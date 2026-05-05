"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { binance as binanceApi, portfolio as portfolioApi } from "@/lib/api";
import {
  ArrowUpRight, ArrowDownRight, RefreshCw,
  TrendingUp, DollarSign,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────
function fmtVnd(n: number) {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1_000_000_000) return `${s}${(a / 1_000_000_000).toFixed(2)}tỷ`;
  if (a >= 1_000_000)     return `${s}${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)         return `${s}${Math.round(a / 1_000)}K`;
  return `${s}${Math.round(a)}`;
}
function fmtUsd(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(ts: number, limit: number) {
  const d = new Date(ts);
  if (limit <= 7)  return d.toLocaleDateString("vi-VN", { day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "numeric" });
}

// ── Coin brand colors ─────────────────────────────────────────
const COIN_COLOR: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", BNB: "#f3ba2f",
  SOL: "#9945ff", LINK: "#2a5ada", ADA: "#0033ad",
  DOT: "#e6007a", AVAX: "#e84142", MATIC: "#8247e5",
  XRP: "#00aae4", DOGE: "#c2a633", LTC: "#bfbbbb",
};
function coinColor(ticker: string) {
  return COIN_COLOR[ticker.toUpperCase()] ?? "#6366f1";
}

const PERIODS = [
  { label: "7N",  days: 7,  interval: "1h"  as const, limit: 168 },
  { label: "30N", days: 30, interval: "1d"  as const, limit: 30  },
  { label: "90N", days: 90, interval: "1d"  as const, limit: 90  },
];

// ── Main ──────────────────────────────────────────────────────
export default function CryptoDashboard() {
  const [holdings,     setHoldings]     = useState<any[]>([]);
  const [cashUsd,      setCashUsd]      = useState(0);
  const [usdVnd,       setUsdVnd]       = useState(25_400);
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState(false);
  const [chartData,    setChartData]    = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [periodIdx,    setPeriodIdx]    = useState(1);
  const [isDark,       setIsDark]       = useState(true);
  const chartAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const loadHoldings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [h, summary] = await Promise.all([
        portfolioApi.holdings(),
        portfolioApi.summary(),
      ]);
      const crypto = h.filter((x: any) => x.type === "CRYPTO");
      setHoldings(crypto);
      setCashUsd(summary.cashUsd ?? 0);
      setUsdVnd(summary.usdVnd ?? 25_400);
    } finally { setLoading(false); }
  };

  const loadChart = async (crypto: any[], rate: number, idx: number) => {
    if (!crypto.length) return;
    chartAbort.current?.abort();
    chartAbort.current = new AbortController();
    setChartLoading(true);
    const { interval, limit } = PERIODS[idx];
    try {
      const klinesPerCoin = await Promise.all(
        crypto.map(h =>
          binanceApi.klines(`${h.ticker}USDT`, interval, limit)
            .then((kl: any[]) => ({ shares: h.shares, klines: kl }))
            .catch(() => null)
        )
      );
      // Merge by timestamp: sum shares_i * close_i * usdVnd
      const timeMap: Record<number, number> = {};
      for (const item of klinesPerCoin) {
        if (!item) continue;
        for (const k of item.klines) {
          timeMap[k.time] = (timeMap[k.time] ?? 0) + item.shares * k.close * rate;
        }
      }
      const sorted = Object.entries(timeMap)
        .map(([t, v]) => ({ time: Number(t), value: Math.round(v) }))
        .sort((a, b) => a.time - b.time);
      setChartData(sorted);
    } catch { /* aborted */ }
    finally { setChartLoading(false); }
  };

  useEffect(() => {
    loadHoldings();
  }, []);

  useEffect(() => {
    if (holdings.length && usdVnd) loadChart(holdings, usdVnd, periodIdx);
  }, [holdings.map(h => h.ticker).join(","), usdVnd, periodIdx]); // eslint-disable-line

  const sync = async () => {
    setSyncing(true);
    await binanceApi.sync().catch(() => {});
    await loadHoldings(true);
    setSyncing(false);
  };

  // ── KPIs ──────────────────────────────────────────────────
  const totalValue = holdings.reduce((s, h) => s + h.shares * (h.livePrice ?? h.currentPrice) * usdVnd, 0);
  const totalCost  = holdings.reduce((s, h) => s + h.shares * h.buyPrice * usdVnd, 0);
  const pnl        = totalValue - totalCost;
  const pct        = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const cashVnd    = cashUsd * usdVnd;
  const totalWithCash = totalValue + cashVnd;

  const pos = pnl >= 0;
  const accentColor = isDark ? "#a78bfa" : "#7c3aed";
  const gridColor   = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
  const tickColor   = isDark ? "rgba(255,255,255,0.28)" : "#94a3b8";

  // Chart Y domain
  const vals     = chartData.map(d => d.value);
  const lo       = Math.min(...vals);
  const hi       = Math.max(...vals);
  const pad      = (hi - lo) > 0 ? (hi - lo) * 0.35 : hi * 0.01;
  const yDomain: [number | string, number | string] = vals.length ? [lo - pad, hi + pad] : ["auto", "auto"];

  const limit = PERIODS[periodIdx].limit;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="ml-56 flex flex-col min-h-screen">

        {/* ── Topbar ── */}
        <header className="sticky top-0 z-20 backdrop-blur-xl px-6 py-3"
          style={{ background: isDark ? "rgba(7,9,18,0.88)" : "rgba(241,245,249,0.92)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Crypto Dashboard</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Binance · {holdings.length} coin đang nắm giữ</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: "var(--positive-soft)", color: "var(--positive)", border: "1px solid rgba(34,197,94,0.20)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                LIVE
              </div>
              <button onClick={sync} disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50"
                style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.22)" }}>
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync Binance"}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 space-y-4">

          {/* ── Hero row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Big total card */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-2xl"
              style={{ background: isDark ? "linear-gradient(135deg,#1e1333 0%,#0f172a 100%)" : "linear-gradient(135deg,#ede9fe 0%,#f1f5f9 100%)", border: "1px solid rgba(139,92,246,0.22)" }}>
              {/* Glow orbs */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full"
                  style={{ background: "radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 65%)", transform: "translate(35%,-35%)" }} />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full"
                  style={{ background: "radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 65%)", transform: "translate(-30%,30%)" }} />
              </div>

              <div className="relative flex flex-col h-full">
                {/* Top section: label + big number + P&L */}
                <div className="p-7 pb-5 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
                    style={{ color: isDark ? "rgba(167,139,250,0.6)" : "#7c3aed" }}>
                    Tổng tài sản crypto
                  </p>
                  {loading ? (
                    <div className="space-y-3">
                      <div className="h-14 w-52 shimmer-skeleton rounded-xl" />
                      <div className="h-6 w-36 shimmer-skeleton rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <p className="num font-black leading-none mb-3"
                        style={{ fontSize: "clamp(2.8rem,5vw,4rem)", color: isDark ? "#f3e8ff" : "#3b0764", letterSpacing: "-0.04em" }}>
                        {fmtVnd(totalWithCash)}
                        <span className="ml-2 font-semibold" style={{ fontSize: "1.4rem", opacity: 0.4 }}>₫</span>
                      </p>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1 num text-[12px] font-bold px-2.5 py-1 rounded-full"
                          style={{
                            background: pos ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            color: pos ? "#4ade80" : "#f87171",
                            border: `1px solid ${pos ? "rgba(74,222,128,0.20)" : "rgba(248,113,113,0.20)"}`,
                          }}>
                          {pos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {Math.abs(pct).toFixed(2)}%
                        </span>
                        <span className="num text-[13px] font-semibold" style={{ color: pos ? "#4ade80" : "#f87171" }}>
                          {pos ? "+" : ""}{fmtVnd(pnl)} ₫
                        </span>
                        <span className="text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.25)" : "#94a3b8" }}>
                          so với giá vốn
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom section: 3 stats trải đều */}
                <div className="grid grid-cols-3" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
                  {[
                    { label: "Giá vốn",  val: loading ? "—" : fmtVnd(totalCost) + " ₫",  color: isDark ? "rgba(255,255,255,0.55)" : "#475569" },
                    { label: "Holdings", val: loading ? "—" : fmtVnd(totalValue) + " ₫", color: isDark ? "#c4b5fd" : "#7c3aed" },
                    { label: "USDT",     val: loading ? "—" : fmtUsd(cashUsd),            color: isDark ? "#67e8f9" : "#0891b2" },
                  ].map((s, i) => (
                    <div key={s.label} className="py-4 px-7"
                      style={{ borderRight: i < 2 ? "1px solid rgba(139,92,246,0.12)" : "none" }}>
                      <p className="text-[10px] font-semibold mb-1"
                        style={{ color: isDark ? "rgba(255,255,255,0.28)" : "#94a3b8" }}>{s.label}</p>
                      <p className="num text-[15px] font-bold" style={{ color: s.color }}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stat cards — stacked vertically on the right */}
            <div className="flex flex-col gap-4">
              {[
                {
                  label: "Crypto holdings",
                  value: loading ? "—" : fmtVnd(totalValue) + " ₫",
                  sub:   loading ? "" : fmtUsd(totalValue / usdVnd),
                  icon: TrendingUp, color: "#a78bfa",
                },
                {
                  label: "USDT dự phòng",
                  value: loading ? "—" : fmtUsd(cashUsd),
                  sub:   loading ? "" : `≈ ${fmtVnd(cashVnd)} ₫`,
                  icon: DollarSign, color: "#22d3ee",
                },
              ].map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="flex-1 rounded-2xl p-5 flex flex-col justify-between"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em]"
                        style={{ color: "var(--text-muted)" }}>{c.label}</p>
                      <div className="p-1.5 rounded-lg" style={{ background: `${c.color}18` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                      </div>
                    </div>
                    {loading ? (
                      <div className="h-6 w-28 shimmer-skeleton rounded-lg" />
                    ) : (
                      <>
                        <p className="num text-xl font-bold leading-tight" style={{ color: c.color }}>{c.value}</p>
                        <p className="num text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{c.sub}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Market ticker — coin nắm giữ ── */}
          {!loading && holdings.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="px-5 pt-4 pb-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>
                  Giá thị trường · {holdings.length} coin
                </p>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: `repeat(${holdings.length}, 1fr)` }}>
                {holdings
                  .slice()
                  .sort((a, b) => (b.shares * (b.livePrice ?? b.currentPrice)) - (a.shares * (a.livePrice ?? a.currentPrice)))
                  .map((h, i) => {
                    const lp  = h.livePrice ?? h.currentPrice;
                    const chg = h.priceChangePct24h ?? 0;
                    const clr = coinColor(h.ticker);
                    const up  = chg >= 0;
                    return (
                      <div key={h.id} className="flex flex-col items-center py-4 px-3 gap-1"
                        style={{ borderRight: i < holdings.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black mb-1"
                          style={{ background: `${clr}20`, color: clr }}>
                          {h.ticker.slice(0, 3)}
                        </div>
                        <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{h.ticker}</p>
                        <p className="num text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>
                          {lp >= 1000 ? `$${(lp / 1000).toFixed(2)}K` : fmtUsd(lp)}
                        </p>
                        <span className="num text-[11px] font-bold inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full"
                          style={{
                            background: up ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                            color: up ? "#4ade80" : "#f87171",
                          }}>
                          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(chg).toFixed(2)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Chart + Holdings ── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Line chart */}
            <div className="xl:col-span-3 rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Hiệu suất danh mục</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Giá trị crypto theo thời gian (VND)</p>
                </div>
                <div className="flex gap-1">
                  {PERIODS.map((p, i) => (
                    <button key={p.label} onClick={() => setPeriodIdx(i)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                      style={periodIdx === i
                        ? { background: "rgba(139,92,246,0.20)", color: accentColor, border: "1px solid rgba(139,92,246,0.30)" }
                        : { color: "var(--text-muted)", border: "1px solid transparent" }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                {chartLoading || loading ? (
                  <div className="h-[220px] shimmer-skeleton rounded-xl" />
                ) : chartData.length < 2 ? (
                  <div className="h-[220px] flex items-center justify-center">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Chưa đủ dữ liệu</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="cryptoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={accentColor} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={gridColor} />
                      <XAxis dataKey="time" type="number" scale="time" domain={["dataMin","dataMax"]}
                        tickFormatter={v => fmtDate(v, limit)}
                        tick={{ fill: tickColor, fontSize: 10 }}
                        axisLine={false} tickLine={false}
                        interval="preserveStartEnd" />
                      <YAxis
                        tickFormatter={v => fmtVnd(v)}
                        tick={{ fill: tickColor, fontSize: 10 }}
                        axisLine={false} tickLine={false}
                        domain={yDomain} width={52} />
                      <Tooltip
                        contentStyle={{ background: isDark ? "#0d1117" : "#fff", border: `1px solid var(--border)`, borderRadius: 10, fontSize: 12 }}
                        labelStyle={{ color: tickColor, marginBottom: 4 }}
                        itemStyle={{ color: isDark ? "rgba(255,255,255,0.85)" : "#0f172a", fontFamily: "var(--font-geist-mono)" }}
                        labelFormatter={v => new Date(v).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric", hour: limit <= 7 ? "2-digit" : undefined, minute: limit <= 7 ? "2-digit" : undefined })}
                        formatter={(v: any) => [`${fmtVnd(v)} ₫`, "Giá trị"]}
                      />
                      <Area type="monotone" dataKey="value"
                        stroke={accentColor} strokeWidth={2}
                        fill="url(#cryptoGrad)" dot={false}
                        activeDot={{ r: 4, fill: accentColor, stroke: isDark ? "#0d1117" : "#fff", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Holdings mini list */}
            <div className="xl:col-span-2 rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Coin nắm giữ</p>
              </div>
              <div className="divide-y" style={{ "--tw-divide-opacity": 1 } as any}>
                {loading ? (
                  <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 shimmer-skeleton rounded-xl" />)}</div>
                ) : holdings.length === 0 ? (
                  <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Chưa có dữ liệu</div>
                ) : (
                  holdings
                    .slice()
                    .sort((a, b) => (b.shares * (b.livePrice ?? b.currentPrice)) - (a.shares * (a.livePrice ?? a.currentPrice)))
                    .map(h => {
                      const lp   = h.livePrice ?? h.currentPrice;
                      const val  = h.shares * lp * usdVnd;
                      const pct2 = h.buyPrice > 0 ? ((lp - h.buyPrice) / h.buyPrice) * 100 : 0;
                      const clr  = coinColor(h.ticker);
                      const alloc = totalValue > 0 ? (val / totalValue) * 100 : 0;
                      return (
                        <div key={h.id} className="flex items-center gap-3 px-5 py-3.5"
                          style={{ borderBottom: "1px solid var(--border)" }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
                            style={{ background: `${clr}22`, color: clr }}>
                            {h.ticker.slice(0, 3)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>{h.ticker}</p>
                              <p className="num font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>{fmtVnd(val)} ₫</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="num text-[11px]" style={{ color: "var(--text-muted)" }}>
                                {h.shares.toFixed(5)} · {fmtUsd(lp)}
                              </p>
                              <span className="num text-[11px] font-bold"
                                style={{ color: pct2 >= 0 ? "#4ade80" : "#f87171" }}>
                                {pct2 >= 0 ? "+" : ""}{pct2.toFixed(2)}%
                              </span>
                            </div>
                            {/* Allocation bar */}
                            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: `${clr}18` }}>
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(alloc, 100)}%`, background: clr }} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          {/* ── Full holdings table ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Chi tiết danh mục</p>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 shimmer-skeleton rounded-xl" />)}</div>
            ) : holdings.length === 0 ? (
              <div className="p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                Chưa có coin. Nhấn Sync Binance để tải về.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Coin", "Số lượng", "Giá vốn TB", "Giá hiện tại", "Thay đổi 24h", "Giá trị (₫)", "P&L (₫)", "% Lãi/Lỗ"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings
                      .slice()
                      .sort((a, b) => (b.shares * (b.livePrice ?? b.currentPrice)) - (a.shares * (a.livePrice ?? a.currentPrice)))
                      .map(h => {
                        const lp    = h.livePrice ?? h.currentPrice;
                        const val   = h.shares * lp * usdVnd;
                        const cost  = h.shares * h.buyPrice * usdVnd;
                        const pnlH  = val - cost;
                        const pctH  = h.buyPrice > 0 ? ((lp - h.buyPrice) / h.buyPrice) * 100 : 0;
                        const chg24 = h.priceChangePct24h ?? 0;
                        const clr   = coinColor(h.ticker);
                        return (
                          <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
                                  style={{ background: `${clr}22`, color: clr }}>
                                  {h.ticker.slice(0, 3)}
                                </div>
                                <div>
                                  <p className="font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>{h.ticker}</p>
                                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{h.name ?? h.ticker}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 num font-semibold text-[12px]" style={{ color: "var(--text-secondary)" }}>
                              {h.shares.toFixed(6)}
                            </td>
                            <td className="px-5 py-3.5 num text-[12px]" style={{ color: "var(--text-muted)" }}>
                              {fmtUsd(h.buyPrice)}
                            </td>
                            <td className="px-5 py-3.5 num font-semibold text-[12px]" style={{ color: "var(--text-primary)" }}>
                              {fmtUsd(lp)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="num text-[11px] font-bold inline-flex items-center gap-0.5"
                                style={{ color: chg24 >= 0 ? "#4ade80" : "#f87171" }}>
                                {chg24 >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {Math.abs(chg24).toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-5 py-3.5 num font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>
                              {fmtVnd(val)} ₫
                            </td>
                            <td className="px-5 py-3.5 num font-bold text-[13px]"
                              style={{ color: pnlH >= 0 ? "#4ade80" : "#f87171" }}>
                              {pnlH >= 0 ? "+" : ""}{fmtVnd(pnlH)} ₫
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="num text-[11px] font-bold px-2.5 py-1 rounded-lg"
                                style={{
                                  background: pctH >= 0 ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                                  color: pctH >= 0 ? "#4ade80" : "#f87171",
                                }}>
                                {pctH >= 0 ? "+" : ""}{pctH.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>

        <footer className="px-6 py-3 text-center text-[10px]"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
          Dữ liệu từ Binance · Chỉ mang tính tham khảo, không phải tư vấn tài chính.
        </footer>
      </div>
    </div>
  );
}
