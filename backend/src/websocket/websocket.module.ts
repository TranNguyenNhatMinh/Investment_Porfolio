import { Module } from '@nestjs/common';
import { PricesGateway } from './prices.gateway';
import { PricesModule } from '../prices/prices.module';

@Module({
  imports: [PricesModule],
  providers: [PricesGateway],
})
export class WebsocketModule {}
