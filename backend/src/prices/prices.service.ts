import { Injectable, Logger } from '@nestjs/common';
import { TcbsService } from '../tcbs/tcbs.service';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require('yahoo-finance2').default;

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private forexCache: { rate: number; ts: number } | null = null;

  constructor(private tcbs: TcbsService) {}

  async getForexRate(): Promise<number> {
    if (this.forexCache && Date.now() - this.forexCache.ts < 3_600_000) {
      return this.forexCache.rate;
    }

    const sources = [
      async () => {
        const r = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
        const rate = r.data?.rates?.VND;
        if (!rate || rate < 20_000) throw new Error('invalid rate');
        return rate as number;
      },
      async () => {
        const r = await axios.get('https://api.fawazahmed0.com/v1/currencies/usd.json', { timeout: 5000 });
        const rate = r.data?.usd?.vnd;
        if (!rate || rate < 20_000) throw new Error('invalid rate');
        return rate as number;
      },
      async () => {
        const r = await axios.get('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', { timeout: 5000 });
        const rate = r.data?.usd?.vnd;
        if (!rate || rate < 20_000) throw new Error('invalid rate');
        return rate as number;
      },
    ];

    for (const source of sources) {
      try {
        const rate = await source();
        this.forexCache = { rate, ts: Date.now() };
        return rate;
      } catch { /* thử nguồn tiếp theo */ }
    }

    // Tất cả nguồn đều lỗi — dùng cache cũ nếu có
    if (this.forexCache) {
      this.logger.warn(`Forex: all sources failed, using stale cache (${this.forexCache.rate})`);
      return this.forexCache.rate;
    }

    this.logger.error('Forex: all sources failed and no cache available');
    return 25_400;
  }

  // Tự động phát hiện VN stock (currency=VND) → dùng TCBS, còn lại dùng Yahoo
  async getQuote(ticker: string, currency = 'USD') {
    if (currency === 'VND') {
      return this.tcbs.getPrice(ticker);
    }
    try {
      const result: any = await yahooFinance.quote(ticker);
      return {
        ticker,
        price: result.regularMarketPrice,
        change: result.regularMarketChange,
        changePercent: result.regularMarketChangePercent,
        high: result.regularMarketDayHigh,
        low: result.regularMarketDayLow,
        volume: result.regularMarketVolume,
        name: result.shortName,
        currency: result.currency,
      };
    } catch (err: any) {
      this.logger.warn(`Yahoo quote failed for ${ticker}: ${err.message}`);
      return null;
    }
  }

  async getMultipleQuotes(tickers: string[]) {
    const results = await Promise.allSettled(tickers.map((t) => this.getQuote(t)));
    return results
      .map((r, i) => (r.status === 'fulfilled' ? r.value : { ticker: tickers[i], error: true }))
      .filter(Boolean);
  }

  // Lấy lịch sử giá — tự route theo currency
  async getHistory(ticker: string, period: '1mo' | '3mo' | '6mo' | '1y' = '6mo', currency = 'USD') {
    if (currency === 'VND') {
      return this.tcbs.getHistory(ticker, period);
    }
    try {
      const result: any[] = await yahooFinance.historical(ticker, {
        period1: this.periodToDate(period),
      });
      return result.map((d: any) => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
    } catch (err: any) {
      this.logger.warn(`Yahoo history failed for ${ticker}: ${err.message}`);
      return [];
    }
  }

  async getRSI(ticker: string, period = 14, currency = 'USD') {
    const history = await this.getHistory(ticker, '3mo', currency);
    if (history.length < period + 1) return null;

    const closes = history.map((d) => d.close as number);
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      avgGain += diff > 0 ? diff : 0;
      avgLoss += diff < 0 ? -diff : 0;
    }
    avgGain /= period;
    avgLoss /= period;

    const rsiPoints: { date: any; rsi: number }[] = [];
    for (let i = period; i < closes.length; i++) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsiPoints.push({ date: history[i].date, rsi: Math.round(100 - 100 / (1 + rs)) });
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    }

    return rsiPoints.slice(-20);
  }

  async getMACD(ticker: string, currency = 'USD') {
    const history = await this.getHistory(ticker, '6mo', currency);
    if (history.length < 35) return null;

    const closes = history.map((d) => d.close as number);
    const ema12 = this.calcEMA(closes, 12);
    const ema26 = this.calcEMA(closes, 26);
    const macdRaw = closes.map((_, i) => (i >= 25 ? ema12[i] - ema26[i] : 0));
    const macdSlice = macdRaw.slice(25);
    const signalSlice = this.calcEMA(macdSlice, 9);

    return history.slice(-20).map((d, i) => {
      const idx = history.length - 20 + i;
      const m = macdRaw[idx];
      const sIdx = idx - 25;
      const s = sIdx >= 0 ? (signalSlice[sIdx] ?? 0) : 0;
      return {
        date: d.date,
        macd: Math.round(m * 100) / 100,
        signal: Math.round(s * 100) / 100,
        hist: Math.round((m - s) * 100) / 100,
      };
    });
  }

  private calcEMA(data: number[], period: number): number[] {
    if (data.length < period) return new Array(data.length).fill(0);
    const k = 2 / (period + 1);
    const ema: number[] = new Array(data.length).fill(0);
    ema[period - 1] = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
    for (let i = period; i < data.length; i++) {
      ema[i] = data[i] * k + ema[i - 1] * (1 - k);
    }
    return ema;
  }

  private periodToDate(period: string): Date {
    const d = new Date();
    const map: Record<string, number> = { '1mo': 1, '3mo': 3, '6mo': 6, '1y': 12 };
    d.setMonth(d.getMonth() - (map[period] ?? 6));
    return d;
  }
}
