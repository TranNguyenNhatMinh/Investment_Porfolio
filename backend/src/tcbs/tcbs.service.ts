import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const BASE = 'https://apipubaws.tcbs.com.vn/stock-insight/v1';

@Injectable()
export class TcbsService {
  private readonly logger = new Logger(TcbsService.name);

  async getPrice(ticker: string) {
    try {
      const res = await axios.get(`${BASE}/stock/price`, {
        params: { ticker: ticker.toUpperCase() },
        timeout: 8000,
      });

      const d = res.data?.data?.[0] ?? res.data;
      if (!d) return null;

      // TCBS trả về giá theo đơn vị nghìn VND → nhân 1000
      const price = (d.p ?? d.closePrice ?? d.c ?? 0) * 1000;
      const change = (d.changePrice ?? d.priceChange ?? d.r ?? 0) * 1000;
      const pct = d.changePercent ?? d.percentChange ?? d.rateOfChange ?? 0;

      return {
        ticker: ticker.toUpperCase(),
        price,
        change,
        changePercent: pct,
        high: (d.highPrice ?? d.h ?? 0) * 1000,
        low: (d.lowPrice ?? d.l ?? 0) * 1000,
        volume: d.totalVolume ?? d.v ?? 0,
        currency: 'VND',
      };
    } catch (err: any) {
      this.logger.warn(`TCBS price failed for ${ticker}: ${err.message}`);
      return null;
    }
  }

  async getHistory(ticker: string, period: '1mo' | '3mo' | '6mo' | '1y' = '6mo') {
    try {
      const now = Math.floor(Date.now() / 1000);
      const daysMap: Record<string, number> = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };
      const from = now - (daysMap[period] ?? 180) * 86400;

      const res = await axios.get(`${BASE}/stock/bars-long-term`, {
        params: { ticker: ticker.toUpperCase(), type: 'stock', resolution: 'D', from, to: now },
        timeout: 10000,
      });

      const data: any[] = res.data?.data ?? res.data?.bars ?? [];

      return data.map((d: any) => ({
        date: new Date(d.tradingDate ?? d.date ?? d.t * 1000),
        open:   (d.priceOpen  ?? d.o ?? 0) * 1000,
        high:   (d.priceHigh  ?? d.h ?? 0) * 1000,
        low:    (d.priceLow   ?? d.l ?? 0) * 1000,
        close:  (d.priceClose ?? d.c ?? 0) * 1000,
        volume: d.totalVolume ?? d.v ?? 0,
      }));
    } catch (err: any) {
      this.logger.warn(`TCBS history failed for ${ticker}: ${err.message}`);
      return [];
    }
  }

  async getMultiplePrices(tickers: string[]) {
    return Promise.all(tickers.map((t) => this.getPrice(t)));
  }
}
