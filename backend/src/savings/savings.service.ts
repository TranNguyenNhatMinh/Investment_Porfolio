import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsDto, UpdateSavingsDto } from './savings.dto';

export class AddDepositDto {
  @IsNumber() @Min(0) amount: number;
  @IsDateString() @IsOptional() depositedAt?: string;
  @IsString() @IsOptional() note?: string;
}

@Injectable()
export class SavingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(userId: string) {
    const accounts = await this.prisma.savingsAccount.findMany({
      where: { userId },
      include: { deposits: { orderBy: { depositedAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    return accounts.map((a) => this.enrich(a));
  }

  async create(userId: string, dto: CreateSavingsDto) {
    const account = await this.prisma.savingsAccount.create({
      data: {
        savingsType: dto.savingsType ?? 'BANK',
        bank: dto.bank,
        name: dto.name,
        amount: dto.amount,
        currency: dto.currency ?? 'VND',
        interestRate: dto.interestRate,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : null,
        isRolling: dto.isRolling ?? false,
        note: dto.note,
        userId,
      },
      include: { deposits: true },
    });
    return this.enrich(account);
  }

  async update(userId: string, id: string, dto: UpdateSavingsDto) {
    await this.assertOwner(userId, id);
    const data: any = { ...dto };
    if (dto.startDate)    data.startDate    = new Date(dto.startDate);
    if (dto.maturityDate) data.maturityDate  = new Date(dto.maturityDate);
    const account = await this.prisma.savingsAccount.update({
      where: { id }, data,
      include: { deposits: { orderBy: { depositedAt: 'asc' } } },
    });
    return this.enrich(account);
  }

  async delete(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.savingsAccount.delete({ where: { id } });
    return { message: 'Đã xoá' };
  }

  // Nạp thêm tiền vào tài khoản Momo
  async addDeposit(userId: string, accountId: string, dto: AddDepositDto) {
    await this.assertOwner(userId, accountId);
    await this.prisma.savingsDeposit.create({
      data: {
        savingsAccountId: accountId,
        amount: dto.amount,
        depositedAt: dto.depositedAt ? new Date(dto.depositedAt) : new Date(),
        note: dto.note,
      },
    });
    const account = await this.prisma.savingsAccount.findUnique({
      where: { id: accountId },
      include: { deposits: { orderBy: { depositedAt: 'asc' } } },
    });
    return this.enrich(account!);
  }

  // Xoá một lần nạp
  async deleteDeposit(userId: string, depositId: string) {
    const deposit = await this.prisma.savingsDeposit.findUnique({
      where: { id: depositId },
      include: { savingsAccount: true },
    });
    if (!deposit || deposit.savingsAccount.userId !== userId) {
      throw new NotFoundException('Không tìm thấy');
    }
    await this.prisma.savingsDeposit.delete({ where: { id: depositId } });
    return { message: 'Đã xoá' };
  }

  async getTotalValueVnd(userId: string, usdVnd = 25_400): Promise<number> {
    const accounts = await this.getAll(userId);
    return accounts.reduce((sum, a) => {
      const mult = a.currency === 'USD' ? usdVnd : 1;
      return sum + a.currentValue * mult;
    }, 0);
  }

  async getSummaryVnd(userId: string, usdVnd = 25_400): Promise<{ principal: number; interest: number; total: number }> {
    const accounts = await this.getAll(userId);
    let principal = 0, interest = 0;
    for (const a of accounts) {
      const mult = a.currency === 'USD' ? usdVnd : 1;
      principal += a.totalPrincipal * mult;
      interest  += a.accruedInterest * mult;
    }
    return { principal, interest, total: principal + interest };
  }

  private enrich(account: any) {
    const now = new Date();
    const isMomo = account.savingsType === 'MOMO';

    if (isMomo) {
      const monthlyRate = account.interestRate / 100 / 12;

      // Gốc ban đầu: tính lãi kép từ startDate
      const allLots: { amount: number; from: Date }[] = [
        { amount: account.amount, from: new Date(account.startDate) },
        ...(account.deposits ?? []).map((d: any) => ({
          amount: d.amount,
          from: new Date(d.depositedAt),
        })),
      ];

      // Tổng giá trị hiện tại = Σ P_i × (1 + r/12)^n_i
      const currentValue = allLots.reduce((total, lot) => {
        const months = Math.max(0, (now.getTime() - lot.from.getTime()) / (30.4375 * 86_400_000));
        return total + lot.amount * Math.pow(1 + monthlyRate, months);
      }, 0);

      const totalPrincipal = allLots.reduce((s, l) => s + l.amount, 0);
      const accruedInterest = currentValue - totalPrincipal;

      // Ước tính lãi 1 năm (tính từ hôm nay)
      const yearlyValue = totalPrincipal * Math.pow(1 + monthlyRate, 12);
      const yearlyInterest = yearlyValue - totalPrincipal;

      const monthsElapsed = (now.getTime() - new Date(account.startDate).getTime()) / (30.4375 * 86_400_000);

      return {
        ...account,
        currentValue,
        totalPrincipal,
        accruedInterest,
        totalInterest: yearlyInterest,
        progressPct: null,
        daysLeft: null,
        isMatured: false,
        termDays: null,
        monthsElapsed: Math.round(monthsElapsed * 10) / 10,
        deposits: account.deposits ?? [],
      };
    }

    // BANK — lãi đơn (không track deposits)
    const start    = new Date(account.startDate);
    const maturity = account.maturityDate ? new Date(account.maturityDate) : null;
    const termDays = maturity ? Math.max(1, (maturity.getTime() - start.getTime()) / 86_400_000) : null;
    const elapsed  = (now.getTime() - start.getTime()) / 86_400_000;
    const capped   = termDays ? Math.min(elapsed, termDays) : elapsed;

    const totalInterest   = termDays ? account.amount * (account.interestRate / 100) * (termDays / 365) : 0;
    const accruedInterest = account.amount * (account.interestRate / 100) * (capped / 365);
    const currentValue    = account.amount + accruedInterest;
    const progressPct     = termDays ? (elapsed / termDays) * 100 : 0;
    const daysLeft        = maturity ? Math.max(0, Math.ceil((maturity.getTime() - now.getTime()) / 86_400_000)) : null;
    const isMatured       = maturity ? now >= maturity : false;

    return {
      ...account,
      currentValue,
      totalPrincipal: account.amount,
      totalInterest,
      accruedInterest,
      progressPct,
      daysLeft,
      isMatured,
      termDays: termDays ? Math.round(termDays) : null,
      deposits: [],
    };
  }

  private async assertOwner(userId: string, id: string) {
    const a = await this.prisma.savingsAccount.findUnique({ where: { id } });
    if (!a || a.userId !== userId) throw new NotFoundException('Không tìm thấy');
  }
}
