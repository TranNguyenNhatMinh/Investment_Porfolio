import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('dsip')
export class DsipController {
  constructor(private prisma: PrismaService) {}

  @Get('plans')
  getPlans(@Req() req: any) {
    return this.prisma.dsipPlan.findMany({
      where: { userId: req.user.id },
      include: { records: { orderBy: { investedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('plans')
  createPlan(@Req() req: any, @Body() body: any) {
    return this.prisma.dsipPlan.create({
      data: {
        userId: req.user.id,
        name: body.name,
        funds: body.funds,
        monthlyAmount: body.monthlyAmount,
        scheduleDay: body.scheduleDay,
        startDate: new Date(body.startDate),
        sourceAccount: body.sourceAccount,
      },
    });
  }

  @Patch('plans/:id')
  updatePlan(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.prisma.dsipPlan.update({
      where: { id, userId: req.user.id },
      data: {
        ...(body.name           !== undefined && { name: body.name }),
        ...(body.funds          !== undefined && { funds: body.funds }),
        ...(body.monthlyAmount  !== undefined && { monthlyAmount: body.monthlyAmount }),
        ...(body.scheduleDay    !== undefined && { scheduleDay: body.scheduleDay }),
        ...(body.startDate      !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.sourceAccount  !== undefined && { sourceAccount: body.sourceAccount }),
        ...(body.isActive       !== undefined && { isActive: body.isActive }),
      },
    });
  }

  @Delete('plans/:id')
  deletePlan(@Req() req: any, @Param('id') id: string) {
    return this.prisma.dsipPlan.delete({ where: { id, userId: req.user.id } });
  }

  @Post('plans/:id/records')
  addRecord(@Param('id') id: string, @Body() body: any) {
    return this.prisma.dsipRecord.create({
      data: {
        planId: id,
        investedAt: new Date(body.investedAt),
        totalInvested: body.totalInvested,
        fundData: body.fundData,
        notes: body.notes,
      },
    });
  }

  @Delete('records/:id')
  deleteRecord(@Param('id') id: string) {
    return this.prisma.dsipRecord.delete({ where: { id } });
  }
}
