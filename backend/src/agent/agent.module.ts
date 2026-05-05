import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentGateway } from './agent.gateway';
import { BinanceModule } from '../binance/binance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({
  imports: [ScheduleModule.forRoot(), BinanceModule, PrismaModule, TelegramModule, PortfolioModule],
  controllers: [AgentController],
  providers: [AgentService, AgentGateway],
  exports: [AgentGateway],
})
export class AgentModule {}
