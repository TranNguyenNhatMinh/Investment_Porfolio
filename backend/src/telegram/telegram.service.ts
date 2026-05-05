import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token:  string | null;
  private readonly chatId: string | null;

  constructor(private config: ConfigService) {
    this.token  = this.config.get<string>('TELEGRAM_BOT_TOKEN') ?? null;
    this.chatId = this.config.get<string>('TELEGRAM_CHAT_ID')   ?? null;
  }

  get isConfigured(): boolean {
    return !!(this.token && this.chatId);
  }

  async send(text: string): Promise<boolean> {
    if (!this.isConfigured) return false;
    try {
      await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        { chat_id: this.chatId, text, parse_mode: 'HTML' },
        { timeout: 8000 },
      );
      return true;
    } catch (err: any) {
      this.logger.warn(`Telegram send failed: ${err?.message}`);
      return false;
    }
  }

  // ── Message builders ─────────────────────────────────────
  async notifyDipBuy(opts: {
    coin:         string;
    amountUsdt:   number;
    qty:          string;
    avgPrice:     number;
    changePercent: number;
    dailySpent:   number;
    dailyLimit:   number;
    isDryRun:     boolean;
  }) {
    const { coin, amountUsdt, qty, avgPrice, changePercent, dailySpent, dailyLimit, isDryRun } = opts;
    const fmtMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtPct   = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

    if (isDryRun) {
      return this.send(
        `🧪 <b>DIP AGENT — DRY RUN</b>\n\n` +
        `Phát hiện cơ hội mua (không thực hiện)\n` +
        `📉 <b>${coin}</b> thay đổi ${fmtPct(changePercent)}\n` +
        `📊 Sẽ mua: <b>$${fmtMoney(amountUsdt)}</b>\n` +
        `⏰ ${new Date().toLocaleString('vi-VN')}`,
      );
    }

    return this.send(
      `🤖 <b>DIP AGENT — ĐÃ MUA</b>\n\n` +
      `✅ <b>${coin}</b> thay đổi ${fmtPct(changePercent)}\n` +
      `💵 Đã mua: <b>${qty} ${coin}</b> ($${fmtMoney(amountUsdt)})\n` +
      `💲 Giá thực thi: $${fmtMoney(avgPrice)}\n` +
      `📊 Hôm nay: $${fmtMoney(dailySpent)} / $${fmtMoney(dailyLimit)}\n` +
      `⏰ ${new Date().toLocaleString('vi-VN')}`,
    );
  }

  async notifyAgentError(coin: string, error: string) {
    return this.send(
      `⚠️ <b>DIP AGENT — LỖI</b>\n\n` +
      `Coin: <b>${coin}</b>\n` +
      `Lỗi: <code>${error}</code>\n` +
      `⏰ ${new Date().toLocaleString('vi-VN')}`,
    );
  }

  async notifyTest(chatId?: string) {
    const target = chatId ?? this.chatId;
    if (!this.token || !target) return { ok: false, error: 'Chưa cấu hình token/chat_id' };
    try {
      await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          chat_id: target,
          text: `✅ <b>Investment Portfolio</b>\n\nKết nối Telegram thành công!\n⏰ ${new Date().toLocaleString('vi-VN')}`,
          parse_mode: 'HTML',
        },
        { timeout: 8000 },
      );
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.response?.data?.description ?? err?.message };
    }
  }
}
