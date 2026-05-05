import { Controller, Get, Post, Query, Param, UseGuards, Req } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('binance')
export class BinanceController {
  constructor(
    private binance: BinanceService,
    private prisma: PrismaService,
  ) {}

  // Giá realtime — không cần API key
  @Get('price/:symbol')
  getPrice(@Param('symbol') symbol: string) {
    return this.binance.getPrice(symbol.toUpperCase());
  }

  @Get('prices')
  getPrices(@Query('symbols') symbols: string) {
    return this.binance.getPrices(symbols.split(',').map((s) => s.trim().toUpperCase()));
  }

  @Get('klines/:symbol')
  getKlines(
    @Param('symbol') symbol: string,
    @Query('interval') interval: '1h' | '4h' | '1d' = '1d',
    @Query('limit') limit = '90',
  ) {
    return this.binance.getKlines(symbol.toUpperCase(), interval, parseInt(limit));
  }

  // Cần API key
  @Get('balance')
  getBalance() {
    return this.binance.getAccountBalance();
  }

  @Get('trades/:symbol')
  getTrades(@Param('symbol') symbol: string, @Query('limit') limit = '20') {
    return this.binance.getTradeHistory(symbol.toUpperCase(), parseInt(limit));
  }

  // Sync Binance balance → DB holdings
  @Post('sync')
  async sync(@Req() req: any) {
    try {
      return await this.binance.syncHoldingsFromBinance(req.user.id, this.prisma);
    } catch (e: any) {
      const msg = e?.response?.data?.msg ?? e?.message ?? 'Unknown sync error';
      return { error: msg, detail: e?.response?.data ?? null };
    }
  }

  @Get('earn/flexible')
  getFlexibleEarn() {
    return this.binance.getFlexibleEarn();
  }

  @Get('earn/dividends')
  getDividends(@Query('limit') limit = '50') {
    return this.binance.getDividends(parseInt(limit));
  }

  @Get('convert/history')
  getConvertHistory(@Query('limit') limit = '1000') {
    return this.binance.getConvertHistory(parseInt(limit));
  }

  @Get('autoinvest/plans')
  getAutoInvestPlans() {
    return this.binance.getAutoInvestPlans();
  }

  @Get('autoinvest/history')
  getAutoInvestHistory(
    @Query('planId') planId?: string,
    @Query('size') size = '100',
  ) {
    return this.binance.getAutoInvestHistory(planId ? parseInt(planId) : undefined, parseInt(size));
  }

  @Get('avgbuy/:symbol')
  getAvgBuyPrice(@Param('symbol') symbol: string) {
    return this.binance.getAvgBuyPrice(symbol.toUpperCase());
  }

  @Get('dca-avgprice/:asset')
  getDcaAvgPrice(@Param('asset') asset: string) {
    return this.binance.getDcaAvgPricePublic(asset.toUpperCase());
  }

  // Tổng hợp DCA: P&L + số tiền đầu tư chính xác từng coin
  @Get('dca-summary')
  getDcaSummary(@Query('startDate') startDate?: string) {
    return this.binance.getDcaSummary(startDate ? new Date(startDate) : undefined);
  }
}
