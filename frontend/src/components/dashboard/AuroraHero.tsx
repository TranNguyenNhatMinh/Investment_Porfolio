"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { portfolio as portfolioApi } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import Link from "next/link";

/* ── Formatters ─────────────────────────────────────── */
function fmtBig(n: number, inUsd: boolean, rate: number) {
  const v = inUsd ? n / rate : n;
  if (inUsd) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return Math.round(v).toLocaleString("vi-VN");
}
function fmtShort(n: number, inUsd: boolean, rate: number) {
  const v = inUsd ? n / rate : n;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (inUsd) {
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(2)}`;
  }
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}tỷ`;
  if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}
function fmtAxis(v: number, inUsd: boolean, rate: number) {
  const val = inUsd ? v / rate : v;
  if (inUsd) return `$${val >= 1000 ? (val / 1000).toFixed(1) + "K" : val.toFixed(1)}`;
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
  if (Math.abs(val) >= 1_000)     return `${Math.round(val / 1_000)}K`;
  return `${Math.round(val)}`;
}

interface Props { summary: any; usdVnd: number; loading: boolean; holdings: any[]; }

export default function AuroraHero({ summary, usdVnd, loading }: Props) {
  const [history, setHistory]       = useState<{ date: string; value: number }[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [inUsd, setInUsd]           = useState(false);
  const [isDark, setIsDark]         = useState(true);

  /* detect theme */
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  /* load chart — only stable recent period */
  useEffect(() => {
    if (loading) return;
    setLoadingChart(true);
    portfolioApi.history("1mo")
      .then((d: any[]) => {
        if (!d.length) { setHistory([]); return; }
        const maxVal = Math.max(...d.map((x: any) => x.value));
        // Bỏ giai đoạn "ramp up" — chỉ lấy từ khi đạt 80% max trở đi
        const stableStart = d.findIndex((x: any) => x.value >= maxVal * 0.80);
        const slice = stableStart >= 0 ? d.slice(stableStart) : d.slice(-10);
        setHistory(slice.map((x: any) => ({
          raw: x.value,
          date: new Date(x.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "numeric" }),
          value: x.value,
        })));
      })
      .catch(() => setHistory([]))
      .finally(() => setLoadingChart(false));
  }, [loading]);

  /* derived values */
  const { total, crypto, cashUsd = 0, savingsVnd = 0, savingsInterest = 0, dsipCurrentValue = 0, dsipPnl = 0, grandTotal } = summary ?? {};
  const rate     = summary?.usdVnd ?? usdVnd;
  const cashVnd  = cashUsd * rate;
  const totalVal = grandTotal ?? (total?.value ?? 0) + dsipCurrentValue + savingsVnd + cashVnd;

  /* daily change vs yesterday — so sánh investment only (không gồm cash)
     vì historical points không có cashVnd (không biết số dư USDT từng ngày) */
  const investmentVal = totalVal - cashVnd;
  const yesterdayVal  = history.length >= 2 ? history[history.length - 2].value : null;
  const dailyPnl      = yesterdayVal != null ? investmentVal - yesterdayVal : null;
  const dailyPct      = yesterdayVal != null && yesterdayVal > 0 ? (dailyPnl! / yesterdayVal) * 100 : null;
  const isUp          = (dailyPnl ?? 0) >= 0;

  /* chart — cộng cashVnd vào mọi điểm lịch sử để hiện tổng tài sản
     (USDT coi như hằng số — đủ chính xác cho visualization) */
  const chartHistory = history.map(d => ({ ...d, value: d.value + cashVnd }));

  /* chart domain */
  const chartVals = chartHistory.map(d => d.value);
  const lo = Math.min(...(chartVals.length ? chartVals : [0]));
  const hi = Math.max(...(chartVals.length ? chartVals : [1]));
  const rng = hi - lo || hi * 0.01;
  const pad = rng * 0.6;
  const yDomain: [number, number] = [lo - pad, hi + pad];

  /* breakdown items — grandTotal = crypto(livePrice) + dsip(NAV) + savings(gốc+lãi) + usdt */
  const breakdown = [
    { label: "CRYPTO",      val: crypto?.value    ?? 0, pnl: crypto?.pnl,                                 color: "#a78bfa", href: "/crypto"  },
    { label: "CHỨNG KHOÁN", val: dsipCurrentValue,       pnl: dsipPnl !== 0 ? dsipPnl : null,              color: "#60a5fa", href: "/stocks"  },
    { label: "TIẾT KIỆM",   val: savingsVnd,              pnl: savingsInterest > 0 ? savingsInterest:null,  color: "#34d399", href: "/savings" },
    { label: "USDT",         val: cashVnd,                pnl: null,                                         color: "#22d3ee", href: "/crypto"  },
  ];

  const accent = isUp ? "#22c55e" : "#ef4444";
  const accentSoft = isUp ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
  const accentBorder = isUp ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
  // gridColor unused — chart uses default recharts grid
  const tickColor = isDark ? "rgba(255,255,255,0.25)" : "#94a3b8";
  const cardBg   = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const divColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div className="relative overflow-hidden rounded-2xl"
      style={{
        background: isDark
          ? "linear-gradient(145deg,#08091f 0%,#0d1235 50%,#070912 100%)"
          : "linear-gradient(145deg,#f8faff 0%,#eef2ff 50%,#f1f5f9 100%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
        boxShadow: isDark ? "0 4px 40px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.08)",
      }}>

      {/* Glow */}
      {isDark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div style={{ position:"absolute", top:-80, left:-60, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)" }} />
          <div style={{ position:"absolute", bottom:-60, right:40, width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle,rgba(6,182,212,0.08) 0%,transparent 70%)" }} />
        </div>
      )}

      <div className="relative px-8 pt-8 pb-6">

        {/* ── Toggle + Date ── */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-[11px] font-semibold tracking-widest uppercase"
            style={{ color: isDark ? "rgba(255,255,255,0.28)" : "#94a3b8" }}>
            Tổng tài sản
          </span>
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" }}>
            {(["VND","USD"] as const).map(cur => (
              <button key={cur} onClick={() => setInUsd(cur === "USD")}
                className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={(!inUsd && cur==="VND") || (inUsd && cur==="USD")
                  ? { background: isDark ? "rgba(255,255,255,0.14)" : "#fff", color: isDark ? "#fff" : "#1e293b", boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }
                  : { color: isDark ? "rgba(255,255,255,0.30)" : "#94a3b8" }}>
                {cur}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main number ── */}
        <div className="mb-3">
          {loading ? (
            <div className="h-16 w-56 shimmer-skeleton rounded-xl" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold" style={{ fontSize:"1.5rem", color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8" }}>
                {inUsd ? "$" : ""}
              </span>
              <span className="num font-black tabular-nums"
                style={{ fontSize:"clamp(2.8rem,6vw,4.5rem)", letterSpacing:"-0.04em", lineHeight:1, color: isDark ? "rgba(255,255,255,0.96)" : "#0f172a" }}>
                {fmtBig(totalVal, inUsd, rate)}
              </span>
              {!inUsd && (
                <span className="font-semibold" style={{ fontSize:"1.5rem", color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8" }}>₫</span>
              )}
            </div>
          )}
        </div>

        {/* ── Daily P&L ── */}
        <div className="flex items-center gap-2.5 mb-7" style={{ minHeight: 28 }}>
          {!loading && (
            loadingChart || dailyPnl === null ? (
              <div className="h-7 w-44 shimmer-skeleton rounded-full" />
            ) : (
              <>
                <span className="inline-flex items-center gap-1 num text-xs font-bold px-2.5 py-1.5 rounded-full"
                  style={{ background: accentSoft, color: accent, border: `1px solid ${accentBorder}` }}>
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(dailyPct!).toFixed(2)}%
                </span>
                <span className="num text-sm font-bold" style={{ color: accent }}>
                  {isUp ? "+" : ""}{fmtShort(dailyPnl!, inUsd, rate)}{!inUsd && " ₫"}
                </span>
                <span className="text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.28)" : "#94a3b8" }}>
                  so với hôm qua
                </span>
              </>
            )
          )}
        </div>

        {/* ── Breakdown ── */}
        {!loading && (
          <div className="grid grid-cols-4 mb-7 rounded-xl overflow-hidden"
            style={{ border: `1px solid ${divColor}`, background: cardBg }}>
            {breakdown.map((b, i) => (
              <Link key={b.label} href={b.href}>
                <div className="flex flex-col items-center py-4 px-2 transition-all hover:opacity-75 h-full"
                  style={{ borderRight: i < 3 ? `1px solid ${divColor}` : undefined }}>
                  <span className="text-[10px] font-bold tracking-[0.16em] mb-2"
                    style={{ color: isDark ? "rgba(255,255,255,0.30)" : "#94a3b8" }}>{b.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="num font-bold" style={{ fontSize:"1.15rem", color: b.color, letterSpacing:"-0.02em" }}>
                      {fmtShort(b.val, inUsd, rate)}
                    </span>
                    {!inUsd && (
                      <span className="text-[11px] font-semibold" style={{ color: b.color, opacity: 0.6 }}>₫</span>
                    )}
                  </div>
                  {b.pnl != null && (
                    <span className="num text-[11px] mt-1 font-semibold"
                      style={{ color: b.pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                      {b.pnl >= 0 ? "+" : ""}{fmtShort(b.pnl, inUsd, rate)}{!inUsd && " ₫"}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Chart ── */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.7)", border: `1px solid ${divColor}` }}>
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: tickColor }} />
              <span className="text-[11px] font-semibold" style={{ color: tickColor }}>Biến động tổng tài sản</span>
            </div>
            <span className="num text-[11px] font-bold" style={{ color: isDark ? "rgba(255,255,255,0.55)" : "#475569" }}>
              {chartHistory.length > 0 ? fmtShort(chartHistory[chartHistory.length-1]?.value ?? 0, inUsd, rate) + (inUsd ? "" : " ₫") : "—"}
            </span>
          </div>

          {loadingChart || loading ? (
            <div className="h-[140px] mx-4 mb-3 shimmer-skeleton rounded-xl" />
          ) : history.length < 2 ? (
            <div className="h-[140px] flex items-center justify-center">
              <span className="text-sm" style={{ color: tickColor }}>Chưa có dữ liệu</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartHistory} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={accent} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  domain={yDomain}
                  tickFormatter={v => fmtAxis(v, inUsd, rate)}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  axisLine={false} tickLine={false} width={54}
                />
                <Tooltip
                  contentStyle={{ background: isDark ? "#0d1235" : "#fff", border: `1px solid ${divColor}`, borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: tickColor, marginBottom: 4 }}
                  itemStyle={{ color: isDark ? "rgba(255,255,255,0.9)" : "#0f172a", fontFamily: "var(--font-geist-mono)" }}
                  formatter={(v: any) => [
                    `${fmtShort(v, inUsd, rate)}${inUsd ? "" : " ₫"}`,
                    "Tổng tài sản"
                  ]}
                  labelFormatter={l => `Ngày ${l}`}
                />
                <ReferenceLine y={chartHistory[0]?.value} stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"} strokeDasharray="4 3" />
                <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2}
                  fill="url(#heroGrad)" dot={false}
                  activeDot={{ r: 4, fill: accent, stroke: isDark ? "#0d1235" : "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
