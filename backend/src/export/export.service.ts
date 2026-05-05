import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PortfolioService } from '../portfolio/portfolio.service';
import { SavingsService } from '../savings/savings.service';
import { BinanceService } from '../binance/binance.service';
import { PricesService } from '../prices/prices.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(
    private portfolio: PortfolioService,
    private savings: SavingsService,
    private binance: BinanceService,
    private prices: PricesService,
    private prisma: PrismaService,
  ) {}

  // ── Excel ─────────────────────────────────────────────────
  async generateExcel(userId: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Investment Portfolio';
    wb.created = new Date();

    const usdVnd = await this.prices.getForexRate();
    const [summary, holdings, savingsList, dcaData] = await Promise.all([
      this.portfolio.getSummary(userId),
      this.portfolio.getHoldings(userId),
      this.savings.getAll(userId),
      this.binance.getDcaSummary().catch(() => null),
    ]);

    const budgets = await this.prisma.monthlyBudget
      .findMany({ where: { userId }, orderBy: [{ year: 'asc' }, { month: 'asc' }] })
      .catch(() => []);

    // ── Format helpers ──
    // Định dạng VND kiểu Việt Nam: xx.xxx.xxx ₫
    const fmtVnd = (n: number) => {
      const rounded = Math.round(n);
      return rounded.toLocaleString('vi-VN') + ' ₫';
    };
    const fmtUsdToVnd = (usd: number) => fmtVnd(usd * usdVnd);

    // ── Style helpers ──
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        bottom: { style: 'thin', color: { argb: 'FF4F46E5' } },
      },
    };
    // Dùng string cell thay vì number cell để hiển thị đúng format VN
    const numFmt = '#,##0';
    const numFmtUsd = '$#,##0.00';

    const styleHeader = (row: ExcelJS.Row) => {
      row.height = 28;
      row.eachCell(cell => Object.assign(cell, headerStyle));
    };

    const addSheet = (name: string, cols: Partial<ExcelJS.Column>[]) => {
      const ws = wb.addWorksheet(name, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      ws.columns = cols;
      return ws;
    };

    // ═══ Sheet 1: Tổng quan ═══
    const ws1 = wb.addWorksheet('Tổng quan');
    ws1.columns = [
      { header: 'Hạng mục', key: 'label', width: 28 },
      { header: 'Giá trị (VNĐ)', key: 'vnd', width: 24 },
    ];
    styleHeader(ws1.getRow(1));

    const cashVnd = (summary.cashUsd ?? 0) * usdVnd;
    const rows1 = [
      { label: 'Crypto',       vnd: fmtVnd(summary.crypto?.value ?? 0) },
      { label: 'Cổ phiếu',    vnd: fmtVnd(summary.stocks?.value ?? 0) },
      { label: 'Tiết kiệm',   vnd: fmtVnd(summary.savingsVnd ?? 0) },
      { label: 'USDT',         vnd: fmtUsdToVnd(summary.cashUsd ?? 0) },
      { label: 'TỔNG TÀI SẢN',vnd: fmtVnd(summary.grandTotal ?? 0) },
    ];
    rows1.forEach((r, i) => {
      const row = ws1.addRow(r);
      row.getCell('vnd').alignment = { horizontal: 'right' };
      if (i === rows1.length - 1) {
        row.font = { bold: true, size: 12 };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0FF' } };
      }
    });
    ws1.addRow([]);
    ws1.addRow({ label: 'Tỷ giá USD/VND', vnd: fmtVnd(usdVnd) });
    ws1.addRow({ label: 'Ngày xuất',       vnd: new Date().toLocaleDateString('vi-VN') });

    // ═══ Sheet 2: Holdings ═══
    const ws2 = addSheet('Danh mục', [
      { header: 'Ticker', key: 'ticker', width: 12 },
      { header: 'Loại', key: 'type', width: 10 },
      { header: 'Số lượng', key: 'shares', width: 14 },
      { header: 'Giá mua TB', key: 'buyPrice', width: 16 },
      { header: 'Giá hiện tại', key: 'currentPrice', width: 16 },
      { header: 'Giá trị (₫)', key: 'valueVnd', width: 18 },
      { header: 'Lãi/Lỗ (₫)', key: 'pnlVnd', width: 18 },
      { header: 'P&L %', key: 'pnlPct', width: 10 },
    ]);
    styleHeader(ws2.getRow(1));

    for (const h of holdings) {
      const mult = h.currency === 'USD' ? usdVnd : 1;
      const valueVnd = h.shares * h.currentPrice * mult;
      const costVnd  = h.shares * h.buyPrice * mult;
      const pnlVnd   = valueVnd - costVnd;
      const pnlPct   = costVnd > 0 ? (pnlVnd / costVnd) * 100 : 0;
      const isUsd    = h.currency === 'USD';
      const row = ws2.addRow({
        ticker:       h.ticker,
        type:         h.type,
        shares:       h.shares,
        buyPrice:     isUsd ? `$${h.buyPrice.toLocaleString('en-US')}` : fmtVnd(h.buyPrice),
        currentPrice: isUsd ? `$${h.currentPrice.toLocaleString('en-US')}` : fmtVnd(h.currentPrice),
        valueVnd:     fmtVnd(valueVnd),
        pnlVnd:       fmtVnd(pnlVnd),
        pnlPct:       `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`,
      });
      ['buyPrice','currentPrice','valueVnd','pnlVnd'].forEach(k =>
        (row.getCell(k).alignment = { horizontal: 'right' })
      );
      const pnlColor = pnlVnd > 0 ? 'FF16A34A' : pnlVnd < 0 ? 'FFDC2626' : 'FF64748B';
      row.getCell('pnlVnd').font = { color: { argb: pnlColor } };
      row.getCell('pnlPct').font = { color: { argb: pnlColor } };
    }

    // ═══ Sheet 3: Tiết kiệm ═══
    const ws3 = addSheet('Tiết kiệm', [
      { header: 'Tên', key: 'name', width: 22 },
      { header: 'Loại', key: 'savingsType', width: 10 },
      { header: 'Vốn gốc (₫)', key: 'amount', width: 18 },
      { header: 'Lãi suất (%/năm)', key: 'interestRate', width: 18 },
      { header: 'Giá trị hiện tại (₫)', key: 'currentValue', width: 20 },
      { header: 'Lãi tích lũy (₫)', key: 'accruedInterest', width: 18 },
      { header: 'Ngày bắt đầu', key: 'startDate', width: 16 },
    ]);
    styleHeader(ws3.getRow(1));

    for (const s of savingsList) {
      const row = ws3.addRow({
        name:            s.name || s.savingsType,
        savingsType:     s.savingsType,
        amount:          fmtVnd(s.amount),
        interestRate:    `${s.interestRate}%/năm`,
        currentValue:    fmtVnd(Math.round(s.currentValue)),
        accruedInterest: fmtVnd(Math.round(s.accruedInterest)),
        startDate:       new Date(s.startDate).toLocaleDateString('vi-VN'),
      });
      ['amount','currentValue','accruedInterest'].forEach(k =>
        (row.getCell(k).alignment = { horizontal: 'right' })
      );
      row.getCell('accruedInterest').font = { color: { argb: 'FF16A34A' } };
    }

    // ═══ Sheet 4: DCA Crypto ═══
    if (dcaData?.coins?.length) {
      const ws4 = addSheet('DCA Crypto', [
        { header: 'Coin',              key: 'asset',        width: 10 },
        { header: 'Số lần mua',        key: 'executions',   width: 13 },
        { header: 'Đầu tư (VNĐ)',      key: 'invested',     width: 22 },
        { header: 'Số coin nhận',      key: 'coins',        width: 16 },
        { header: 'Giá TB mua (VNĐ)',  key: 'avgBuy',       width: 22 },
        { header: 'Giá hiện tại (VNĐ)',key: 'curPrice',     width: 22 },
        { header: 'P&L (VNĐ)',         key: 'pnl',          width: 22 },
        { header: 'ROI %',             key: 'roi',          width: 10 },
      ]);
      styleHeader(ws4.getRow(1));

      for (const c of dcaData.coins) {
        const pnlColor = c.pnlUsdt > 0 ? 'FF16A34A' : c.pnlUsdt < 0 ? 'FFDC2626' : 'FF64748B';
        const row = ws4.addRow({
          asset:      c.asset,
          executions: c.executions,
          invested:   fmtUsdToVnd(c.totalInvestedUsdt),
          coins:      c.coinsReceived,
          avgBuy:     fmtUsdToVnd(c.avgBuyPrice),
          curPrice:   fmtUsdToVnd(c.currentPrice),
          pnl:        fmtUsdToVnd(c.pnlUsdt),
          roi:        `${c.pnlPct >= 0 ? '+' : ''}${c.pnlPct}%`,
        });
        ['invested','avgBuy','curPrice','pnl'].forEach(k =>
          (row.getCell(k).alignment = { horizontal: 'right' })
        );
        ['pnl','roi'].forEach(k => row.getCell(k).font = { color: { argb: pnlColor } });
      }

      ws4.addRow([]);
      const sumRow = ws4.addRow({
        asset:    'TỔNG',
        invested: fmtUsdToVnd(dcaData.summary.totalInvestedUsdt),
        pnl:      fmtUsdToVnd(dcaData.summary.pnlUsdt),
        roi:      `${dcaData.summary.pnlPct >= 0 ? '+' : ''}${dcaData.summary.pnlPct}%`,
      });
      sumRow.font = { bold: true };
      sumRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0FF' } };
    }

    // ═══ Sheet 5: Đầu tư theo tháng ═══
    if (budgets.length) {
      const ws5 = addSheet('Theo tháng', [
        { header: 'Tháng', key: 'month', width: 12 },
        { header: 'Crypto (₫)', key: 'cryptoInvest', width: 16 },
        { header: 'Cổ phiếu (₫)', key: 'stockInvest', width: 16 },
        { header: 'Tổng (₫)', key: 'total', width: 16 },
      ]);
      styleHeader(ws5.getRow(1));

      for (const b of budgets) {
        const total = (b.cryptoInvest ?? 0) + (b.stockInvest ?? 0);
        const row = ws5.addRow({
          month: `T${b.month}/${String(b.year).slice(2)}`,
          cryptoInvest: b.cryptoInvest ?? 0,
          stockInvest: b.stockInvest ?? 0,
          total,
        });
        ['cryptoInvest', 'stockInvest', 'total'].forEach(k => row.getCell(k).numFmt = numFmt);
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
