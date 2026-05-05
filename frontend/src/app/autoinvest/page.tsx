"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { binance as binanceApi } from "@/lib/api";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from "recharts";
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign,
  CheckCircle, XCircle, Clock, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp,
} from "lucide-react";

const DCA_START = "2026-04-29";

/* ── helpers ── */
function fmtUsdt(n: number, d = 4) {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: d })}`;
}
function fmtCoin(n: number) {
  if (!n) return "0";
  if (n < 0.0001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  return n.toFixed(4);
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const COIN_COLORS: Record<string, string> = {
  BTC: "#f7931a", ETH: "#627eea", BNB: "#f3ba2f", SOL: "#9945ff",
  XRP: "#00aae4", ADA: "#0033ad", LINK: "#2a5ada", DOT: "#e6007a",
};
function coinColor(asset: string) { return COIN_COLORS[asset] ?? "#6366f1"; }

/* ── Stat card ── */
function StatCard({ label, value, sub, color, icon }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          <span style={{ color: "var(--accent)" }}>{icon}</span>
        </div>
      </div>
      <div className="num text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

/* ── Coin row ── */
function CoinRow({ c, expanded, onToggle }: { c: any; expanded: boolean; onToggle: () => void }) {
  const pos = c.pnlPct >= 0;
  const color = coinColor(c.asset);
  const successRate = c.totalAttempts > 0 ? Math.round((c.executions / c.totalAttempts) * 100) : 0;

  return (
    <>
      <tr className="cursor-pointer transition-colors"
        style={{ borderBottom: "1px solid var(--border)" }}
        onClick={onToggle}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
        onMouseLeave={e => (e.currentTarget.style.background = "")}>

        {/* Coin */}
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0"
              style={{ background: color }}>{c.asset.slice(0, 3)}</div>
            <div>
              <div className="font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>{c.asset}</div>
              <div className="num text-[11px]" style={{ color: "var(--text-muted)" }}>{fmtCoin(c.coinsReceived)} {c.asset}</div>
            </div>
          </div>
        </td>

        {/* Đã đầu tư */}
        <td className="py-3.5 px-4">
          <div className="num font-semibold text-[13px]" style={{ color: "var(--text-primary)" }}>{fmtUsdt(c.totalInvestedUsdt)}</div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{c.executions} lần thành công</div>
        </td>

        {/* Giá TB */}
        <td className="py-3.5 px-4">
          <div className="num text-[13px]" style={{ color: "var(--text-muted)" }}>{fmtUsdt(c.avgBuyPrice, 2)}</div>
        </td>

        {/* Giá hiện tại */}
        <td className="py-3.5 px-4">
          <div className="num font-semibold text-[13px]" style={{ color: "var(--text-primary)" }}>{fmtUsdt(c.currentPrice, 2)}</div>
          <div className="num text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Chênh: {((c.currentPrice - c.avgBuyPrice) / c.avgBuyPrice * 100).toFixed(2)}%
          </div>
        </td>

        {/* Giá trị hiện tại */}
        <td className="py-3.5 px-4">
          <div className="num font-semibold text-[13px]" style={{ color: "var(--text-primary)" }}>{fmtUsdt(c.currentValueUsdt)}</div>
        </td>

        {/* P&L */}
        <td className="py-3.5 px-4">
          <div className="flex flex-col gap-0.5">
            <span className="num text-[13px] font-bold" style={{ color: pos ? "var(--positive)" : "var(--negative)" }}>
              {pos ? "+" : ""}{fmtUsdt(c.pnlUsdt)}
            </span>
            <span className="inline-flex items-center gap-0.5 num text-[11px] font-bold w-fit px-1.5 py-0.5 rounded-md"
              style={{ background: pos ? "var(--positive-soft)" : "var(--negative-soft)", color: pos ? "var(--positive)" : "var(--negative)" }}>
              {pos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(c.pnlPct).toFixed(2)}%
            </span>
          </div>
        </td>

        {/* Success rate */}
        <td className="py-3.5 px-4">
          {c.failedAttempts > 0 ? (
            <div>
              <div className="text-[12px] font-semibold" style={{ color: successRate < 50 ? "var(--negative)" : "#fbbf24" }}>
                {successRate}% thành công
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {c.failedAttempts} lần thất bại
              </div>
            </div>
          ) : (
            <span className="text-[12px] font-semibold" style={{ color: "var(--positive)" }}>100% ✓</span>
          )}
        </td>

        {/* Expand */}
        <td className="py-3.5 px-4">
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
        </td>
      </tr>

      {/* Expanded: mini bar chart of investment per execution */}
      {expanded && (
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          <td colSpan={8} className="px-4 py-4" style={{ background: "var(--bg-input)" }}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                  Phân tích {c.asset}
                </p>
                <div className="space-y-2 text-xs">
                  {[
                    ["Tổng USDT đầu tư", fmtUsdt(c.totalInvestedUsdt)],
                    ["Coin đã nhận", `${fmtCoin(c.coinsReceived)} ${c.asset}`],
                    ["Giá mua trung bình", fmtUsdt(c.avgBuyPrice, 2)],
                    ["Giá hiện tại", fmtUsdt(c.currentPrice, 2)],
                    ["Giá trị hiện tại", fmtUsdt(c.currentValueUsdt)],
                    ["Lãi/Lỗ (USDT)", `${c.pnlUsdt >= 0 ? "+" : ""}${fmtUsdt(c.pnlUsdt)}`],
                    ["ROI", `${c.pnlPct >= 0 ? "+" : ""}${c.pnlPct.toFixed(2)}%`],
                    ["Lần mua thành công", `${c.executions}/${c.totalAttempts}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>{k}</span>
                      <span className="num font-semibold" style={{ color: "var(--text-primary)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                  So sánh giá mua vs hiện tại
                </p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={[
                    { name: "Giá TB mua", value: c.avgBuyPrice },
                    { name: "Giá hiện tại", value: c.currentPrice },
                  ]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: "var(--chart-tick)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--chart-tick)", fontSize: 10 }} axisLine={false} tickLine={false} width={60}
                      tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any) => [fmtUsdt(v, 2), ""]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      <Cell fill={coinColor(c.asset)} opacity={0.7} />
                      <Cell fill={c.currentPrice >= c.avgBuyPrice ? "#22c55e" : "#ef4444"} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Main Page ── */
export default function AutoInvestPage() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHist, setLoadingHist] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedCoin, setExpandedCoin] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await binanceApi.dcaSummary(DCA_START);
      if (res?.error) { setError(res.error); return; }
      setData(res);
      setError("");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadHistory = async () => {
    setLoadingHist(true);
    try {
      const res = await binanceApi.autoInvestHistory(undefined, 500);
      if (res?.plans) {
        const start = new Date(DCA_START);
        res.plans = res.plans.filter((p: any) => new Date(p.time) >= start);
        res.total = res.plans.length;
      }
      setHistory(res);
    } catch { /* ignore */ }
    finally { setLoadingHist(false); }
  };

  useEffect(() => { load(); loadHistory(); }, []);

  const coins: any[] = data?.coins ?? [];
  const summary = data?.summary;

  // Chart data: cumulative investment over time from history
  const chartData = (() => {
    if (!history?.plans) return [];
    const byDate: Record<string, { ts: number; invested: number; success: number; failed: number }> = {};
    const sorted = [...history.plans].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    for (const plan of sorted) {
      const t = new Date(plan.time);
      const d = t.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      if (!byDate[d]) byDate[d] = { ts: t.getTime(), invested: 0, success: 0, failed: 0 };
      if (plan.status === "SUCCESS") {
        byDate[d].invested += plan.totalSourceAmount ?? 0;
        byDate[d].success += 1;
      } else {
        byDate[d].failed += 1;
      }
    }
    let cum = 0;
    const points = Object.entries(byDate)
      .sort((a, b) => a[1].ts - b[1].ts)
      .map(([date, v]) => {
        cum += v.invested;
        return { date, invested: v.invested, success: v.success, failed: v.failed, cumulative: Math.round(cum * 100) / 100 };
      });

    // Luôn đảm bảo có điểm hôm nay
    const todayStr = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    if (points.length > 0 && points[points.length - 1].date !== todayStr) {
      const last = points[points.length - 1];
      points.push({ date: todayStr, invested: 0, success: 0, failed: 0, cumulative: last.cumulative });
    }

    // Thêm giá trị hiện tại = cumulative × (currentValue / totalInvested)
    const totalInvested = summary?.totalInvestedUsdt ?? 0;
    const currentValue  = summary?.currentValueUsdt  ?? 0;
    const ratio = totalInvested > 0 ? currentValue / totalInvested : 1;
    return points.map(p => {
      const cv = Math.round(p.cumulative * ratio * 100) / 100;
      return {
        ...p,
        currentValue: cv,
        profit: Math.round((cv - p.cumulative) * 100) / 100,
      };
    });
  })();

  // Filter history plans
  const filteredPlans = (history?.plans ?? []).filter((p: any) => {
    if (historyFilter === "SUCCESS") return p.status === "SUCCESS";
    if (historyFilter === "FAILED") return p.status !== "SUCCESS";
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="ml-56 flex flex-col min-h-screen">

        <header className="sticky top-0 z-20 backdrop-blur-xl px-6 py-3"
          style={{ background:"var(--bg-topbar,rgba(7,9,18,0.88))", borderBottom:"1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold tracking-tight" style={{ color:"var(--text-primary)" }}>DCA Định kỳ</p>
              <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>
                Binance AutoInvest — lãi/lỗ, avg price, lịch sử từng lần mua
              </p>
            </div>
            <button onClick={() => { load(true); loadHistory(); }} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold disabled:opacity-50"
              style={{ background:"var(--bg-input)", color:"var(--text-secondary)", border:"1px solid var(--border)" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 space-y-4">

        {/* Error */}
        {error && (
          <div className="card p-4 text-sm" style={{ color: "var(--negative)", borderColor: "rgba(239,68,68,0.3)" }}>
            ⚠️ {error.includes("Invalid API") ? "API key chưa có quyền. Vào Binance → API Management → bật Unrestricted IP + Enable Reading." : error}
          </div>
        )}

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5 h-28 shimmer-skeleton" />
            ))}
          </div>
        ) : summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tổng đã đầu tư" value={fmtUsdt(summary.totalInvestedUsdt)}
              sub={`${coins.reduce((s: number, c: any) => s + c.executions, 0)} lần mua thành công`}
              color="var(--text-primary)" icon={<DollarSign className="w-4 h-4" />} />
            <StatCard label="Giá trị hiện tại" value={fmtUsdt(summary.currentValueUsdt)}
              sub="Tính theo giá live"
              color="var(--text-primary)" icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard
              label="Lãi / Lỗ"
              value={`${summary.pnlUsdt >= 0 ? "+" : ""}${fmtUsdt(summary.pnlUsdt)}`}
              sub={`${summary.pnlPct >= 0 ? "+" : ""}${summary.pnlPct.toFixed(2)}% ROI`}
              color={summary.pnlPct >= 0 ? "var(--positive)" : "var(--negative)"}
              icon={summary.pnlPct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            />
            <StatCard label="Số coin đang giữ" value={`${coins.length} coin`}
              sub={`${coins.reduce((s: number, c: any) => s + c.totalAttempts, 0)} lần thực thi tổng`}
              color="var(--accent)" icon={<Clock className="w-4 h-4" />} />
          </div>
        )}

        {/* Cumulative investment chart */}
        {chartData.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>
              Tích lũy đầu tư theo thời gian
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradDca" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.10} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--chart-tick)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "var(--chart-tick)", fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                  tickFormatter={v => `$${v}`}
                  domain={[(min: number) => Math.max(0, parseFloat((min * 0.97).toFixed(2))), (max: number) => parseFloat((max * 1.01).toFixed(2))]} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v: any, name: any) => [
                    `$${v}`,
                    name === "cumulative" ? "Đã đầu tư" : "Giá trị hiện tại",
                  ]}
                />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "var(--text-muted)" }}
                  formatter={(v) => v === "cumulative" ? "Đã đầu tư" : "Giá trị hiện tại"}
                />
                <Area type="monotone" dataKey="cumulative" name="cumulative" stroke="#6366f1" strokeWidth={2}
                  fill="url(#gradDca)" dot={false}
                  activeDot={{ r: 4, fill: "#6366f1", stroke: "var(--bg-card)", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="currentValue" name="currentValue" stroke="#22c55e" strokeWidth={2.5}
                  fill="url(#gradProfit)" dot={false}
                  activeDot={{ r: 4, fill: "#22c55e", stroke: "var(--bg-card)", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per-coin table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Chi tiết từng coin
              <span className="ml-2 text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>
                (click để xem phân tích)
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 shimmer-skeleton rounded-xl" />)}
            </div>
          ) : coins.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Chưa có giao dịch DCA thành công nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Coin", "Đã đầu tư", "Giá TB mua", "Giá hiện tại", "Giá trị", "P&L", "Tỷ lệ thành công", ""].map(h => (
                      <th key={h} className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coins.map(c => (
                    <CoinRow
                      key={c.asset} c={c}
                      expanded={expandedCoin === c.asset}
                      onToggle={() => setExpandedCoin(expandedCoin === c.asset ? null : c.asset)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Execution history */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Lịch sử thực thi
              {!loadingHist && history && (
                <span className="ml-2 text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>
                  ({history.total} records)
                </span>
              )}
            </h2>
            <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: "var(--bg-input)" }}>
              {(["ALL", "SUCCESS", "FAILED"] as const).map(f => (
                <button key={f} onClick={() => setHistoryFilter(f)}
                  className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                  style={historyFilter === f
                    ? { background: f === "SUCCESS" ? "var(--positive)" : f === "FAILED" ? "var(--negative)" : "var(--accent)", color: "#fff" }
                    : { color: "var(--text-muted)" }}>
                  {f === "ALL" ? "Tất cả" : f === "SUCCESS" ? "✓ Thành công" : "✗ Thất bại"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingHist ? (
              <div className="p-5 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 shimmer-skeleton rounded-xl" />)}
              </div>
            ) : (
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Thời gian", "Kế hoạch", "Coins", "Tổng USDT", "Trạng thái"].map(h => (
                      <th key={h} className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.slice(0, 50).map((plan: any) => {
                    const isSuccess = plan.status === "SUCCESS";
                    const successAssets = (plan.assets ?? []).filter((a: any) => a.status === "SUCCESS");
                    return (
                      <tr key={plan.id}
                        style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                        <td className="py-3 px-4 text-[12px]" style={{ color: "var(--text-muted)" }}>
                          {fmtDate(new Date(plan.time).getTime())}
                        </td>
                        <td className="py-3 px-4 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                          {plan.planName}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(plan.assets ?? []).map((a: any) => (
                              <span key={a.asset} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                  background: a.status === "SUCCESS" ? `${coinColor(a.asset)}22` : "var(--negative-soft)",
                                  color: a.status === "SUCCESS" ? coinColor(a.asset) : "var(--negative)",
                                }}>
                                {a.asset}
                                {a.executionPrice ? ` $${parseFloat(a.executionPrice).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : ""}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="num text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                            ${plan.totalSourceAmount?.toFixed(4)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {isSuccess
                              ? <CheckCircle className="w-4 h-4" style={{ color: "var(--positive)" }} />
                              : <XCircle className="w-4 h-4" style={{ color: "var(--negative)" }} />}
                            <span className="text-[11px] font-bold"
                              style={{ color: isSuccess ? "var(--positive)" : "var(--negative)" }}>
                              {isSuccess ? `${successAssets.length}/${plan.assets?.length} coin` : "Thất bại"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPlans.length > 50 && (
                    <tr>
                      <td colSpan={5} className="py-3 px-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                        Hiển thị 50/{filteredPlans.length} records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        </main>
      </div>
    </div>
  );
}
