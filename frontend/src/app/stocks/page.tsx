"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { dsip as dsipApi } from "@/lib/api";
import Link from "next/link";
import { Plus, Calendar, TrendingUp, ArrowRight } from "lucide-react";

function fmt(n: number) {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1_000_000_000) return `${s}${(a/1_000_000_000).toFixed(2)}tỷ`;
  if (a >= 1_000_000)     return `${s}${(a/1_000_000).toFixed(1)}M`;
  if (a >= 1_000)         return `${s}${Math.round(a/1_000)}K`;
  return `${s}${Math.round(a)}`;
}

const FUND_TYPE: Record<string, string> = {
  VCBFBCF: "Trái phiếu", VNDAF: "Cổ phiếu", VNDBF: "Trái phiếu",
  DCBF: "Trái phiếu", DCDE: "Cổ phiếu", VESAF: "Cổ phiếu", VIBF: "Trái phiếu",
};

export default function StocksDashboard() {
  const [plans, setPlans]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dsipApi.plans().then(setPlans).finally(() => setLoading(false));
  }, []);

  const totalInvested  = plans.reduce((s, p) =>
    s + p.records.reduce((rs: number, r: any) => rs + r.totalInvested, 0), 0);
  const totalRecords   = plans.reduce((s, p) => s + p.records.length, 0);
  const activePlans    = plans.filter(p => p.isActive);

  // Next scheduled date
  const nextDates = activePlans.map(p => {
    const now   = new Date();
    const d     = new Date(now.getFullYear(), now.getMonth(), p.scheduleDay);
    if (d <= now) d.setMonth(d.getMonth() + 1);
    return { plan: p, date: d };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Fund breakdown across all plans
  const fundMap: Record<string, { allocation: number; invested: number; count: number }> = {};
  plans.forEach(p => {
    const funds = p.funds as { symbol: string; allocation: number }[];
    const planInvested = p.records.reduce((s: number, r: any) => s + r.totalInvested, 0);
    funds.forEach(f => {
      if (!fundMap[f.symbol]) fundMap[f.symbol] = { allocation: 0, invested: 0, count: 0 };
      fundMap[f.symbol].invested += planInvested * f.allocation / 100;
      fundMap[f.symbol].count++;
    });
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="ml-56 p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Chứng khoán</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Quỹ mở VNDirect · DSIP</p>
          </div>
          <Link href="/stocks/dsip"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "var(--accent)", color: "#fff" }}>
            <Plus className="w-3.5 h-3.5" /> Quản lý DSIP
          </Link>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Kế hoạch đang chạy", value: `${activePlans.length}`, suffix: ` / ${plans.length} kế hoạch`, color: "var(--text-primary)" },
            { label: "Tổng đã đầu tư", value: fmt(totalInvested), suffix: " ₫", color: "#60a5fa" },
            { label: "Tổng lần nộp", value: String(totalRecords), suffix: " lần", color: "#a78bfa" },
          ].map(c => (
            <div key={c.label} className="card p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{c.label}</p>
              <p className="num text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              <p className="text-xs mt-0.5 num" style={{ color: "var(--text-muted)" }}>{c.suffix}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Next scheduled */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Lịch nộp sắp tới</h2>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 shimmer-skeleton rounded-xl" />)}</div>
            ) : nextDates.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Chưa có kế hoạch nào</p>
            ) : (
              <div className="space-y-3">
                {nextDates.map(({ plan, date }) => {
                  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
                  return (
                    <div key={plan.id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: "var(--bg-input)" }}>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{plan.name}</p>
                        <p className="text-xs mt-0.5 num" style={{ color: "var(--text-muted)" }}>
                          {fmt(plan.monthlyAmount)} ₫ · {date.toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: daysLeft <= 3 ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.15)", color: daysLeft <= 3 ? "#ef4444" : "#a5b4fc" }}>
                        {daysLeft === 0 ? "Hôm nay" : `${daysLeft} ngày`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fund breakdown */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: "#60a5fa" }} />
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Phân bổ quỹ</h2>
            </div>
            {Object.keys(fundMap).length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(fundMap).sort((a,b) => b[1].invested - a[1].invested).map(([sym, data]) => {
                  const pct = totalInvested > 0 ? (data.invested / totalInvested) * 100 : 0;
                  const isStock = (FUND_TYPE[sym] ?? "") === "Cổ phiếu";
                  return (
                    <div key={sym}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: isStock ? "rgba(96,165,250,0.15)" : "rgba(167,139,250,0.15)", color: isStock ? "#60a5fa" : "#a78bfa" }}>
                            {FUND_TYPE[sym] ?? "Quỹ"}
                          </span>
                          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{sym}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="num text-sm font-bold" style={{ color: "var(--text-primary)" }}>{fmt(data.invested)} ₫</span>
                          <span className="num text-xs w-9 text-right" style={{ color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isStock ? "#60a5fa" : "#a78bfa" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Plans list */}
        {!loading && plans.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Tất cả kế hoạch</h2>
              <Link href="/stocks/dsip" className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: "var(--accent)" }}>
                Quản lý <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {plans.map(p => {
                const invested = p.records.reduce((s: number, r: any) => s + r.totalInvested, 0);
                return (
                  <div key={p.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: p.isActive ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)", color: p.isActive ? "#22c55e" : "var(--text-muted)" }}>
                          {p.isActive ? "Đang chạy" : "Tạm dừng"}
                        </span>
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Ngày {p.scheduleDay} · {fmt(p.monthlyAmount)} ₫/tháng · {p.records.length} lần nộp
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num font-bold text-sm" style={{ color: "var(--text-primary)" }}>{fmt(invested)} ₫</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>tổng đã đầu tư</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div className="card p-12 text-center">
            <p className="font-semibold text-base mb-2" style={{ color: "var(--text-secondary)" }}>Chưa có kế hoạch DSIP nào</p>
            <Link href="/stocks/dsip"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mt-2"
              style={{ background: "var(--accent)" }}>
              <Plus className="w-4 h-4" /> Thêm kế hoạch DSIP
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
