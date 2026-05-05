"use client";

import { useEffect, useState } from "react";
import { portfolio as portfolioApi, savings as savingsApi, binance as binanceApi, prices as pricesApi } from "@/lib/api";

function fmtVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN") + " ₫";
}
function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function ReportPage() {
  const [summary, setSummary]       = useState<any>(null);
  const [holdings, setHoldings]     = useState<any[]>([]);
  const [savingsList, setSavings]   = useState<any[]>([]);
  const [dcaData, setDca]           = useState<any>(null);
  const [usdVnd, setUsdVnd]         = useState(25_400);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      portfolioApi.summary(),
      portfolioApi.holdings(),
      savingsApi.list(),
      binanceApi.dcaSummary("2026-04-29").catch(() => null),
      pricesApi.forexRate().catch(() => ({ rate: 25_400 })),
    ]).then(([s, h, sv, dca, fx]) => {
      setSummary(s); setHoldings(h); setSavings(sv);
      setDca(dca); setUsdVnd(fx.rate);
    }).finally(() => setLoading(false));
  }, []);

  const date = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-gray-400">
      Đang tải dữ liệu...
    </div>
  );

  const cashVnd  = (summary?.cashUsd ?? 0) * usdVnd;
  const grandTotal = summary?.grandTotal ?? 0;

  return (
    <div className="report-page max-w-4xl mx-auto px-8 py-10 font-sans text-gray-900">
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        body { background: white; }
        .report-page { font-family: 'Arial', sans-serif; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th { background: #6366f1; color: white; padding: 8px 10px; text-align: left; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f9fafb; }
        .positive { color: #16a34a; font-weight: 600; }
        .negative { color: #dc2626; font-weight: 600; }
        .section-title { font-size: 15px; font-weight: 700; color: #1e293b;
          border-left: 4px solid #6366f1; padding-left: 10px; margin: 28px 0 12px; }
        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 8px; }
        .summary-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
        .summary-label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .summary-value { font-size: 20px; font-weight: 800; margin-top: 4px; color: #1e293b; }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-5" style={{ borderBottom: "2px solid #6366f1" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", margin: 0 }}>
            Báo cáo Danh mục Đầu tư
          </h1>
          <p style={{ color: "#64748b", marginTop: 4, fontSize: 13 }}>
            Tổng hợp tài sản — {date}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Tổng tài sản</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#6366f1" }}>{fmtVnd(grandTotal)}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Tỷ giá: {fmtVnd(usdVnd)}/USD</div>
        </div>
      </div>

      {/* Tổng quan */}
      <div className="summary-grid">
        {[
          { label: "Crypto", value: fmtVnd(summary?.crypto?.value ?? 0), color: "#f97316" },
          { label: "Cổ phiếu", value: fmtVnd(summary?.stocks?.value ?? 0), color: "#6366f1" },
          { label: "Tiết kiệm", value: fmtVnd(summary?.savingsVnd ?? 0), color: "#22c55e" },
          { label: "USDT", value: fmtVnd(cashVnd), color: "#14b8a6" },
        ].map(c => (
          <div key={c.label} className="summary-card">
            <div className="summary-label">{c.label}</div>
            <div className="summary-value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Holdings */}
      {holdings.length > 0 && (
        <>
          <div className="section-title">Danh mục nắm giữ</div>
          <table>
            <thead>
              <tr>
                <th>Ticker</th><th>Loại</th><th>Số lượng</th>
                <th style={{ textAlign: "right" }}>Giá mua TB</th>
                <th style={{ textAlign: "right" }}>Giá hiện tại</th>
                <th style={{ textAlign: "right" }}>Giá trị (₫)</th>
                <th style={{ textAlign: "right" }}>P&L</th>
                <th style={{ textAlign: "right" }}>%</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => {
                const mult    = h.currency === "USD" ? usdVnd : 1;
                const valVnd  = h.shares * h.currentPrice * mult;
                const costVnd = h.shares * h.buyPrice * mult;
                const pnl     = valVnd - costVnd;
                const pct     = costVnd > 0 ? (pnl / costVnd) * 100 : 0;
                const isUsd   = h.currency === "USD";
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 700 }}>{h.ticker}</td>
                    <td>{h.type}</td>
                    <td>{h.shares}</td>
                    <td style={{ textAlign: "right" }}>{isUsd ? fmtUsd(h.buyPrice) : fmtVnd(h.buyPrice)}</td>
                    <td style={{ textAlign: "right" }}>{isUsd ? fmtUsd(h.currentPrice) : fmtVnd(h.currentPrice)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(valVnd)}</td>
                    <td style={{ textAlign: "right" }} className={pnl >= 0 ? "positive" : "negative"}>{fmtVnd(pnl)}</td>
                    <td style={{ textAlign: "right" }} className={pct >= 0 ? "positive" : "negative"}>{fmtPct(pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* DCA */}
      {dcaData?.coins?.length > 0 && (
        <>
          <div className="section-title page-break">DCA Định kỳ (Binance AutoInvest)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Tổng đầu tư", val: fmtVnd(dcaData.summary.totalInvestedUsdt * usdVnd) },
              { label: "Giá trị hiện tại", val: fmtVnd(dcaData.summary.currentValueUsdt * usdVnd) },
              { label: "Lãi/Lỗ", val: fmtVnd(dcaData.summary.pnlUsdt * usdVnd) },
            ].map(s => (
              <div key={s.label} className="summary-card">
                <div className="summary-label">{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{s.val}</div>
              </div>
            ))}
          </div>
          <table>
            <thead>
              <tr>
                <th>Coin</th><th>Lần mua</th>
                <th style={{ textAlign: "right" }}>Đầu tư (₫)</th>
                <th style={{ textAlign: "right" }}>Giá TB mua (₫)</th>
                <th style={{ textAlign: "right" }}>Giá hiện tại (₫)</th>
                <th style={{ textAlign: "right" }}>P&L (₫)</th>
                <th style={{ textAlign: "right" }}>ROI</th>
              </tr>
            </thead>
            <tbody>
              {dcaData.coins.map((c: any) => (
                <tr key={c.asset}>
                  <td style={{ fontWeight: 700 }}>{c.asset}</td>
                  <td>{c.executions}</td>
                  <td style={{ textAlign: "right" }}>{fmtVnd(c.totalInvestedUsdt * usdVnd)}</td>
                  <td style={{ textAlign: "right" }}>{fmtVnd(c.avgBuyPrice * usdVnd)}</td>
                  <td style={{ textAlign: "right" }}>{fmtVnd(c.currentPrice * usdVnd)}</td>
                  <td style={{ textAlign: "right" }} className={c.pnlUsdt >= 0 ? "positive" : "negative"}>
                    {fmtVnd(c.pnlUsdt * usdVnd)}
                  </td>
                  <td style={{ textAlign: "right" }} className={c.pnlPct >= 0 ? "positive" : "negative"}>
                    {fmtPct(c.pnlPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Tiết kiệm */}
      {savingsList.length > 0 && (
        <>
          <div className="section-title">Tiết kiệm</div>
          <table>
            <thead>
              <tr>
                <th>Tên</th><th>Loại</th>
                <th style={{ textAlign: "right" }}>Vốn gốc (₫)</th>
                <th style={{ textAlign: "right" }}>Lãi suất</th>
                <th style={{ textAlign: "right" }}>Giá trị HT (₫)</th>
                <th style={{ textAlign: "right" }}>Lãi tích lũy (₫)</th>
                <th>Ngày bắt đầu</th>
              </tr>
            </thead>
            <tbody>
              {savingsList.map((s: any) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name || s.savingsType}</td>
                  <td>{s.savingsType}</td>
                  <td style={{ textAlign: "right" }}>{fmtVnd(s.amount)}</td>
                  <td style={{ textAlign: "right" }}>{s.interestRate}%/năm</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(Math.round(s.currentValue))}</td>
                  <td style={{ textAlign: "right" }} className="positive">{fmtVnd(Math.round(s.accruedInterest))}</td>
                  <td>{new Date(s.startDate).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #e5e7eb", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
        Investment Portfolio — Báo cáo ngày {date} — Dữ liệu chỉ mang tính tham khảo
      </div>

      {/* Print button */}
      <div className="no-print" style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={() => window.print()}
          style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          🖨 In / Lưu PDF
        </button>
        <button onClick={() => window.close()}
          style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Đóng
        </button>
      </div>
    </div>
  );
}
