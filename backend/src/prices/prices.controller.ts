import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PricesService } from './prices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('prices')
export class PricesController {
  constructor(private prices: PricesService) {}

  @Get('quote/:ticker')
  getQuote(@Param('ticker') ticker: string, @Query('currency') currency = 'USD') {
    return this.prices.getQuote(ticker, currency);
  }

  @Get('quotes')
  getMultiple(@Query('tickers') tickers: string) {
    return this.prices.getMultipleQuotes(tickers.split(','));
  }

  @Get('history/:ticker')
  getHistory(
    @Param('ticker') ticker: string,
    @Query('period') period: '1mo' | '3mo' | '6mo' | '1y' = '6mo',
    @Query('currency') currency = 'USD',
  ) {
    return this.prices.getHistory(ticker, period, currency);
  }

  @Get('rsi/:ticker')
  getRSI(@Param('ticker') ticker: string, @Query('currency') currency = 'USD') {
    return this.prices.getRSI(ticker, 14, currency);
  }

  @Get('macd/:ticker')
  getMACD(@Param('ticker') ticker: string, @Query('currency') currency = 'USD') {
    return this.prices.getMACD(ticker, currency);
  }

  @Get('forex')
  async getForexRate() {
    return { rate: await this.prices.getForexRate() };
  }
}
