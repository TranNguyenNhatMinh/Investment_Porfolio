"use client";

import { ArrowUpRight, ArrowDownRight, PiggyBank, Landmark, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";

function fmt(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} tỷ`;
  if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)         return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}

function HeroCard({ totalVal, pnl, pnlPct }: { totalVal: number; pnl: number; pnlPct: number }) {
  const pos = pnl >= 0;
  return (
    <div className="overflow-hidden rounded-2xl relative hero-card">
        <style>{`
          .hero-card {
            background: linear-gradient(135deg,#0c1425 0%,#111e35 50%,#0c1a2e 100%);
            box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.07);
          }
          .hero-card .hero-label { color: rgba(255,255,255,0.32); }
          .hero-card .hero-value { color: rgba(255,255,255,0.95); }
          .hero-card .hero-unit  { color: rgba(255,255,255,0.28); }
          .hero-card .hero-sub   { color: rgba(255,255,255,0.25); }
          [data-theme="light"] .hero-card {
            background: linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 50%, #f5f3ff 100%);
            box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 24px rgba(99,102,241,0.08);
            border: 1px solid rgba(99,102,241,0.12);
          }
          [data-theme="light"] .hero-card .hero-label { color: #94a3b8; }
          [data-theme="light"] .hero-card .hero-value { color: #0f172a; }
          [data-theme="light"] .hero-card .hero-unit  { color: #94a3b8; }
          [data-theme="light"] .hero-card .hero-sub   { color: #94a3b8; }
        `}</style>

        {/* Glow blobs — dark only */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div style={{position:"absolute",top:-60,left:-40,width:240,height:240,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 65%)"}} />
          <div style={{position:"absolute",bottom:-40,right:60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(6,182,212,0.10) 0%,transparent 65%)"}} />
        </div>

        <div className="relative px-8 py-8 flex flex-col items-center text-center">
          <p className="hero-label text-[11px] font-bold uppercase tracking-[0.22em] mb-4">Tổng tài sản</p>

          {/* Big green number */}
          <div className="flex items-baseline gap-2 mb-5">
            <span className="num font-bold" style={{ fontSize: "3.8rem", letterSpacing: "-0.03em", lineHeight: 1, color: "#059669" }}>
              {fmt(totalVal)}
            </span>
            <span className="text-2xl font-semibold" style={{ color: "#059669", opacity: 0.7 }}>₫</span>
          </div>

          {/* Divider */}
          <div className="w-16 h-px mb-5 rounded-full" style={{ background: "rgba(5,150,105,0.4)" }} />

          {/* P&L */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 num text-sm font-bold px-3 py-1.5 rounded-xl"
              style={{
                background: pos ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                color: pos ? "#22c55e" : "#ef4444",
                border: `1px solid ${pos ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}>
              {pos ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(pnlPct).toFixed(2)}%
            </span>
            <span className="num text-base font-semibold" style={{ color: pos ? "#22c55e" : "#ef4444" }}>
              {pos ? "+" : ""}{fmt(pnl)} ₫
            </span>
            <span className="hero-sub text-xs">lãi / lỗ đầu tư</span>
          </div>
        </div>
      </div>
  );
}

interface Props { summary: any; usdVnd: number; loading: boolean; }

export default function OverviewCards({ summary, usdVnd, loading }: Props) {

  if (loading) return (
    <div className="space-y-3">
      <div className="card p-6 h-24 shimmer-skeleton" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-28 shimmer-skeleton" />)}
      </div>
    </div>
  );

  if (!summary) return null;

  const { total, stocks, crypto, budget, cashUsd = 0, savingsVnd = 0, grandTotal } = summary;
  const liveRate = summary.usdVnd ?? usdVnd;
  const cashVnd  = cashUsd * liveRate;
  const totalVal = grandTotal ?? (total?.value ?? 0) + savingsVnd + cashVnd;

  // Budget
  const income      = budget?.income ?? 0;
  const investRate  = income ? Math.round(((budget?.stockInvest + budget?.cryptoInvest) / income) * 100) : 0;
  const saving      = Math.max(0, income - (budget?.stockInvest ?? 0) - (budget?.cryptoInvest ?? 0) - (budget?.spending ?? 0));

  const cards = [
    {
      key: "crypto", href: "/holdings",
      label: "Crypto",
      icon: <PiggyBank className="w-4 h-4" />,
      color: "#fb923c", bg: "rgba(251,146,60,0.12)", bar: "linear-gradient(90deg,#f97316,#fb923c)",
      value: fmt(crypto?.value ?? 0) + " ₫",
      pnl:    crypto?.pnl   ?? 0,
      pnlPct: crypto?.pct   ?? 0,
      sub: `Vốn ${fmt(crypto?.cost ?? 0)} ₫`,
    },
    {
      key: "stocks", href: "/holdings",
      label: "Cổ phiếu",
      icon: <TrendingUp className="w-4 h-4" />,
      color: "#60a5fa", bg: "rgba(59,130,246,0.12)", bar: "linear-gradient(90deg,#3b82f6,#60a5fa)",
      value: fmt(stocks?.value ?? 0) + " ₫",
      pnl:    stocks?.pnl   ?? 0,
      pnlPct: stocks?.pct   ?? 0,
      sub: `Vốn ${fmt(stocks?.cost ?? 0)} ₫`,
    },
    {
      key: "savings", href: "/savings",
      label: "Tiết kiệm",
      icon: <Landmark className="w-4 h-4" />,
      color: "#a5b4fc", bg: "rgba(99,102,241,0.12)", bar: "linear-gradient(90deg,#8b5cf6,#a5b4fc)",
      value: fmt(savingsVnd) + " ₫",
      pnl: null, pnlPct: null,
      sub: "Gốc + lãi tích lũy",
    },
    {
      key: "usdt", href: "/savings",
      label: "USDT",
      icon: <DollarSign className="w-4 h-4" />,
      color: "#2dd4bf", bg: "rgba(20,184,166,0.12)", bar: "linear-gradient(90deg,#14b8a6,#2dd4bf)",
      value: `$${cashUsd.toFixed(2)}`,
      pnl: null, pnlPct: null,
      sub: `≈ ${fmt(cashVnd)} ₫ · Chờ đầu tư`,
    },
  ];

  return (
    <div className="space-y-3">

      {/* ── HERO ── */}
      <HeroCard totalVal={totalVal} pnl={total?.pnl ?? 0} pnlPct={total?.pct ?? 0} />

      {/* ── 4 sub-cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <Link key={c.key} href={c.href}>
            <div className="card overflow-hidden hover:-translate-y-0.5 transition-transform duration-200 h-full">
              <div style={{ height: 3, background: c.bar }} />
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-muted)" }}>{c.label}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: c.bg }}>
                    <span style={{ color: c.color }}>{c.icon}</span>
                  </div>
                </div>

                {/* Value */}
                <div className="num text-[1.45rem] font-bold leading-none mb-2.5"
                  style={{ color: "var(--text-primary)" }}>
                  {c.value}
                </div>

                {/* P&L */}
                {c.pnlPct !== null ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-0.5 num text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: (c.pnlPct ?? 0) >= 0 ? "var(--positive-soft)" : "var(--negative-soft)",
                        color: (c.pnlPct ?? 0) >= 0 ? "var(--positive)" : "var(--negative)",
                      }}>
                      {(c.pnlPct ?? 0) >= 0
                        ? <ArrowUpRight className="w-2.5 h-2.5" />
                        : <ArrowDownRight className="w-2.5 h-2.5" />}
                      {Math.abs(c.pnlPct ?? 0).toFixed(2)}%
                    </span>
                    <span className="num text-[11px]"
                      style={{ color: (c.pnl ?? 0) >= 0 ? "var(--positive)" : "var(--negative)" }}>
                      {(c.pnl ?? 0) >= 0 ? "+" : ""}{fmt(c.pnl ?? 0)} ₫
                    </span>
                  </div>
                ) : (
                  <div className="h-5" /> // spacer
                )}

                {/* Sub */}
                <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>{c.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Budget ── */}
      {budget && income > 0 && (
        <div className="card px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              T{budget.month}/{budget.year}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>
              Đầu tư {investRate}%
            </span>
          </div>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden flex" style={{ background: "var(--bg-input)" }}>
            {[
              { v: budget?.stockInvest ?? 0, c: "#3b82f6" },
              { v: budget?.cryptoInvest ?? 0, c: "#f97316" },
              { v: budget?.spending ?? 0, c: "#ef4444" },
              { v: saving, c: "#22c55e" },
            ].map((b, i) => (
              <div key={i} className="h-full" style={{ width: `${income > 0 ? (b.v / income) * 100 : 0}%`, background: b.c }} />
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {[
              { l: "Cổ phiếu", c: "#3b82f6", v: budget?.stockInvest ?? 0 },
              { l: "Crypto",   c: "#f97316", v: budget?.cryptoInvest ?? 0 },
              { l: "Chi tiêu", c: "#ef4444", v: budget?.spending ?? 0 },
              { l: "Tiết kiệm",c: "#22c55e", v: saving },
            ].map(b => (
              <div key={b.l} className="flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.c }} />
                <span style={{ color: "var(--text-muted)" }}>{b.l}</span>
                <span className="num font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {b.v >= 1_000_000 ? `${(b.v / 1_000_000).toFixed(1)}M` : `${Math.round(b.v / 1000)}K`}
                </span>
              </div>
            ))}
            <div className="pl-3 flex items-center gap-1 text-[10px]" style={{ borderLeft: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Thu nhập</span>
              <span className="num font-bold" style={{ color: "var(--text-primary)" }}>
                {income >= 1_000_000 ? `${(income / 1_000_000).toFixed(1)}M` : `${Math.round(income / 1000)}K`}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
