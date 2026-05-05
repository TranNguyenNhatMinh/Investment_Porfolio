import { Controller, Get, Res, UseGuards, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('excel')
  async downloadExcel(@Req() req: any, @Res() res: Response) {
    const buffer = await this.exportService.generateExcel(req.user.id);
    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="portfolio_${date}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('pdf')
  async downloadPdf(@Req() req: any, @Res() res: Response) {
    // Puppeteer chụp trang report — trả về URL để frontend mở
    // Implement sau khi có /report page
    res.json({ message: 'PDF export coming soon' });
  }
}
