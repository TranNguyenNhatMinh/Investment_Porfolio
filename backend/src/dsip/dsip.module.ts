import { Module } from '@nestjs/common';
import { DsipController } from './dsip.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DsipController],
})
export class DsipModule {}
