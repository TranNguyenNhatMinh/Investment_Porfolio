import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import { TelegramService } from '../telegram/telegram.service';

const BASE = 'https://api.binance.com';

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);
  private apiKey: string;
  private secretKey: string;

  constructor(
    private config: ConfigService,
    private telegram: TelegramService,
  ) {
    this.apiKey = this.config.get<string>('BINANCE_API_KEY', '');
    this.secretKey = this.config.get<string>('BINANCE_SECRET_KEY', '');
  }

  private sign(query: string): string {
    return crypto.createHmac('sha256', this.secretKey).update(query).digest('hex');
  }

  private headers() {
    return { 'X-MBX-APIKEY': this.apiKey };
  }

  async getPrice(symbol: string): Promise<{ symbol: string; price: number; change24h: number; changePercent24h: number }> {
    const [ticker, stats] = await Promise.all([
      axios.get(`${BASE}/api/v3/ticker/price?symbol=${symbol}`),
      axios.get(`${BASE}/api/v3/ticker/24hr?symbol=${symbol}`),
    ]);
    return {
      symbol,
      price: parseFloat(ticker.data.price),
      change24h: parseFloat(stats.data.priceChange),
      changePercent24h: parseFloat(stats.data.priceChangePercent),
    };
  }

  async getPrices(symbols: string[]) {
    return Promise.all(symbols.map((s) => this.getPrice(s).catch(() => null)));
  }

  async getAccountBalance() {
    if (!this.apiKey || this.apiKey === 'your_binance_api_key_here') {
      return { error: 'Chưa cấu hình BINANCE_API_KEY' };
    }
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = this.sign(query);

    const res = await axios.get(`${BASE}/api/v3/account?${query}&signature=${signature}`, {
      headers: this.headers(),
    });

    const balances = res.data.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked),
      }));

    return { balances, updateTime: res.data.updateTime };
  }

  // Tổng stablecoin quy ra USD (Spot + Flexible Earn)
  async getStablecoinBalanceUSD(): Promise<number> {
    if (!this.apiKey || this.apiKey.includes('your_')) return 0;
    const STABLE = ['USDT', 'BUSD', 'USDC', 'TUSD', 'DAI'];
    try {
      const [account, earnRes] = await Promise.all([
        this.getAccountBalance(),
        this.getFlexibleEarn().catch(() => null),
      ]);

      let total = 0;

      if (!('error' in account)) {
        total += account.balances
          .filter((b: any) => STABLE.includes(b.asset))
          .reduce((s: number, b: any) => s + b.total, 0);
      }

      if (earnRes && !('error' in earnRes) && Array.isArray(earnRes.rows)) {
        total += earnRes.rows
          .filter((p: any) => STABLE.includes(p.asset))
          .reduce((s: number, p: any) => s + parseFloat(p.totalAmount ?? 0), 0);
      }

      return total;
    } catch {
      return 0;
    }
  }

  async getTradeHistory(symbol: string, limit = 500) {
    if (!this.apiKey || this.apiKey === 'your_binance_api_key_here') {
      return { error: 'Chưa cấu hình BINANCE_API_KEY' };
    }
    // Paginate qua toàn bộ lịch sử từ 3 năm trước
    const allTrades: any[] = [];
    const startTime = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
    let fromId: number | undefined;

    while (true) {
      const timestamp = Date.now();
      const parts = [`symbol=${symbol}`, `limit=1000`, `timestamp=${timestamp}`, `recvWindow=10000`];
      if (fromId !== undefined) parts.push(`fromId=${fromId}`);
      else parts.push(`startTime=${startTime}`);
      const query = parts.join('&');
      const signature = this.sign(query);
      const res = await axios.get(`${BASE}/api/v3/myTrades?${query}&signature=${signature}`, {
        headers: this.headers(),
      });
      const batch: any[] = res.data ?? [];
      if (!batch.length) break;
      allTrades.push(...batch);
      if (batch.length < 1000) break;
      fromId = batch[batch.length - 1].id + 1;
    }

    return allTrades
      .sort((a, b) => b.time - a.time) // mới nhất trước
      .slice(0, limit)
      .map((t: any) => ({
        tradeId: t.id,
        symbol:  t.symbol,
        side:    t.isBuyer ? 'BUY' : 'SELL',
        price:   parseFloat(t.price),
        qty:     parseFloat(t.qty),
        total:   parseFloat(t.quoteQty),
        fee:     parseFloat(t.commission),
        feeAsset: t.commissionAsset,
        time:    new Date(t.time),
      }));
  }

  // Lưu spot trades của 1 symbol vào DB (upsert by tradeId)
  async saveSpotTradesToDb(userId: string, symbol: string, prisma: any): Promise<number> {
    if (!this.apiKey || this.apiKey.includes('your_')) return 0;
    try {
      const startTime = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
      const allTrades: any[] = [];
      let fromId: number | undefined;

      while (true) {
        const timestamp = Date.now();
        const parts = [`symbol=${symbol}USDT`, `limit=1000`, `timestamp=${timestamp}`, `recvWindow=10000`];
        if (fromId !== undefined) parts.push(`fromId=${fromId}`);
        else parts.push(`startTime=${startTime}`);
        const query = parts.join('&');
        const signature = this.sign(query);
        const res = await axios.get(`${BASE}/api/v3/myTrades?${query}&signature=${signature}`, {
          headers: this.headers(),
        });
        const batch: any[] = res.data ?? [];
        if (!batch.length) break;
        allTrades.push(...batch);
        if (batch.length < 1000) break;
        fromId = batch[batch.length - 1].id + 1;
      }

      if (!allTrades.length) return 0;

      // Lấy tradeId đã có trong DB để phát hiện giao dịch mới
      const existing = await prisma.binanceTrade.findMany({
        where: { userId, symbol: `${symbol}USDT` },
        select: { tradeId: true },
      });
      const existingIds = new Set(existing.map((t: any) => t.tradeId.toString()));

      // Upsert tất cả trades — bỏ qua nếu đã tồn tại
      await prisma.binanceTrade.createMany({
        data: allTrades.map((t: any) => ({
          userId,
          tradeId:    BigInt(t.id),
          symbol:     `${symbol}USDT`,
          side:       t.isBuyer ? 'BUY' : 'SELL',
          price:      parseFloat(t.price),
          qty:        parseFloat(t.qty),
          total:      parseFloat(t.quoteQty),
          fee:        parseFloat(t.commission),
          feeAsset:   t.commissionAsset,
          executedAt: new Date(t.time),
        })),
        skipDuplicates: true,
      });

      // Notify Telegram cho BUY trades mới (chưa có trong DB trước khi sync)
      const newBuys = allTrades.filter(t => t.isBuyer && !existingIds.has(String(t.id)));
      for (const t of newBuys) {
        const qty   = parseFloat(t.qty);
        const price = parseFloat(t.price);
        const total = parseFloat(t.quoteQty);
        this.telegram.send(
          `💰 <b>MUA ${symbol}</b>\n\n` +
          `📦 Số lượng: <b>${qty.toFixed(6)} ${symbol}</b>\n` +
          `💲 Giá: $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}\n` +
          `💵 Tổng: <b>$${total.toFixed(2)}</b>\n` +
          `⏰ ${new Date(t.time).toLocaleString('vi-VN')}`,
        ).catch(() => {});
      }

      return allTrades.length;
    } catch (err: any) {
      this.logger.warn(`saveSpotTradesToDb ${symbol}: ${err.message}`);
      return 0;
    }
  }

  async getKlines(symbol: string, interval: '1h' | '4h' | '1d' = '1d', limit = 90) {
    const res = await axios.get(
      `${BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    );
    return res.data.map((k: any[]) => ({
      time: new Date(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }

  async getFlexibleEarn() {
    if (!this.apiKey || this.apiKey.includes('your_')) return { error: 'Chưa cấu hình API key' };
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}&recvWindow=10000`;
    const signature = this.sign(query);
    const res = await axios.get(`${BASE}/sapi/v1/simple-earn/flexible/position?${query}&signature=${signature}`, {
      headers: this.headers(),
    });
    return res.data;
  }

  async getDividends(limit = 50) {
    if (!this.apiKey || this.apiKey.includes('your_')) return { error: 'Chưa cấu hình API key' };
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}&recvWindow=10000&limit=${limit}`;
    const signature = this.sign(query);
    const res = await axios.get(`${BASE}/sapi/v1/asset/assetDividend?${query}&signature=${signature}`, {
      headers: this.headers(),
    });
    return res.data;
  }

  // FIFO avg buy price — paginate qua toàn bộ history, không giới hạn 1000
  async getAvgBuyPrice(symbol: string): Promise<number | null> {
    if (!this.apiKey || this.apiKey.includes('your_')) return null;
    try {
      const allTrades: any[] = [];
      // Bắt đầu từ 3 năm trước để cover toàn bộ lịch sử hợp lý
      const startTime = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
      let fromId: number | undefined;

      while (true) {
        const timestamp = Date.now();
        const parts = [
          `symbol=${symbol}`, `limit=1000`,
          `timestamp=${timestamp}`, `recvWindow=10000`,
        ];
        // Lần đầu dùng startTime, các lần sau dùng fromId để tiếp tục pagination
        if (fromId !== undefined) parts.push(`fromId=${fromId}`);
        else parts.push(`startTime=${startTime}`);

        const query = parts.join('&');
        const signature = this.sign(query);
        const res = await axios.get(`${BASE}/api/v3/myTrades?${query}&signature=${signature}`, {
          headers: this.headers(),
        });
        const batch: any[] = res.data ?? [];
        if (!batch.length) break;
        allTrades.push(...batch);
        if (batch.length < 1000) break;
        // Tiếp tục từ trade ID tiếp theo
        fromId = batch[batch.length - 1].id + 1;
      }

      if (!allTrades.length) return null;
      const trades = allTrades.sort((a, b) => a.time - b.time);

      // FIFO lot tracking
      const lots: { qty: number; price: number }[] = [];
      for (const trade of trades) {
        const qty   = parseFloat(trade.qty);
        const price = parseFloat(trade.price);
        if (trade.isBuyer) {
          lots.push({ qty, price });
        } else {
          let remaining = qty;
          while (remaining > 1e-10 && lots.length > 0) {
            if (lots[0].qty <= remaining + 1e-10) {
              remaining -= lots[0].qty;
              lots.shift();
            } else {
              lots[0].qty -= remaining;
              remaining = 0;
            }
          }
        }
      }

      if (lots.length === 0) return null;
      const totalQty  = lots.reduce((s, l) => s + l.qty, 0);
      const totalCost = lots.reduce((s, l) => s + l.qty * l.price, 0);
      return totalQty > 0 ? totalCost / totalQty : null;
    } catch {
      return null;
    }
  }

  async getConvertHistory(limit = 1000) {
    if (!this.apiKey || this.apiKey.includes('your_')) return { error: 'Chưa cấu hình API key' };
    try {
      const timestamp = Date.now();
      // Lấy 90 ngày gần nhất
      const startTime = timestamp - 90 * 24 * 60 * 60 * 1000;
      const query = `startTime=${startTime}&endTime=${timestamp}&limit=${limit}&timestamp=${timestamp}&recvWindow=10000`;
      const signature = this.sign(query);
      const res = await axios.get(`${BASE}/sapi/v1/convert/tradeFlow?${query}&signature=${signature}`, {
        headers: this.headers(),
      });
      const list: any[] = res.data?.list ?? [];
      return {
        total: res.data?.total ?? list.length,
        trades: list.map((t: any) => ({
          id: t.orderId,
          fromAsset: t.fromAsset,
          toAsset: t.toAsset,
          fromAmount: parseFloat(t.fromAmount ?? 0),
          toAmount: parseFloat(t.toAmount ?? 0),
          ratio: parseFloat(t.ratio ?? 0),
          status: t.orderStatus,
          time: new Date(t.createTime),
        })).sort((a, b) => b.time.getTime() - a.time.getTime()),
      };
    } catch (e: any) {
      const msg = e?.response?.data?.msg ?? e?.message ?? 'Binance API error';
      this.logger.warn(`getConvertHistory: ${msg}`);
      return { error: msg };
    }
  }

  async getAutoInvestPlans() {
    if (!this.apiKey || this.apiKey.includes('your_')) return { error: 'Chưa cấu hình API key' };
    try {
      const timestamp = Date.now();
      const query = `timestamp=${timestamp}&recvWindow=10000`;
      const signature = this.sign(query);
      const res = await axios.get(`${BASE}/sapi/v1/lending/auto-invest/plan/list?${query}&signature=${signature}`, {
        headers: this.headers(),
      });
      return res.data;
    } catch (e: any) {
      const code = e?.response?.data?.code;
      const msg = e?.response?.data?.msg ?? e?.message ?? 'Binance API error';
      this.logger.warn(`getAutoInvestPlans [${code}]: ${msg}`);
      return { error: msg, code };
    }
  }

  async getAutoInvestHistory(planId?: number, _size = 100) {
    if (!this.apiKey || this.apiKey.includes('your_')) return { error: 'Chưa cấu hình API key' };
    try {
      // Binance không support pagination đúng kiểu — chỉ fetch 1 lần với size tối đa
      // rồi deduplicate theo id để tránh đếm trùng
      const timestamp = Date.now();
      const query = `size=100${planId ? `&planId=${planId}` : ''}&timestamp=${timestamp}&recvWindow=10000`;
      const signature = this.sign(query);
      const response = await axios.get(
        `${BASE}/sapi/v1/lending/auto-invest/history/list?${query}&signature=${signature}`,
        { headers: this.headers() },
      );
      const seen = new Set<number>();
      const allItems: any[] = [];
      for (const item of (response.data.list ?? [])) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          allItems.push(item);
        }
      }
      this.logger.log(`AutoInvest history: total=${response.data.total}, unique=${allItems.length}`);

      const grouped: Record<string, any> = {};
      for (const item of allItems) {
        const key = `${item.planId}-${item.transactionDateTime}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            planId: item.planId,
            planName: item.planName,
            planType: item.planType,
            cycle: item.subscriptionCycle,
            sourceAsset: item.sourceAsset,
            totalSourceAmount: 0,
            status: item.transactionStatus,
            time: new Date(item.transactionDateTime),
            assets: [],
          };
        }
        grouped[key].totalSourceAmount += parseFloat(item.sourceAssetAmount ?? 0);
        grouped[key].assets.push({
          asset: item.targetAsset,
          amount: parseFloat(item.targetAssetAmount ?? 0),
          spent: parseFloat(item.sourceAssetAmount ?? 0),
          executionPrice: parseFloat(item.executionPrice ?? 0), // ← giá thực mua
          status: item.transactionStatus,
        });
      }

      return {
        total: allItems.length,
        plans: Object.values(grouped).sort((a: any, b: any) => b.time - a.time),
      };
    } catch (e: any) {
      const msg = e?.response?.data?.msg ?? e?.message ?? 'Binance API error';
      this.logger.warn(`getAutoInvestHistory: ${msg}`);
      return { error: msg };
    }
  }

  async syncHoldingsFromBinance(userId: string, prisma: any) {
    const account = await this.getAccountBalance();
    if ('error' in account) return account;

    const STABLE = ['USDT', 'BUSD', 'USDC', 'TUSD', 'DAI'];
    const balances: { asset: string; free: number; locked: number; total: number }[] = account.balances;

    // Gộp Flexible Earn vào tổng số dư
    const earnRes = await this.getFlexibleEarn().catch(() => null);
    if (earnRes && !('error' in earnRes) && Array.isArray(earnRes.rows)) {
      for (const pos of earnRes.rows) {
        const earnAmt = parseFloat(pos.totalAmount ?? 0);
        if (earnAmt <= 0) continue;
        const existing = balances.find((b) => b.asset === pos.asset);
        if (existing) existing.total += earnAmt;
        else balances.push({ asset: pos.asset, free: 0, locked: 0, total: earnAmt });
      }
    }

    const cryptoAssets = balances.filter((b) => !STABLE.includes(b.asset) && b.total > 0);
    this.logger.log(`Sync: spot=${account.balances.length} assets, earn=${earnRes && !('error' in earnRes) ? (earnRes.rows?.length ?? 0) : 'err'}, crypto=${cryptoAssets.length} [${cryptoAssets.map((b) => b.asset).join(',')}]`);

    // Fetch AutoInvest history 1 lần duy nhất cho tất cả assets (tránh rate limit)
    const DCA_START = new Date('2026-04-29T00:00:00.000Z');
    const dcaAvgMap = await this.buildDcaAvgMap(DCA_START).catch(() => ({}));

    const synced: { asset: string; amount: number; currentPrice: number; avgBuyPrice: number | null }[] = [];

    for (const asset of cryptoAssets) {
      try {
        const symbol = `${asset.asset}USDT`;
        const [priceData, avgFromTrades] = await Promise.all([
          this.getPrice(symbol),
          this.getAvgBuyPrice(symbol).catch(() => null),
        ]);

        const avgFromDca = dcaAvgMap[asset.asset] ?? null;
        // DCA avg (filtered by startDate) takes priority over all-time trade history
        const avgBuy = avgFromDca ?? avgFromTrades;

        // Giữ buyPrice cũ trong DB nếu không tính được avg — không fallback về giá hiện tại
        const existing = await prisma.holding.findUnique({
          where: { id: `binance-${userId}-${asset.asset}` },
          select: { buyPrice: true },
        });
        const buyPrice = avgBuy ?? existing?.buyPrice ?? priceData.price;

        await prisma.holding.upsert({
          where: { id: `binance-${userId}-${asset.asset}` },
          create: {
            id: `binance-${userId}-${asset.asset}`,
            userId, type: 'CRYPTO',
            ticker: asset.asset, name: asset.asset,
            shares: asset.total, buyPrice,
            currentPrice: priceData.price, currency: 'USD',
          },
          update: {
            shares: asset.total,
            ...(avgBuy ? { buyPrice: avgBuy } : {}),
            currentPrice: priceData.price,
            currency: 'USD',
          },
        });

        synced.push({ asset: asset.asset, amount: asset.total, currentPrice: priceData.price, avgBuyPrice: avgBuy });

        // Lưu spot trades vào DB (background, không block sync)
        this.saveSpotTradesToDb(userId, asset.asset, prisma).catch(() => {});
      } catch (err: any) {
        this.logger.warn(`Sync failed for ${asset.asset}: ${err.message}`);
      }
    }
    return { synced, count: synced.length };
  }

  // Build map {BTC: avgPrice, ETH: avgPrice} — dùng executionPrice có sẵn từ Binance
  private async buildDcaAvgMap(startDate?: Date): Promise<Record<string, number>> {
    const map: Record<string, { totalCost: number; totalReceived: number }> = {};
    try {
      const res = await this.getAutoInvestHistory();
      if (!res || 'error' in res) return {};
      const FAILED = ['FAILED', 'CANCELED', 'ERROR'];
      for (const plan of (res.plans ?? [])) {
        if (startDate && new Date(plan.time) < startDate) continue;
        for (const a of (plan.assets ?? [])) {
          if (FAILED.includes(a.status?.toUpperCase())) continue;
          const received = Number(a.amount ?? 0);
          const price    = Number(a.executionPrice ?? 0);
          if (received <= 0 || price <= 0) continue;
          if (!map[a.asset]) map[a.asset] = { totalCost: 0, totalReceived: 0 };
          // Weighted average: Σ(price × qty) / Σ(qty)
          map[a.asset].totalCost     += price * received;
          map[a.asset].totalReceived += received;
        }
      }
    } catch (err: any) {
      this.logger.warn(`buildDcaAvgMap failed: ${err.message}`);
    }
    const result: Record<string, number> = {};
    for (const [asset, { totalCost, totalReceived }] of Object.entries(map)) {
      if (totalReceived > 0) {
        result[asset] = totalCost / totalReceived;
        this.logger.log(`DCA avg [${asset}]: $${(totalCost / totalReceived).toFixed(2)}`);
      }
    }
    return result;
  }

  // Tính avg buy price từ AutoInvest/DCA history (khi myTrades không đủ)
  // Tổng hợp DCA đầy đủ: đầu tư, nhận, avg price, giá live, P&L từng coin
  async getDcaSummary(startDate?: Date) {
    const dcaMap: Record<string, { spent: number; received: number; executions: number }> = {};

    const failedMap: Record<string, { attempts: number; failedAttempts: number }> = {};

    try {
      const res = await this.getAutoInvestHistory(undefined, 1000);
      if (!res || 'error' in res) return { error: 'Không lấy được DCA history' };

      const FAILED = ['FAILED', 'CANCELED', 'ERROR'];
      for (const plan of (res.plans ?? [])) {
        if (startDate && new Date(plan.time) < startDate) continue;
        for (const a of (plan.assets ?? [])) {
          if (!failedMap[a.asset]) failedMap[a.asset] = { attempts: 0, failedAttempts: 0 };
          failedMap[a.asset].attempts += 1;
          if (FAILED.includes(a.status?.toUpperCase())) {
            failedMap[a.asset].failedAttempts += 1;
            continue;
          }
          if (!dcaMap[a.asset]) dcaMap[a.asset] = { spent: 0, received: 0, executions: 0 };
          dcaMap[a.asset].spent      += Number(a.spent ?? 0);
          dcaMap[a.asset].received   += Number(a.amount ?? 0);
          dcaMap[a.asset].executions += 1;
        }
      }
    } catch (err: any) {
      return { error: err.message };
    }

    if (!Object.keys(dcaMap).length) return {
      coins: [],
      failed: Object.entries(failedMap).map(([asset, v]) => ({ asset, ...v })),
      summary: { totalInvestedUsdt: 0, currentValueUsdt: 0, pnlUsdt: 0, pnlPct: 0 },
    };

    // Fetch giá live cho tất cả coins cùng lúc
    const assets = Object.keys(dcaMap);
    const prices = await Promise.allSettled(
      assets.map(a => this.getPrice(`${a}USDT`).catch(() => null))
    );

    const coins = assets.map((asset, i) => {
      const { spent, received, executions } = dcaMap[asset];
      const priceResult = prices[i].status === 'fulfilled' ? prices[i].value : null;
      const currentPrice = (priceResult as any)?.price ?? 0;
      const avgBuyPrice  = received > 0 ? spent / received : 0;
      const currentValue = received * currentPrice;
      const pnl          = currentValue - spent;
      const pnlPct       = spent > 0 ? (pnl / spent) * 100 : 0;
      const failInfo     = failedMap[asset] ?? { attempts: executions, failedAttempts: 0 };

      return {
        asset,
        executions,
        totalAttempts:     failInfo.attempts,
        failedAttempts:    failInfo.failedAttempts,
        totalInvestedUsdt: Math.round(spent * 10000) / 10000,
        coinsReceived:     received,
        avgBuyPrice:       Math.round(avgBuyPrice * 10000) / 10000,
        currentPrice:      Math.round(currentPrice * 10000) / 10000,
        currentValueUsdt:  Math.round(currentValue * 10000) / 10000,
        pnlUsdt:           Math.round(pnl * 10000) / 10000,
        pnlPct:            Math.round(pnlPct * 100) / 100,
      };
    }).sort((a, b) => b.totalInvestedUsdt - a.totalInvestedUsdt);

    const totalInvested = coins.reduce((s, c) => s + c.totalInvestedUsdt, 0);
    const totalValue    = coins.reduce((s, c) => s + c.currentValueUsdt, 0);
    const totalPnl      = totalValue - totalInvested;

    return {
      coins,
      summary: {
        totalInvestedUsdt: Math.round(totalInvested * 100) / 100,
        currentValueUsdt:  Math.round(totalValue * 100) / 100,
        pnlUsdt:           Math.round(totalPnl * 100) / 100,
        pnlPct:            totalInvested > 0 ? Math.round((totalPnl / totalInvested) * 10000) / 100 : 0,
      },
    };
  }

  // Public wrapper — dùng buildDcaAvgMap để lấy avg price cho 1 asset cụ thể
  async getDcaAvgPricePublic(asset: string) {
    const map = await this.buildDcaAvgMap().catch(() => ({}));
    const avgBuyPrice = map[asset.toUpperCase()] ?? null;
    if (avgBuyPrice) {
      this.logger.log(`DCA avg price for ${asset}: $${avgBuyPrice.toFixed(2)}`);
    }
    return { asset, avgBuyPrice };
  }

  // ── TRADE APIs ────────────────────────────────────────────

  // Lấy số dư USDT trong Spot wallet
  async getSpotUsdtBalance(): Promise<number> {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = this.sign(query);
    const res = await axios.get(`${BASE}/api/v3/account?${query}&signature=${signature}`, {
      headers: this.headers(),
    });
    const usdt = res.data.balances?.find((b: any) => b.asset === 'USDT');
    return parseFloat(usdt?.free ?? '0');
  }

  // Lấy % thay đổi giá 24h
  async get24hChangePercent(symbol: string): Promise<number> {
    const res = await axios.get(`${BASE}/api/v3/ticker/24hr?symbol=${symbol}`);
    return parseFloat(res.data.priceChangePercent);
  }

  // Đặt lệnh market buy trên Spot
  async placeMarketBuy(symbol: string, quoteOrderQty: number): Promise<{
    orderId: number;
    executedQty: string;
    cummulativeQuoteQty: string;
    status: string;
    fills?: { price: string; qty: string; commission: string; commissionAsset: string; tradeId: number }[];
  }> {
    const timestamp = Date.now();
    const params = [
      `symbol=${symbol}`,
      `side=BUY`,
      `type=MARKET`,
      `quoteOrderQty=${quoteOrderQty}`,
      `timestamp=${timestamp}`,
    ].join('&');
    const signature = this.sign(params);

    const res = await axios.post(
      `${BASE}/api/v3/order?${params}&signature=${signature}`,
      null,
      { headers: this.headers() },
    );

    this.logger.log(
      `Market buy: ${symbol} $${quoteOrderQty} → orderId=${res.data.orderId} status=${res.data.status}`,
    );
    return res.data;
  }

  // Pre-insert agent buy fills vào BinanceTrade để sync sau không notify lại
  async markAgentBuyAsKnown(
    userId: string, symbol: string,
    fills: { price: string; qty: string; commission: string; commissionAsset: string; tradeId: number }[],
    prisma: any,
  ): Promise<void> {
    if (!fills?.length) return;
    try {
      await prisma.binanceTrade.createMany({
        data: fills.map(f => ({
          userId,
          tradeId:    BigInt(f.tradeId),
          symbol:     `${symbol}USDT`,
          side:       'BUY',
          price:      parseFloat(f.price),
          qty:        parseFloat(f.qty),
          total:      parseFloat(f.price) * parseFloat(f.qty),
          fee:        parseFloat(f.commission),
          feeAsset:   f.commissionAsset,
          executedAt: new Date(),
        })),
        skipDuplicates: true,
      });
    } catch { /* non-critical */ }
  }

  // Test kết nối trade (đặt lệnh giả — không thực thi)
  async testOrder(symbol: string, quoteOrderQty: number): Promise<boolean> {
    const timestamp = Date.now();
    const params = [
      `symbol=${symbol}`,
      `side=BUY`,
      `type=MARKET`,
      `quoteOrderQty=${quoteOrderQty}`,
      `timestamp=${timestamp}`,
    ].join('&');
    const signature = this.sign(params);

    await axios.post(
      `${BASE}/api/v3/order/test?${params}&signature=${signature}`,
      null,
      { headers: this.headers() },
    );
    return true; // không throw = API key hợp lệ có quyền trade
  }

}
