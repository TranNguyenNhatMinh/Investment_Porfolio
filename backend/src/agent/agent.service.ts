import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HoldingType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';
import { AgentGateway } from './agent.gateway';
import { TelegramService } from '../telegram/telegram.service';
import { PortfolioService } from '../portfolio/portfolio.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private binance: BinanceService,
    private gateway: AgentGateway,
    private telegram: TelegramService,
    private portfolio: PortfolioService,
  ) {}

  // ── Cron: chạy mỗi 5 phút ──────────────────────────────
  @Cron('*/5 * * * *')
  async runAllAgents() {
    if (this.isRunning) {
      this.logger.warn('[Agent] Previous run still in progress, skipping this cycle');
      return;
    }
    this.isRunning = true;
    try {
      const configs = await this.prisma.dipBuyConfig.findMany({
        where: { isActive: true },
      });
      for (const config of configs) {
        try {
          await this.runForUser(config);
        } catch (err: any) {
          this.logger.error(`Agent error for user ${config.userId}: ${err.message}`);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  // ── Logic chính + trả về summary ───────────────────────
  async runForUserWithSummary(config: any) {
    const before = await this.prisma.dipBuyLog.count({ where: { userId: config.userId } });
    await this.runForUser(config);
    const after  = await this.prisma.dipBuyLog.count({ where: { userId: config.userId } });
    const status = await this.getStatus(config.userId);

    const triggered = after - before;
    const allPositive = status.coins.every((c: any) => (c.change24h ?? 0) >= 0);

    return {
      triggered,
      checked: status.coins.length,
      coins: status.coins.map((c: any) => ({
        coin: c.coin,
        change: c.change24h,
        willTrigger: c.willTrigger,
      })),
      message: triggered > 0
        ? `✅ Đã mua ${triggered} coin`
        : allPositive
        ? `📈 ${status.coins.length} coins đang tăng — không có gì để mua`
        : `⏳ Chưa coin nào giảm quá ${config.threshold}%`,
    };
  }

  // ── Logic chính cho 1 user ──────────────────────────────
  async runForUser(config: any) {
    // Lấy danh sách coins từ DCA history + filter theo selectedCoins
    const allCoins = await this.getDcaCoins();
    if (!allCoins.length) return;

    const selected = (config.selectedCoins ?? 'ALL').toUpperCase();
    const dcaCoins = selected === 'ALL'
      ? allCoins
      : allCoins.filter(c => selected.split(',').includes(c.toUpperCase()));

    for (const coin of dcaCoins) {
      const symbol = `${coin}USDT`;

      // Lấy % thay đổi 24h
      let changePercent: number;
      try {
        changePercent = await this.binance.get24hChangePercent(symbol);
      } catch {
        continue; // bỏ qua nếu không lấy được giá
      }

      // Chưa đủ ngưỡng giảm
      if (changePercent >= -config.threshold) continue;

      this.logger.log(
        `[Agent] ${coin} giảm ${changePercent.toFixed(2)}% (ngưỡng: -${config.threshold}%)`
      );

      // Dry run — bỏ qua safety, chỉ log
      if (config.isDryRun) {
        await this.saveLog(config, coin, symbol, changePercent, 'DRY_RUN');
        this.logger.log(`[Agent] DRY RUN: ${coin} giảm ${changePercent.toFixed(2)}% → Sẽ mua $${config.amountUsdt}`);
        this.telegram.notifyDipBuy({
          coin, amountUsdt: config.amountUsdt, qty: '0',
          avgPrice: 0, changePercent, dailySpent: 0,
          dailyLimit: config.dailyLimit, isDryRun: true,
        }).catch(() => {});
        continue;
      }

      // Kiểm tra safety (chỉ khi chạy thật)
      const skipReason = await this.checkSafety(config, coin);
      if (skipReason) {
        await this.saveLog(config, coin, symbol, changePercent, 'SKIPPED', { skipReason });
        this.logger.log(`[Agent] Skip ${coin}: ${skipReason}`);
        continue;
      }

      // Đặt lệnh thật
      try {
        if (config.amountUsdt < 5) {
          await this.saveLog(config, coin, symbol, changePercent, 'FAILED', {
            errorMsg: `Amount $${config.amountUsdt} thấp hơn Binance minimum $5`,
          });
          continue;
        }
        const order = await this.binance.placeMarketBuy(symbol, config.amountUsdt);
        // Từ đây trở đi: lệnh ĐÃ ĐƯỢC THỰC THI trên Binance
        // Phải đảm bảo log được lưu bằng mọi giá
        const execQty = parseFloat(order.executedQty ?? '0');
        const cumQty  = parseFloat(order.cummulativeQuoteQty ?? '0');
        const avgPrice = execQty > 0 ? cumQty / execQty : config.amountUsdt;

        if (!['FILLED', 'PARTIALLY_FILLED'].includes(order.status)) {
          this.logger.warn(`[Agent] Unexpected order status ${order.status} for ${coin}`);
        }
        if (order.status === 'PARTIALLY_FILLED') {
          this.logger.warn(`[Agent] Partial fill ${coin}: ${execQty} received`);
        }

        // Luôn cố gắng lưu log — retry nếu thất bại
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await this.saveLog(config, coin, symbol, changePercent, 'SUCCESS', {
              orderId:     String(order.orderId),
              executedQty: order.executedQty,
              avgPrice,
            });
            break;
          } catch (logErr: any) {
            this.logger.error(`[Agent] saveLog attempt ${attempt} failed for ${coin} order #${order.orderId}: ${logErr.message}`);
            if (attempt === 3) {
              // Log ra console để không mất dấu vết
              this.logger.error(`[Agent] CRITICAL: Order #${order.orderId} executed but NOT logged! ${coin} qty=${execQty} price=${avgPrice}`);
            }
          }
        }

        // Cập nhật Holding (lỗi ở đây không ảnh hưởng đến audit log)
        await this.syncHoldingAfterBuy(config.userId, coin, execQty, avgPrice);

        // Push thông báo real-time
        this.gateway.notifyBuy(config.userId, {
          coin,
          amountUsdt: config.amountUsdt,
          avgPrice,
          orderId: String(order.orderId),
        });

        this.logger.log(`[Agent] ✅ Mua ${execQty} ${coin} @ $${avgPrice.toFixed(2)} (order #${order.orderId})`);

        // Tính tổng đã chi trong ngày (bao gồm lần mua vừa rồi)
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dailySpent = await this.prisma.dipBuyLog.aggregate({
          where: { userId: config.userId, coin, status: 'SUCCESS', executedAt: { gte: today }, isDryRun: false },
          _sum: { amountUsdt: true },
        }).then(r => r._sum.amountUsdt ?? 0).catch(() => 0);

        this.telegram.notifyDipBuy({
          coin, amountUsdt: config.amountUsdt,
          qty: execQty.toFixed(6), avgPrice, changePercent,
          dailySpent, dailyLimit: config.dailyLimit, isDryRun: false,
        }).catch(() => {});

        // Pre-insert fills vào BinanceTrade để sync sau không notify lại (double notification prevention)
        if (order.fills?.length) {
          this.binance.markAgentBuyAsKnown(config.userId, coin, order.fills, this.prisma).catch(() => {});
        }

      } catch (err: any) {
        // Lỗi xảy ra TRƯỚC khi placeMarketBuy hoàn thành — chưa tiêu tiền
        try {
          await this.saveLog(config, coin, symbol, changePercent, 'FAILED', {
            errorMsg: err.message,
          });
        } catch { /* ignore log error in failure path */ }
        this.logger.error(`[Agent] Lỗi đặt lệnh ${coin}: ${err.message}`);
        this.telegram.notifyAgentError(coin, err.message).catch(() => {});
      }
    }
  }

  // ── Safety checks ───────────────────────────────────────
  private async checkSafety(config: any, coin: string): Promise<string | null> {
    // 1. Cooldown: đã mua coin này trong X giờ chưa?
    const cooldownMs = config.cooldownHours * 60 * 60 * 1000;
    const lastBuy = await this.prisma.dipBuyLog.findFirst({
      where: {
        configId: config.id,
        coin,
        status: 'SUCCESS', // chỉ tính lần mua thật, không tính dry run
        executedAt: { gte: new Date(Date.now() - cooldownMs) },
      },
      orderBy: { executedAt: 'desc' },
    });
    if (lastBuy) {
      const hoursLeft = ((lastBuy.executedAt.getTime() + cooldownMs - Date.now()) / 3600000).toFixed(1);
      return `Cooldown: còn ${hoursLeft}h`;
    }

    // 2. Giới hạn ngày (dùng aggregate để tránh race condition)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const agg = await this.prisma.dipBuyLog.aggregate({
      where: {
        configId:    config.id,
        status:      'SUCCESS',
        executedAt:  { gte: today },
      },
      _sum: { amountUsdt: true },
    });
    const todaySpend = agg._sum.amountUsdt ?? 0;
    if (todaySpend + config.amountUsdt > config.maxPerDay) {
      return `Đã đạt giới hạn ngày ($${todaySpend.toFixed(0)}/$${config.maxPerDay})`;
    }

    // 3. Kiểm tra balance USDT (chỉ khi không phải dry run)
    if (!config.isDryRun) {
      const balance = await this.binance.getSpotUsdtBalance();
      if (balance < config.amountUsdt) {
        return `Không đủ USDT (có $${balance.toFixed(2)}, cần $${config.amountUsdt})`;
      }
    }

    return null; // Tất cả pass → OK
  }

  // ── Lấy coins từ DCA history ────────────────────────────
  private async getDcaCoins(): Promise<string[]> {
    try {
      const history = await this.binance.getAutoInvestHistory(undefined, 500);
      const coins = new Set<string>();
      for (const plan of history?.plans ?? []) {
        // Assets nằm trong plan.assets[].asset
        for (const asset of (plan.assets ?? [])) {
          if (asset.asset) coins.add(asset.asset.toUpperCase());
        }
      }
      this.logger.log(`[Agent] DCA coins: ${Array.from(coins).join(', ')}`);
      return Array.from(coins);
    } catch (e: any) {
      this.logger.warn(`[Agent] getDcaCoins error: ${e.message}`);
      return [];
    }
  }

  // ── Save log ────────────────────────────────────────────
  private async saveLog(
    config: any,
    coin: string,
    symbol: string,
    changePercent: number,
    status: string,
    extra: {
      skipReason?: string;
      errorMsg?: string;
      orderId?: string;
      executedQty?: string;
      avgPrice?: number;
    } = {},
  ) {
    await this.prisma.dipBuyLog.create({
      data: {
        userId:       config.userId,
        configId:     config.id,
        coin,
        symbol,
        changePercent,
        amountUsdt:   config.amountUsdt,
        isDryRun:     config.isDryRun,
        status,
        skipReason:   extra.skipReason ?? null,
        errorMsg:     extra.errorMsg ?? null,
        orderId:      extra.orderId ?? null,
        executedQty:  extra.executedQty ?? null,
        avgPrice:     extra.avgPrice ?? null,
      },
    });
  }

  // ── CRUD Config ─────────────────────────────────────────
  async getConfig(userId: string) {
    return this.prisma.dipBuyConfig.findUnique({ where: { userId } });
  }

  async upsertConfig(userId: string, dto: {
    isActive?: boolean;
    isDryRun?: boolean;
    threshold?: number;
    amountUsdt?: number;
    cooldownHours?: number;
    maxPerDay?: number;
  }) {
    return this.prisma.dipBuyConfig.upsert({
      where:  { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  async getLogs(userId: string, limit = 50) {
    return this.prisma.dipBuyLog.findMany({
      where:   { userId },
      orderBy: { executedAt: 'desc' },
      take:    limit,
    });
  }

  async clearLogs(userId: string, type: 'test' | 'all') {
    const where = type === 'test'
      ? { userId, status: { in: ['DRY_RUN'] } }
      : { userId };
    const { count } = await this.prisma.dipBuyLog.deleteMany({ where });
    return { deleted: count, type };
  }

  // Force test: tạo DRY_RUN log cho tất cả coins bất kể giá
  async forceTestRun(userId: string) {
    const config = await this.getConfig(userId);
    if (!config) return { error: 'Chưa có cấu hình' };

    const allCoins = await this.getDcaCoins();
    const selected = (config.selectedCoins ?? 'ALL').toUpperCase();
    const coins = selected === 'ALL'
      ? allCoins
      : allCoins.filter(c => selected.split(',').includes(c.toUpperCase()));
    const results: any[] = [];

    for (const coin of coins) {
      const symbol = `${coin}USDT`;
      const change = await this.binance.get24hChangePercent(symbol).catch(() => 0);
      await this.saveLog(
        { ...config, isDryRun: true },
        coin, symbol, change,
        'DRY_RUN',
      );
      results.push({ coin, change });
    }

    return { message: `Force test: tạo ${results.length} DRY_RUN logs`, results };
  }

  // Debug: xem trạng thái từng coin hiện tại
  async getStatus(userId: string) {
    const config = await this.getConfig(userId);
    const allCoins = await this.getDcaCoins();
    // Frontend vẫn hiện tất cả coins trong panel "Giá 24h" — chỉ filter ở backend để giảm API calls
    const coins = allCoins; // Giữ all coins cho display, frontend tự filter "Đang theo dõi"

    const coinStatus = await Promise.all(
      coins.map(async (coin) => {
        const symbol = `${coin}USDT`;
        try {
          const [change, ticker] = await Promise.all([
            this.binance.get24hChangePercent(symbol),
            this.binance.getKlines(symbol, '1d', 1).then((k:any[]) => k?.[0]?.close ?? 0).catch(() => 0),
          ]);
          const willTrigger = change <= -((config?.threshold ?? 5));
          const p0 = ticker > 0 ? ticker / (1 + change / 100) : 0;
          const triggerPrice = p0 > 0 ? parseFloat((p0 * (1 - (config?.threshold ?? 5) / 100)).toFixed(2)) : 0;
          return { coin, symbol, change24h: parseFloat(change.toFixed(2)), willTrigger, currentPrice: ticker, triggerPrice };
        } catch {
          return { coin, symbol, change24h: null, willTrigger: false };
        }
      })
    );

    return {
      config,
      coins: coinStatus,
      summary: {
        total: coins.length,
        willTrigger: coinStatus.filter(c => c.willTrigger).length,
        threshold: config?.threshold ?? 5,
      },
    };
  }

  // ── Đồng bộ Holding sau khi mua ────────────────────────
  private async syncHoldingAfterBuy(userId: string, coin: string, qty: number, price: number) {
    try {
      // Dùng transaction để đảm bảo atomic — tránh race condition giữa read và update
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.holding.findFirst({
          where: { userId, ticker: coin, type: 'CRYPTO' },
        });

        if (existing) {
          const newShares = existing.shares + qty;
          if (newShares <= 0) return; // Safety guard
          const newAvgPrice = (existing.shares * existing.buyPrice + qty * price) / newShares;
          await tx.holding.update({
            where: { id: existing.id },
            data: {
              shares:       Math.round(newShares * 1e8) / 1e8,
              buyPrice:     Math.round(newAvgPrice * 100) / 100,
              currentPrice: Math.round(price * 100) / 100,
            },
          });
          this.logger.log(`[Agent] Updated holding ${coin}: ${existing.shares} → ${newShares} (avg $${newAvgPrice.toFixed(2)})`);
        } else {
          await tx.holding.create({
            data: {
              userId,
              ticker:       coin,
              name:         coin,
              type:         HoldingType.CRYPTO,
              currency:     'USD',
              shares:       qty,
              buyPrice:     Math.round(price * 100) / 100,
              currentPrice: Math.round(price * 100) / 100,
            },
          });
          this.logger.log(`[Agent] Created new holding ${coin}: ${qty} @ $${price.toFixed(2)}`);
        }
      });
    } catch (err: any) {
      this.logger.error(`[Agent] syncHolding failed for ${coin}: ${err.message}`);
    }
  }

  // Test API key có quyền trade không
  async testTradePermission(): Promise<{ ok: boolean; balance: number }> {
    const [ok, balance] = await Promise.all([
      this.binance.testOrder('BTCUSDT', 10).catch(() => false),
      this.binance.getSpotUsdtBalance().catch(() => 0),
    ]);
    return { ok: ok as boolean, balance: balance as number };
  }

  // ── Daily 7am summary ─────────────────────────────────────
  @Cron('0 7 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async dailyPortfolioSummary() {
    if (!this.telegram.isConfigured) return;
    try {
      // Lấy user đầu tiên có dipBuyConfig (personal app = 1 user)
      const config = await this.prisma.dipBuyConfig.findFirst({ select: { userId: true } });
      if (!config) return;

      const [summary, history] = await Promise.all([
        this.portfolio.getSummary(config.userId),
        this.portfolio.getPortfolioHistory(config.userId, '1mo'),
      ]);

      const grandTotal    = summary.grandTotal ?? 0;
      const cashVnd       = (summary.cashUsd ?? 0) * (summary.usdVnd ?? 25_400);
      // So sánh investment-only (không gồm USDT) với history (cũng không gồm USDT)
      const investmentVal = grandTotal - cashVnd;
      const yesterday     = history.length >= 2 ? history[history.length - 2].value : null;
      const diff          = yesterday ? investmentVal - yesterday : 0;
      const diffPct       = yesterday && yesterday > 0 ? (diff / yesterday) * 100 : 0;
      const isUp          = diff >= 0;

      const fmt = (n: number) => {
        const a = Math.abs(n);
        if (a >= 1_000_000_000) return `${(a / 1_000_000_000).toFixed(2)}tỷ`;
        if (a >= 1_000_000)     return `${(a / 1_000_000).toFixed(1)}M`;
        if (a >= 1_000)         return `${Math.round(a / 1_000)}K`;
        return `${Math.round(a)}`;
      };

      await this.telegram.send(
        `📊 <b>Tổng kết tài sản — ${new Date().toLocaleDateString('vi-VN')}</b>\n\n` +
        `💼 Tổng tài sản: <b>${fmt(grandTotal)} ₫</b>\n` +
        `${isUp ? '📈' : '📉'} So với hôm qua: <b>${isUp ? '+' : ''}${fmt(diff)} ₫</b> (${isUp ? '+' : ''}${diffPct.toFixed(2)}%)\n\n` +
        `🔹 Crypto:    ${fmt(summary.crypto?.value ?? 0)} ₫\n` +
        `🔹 Cổ phiếu: ${fmt(summary.stocks?.value ?? 0)} ₫\n` +
        `🔹 Tiết kiệm: ${fmt(summary.savingsVnd ?? 0)} ₫\n` +
        `🔹 USDT:      $${(summary.cashUsd ?? 0).toFixed(2)}\n` +
        `\n⏰ 7:00 AM — Tự động từ Investment Bot`,
      );
    } catch (err: any) {
      this.logger.warn(`[Agent] Daily summary failed: ${err.message}`);
    }
  }
}
