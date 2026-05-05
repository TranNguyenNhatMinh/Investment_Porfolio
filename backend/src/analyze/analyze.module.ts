import { Module } from '@nestjs/common';
import { AnalyzeService } from './analyze.service';
import { AnalyzeController } from './analyze.controller';
import { BinanceModule } from '../binance/binance.module';
import { PricesModule } from '../prices/prices.module';
import { SavingsModule } from '../savings/savings.module';

@Module({
  imports: [BinanceModule, PricesModule, SavingsModule],
  controllers: [AnalyzeController],
  providers: [AnalyzeService],
})
export class AnalyzeModule {}
