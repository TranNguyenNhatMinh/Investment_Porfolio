import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SavingsService, AddDepositDto } from './savings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSavingsDto, UpdateSavingsDto } from './savings.dto';

@UseGuards(JwtAuthGuard)
@Controller('savings')
export class SavingsController {
  constructor(private savings: SavingsService) {}

  @Get()
  getAll(@Req() req: any) {
    return this.savings.getAll(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateSavingsDto) {
    return this.savings.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSavingsDto) {
    return this.savings.update(req.user.id, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.savings.delete(req.user.id, id);
  }

  @Post(':id/deposit')
  addDeposit(@Req() req: any, @Param('id') id: string, @Body() dto: AddDepositDto) {
    return this.savings.addDeposit(req.user.id, id, dto);
  }

  @Delete('deposit/:depositId')
  deleteDeposit(@Req() req: any, @Param('depositId') depositId: string) {
    return this.savings.deleteDeposit(req.user.id, depositId);
  }
}
