import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { BinanceModule } from '../binance/binance.module';
import { PricesModule } from '../prices/prices.module';
import { SavingsModule } from '../savings/savings.module';

@Module({
  imports: [BinanceModule, PricesModule, SavingsModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
