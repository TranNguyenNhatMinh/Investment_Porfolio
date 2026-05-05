import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateHoldingDto, UpdateHoldingDto, UpsertBudgetDto } from './portfolio.dto';

@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private portfolio: PortfolioService) {}

  @Get('summary')
  summary(@Req() req: any) {
    return this.portfolio.getSummary(req.user.id);
  }

  @Get('holdings')
  getHoldings(@Req() req: any) {
    return this.portfolio.getHoldings(req.user.id);
  }

  @Post('holdings')
  createHolding(@Req() req: any, @Body() dto: CreateHoldingDto) {
    return this.portfolio.createHolding(req.user.id, dto);
  }

  @Patch('holdings/:id')
  updateHolding(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateHoldingDto) {
    return this.portfolio.updateHolding(req.user.id, id, dto);
  }

  @Delete('holdings/:id')
  deleteHolding(@Req() req: any, @Param('id') id: string) {
    return this.portfolio.deleteHolding(req.user.id, id);
  }

  @Get('history')
  getHistory(@Req() req: any, @Query('period') period: '1mo' | '3mo' | '6mo' | '1y' = '6mo') {
    return this.portfolio.getPortfolioHistory(req.user.id, period);
  }

  @Get('budgets')
  getBudgets(@Req() req: any) {
    return this.portfolio.getBudgets(req.user.id);
  }

  @Post('budgets')
  upsertBudget(@Req() req: any, @Body() dto: UpsertBudgetDto) {
    return this.portfolio.upsertBudget(req.user.id, dto);
  }
}
