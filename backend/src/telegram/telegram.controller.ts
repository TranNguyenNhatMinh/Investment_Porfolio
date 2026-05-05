import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Get('status')
  status() {
    return { configured: this.telegram.isConfigured };
  }

  @Post('test')
  test(@Body() body: { chatId?: string }) {
    return this.telegram.notifyTest(body.chatId);
  }
}
