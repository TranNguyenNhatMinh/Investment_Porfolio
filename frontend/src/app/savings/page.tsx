"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { savings as savingsApi } from "@/lib/api";
import Link from "next/link";
import { Settings2, Clock, TrendingUp, Landmark, Wallet, ArrowRight, Building2, AlertTriangle } from "lucide-react";

function fmt(n: number) {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1_000_000_000) return `${s}${(a / 1_000_000_000).toFixed(2)}tỷ`;
  if (a >= 1_000_000)     return `${s}${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)         return `${s}${Math.round(a / 1_000)}K`;
  return `${s}${Math.round(a)}`;
}
function fmtFull(n: number) { return Math.round(n).toLocaleString("vi-VN"); }

export default function SavingsDashboard() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [isDark,   setIsDark]   = useState(true);

  useEffect(() => {
    savingsApi.list().then(setAccounts).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") !== "light");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const totalValue     = accounts.reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const totalInterest  = accounts.reduce((s, a) => s + (a.accruedInterest ?? 0), 0);
  const totalPrincipal = accounts.reduce((s, a) => s + (a.totalPrincipal ?? 0), 0);
  const bankAccounts   = accounts.filter(a => a.savingsType === "BANK");
  const momoAccounts   = accounts.filter(a => a.savingsType === "MOMO");
  const bankTotal      = bankAccounts.reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const momoTotal      = momoAccounts.reduce((s, a) => s + (a.currentValue ?? 0), 0);

  const interestPct = totalPrincipal > 0 ? (totalInterest / totalPrincipal) * 100 : 0;

  const upcoming = accounts
    .filter(a => a.maturityDate && new Date(a.maturityDate) > new Date())
    .sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime());

  const matured = accounts.filter(a => a.isMatured);

  const sorted = accounts
    .slice()
    .sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="ml-56 flex flex-col min-h-screen">

        {/* Topbar */}
        <header className="sticky top-0 z-20 backdrop-blur-xl px-6 py-3"
          style={{ background: isDark ? "rgba(7,9,18,0.88)" : "rgba(241,245,249,0.92)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Tiết kiệm</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {accounts.length} khoản · {bankAccounts.length} Ngân hàng · {momoAccounts.length} MoMo
              </p>
            </div>
            <Link href="/savings/accounts"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.22)" }}>
              <Settings2 className="w-3.5 h-3.5" /> Quản lý tài khoản
            </Link>
          </div>
        </header>

        <main className="flex-1 p-5 space-y-4">

          {/* ── Hero + stats ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Hero card */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-2xl"
              style={{ background: isDark ? "linear-gradient(135deg,#052e16 0%,#0f172a 100%)" : "linear-gradient(135deg,#dcfce7 0%,#f0fdf4 100%)", border: "1px solid rgba(52,211,153,0.22)" }}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full"
                  style={{ background: "radial-gradient(circle,rgba(52,211,153,0.10) 0%,transparent 65%)", transform: "translate(35%,-35%)" }} />
              </div>
              <div className="relative flex flex-col h-full">
                <div className="p-7 pb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
                    style={{ color: isDark ? "rgba(52,211,153,0.6)" : "#059669" }}>
                    Tổng tài sản tiết kiệm
                  </p>
                  {loading ? (
                    <div className="space-y-3">
                      <div className="h-14 w-52 shimmer-skeleton rounded-xl" />
                      <div className="h-5 w-36 shimmer-skeleton rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <p className="num font-black leading-none mb-3"
                        style={{ fontSize: "clamp(2.5rem,5vw,3.5rem)", color: isDark ? "#d1fae5" : "#064e3b", letterSpacing: "-0.04em" }}>
                        {fmtFull(totalValue)}
                        <span className="ml-2 font-semibold" style={{ fontSize: "1.4rem", opacity: 0.4 }}>₫</span>
                      </p>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1 num text-[12px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.20)" }}>
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{interestPct.toFixed(2)}%
                        </span>
                        <span className="num text-[13px] font-semibold" style={{ color: "#4ade80" }}>
                          +{fmtFull(totalInterest)} ₫ lãi
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom 3 stats */}
                <div className="grid grid-cols-3" style={{ borderTop: "1px solid rgba(52,211,153,0.12)" }}>
                  {[
                    { label: "Vốn gốc",    val: loading ? "—" : fmt(totalPrincipal) + " ₫", color: isDark ? "rgba(255,255,255,0.55)" : "#374151" },
                    { label: "Ngân hàng",  val: loading ? "—" : fmt(bankTotal) + " ₫",      color: isDark ? "#93c5fd" : "#2563eb" },
                    { label: "MoMo",       val: loading ? "—" : fmt(momoTotal) + " ₫",      color: isDark ? "#fdba74" : "#ea580c" },
                  ].map((s, i) => (
                    <div key={s.label} className="py-4 px-6"
                      style={{ borderRight: i < 2 ? "1px solid rgba(52,211,153,0.10)" : "none" }}>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: isDark ? "rgba(255,255,255,0.28)" : "#94a3b8" }}>{s.label}</p>
                      <p className="num text-[15px] font-bold" style={{ color: s.color }}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: phân bổ loại */}
            <div className="flex flex-col gap-4">
              {[
                { label: "Ngân hàng", count: bankAccounts.length, total: bankTotal, color: "#6366f1", icon: Building2, rate: bankAccounts.length ? Math.max(...bankAccounts.map(a => a.interestRate ?? 0)) : 0 },
                { label: "MoMo",      count: momoAccounts.length, total: momoTotal, color: "#f97316", icon: Wallet,    rate: momoAccounts.length ? Math.max(...momoAccounts.map(a => a.interestRate ?? 0)) : 0 },
              ].map(g => {
                const Icon = g.icon;
                const pct  = totalValue > 0 ? (g.total / totalValue) * 100 : 0;
                return (
                  <div key={g.label} className="flex-1 rounded-2xl p-5"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: `${g.color}18` }}>
                          <Icon className="w-4 h-4" style={{ color: g.color }} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{g.label}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{g.count} khoản · max {g.rate}%/năm</p>
                        </div>
                      </div>
                      <p className="num text-[13px] font-bold" style={{ color: g.color }}>{fmt(g.total)} ₫</p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: g.color }} />
                    </div>
                    <p className="num text-[11px] mt-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>{pct.toFixed(1)}% tổng danh mục</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Cảnh báo đáo hạn + sắp tới ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Đến hạn sắp tới */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <Clock className="w-4 h-4" style={{ color: "#fbbf24" }} />
                <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Đến hạn sắp tới</p>
                {matured.length > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                    <AlertTriangle className="w-3 h-3" /> {matured.length} đã đáo hạn
                  </span>
                )}
              </div>
              {loading ? (
                <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 shimmer-skeleton rounded-xl" />)}</div>
              ) : upcoming.length === 0 && matured.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  {accounts.length === 0 ? "Chưa có tài khoản nào" : "Không có khoản nào sắp đến hạn"}
                </div>
              ) : (
                <div className="divide-y" style={{ "--tw-divide-color": "var(--border)" } as any}>
                  {[...matured, ...upcoming.slice(0, 5)].map(a => {
                    const maturity = new Date(a.maturityDate);
                    const daysLeft = Math.ceil((maturity.getTime() - Date.now()) / 86_400_000);
                    const isExp    = a.isMatured;
                    return (
                      <div key={a.id} className="flex items-center justify-between px-5 py-3.5"
                        style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: isExp ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.10)" }}>
                            {isExp
                              ? <AlertTriangle className="w-4 h-4" style={{ color: "#f87171" }} />
                              : <Clock className="w-4 h-4" style={{ color: "#fbbf24" }} />}
                          </div>
                          <div>
                            <p className="font-semibold text-[13px]" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {a.bank} · {maturity.toLocaleDateString("vi-VN")} · {fmt(a.currentValue)} ₫
                            </p>
                          </div>
                        </div>
                        <span className="num text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                          style={{
                            background: isExp ? "rgba(239,68,68,0.12)" : daysLeft <= 30 ? "rgba(251,191,36,0.12)" : "rgba(34,197,94,0.10)",
                            color:      isExp ? "#f87171"              : daysLeft <= 30 ? "#fbbf24"               : "#4ade80",
                          }}>
                          {isExp ? "Đáo hạn" : `${daysLeft} ngày`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Danh sách nhanh — read only */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4" style={{ color: "#34d399" }} />
                  <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Tất cả khoản</p>
                </div>
                <Link href="/savings/accounts"
                  className="flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: "var(--text-muted)" }}>
                  Quản lý <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {loading ? (
                <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 shimmer-skeleton rounded-xl" />)}</div>
              ) : sorted.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Chưa có tài khoản nào</p>
                  <Link href="/savings/accounts"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                    Thêm tài khoản
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {sorted.map((a, i) => {
                    const isMomo = a.savingsType === "MOMO";
                    const color  = isMomo ? "#f97316" : "#6366f1";
                    const alloc  = totalValue > 0 ? ((a.currentValue ?? 0) / totalValue) * 100 : 0;
                    return (
                      <div key={a.id} className="flex items-center gap-3 px-5 py-3.5"
                        style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${color}18` }}>
                          {isMomo
                            ? <Wallet    className="w-4 h-4" style={{ color }} />
                            : <Building2 className="w-4 h-4" style={{ color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-semibold text-[13px] truncate" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                            <p className="num font-bold text-[13px] ml-2 shrink-0" style={{ color: "var(--text-primary)" }}>{fmt(a.currentValue)} ₫</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {a.bank} · {a.interestRate}%/năm
                            </p>
                            <p className="num text-[11px] font-semibold ml-2" style={{ color: "#4ade80" }}>
                              +{fmt(a.accruedInterest)} ₫
                            </p>
                          </div>
                          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(alloc, 100)}%`, background: color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </main>

        <footer className="px-6 py-3 text-center text-[10px]"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
          Lãi tính theo từng khoản · Ngân hàng: lãi đơn · MoMo: lãi kép hàng tháng
        </footer>
      </div>
    </div>
  );
}
