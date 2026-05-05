import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AnalyzeService } from './analyze.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsOptional, IsString } from 'class-validator';

class AnalyzeDto {
  @IsOptional()
  @IsString()
  question?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('analyze')
export class AnalyzeController {
  constructor(private analyzeService: AnalyzeService) {}

  @Post()
  run(@Req() req: any, @Body() dto: AnalyzeDto) {
    return this.analyzeService.analyzePortfolio(req.user.id, dto.question);
  }
}
