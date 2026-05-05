"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { portfolio as portfolioApi, savings as savingsApi, binance as binanceApi, prices as pricesApi } from "@/lib/api";

function fmtVnd(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1)}tỷ`;
  if (abs >= 1_000_000)     return `${(n/1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${Math.round(n/1_000)}K`;
  return `${Math.round(n)}`;
}

const MONTH_NAMES = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

const COLORS = {
  crypto:  "#f97316",
  stocks:  "#6366f1",
  savings: "#22c55e",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs"
      style={{ background:"var(--bg-card)", border:"1px solid var(--border-2)", boxShadow:"var(--shadow-dropdown)", minWidth:160 }}>
      <p className="font-bold mb-2" style={{ color:"var(--text-primary)" }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span style={{ color:"var(--text-muted)" }}>{p.name}</span>
          </div>
          <span className="num font-semibold" style={{ color:"var(--text-primary)" }}>
            {fmtVnd(p.value)} ₫
          </span>
        </div>
      ))}
      <div className="flex justify-between gap-4 mt-2 pt-2" style={{ borderTop:"1px solid var(--border)" }}>
        <span style={{ color:"var(--text-muted)" }}>Tổng</span>
        <span className="num font-bold" style={{ color:"var(--text-primary)" }}>
          {fmtVnd(payload.reduce((s: number, p: any) => s + (p.value||0), 0))} ₫
        </span>
      </div>
    </div>
  );
};

// Label tổng hiện trên đỉnh bar cao nhất
function TotalLabel({ x, y, width, index, data }: any) {
  const d = data?.[index];
  if (!d) return null;
  const total = (d.crypto || 0) + (d.stocks || 0) + (d.savings || 0);
  if (!total) return null;
  return (
    <text x={x + width / 2} y={y - 5} textAnchor="middle"
      fontSize={10} fontWeight={600} fill="var(--text-muted)">
      {fmtVnd(total)}
    </text>
  );
}

export default function InvestmentBarChart() {
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      portfolioApi.budgets(),
      savingsApi.list(),
      binanceApi.autoInvestHistory(undefined, 500).catch(() => ({ plans: [] })),
      pricesApi.forexRate().catch(() => ({ rate: 25_400 })),
    ])
      .then(([budgets, savingsList, autoinvest, forex]) => {
        const usdVnd: number = forex?.rate ?? 25_400;

        // ── 1. Crypto thực tế từ Binance DCA history ──
        const cryptoByMonth: Record<string, number> = {};
        for (const plan of (autoinvest?.plans ?? [])) {
          if (plan.status !== "SUCCESS") continue;
          const d = new Date(plan.time);
          const y = d.getFullYear(); const m = d.getMonth() + 1;
          if (y < 2026 || (y === 2026 && m < 4)) continue;
          const key = `${y}-${m}`;
          cryptoByMonth[key] = (cryptoByMonth[key] || 0) + (plan.totalSourceAmount ?? 0) * usdVnd;
        }

        // ── 2. Tiết kiệm thực nạp theo tháng ──
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

        // ── 3. Cổ phiếu từ budget (nhập tay) ──
        const stocksByMonth: Record<string, number> = {};
        for (const b of budgets) {
          if (b.year < 2026 || (b.year === 2026 && b.month < 4)) continue;
          if ((b.stockInvest ?? 0) > 0) {
            stocksByMonth[`${b.year}-${b.month}`] = b.stockInvest;
          }
        }

        // ── 4. Gộp tất cả tháng có dữ liệu + tháng hiện tại ──
        const monthSet = new Set<string>();
        [cryptoByMonth, savingsByMonth, stocksByMonth].forEach(obj =>
          Object.keys(obj).forEach(k => monthSet.add(k))
        );
        const now = new Date();
        monthSet.add(`${now.getFullYear()}-${now.getMonth() + 1}`);

        // ── 5. Build chart data ──
        const chartData = Array.from(monthSet)
          .sort()
          .map(key => {
            const [y, m] = key.split("-").map(Number);
            return {
              month:   `${MONTH_NAMES[m - 1]}/${String(y).slice(2)}`,
              crypto:  Math.round(cryptoByMonth[key]  || 0),
              stocks:  Math.round(stocksByMonth[key]  || 0),
              savings: Math.round(savingsByMonth[key] || 0),
            };
          });

        setData(chartData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalAll  = data.reduce((s, d) => s + d.crypto + d.stocks + d.savings, 0);
  const hasCrypto  = data.some(d => d.crypto  > 0);
  const hasStocks  = data.some(d => d.stocks  > 0);
  const hasSavings = data.some(d => d.savings > 0);

  // Bar trên cùng trong stack (thứ tự: crypto → stocks → savings)
  const topKey = hasSavings ? "savings" : hasStocks ? "stocks" : "crypto";

  return (
    <div className="card p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm" style={{ color:"var(--text-primary)" }}>
            Đầu tư theo tháng
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color:"var(--text-muted)" }}>
            {[hasCrypto && "Crypto", hasStocks && "Cổ phiếu", hasSavings && "Tiết kiệm"]
              .filter(Boolean).join(" · ")} — từ T4/2026
          </p>
        </div>
        {totalAll > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Tổng đã đầu tư</p>
            <p className="num text-lg font-bold" style={{ color:"var(--text-primary)" }}>{fmtVnd(totalAll)} ₫</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-[240px] shimmer-skeleton rounded-xl" />
      ) : data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center gap-2 rounded-xl"
          style={{ background:"var(--bg-input)" }}>
          <p className="text-sm font-medium" style={{ color:"var(--text-muted)" }}>Chưa có dữ liệu</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="40%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill:"var(--chart-tick)", fontSize:11, fontWeight:700 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={fmtVnd}
              tick={{ fill:"var(--chart-tick)", fontSize:10 }}
              axisLine={false} tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />}
              cursor={{ fill:"var(--bg-input)", rx:8, ry:8 }} />
            <Legend
              iconType="circle" iconSize={7}
              wrapperStyle={{ fontSize:11, paddingTop:14, color:"var(--text-muted)" }}
              formatter={(v) => v}
            />
            {hasCrypto  && <Bar dataKey="crypto"  stackId="a" name="Crypto"
              fill={COLORS.crypto}  maxBarSize={44}
              radius={topKey==="crypto"  ? [6,6,0,0] : [0,0,0,0]}
              label={topKey==="crypto"  ? (p:any) => <TotalLabel {...p} data={data} /> : undefined} />}
            {hasStocks  && <Bar dataKey="stocks"  stackId="a" name="Cổ phiếu"
              fill={COLORS.stocks}  maxBarSize={44}
              radius={topKey==="stocks"  ? [6,6,0,0] : [0,0,0,0]}
              label={topKey==="stocks"  ? (p:any) => <TotalLabel {...p} data={data} /> : undefined} />}
            {hasSavings && <Bar dataKey="savings" stackId="a" name="Tiết kiệm"
              fill={COLORS.savings} maxBarSize={44}
              radius={[6,6,0,0]}
              label={(p:any) => <TotalLabel {...p} data={data} />} />}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
