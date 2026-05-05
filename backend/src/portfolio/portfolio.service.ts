import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';
import { PricesService } from '../prices/prices.service';
import { SavingsService } from '../savings/savings.service';
import { CreateHoldingDto, UpdateHoldingDto, UpsertBudgetDto } from './portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(
    private prisma: PrismaService,
    private binance: BinanceService,
    private prices: PricesService,
    private savingsService: SavingsService,
  ) {}

  // ── Holdings ──────────────────────────────────────────────
  async getHoldings(userId: string) {
    const holdings = await this.prisma.holding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachLivePrices(holdings);
  }

  async createHolding(userId: string, dto: CreateHoldingDto) {
    return this.prisma.holding.create({ data: { ...dto, userId } });
  }

  async updateHolding(userId: string, id: string, dto: UpdateHoldingDto) {
    await this.assertOwner(userId, id);
    return this.prisma.holding.update({ where: { id }, data: dto });
  }

  async deleteHolding(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.holding.delete({ where: { id } });
    return { message: 'Đã xoá' };
  }

  // ── Budget ────────────────────────────────────────────────
  async getBudgets(userId: string) {
    return this.prisma.monthlyBudget.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async upsertBudget(userId: string, dto: UpsertBudgetDto) {
    return this.prisma.monthlyBudget.upsert({
      where: { userId_month_year: { userId, month: dto.month, year: dto.year } },
      create: { ...dto, userId },
      update: { income: dto.income, stockInvest: dto.stockInvest, cryptoInvest: dto.cryptoInvest, spending: dto.spending },
    });
  }

  // ── Summary với giá realtime ──────────────────────────────
  async getSummary(userId: string) {
    const rawHoldings = await this.prisma.holding.findMany({ where: { userId } });
    const now = new Date();
    const budget = await this.prisma.monthlyBudget.findUnique({
      where: { userId_month_year: { userId, month: now.getMonth() + 1, year: now.getFullYear() } },
    });

    const [holdings, usdVnd, cashUsd, savingsSummary, dsipPlans] = await Promise.all([
      this.attachLivePrices(rawHoldings),
      this.prices.getForexRate(),
      this.binance.getStablecoinBalanceUSD(),
      this.savingsService.getSummaryVnd(userId).catch(() => ({ principal: 0, interest: 0, total: 0 })),
      this.prisma.dsipPlan.findMany({
        where: { userId },
        include: { records: { select: { totalInvested: true } } },
      }).catch(() => []),
    ]);
    const savingsVnd      = savingsSummary.total;
    const savingsInterest = savingsSummary.interest;
    const savingsPrincipal = savingsSummary.principal;

    // DSIP: tính giá trị hiện tại từ units tích lũy × NAV hiện tại
    let dsipInvested = 0;
    let dsipCurrentValue = 0;
    for (const plan of dsipPlans as any[]) {
      const funds: { symbol: string; currentNav?: number }[] = plan.funds ?? [];
      const records: any[] = plan.records ?? [];
      dsipInvested += records.reduce((s: number, r: any) => s + r.totalInvested, 0);
      // Tích lũy units từ tất cả records
      const unitMap: Record<string, number> = {};
      for (const r of records) {
        for (const fd of (r.fundData ?? []) as any[]) {
          unitMap[fd.symbol] = (unitMap[fd.symbol] ?? 0) + (fd.units ?? 0);
        }
      }
      // Nhân với NAV hiện tại nếu có
      for (const fund of funds) {
        const units = unitMap[fund.symbol] ?? 0;
        const nav   = fund.currentNav ?? 0;
        dsipCurrentValue += nav > 0 ? units * nav : 0;
      }
      // Fallback: nếu chưa có NAV thì dùng invested
      if (dsipCurrentValue === 0) dsipCurrentValue = dsipInvested;
    }
    if (dsipCurrentValue === 0 && dsipInvested > 0) dsipCurrentValue = dsipInvested;
    const dsipPnl = dsipCurrentValue - dsipInvested;

    const stockHoldings = holdings.filter((h) => h.type === 'STOCK');
    const cryptoHoldings = holdings.filter((h) => h.type === 'CRYPTO');

    const calcGroup = (list: typeof holdings) => {
      const value = list.reduce((s, h) => {
        const mult = h.currency === 'USD' ? usdVnd : 1;
        return s + h.shares * h.livePrice * mult;
      }, 0);
      const cost = list.reduce((s, h) => {
        const mult = h.currency === 'USD' ? usdVnd : 1;
        return s + h.shares * h.buyPrice * mult;
      }, 0);
      return { value, cost, pnl: value - cost, pct: cost ? ((value - cost) / cost) * 100 : 0 };
    };

    const stocks = calcGroup(stockHoldings);
    const crypto = calcGroup(cryptoHoldings);
    const totalValue = stocks.value + crypto.value;
    const totalCost = stocks.cost + crypto.cost;
    const total = {
      value: totalValue,
      cost: totalCost,
      pnl: totalValue - totalCost,
      pct: totalCost ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    };

    const cashVnd = cashUsd * usdVnd;
    // grandTotal = crypto(livePrice) + DSIP(currentNAV) + tiết kiệm(gốc+lãi) + USDT
    const grandTotal = totalValue + dsipCurrentValue + savingsVnd + cashVnd;

    return {
      total, stocks, crypto, budget,
      holdingsCount: holdings.length,
      usdVnd, cashUsd,
      savingsVnd, savingsInterest, savingsPrincipal,
      cashVnd,
      dsipInvested, dsipCurrentValue, dsipPnl,
      grandTotal,
    };
  }

  // ── Portfolio total value history ─────────────────────────
  async getPortfolioHistory(userId: string, period: '1mo' | '3mo' | '6mo' | '1y' = '6mo') {
    const holdings = await this.prisma.holding.findMany({ where: { userId } });
    if (holdings.length === 0) return [];

    const usdVnd = await this.prices.getForexRate();
    const daysMap: Record<string, number> = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };
    const days = daysMap[period] ?? 180;

    const dateValueMap: Record<string, number> = {};

    await Promise.allSettled(
      holdings.map(async (h) => {
        try {
          let points: { date: string; close: number }[] = [];

          if (h.type === 'CRYPTO' && h.currency === 'USD') {
            const klines = await this.binance.getKlines(`${h.ticker}USDT`, '1d', days);
            points = klines.map((k: any) => ({
              date: new Date(k.time).toISOString().split('T')[0],
              close: k.close,
            }));
          } else {
            // Route VN stocks (currency=VND) → TCBS, US stocks → Yahoo
            const hist = await this.prices.getHistory(h.ticker, period, h.currency);
            points = hist.map((d: any) => ({
              date: new Date(d.date).toISOString().split('T')[0],
              close: d.close,
            }));
          }

          const mult = h.currency === 'USD' ? usdVnd : 1;
          for (const pt of points) {
            dateValueMap[pt.date] = (dateValueMap[pt.date] ?? 0) + h.shares * pt.close * mult;
          }
        } catch {
          // skip holdings with no history
        }
      }),
    );

    if (Object.keys(dateValueMap).length === 0) return [];

    // Lấy savings accounts để tính theo từng ngày lịch sử
    const [savingsList, cashUsd] = await Promise.all([
      this.prisma.savingsAccount.findMany({
        where: { userId },
        include: { deposits: true },
      }).catch(() => []),
      this.binance.getStablecoinBalanceUSD().catch(() => 0),
    ]);
    const cashVnd = cashUsd * usdVnd;

    // Tính giá trị savings tại một ngày cụ thể (gốc + lãi tích lũy đến ngày đó)
    const savingsAtDate = (dateStr: string): number => {
      const targetDate = new Date(dateStr);
      let total = 0;
      for (const acc of savingsList) {
        const startDate = new Date(acc.startDate).toISOString().split('T')[0];
        if (startDate > dateStr) continue;

        const lots: { amount: number; from: Date }[] = [
          { amount: acc.amount, from: new Date(acc.startDate) },
          ...(acc.deposits ?? [])
            .filter((d: any) => new Date(d.depositedAt).toISOString().split('T')[0] <= dateStr)
            .map((d: any) => ({ amount: d.amount, from: new Date(d.depositedAt) })),
        ];

        if ((acc as any).savingsType === 'MOMO') {
          // Lãi kép hàng tháng
          const monthlyRate = (acc as any).interestRate / 100 / 12;
          for (const lot of lots) {
            const months = Math.max(0, (targetDate.getTime() - lot.from.getTime()) / (30.4375 * 86_400_000));
            total += lot.amount * Math.pow(1 + monthlyRate, months);
          }
        } else {
          // Lãi đơn ngân hàng
          const rate = (acc as any).interestRate / 100;
          const maturity = (acc as any).maturityDate ? new Date((acc as any).maturityDate) : null;
          for (const lot of lots) {
            const daysTotal = (targetDate.getTime() - lot.from.getTime()) / 86_400_000;
            const maxDays = maturity ? Math.min(daysTotal, (maturity.getTime() - lot.from.getTime()) / 86_400_000) : daysTotal;
            total += lot.amount + lot.amount * rate * (Math.max(0, maxDays) / 365);
          }
        }
      }
      return total;
    };

    // Historical points: không cộng cashVnd vì không biết số dư USDT từng ngày trong quá khứ
    // Chỉ cộng cashVnd vào điểm hôm nay (live) để khớp với grandTotal trên dashboard
    const sorted = Object.entries(dateValueMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        value: Math.round(value + savingsAtDate(date)),
      }));

    // Điểm hôm nay với giá live + cashVnd hiện tại
    const today = new Date().toISOString().split('T')[0];
    const lastDate = sorted[sorted.length - 1]?.date;
    if (lastDate && lastDate < today) {
      try {
        const withLive = await this.attachLivePrices(holdings);
        let liveValueVnd = 0;
        for (const h of withLive) {
          const price = h.livePrice ?? h.currentPrice ?? 0;
          if (price > 0) liveValueVnd += h.shares * price * (h.currency === 'USD' ? usdVnd : 1);
        }
        if (liveValueVnd > 0) {
          sorted.push({ date: today, value: Math.round(liveValueVnd + savingsAtDate(today) + cashVnd) });
        }
      } catch { /* skip */ }
    }

    return sorted;
  }

  // ── Gắn giá live từ Binance ──────────────────────────────
  private async attachLivePrices(holdings: any[]) {
    const cryptos = holdings.filter((h) => h.type === 'CRYPTO' && h.currency === 'USD');
    if (cryptos.length === 0) {
      return holdings.map((h) => ({ ...h, livePrice: h.currentPrice, priceChange24h: 0, priceChangePct24h: 0 }));
    }

    const symbols = cryptos.map((h) => `${h.ticker}USDT`);
    const prices = await this.binance.getPrices(symbols);

    const priceMap: Record<string, { price: number; change24h: number; changePercent24h: number }> = {};
    prices.forEach((p: any, i: number) => {
      if (p) priceMap[cryptos[i].ticker] = p;
    });

    for (const h of cryptos) {
      const live = priceMap[h.ticker];
      if (live && Math.abs(live.price - h.currentPrice) > 0.001) {
        this.prisma.holding.update({ where: { id: h.id }, data: { currentPrice: live.price } }).catch(() => {});
      }
    }

    return holdings.map((h) => {
      if (h.type === 'CRYPTO' && h.currency === 'USD' && priceMap[h.ticker]) {
        const live = priceMap[h.ticker];
        return { ...h, livePrice: live.price, priceChange24h: live.change24h, priceChangePct24h: live.changePercent24h, currentPrice: live.price };
      }
      return { ...h, livePrice: h.currentPrice, priceChange24h: 0, priceChangePct24h: 0 };
    });
  }

  private async assertOwner(userId: string, holdingId: string) {
    const h = await this.prisma.holding.findUnique({ where: { id: holdingId } });
    if (!h || h.userId !== userId) throw new NotFoundException('Không tìm thấy');
  }
}
