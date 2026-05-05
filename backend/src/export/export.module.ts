import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { SavingsModule } from '../savings/savings.module';
import { BinanceModule } from '../binance/binance.module';
import { PricesModule } from '../prices/prices.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PortfolioModule, SavingsModule, BinanceModule, PricesModule, PrismaModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
