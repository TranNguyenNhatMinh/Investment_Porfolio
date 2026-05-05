"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { portfolio as portfolioApi, savings as savingsApi, binance as binanceApi, prices as pricesApi } from "@/lib/api";
import { TrendingUp } from "lucide-react";

const MONTH_NAMES = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

function fmtVnd(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(2)}tỷ`;
  if (abs >= 1_000_000)     return `${(n/1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${Math.round(n/1_000)}K`;
  return n.toLocaleString("vi-VN");
}

interface ChartPoint { month: string; cumulative: number; invested: number; }

interface Props { holdings: any[]; usdVnd: number; loading: boolean; }

export default function PerformanceChart({ holdings, usdVnd, loading }: Props) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    if (loading) return;
    setLoadingChart(true);

    Promise.all([
      portfolioApi.budgets(),
      savingsApi.list(),
      binanceApi.autoInvestHistory(undefined, 500).catch(() => ({ plans: [] })),
      pricesApi.forexRate().catch(() => ({ rate: usdVnd ?? 25_400 })),
    ])
      .then(([budgets, savingsList, autoinvest, forex]) => {
        const rate: number = forex?.rate ?? usdVnd ?? 25_400;

        // ── Crypto từ DCA history ──
        const cryptoByMonth: Record<string, number> = {};
        for (const plan of (autoinvest?.plans ?? [])) {
          if (plan.status !== "SUCCESS") continue;
          const d = new Date(plan.time);
          const y = d.getFullYear(); const m = d.getMonth() + 1;
          if (y < 2026 || (y === 2026 && m < 4)) continue;
          const key = `${y}-${m}`;
          cryptoByMonth[key] = (cryptoByMonth[key] || 0) + (plan.totalSourceAmount ?? 0) * rate;
        }

        // ── Tiết kiệm nạp theo tháng ──
        const savingsByMonth: Record<string, number> = {};
        for (const acc of savingsList) {
          const startD = new Date(acc.startDate);
          const y = startD.getFullYear(); const m = startD.getMonth() + 1;
          if (y < 2026 || (y === 2026 && m < 4)) continue;
          const key = `${y}-${m}`;
          savingsByMonth[key] = (savingsByMonth[key] || 0) + acc.amount;
          for (const dep of (acc.deposits || [])) {
            const depD = new Date(dep.depositedAt);
            const dy = depD.getFullYear(); const dm = depD.getMonth() + 1;
            if (dy < 2026 || (dy === 2026 && dm < 4)) continue;
            const depKey = `${dy}-${dm}`;
            savingsByMonth[depKey] = (savingsByMonth[depKey] || 0) + dep.amount;
          }
        }

        // ── Cổ phiếu từ budget ──
        const stocksByMonth: Record<string, number> = {};
        for (const b of budgets) {
          if (b.year < 2026 || (b.year === 2026 && b.month < 4)) continue;
          if ((b.stockInvest ?? 0) > 0) stocksByMonth[`${b.year}-${b.month}`] = b.stockInvest;
        }

        // ── Gộp tháng + tháng hiện tại ──
        const monthSet = new Set<string>();
        [cryptoByMonth, savingsByMonth, stocksByMonth].forEach(obj =>
          Object.keys(obj).forEach(k => monthSet.add(k))
        );
        const now = new Date();
        monthSet.add(`${now.getFullYear()}-${now.getMonth() + 1}`);

        // ── Build cumulative chart data ──
        let cum = 0;
        const chartData: ChartPoint[] = Array.from(monthSet)
          .sort()
          .map(key => {
            const [y, m] = key.split("-").map(Number);
            const invested = Math.round(
              (cryptoByMonth[key] || 0) +
              (savingsByMonth[key] || 0) +
              (stocksByMonth[key]  || 0)
            );
            cum += invested;
            return {
              month:      `${MONTH_NAMES[m - 1]}/${String(y).slice(2)}`,
              invested,
              cumulative: cum,
            };
          });

        setData(chartData);
      })
      .catch(() => {})
      .finally(() => setLoadingChart(false));
  }, [loading]);

  const lastPoint  = data[data.length - 1];
  const firstPoint = data[0];
  const totalGrowth = lastPoint && firstPoint ? lastPoint.cumulative - firstPoint.cumulative : 0;

  return (
    <div className="card p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Tích lũy đầu tư
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Crypto · Cổ phiếu · Tiết kiệm — lũy kế từ T4/2026
          </p>
        </div>
        {!loadingChart && lastPoint && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Tổng tích lũy</p>
            <p className="num text-sm font-bold" style={{ color: "var(--text-primary)" }}>{fmtVnd(lastPoint.cumulative)} ₫</p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {loading || loadingChart ? (
          <div className="h-[220px] shimmer-skeleton rounded-xl" />
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradCumul" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--chart-tick)", fontSize: 11, fontWeight: 600 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--chart-tick)", fontSize: 10 }}
                axisLine={false} tickLine={false}
                width={54}
                tickFormatter={fmtVnd}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-2)",
                  borderRadius: 10,
                  boxShadow: "var(--shadow-dropdown)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--text-muted)", marginBottom: 4 }}
                formatter={(v: any, name: string) => [
                  `${fmtVnd(v)} ₫`,
                  name === "cumulative" ? "Lũy kế" : "Tháng này",
                ]}
              />
              <ReferenceLine y={firstPoint?.cumulative} stroke="var(--border-2)" strokeDasharray="4 3" />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="cumulative"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#gradCumul)"
                dot={{ r: 4, fill: "#22c55e", stroke: "var(--bg-card)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#22c55e", stroke: "var(--bg-card)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex flex-col items-center justify-center gap-3 rounded-xl"
            style={{ background: "var(--bg-input)" }}>
            <TrendingUp className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              Chưa có dữ liệu đầu tư
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
