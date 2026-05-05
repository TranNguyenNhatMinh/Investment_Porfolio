"use client";

import { useEffect, useState } from "react";
import { binance as binanceApi } from "@/lib/api";
import { ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp, DollarSign, Layers } from "lucide-react";

function fmtUsdt(n: number) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function fmtCoin(n: number) {
  if (n < 0.0001) return n.toFixed(8);
  if (n < 1)      return n.toFixed(6);
  return n.toFixed(4);
}

function PnlBadge({ pct, usdt }: { pct: number; usdt: number }) {
  const pos = pct >= 0;
  return (
    <div className="flex items-center gap-1.5">
      <span className="num text-sm font-bold" style={{ color: pos ? "var(--positive)" : "var(--negative)" }}>
        {pos ? "+" : ""}{fmtUsdt(usdt)}
      </span>
      <span className="inline-flex items-center gap-0.5 num text-[11px] font-bold px-1.5 py-0.5 rounded-md"
        style={{ background: pos ? "var(--positive-soft)" : "var(--negative-soft)", color: pos ? "var(--positive)" : "var(--negative)" }}>
        {pos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(pct).toFixed(2)}%
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-3.5 shimmer-skeleton rounded" style={{ width: `${45 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

const COIN_COLORS: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", BNB: "#f3ba2f", SOL: "#9945ff",
  XRP: "#00aae4", ADA: "#0033ad", LINK: "#2a5ada", DOT: "#e6007a",
  AVAX: "#e84142", MATIC: "#8247e5",
};

export default function DcaSummary() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await binanceApi.dcaSummary("2026-04-29");
      if (res?.error) { setError(res.error); return; }
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const coins: any[] = data?.coins ?? [];
  const summary = data?.summary;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,146,60,0.15)" }}>
            <Layers className="w-4.5 h-4.5" style={{ color: "#fb923c" }} />
          </div>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>DCA Định kỳ</h2>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {!loading && coins.length > 0 ? `${coins.length} coin · ${coins.reduce((s, c) => s + c.executions, 0)} lần mua` : "Binance AutoInvest"}
            </p>
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="p-1.5 rounded-xl transition-colors"
          style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary bar */}
      {!loading && summary && (
        <div className="grid grid-cols-3 gap-0" style={{ borderBottom: "1px solid var(--border)" }}>
          {[
            { label: "Tổng đầu tư", value: fmtUsdt(summary.totalInvestedUsdt), icon: <DollarSign className="w-3.5 h-3.5" />, color: "var(--text-primary)" },
            { label: "Giá trị hiện tại", value: fmtUsdt(summary.currentValueUsdt), icon: <TrendingUp className="w-3.5 h-3.5" />, color: "var(--text-primary)" },
            {
              label: "Lãi / Lỗ",
              value: `${summary.pnlUsdt >= 0 ? "+" : ""}${fmtUsdt(summary.pnlUsdt)} (${summary.pnlPct >= 0 ? "+" : ""}${summary.pnlPct}%)`,
              icon: summary.pnlPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />,
              color: summary.pnlPct >= 0 ? "var(--positive)" : "var(--negative)",
            },
          ].map((s, i) => (
            <div key={s.label} className="px-5 py-3" style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span style={{ color: "var(--text-muted)" }}>{s.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</span>
              </div>
              <span className="num text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-5 py-4 text-sm" style={{ color: "var(--negative)" }}>
          {error.includes("Invalid API") ? "⚠️ API key chưa có quyền — vào Binance → API Management → bật Unrestricted IP + Enable Reading" : error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <table className="w-full min-w-[600px]">
            <tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : coins.length === 0 && !error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Chưa có giao dịch DCA nào</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Tạo AutoInvest plan trên Binance để bắt đầu</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Coin", "Số lần mua", "Tổng đầu tư (USDT)", "Giá TB mua", "Giá hiện tại", "P&L"].map(h => (
                  <th key={h} className="py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coins.map(c => {
                const color = COIN_COLORS[c.asset] ?? "var(--accent)";
                return (
                  <tr key={c.asset}
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>

                    {/* Coin */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                          style={{ background: color }}>
                          {c.asset.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>{c.asset}</div>
                          <div className="num text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtCoin(c.coinsReceived)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Executions */}
                    <td className="py-3 px-3">
                      <span className="num text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>{c.executions} lần</span>
                    </td>

                    {/* Total invested */}
                    <td className="py-3 px-3">
                      <span className="num text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {fmtUsdt(c.totalInvestedUsdt)}
                      </span>
                    </td>

                    {/* Avg buy price */}
                    <td className="py-3 px-3">
                      <span className="num text-[12px]" style={{ color: "var(--text-muted)" }}>
                        ${c.avgBuyPrice.toLocaleString("en-US")}
                      </span>
                    </td>

                    {/* Current price */}
                    <td className="py-3 px-3">
                      <span className="num text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        ${c.currentPrice.toLocaleString("en-US")}
                      </span>
                    </td>

                    {/* P&L + failed warning */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <PnlBadge pct={c.pnlPct} usdt={c.pnlUsdt} />
                        {c.failedAttempts > 0 && (
                          <div className="text-[10px] font-semibold" style={{ color: "#fbbf24" }}>
                            ⚠️ {c.failedAttempts}/{c.totalAttempts} lần thất bại
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
