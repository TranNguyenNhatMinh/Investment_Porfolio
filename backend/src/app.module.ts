import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PricesModule } from './prices/prices.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { WebsocketModule } from './websocket/websocket.module';
import { BinanceModule } from './binance/binance.module';
import { TcbsModule } from './tcbs/tcbs.module';
import { SavingsModule } from './savings/savings.module';
import { ExportModule } from './export/export.module';
import { AgentModule } from './agent/agent.module';
import { DsipModule } from './dsip/dsip.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PortfolioModule,
    PricesModule,
    AnalyzeModule,
    WebsocketModule,
    BinanceModule,
    TcbsModule,
    SavingsModule,
    ExportModule,
    AgentModule,
    DsipModule,
    TelegramModule,
  ],
})
export class AppModule {}
