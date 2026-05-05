"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const PALETTE = ["#6366f1","#f97316","#22c55e","#3b82f6","#a855f7","#14b8a6","#eab308","#ef4444"];

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1)}tỷ`;
  if (n >= 1_000_000)     return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${Math.round(n/1_000)}K`;
  return `${Math.round(n)}`;
}

function CenterText({ total, label }: { total: number; label: string }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-0.7em" fontSize="15" fontWeight="800" fill="var(--text-primary)" fontFamily="var(--font-geist-mono)">
        {fmt(total)}
      </tspan>
      <tspan x="50%" dy="1.5em" fontSize="10" fill="var(--text-muted)">{label}</tspan>
    </text>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background:"var(--bg-card)", border:"1px solid var(--border-2)", boxShadow:"var(--shadow-dropdown)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: d.payload.fill }} />
        <span className="font-semibold" style={{ color:"var(--text-primary)" }}>{d.name}</span>
      </div>
      <p className="num font-bold" style={{ color:"var(--text-primary)" }}>{fmt(d.value)} ₫</p>
      <p style={{ color:"var(--text-muted)" }}>{d.payload.pct}% tổng</p>
    </div>
  );
};

type Tab = "overview" | "stock" | "crypto";

interface Props { summary: any; holdings: any[]; usdVnd: number; loading: boolean; }

export default function AllocationChart({ summary, holdings, usdVnd, loading }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [hovered, setHovered] = useState<number | null>(null);

  const stockVal  = summary?.stocks?.value  ?? 0;
  const cryptoVal = summary?.crypto?.value  ?? 0;
  const savingsVnd = summary?.savingsVnd ?? 0;
  const cashVnd   = (summary?.cashUsd ?? 0) * (summary?.usdVnd ?? usdVnd);
  const totalVal  = stockVal + cryptoVal + savingsVnd + cashVnd;

  const overviewData = [
    { name:"Crypto",    value: cryptoVal, fill: PALETTE[0] },
    { name:"Cổ phiếu", value: stockVal,  fill: PALETTE[3] },
    { name:"Tiết kiệm",value: savingsVnd, fill: PALETTE[2] },
    { name:"USDT",     value: cashVnd,    fill: PALETTE[5] },
  ].filter(d => d.value > 0).map(d => ({ ...d, pct: totalVal > 0 ? ((d.value/totalVal)*100).toFixed(0) : "0" }));

  const stockBreak = holdings.filter(h => h.type === "STOCK")
    .map((h,i) => ({ name: h.ticker, value: h.shares * h.currentPrice, fill: PALETTE[i % PALETTE.length] }))
    .filter(d => d.value > 0);

  const cryptoBreak = holdings.filter(h => h.type === "CRYPTO")
    .map((h,i) => ({ name: h.ticker, value: h.shares * h.currentPrice * (h.currency === "USD" ? usdVnd : 1), fill: PALETTE[i % PALETTE.length] }))
    .filter(d => d.value > 0)
    .sort((a,b) => b.value - a.value);

  const dataMap: Record<Tab, { items: any[]; total: number; label: string }> = {
    overview: { items: overviewData, total: totalVal,   label: "tổng tài sản" },
    stock:    { items: stockBreak.map((d,i) => ({ ...d, pct: stockVal > 0 ? ((d.value/stockVal)*100).toFixed(0) : "0" })),
                total: stockBreak.reduce((s,d) => s+d.value, 0), label: "cổ phiếu" },
    crypto:   { items: cryptoBreak.map((d,i) => ({ ...d, pct: cryptoVal > 0 ? ((d.value/cryptoVal)*100).toFixed(0) : "0" })),
                total: cryptoBreak.reduce((s,d) => s+d.value, 0), label: "crypto" },
  };

  const { items, total, label } = dataMap[tab];

  const tabs: { id: Tab; label: string }[] = [
    { id:"overview", label:"Tổng" },
    { id:"stock",    label:"CP"   },
    { id:"crypto",   label:"Crypto" },
  ];

  return (
    <div className="card p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm" style={{ color:"var(--text-primary)" }}>Phân bổ</h2>
          {!loading && total > 0 && (
            <p className="num text-[11px] mt-0.5" style={{ color:"var(--text-muted)" }}>{fmt(total)} ₫</p>
          )}
        </div>
        <div className="flex gap-0.5 p-1 rounded-xl" style={{ background:"var(--bg-input)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={tab === t.id
                ? { background:"var(--accent)", color:"#fff" }
                : { color:"var(--text-muted)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full shimmer-skeleton" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color:"var(--text-muted)" }}>
          Chưa có dữ liệu
        </div>
      ) : (
        <>
          {/* Donut chart */}
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={items}
                  cx="50%" cy="50%"
                  innerRadius={62} outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  onMouseEnter={(_, i) => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {items.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.fill}
                      opacity={hovered === null || hovered === i ? 1 : 0.45}
                      style={{ transition:"opacity 0.2s", cursor:"pointer" }}
                    />
                  ))}
                  <CenterText total={total} label={label} />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-2 mt-2">
            {items.map((d, i) => (
              <div key={d.name}
                className="flex items-center justify-between py-1.5 px-2 rounded-xl transition-colors cursor-pointer"
                style={{ background: hovered === i ? "var(--bg-input)" : "transparent" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}>
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.fill }} />
                  <span className="text-xs font-medium" style={{ color:"var(--text-secondary)" }}>{d.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-xs font-semibold" style={{ color:"var(--text-primary)" }}>
                    {fmt(d.value)} ₫
                  </span>
                  <span className="num text-[10px] w-8 text-right font-bold" style={{ color: d.fill }}>
                    {d.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
