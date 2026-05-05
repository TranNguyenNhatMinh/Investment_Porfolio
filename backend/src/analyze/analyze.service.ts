import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';
import { PricesService } from '../prices/prices.service';
import { SavingsService } from '../savings/savings.service';

@Injectable()
export class AnalyzeService {
  private client: Anthropic;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private binance: BinanceService,
    private prices: PricesService,
    private savingsService: SavingsService,
  ) {
    this.client = new Anthropic({ apiKey: this.config.get('ANTHROPIC_API_KEY') });
  }

  async analyzePortfolio(userId: string, question?: string) {
    const holdings = await this.prisma.holding.findMany({ where: { userId } });
    const now = new Date();
    const budget = await this.prisma.monthlyBudget.findUnique({
      where: { userId_month_year: { userId, month: now.getMonth() + 1, year: now.getFullYear() } },
    });

    const [usdVnd, savingsAccounts] = await Promise.all([
      this.prices.getForexRate(),
      this.savingsService.getAll(userId),
    ]);

    // Fetch live prices
    const livePriceMap: Record<string, number> = {};
    await Promise.allSettled(
      holdings.map(async (h) => {
        try {
          if (h.type === 'CRYPTO' && h.currency === 'USD') {
            const p = await this.binance.getPrice(`${h.ticker}USDT`);
            livePriceMap[h.ticker] = p.price;
          } else {
            const q = await this.prices.getQuote(h.ticker, h.currency);
            if (q?.price) livePriceMap[h.ticker] = q.price;
          }
        } catch { /* fallback to DB price */ }
      }),
    );

    const portfolioContext = holdings.map((h) => {
      const livePrice = livePriceMap[h.ticker] ?? h.currentPrice;
      const mult = h.currency === 'USD' ? usdVnd : 1;
      const value = h.shares * livePrice * mult;
      const cost = h.shares * h.buyPrice * mult;
      const pnl = value - cost;
      const pct = cost > 0 ? ((pnl / cost) * 100).toFixed(2) : '0';
      return `- ${h.ticker} [${h.type}/${h.currency}]: ${h.shares} đơn vị, giá vốn ${h.buyPrice.toLocaleString()} → hiện ${livePrice.toLocaleString()}, P&L: ${pnl > 0 ? '+' : ''}${Math.round(pnl / 1000)}K VND (${pnl > 0 ? '+' : ''}${pct}%)`;
    }).join('\n');

    const savingsContext = savingsAccounts.length > 0
      ? savingsAccounts.map((a: any) => {
          const valueVnd = a.currency === 'USD' ? a.currentValue * usdVnd : a.currentValue;
          return `- ${a.bank} "${a.name}": ${(a.amount / 1_000_000).toFixed(1)}M ${a.currency}, lãi ${a.interestRate}%/năm, đáo hạn ${new Date(a.maturityDate).toLocaleDateString('vi-VN')}, giá trị hiện tại ≈ ${Math.round(valueVnd / 1_000_000).toFixed(1)}M VND`;
        }).join('\n')
      : 'Chưa có';

    const savingsTotalVnd = savingsAccounts.reduce((s: number, a: any) => {
      const mult = a.currency === 'USD' ? usdVnd : 1;
      return s + a.currentValue * mult;
    }, 0);

    const budgetContext = budget
      ? `Thu nhập: ${budget.income.toLocaleString()} VND | Cổ phiếu: ${budget.stockInvest.toLocaleString()} | Crypto: ${budget.cryptoInvest.toLocaleString()} | Chi tiêu: ${budget.spending.toLocaleString()} | Tỷ giá: ${Math.round(usdVnd).toLocaleString()} VND/USD`
      : 'Chưa có ngân sách';

    const userQuestion = question || 'Phân tích tổng quan danh mục, rủi ro và gợi ý cải thiện.';

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `Bạn là chuyên gia phân tích tài chính đầu tư tại Việt Nam. Phân tích ngắn gọn, thực tế, có số liệu cụ thể. Trả lời tiếng Việt, dùng markdown.`,
      messages: [{
        role: 'user',
        content: `**Danh mục đầu tư (giá live):**\n${portfolioContext || 'Chưa có holdings'}\n\n**Tiết kiệm (${(savingsTotalVnd / 1_000_000).toFixed(0)}M VND tổng):**\n${savingsContext}\n\n**Ngân sách:** ${budgetContext}\n\n**Câu hỏi:** ${userQuestion}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return { analysis: text, tokensUsed: message.usage.input_tokens + message.usage.output_tokens };
  }
}
