import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private agent: AgentService) {}

  @Get('config')
  getConfig(@Req() req: any) {
    return this.agent.getConfig(req.user.id);
  }

  @Post('config')
  upsertConfig(@Req() req: any, @Body() dto: any) {
    return this.agent.upsertConfig(req.user.id, dto);
  }

  @Get('logs')
  getLogs(@Req() req: any, @Query('limit') limit?: string) {
    return this.agent.getLogs(req.user.id, limit ? parseInt(limit) : 50);
  }

  @Post('run-now')
  async runNow(@Req() req: any) {
    const config = await this.agent.getConfig(req.user.id);
    if (!config) return { message: 'Chưa có cấu hình — hãy lưu cấu hình trước', triggered: 0, checked: 0 };
    const result = await this.agent.runForUserWithSummary(config);
    return result;
  }

  // Force trigger tất cả coins — chỉ để test dry run
  @Post('force-test')
  async forceTest(@Req() req: any) {
    return this.agent.forceTestRun(req.user.id);
  }

  @Get('test-permission')
  testPermission() {
    return this.agent.testTradePermission();
  }

  @Get('status')
  getStatus(@Req() req: any) {
    return this.agent.getStatus(req.user.id);
  }

  // Xóa log test (DRY_RUN) hoặc tất cả
  @Post('clear-logs')
  clearLogs(@Req() req: any, @Body() body: { type?: 'test' | 'all' }) {
    return this.agent.clearLogs(req.user.id, body.type ?? 'test');
  }
}
