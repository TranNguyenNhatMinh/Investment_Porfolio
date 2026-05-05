import { Module } from '@nestjs/common';
import { TcbsService } from './tcbs.service';

@Module({
  providers: [TcbsService],
  exports: [TcbsService],
})
export class TcbsModule {}
