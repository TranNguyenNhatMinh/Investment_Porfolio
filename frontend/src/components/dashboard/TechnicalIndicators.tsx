"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from "recharts";
import { prices as pricesApi } from "@/lib/api";

function toYahooTicker(ticker: string, type: string) {
  return type === "CRYPTO" ? `${ticker}-USD` : ticker;
}

function Skeleton() {
  return <div className="h-[140px] shimmer-skeleton rounded-xl" />;
}

interface Props { holdings: any[]; }

export default function TechnicalIndicators({ holdings }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [rsiData, setRsiData] = useState<any[]>([]);
  const [macdData, setMacdData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const tickers = holdings.map(h => ({ ticker: h.ticker, type: h.type, currency: h.currency }));
  const selected = tickers[selectedIdx];

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    const yahooTicker = toYahooTicker(selected.ticker, selected.type);
    Promise.all([pricesApi.rsi(yahooTicker), pricesApi.macd(yahooTicker)])
      .then(([rsi, macd]) => {
        setRsiData((rsi ?? []).map((d: any) => ({ ...d, date: new Date(d.date).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" }) })));
        setMacdData((macd ?? []).map((d: any) => ({ ...d, date: new Date(d.date).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" }) })));
      })
      .catch(() => { setRsiData([]); setMacdData([]); })
      .finally(() => setLoading(false));
  }, [selectedIdx, selected?.ticker]);

  const latestRsi = rsiData.length > 0 ? rsiData[rsiData.length - 1].rsi : null;
  const rsiStatus = latestRsi === null ? "—" : latestRsi > 70 ? "Overbought" : latestRsi < 30 ? "Oversold" : "Neutral";
  const rsiColor  = latestRsi === null ? "var(--text-muted)"
    : latestRsi > 70 ? "var(--negative)" : latestRsi < 30 ? "var(--positive)" : "#fbbf24";
  const rsiBg     = latestRsi === null ? "var(--bg-input)"
    : latestRsi > 70 ? "var(--negative-soft)" : latestRsi < 30 ? "var(--positive-soft)" : "rgba(251,191,36,0.12)";

  const TOOLTIP = {
    contentStyle: { background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, boxShadow: "var(--shadow-dropdown)", fontSize: 12 },
    labelStyle: { color: "var(--text-muted)" },
    itemStyle: { color: "var(--text-primary)" },
  };

  const NO_DATA = (
    <div className="h-[140px] flex items-center justify-center text-sm rounded-xl" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>
      Không có dữ liệu
    </div>
  );

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Chỉ số kỹ thuật</h2>
        {tickers.length > 0 && (
          <div className="flex gap-0.5 p-1 rounded-xl flex-wrap max-w-[220px] justify-end" style={{ background: "var(--bg-input)" }}>
            {tickers.map((t, i) => (
              <button key={`${t.ticker}-${i}`} onClick={() => setSelectedIdx(i)}
                className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
                style={selectedIdx === i
                  ? { background: "var(--accent)", color: "#fff" }
                  : { color: "var(--text-muted)" }}>
                {t.ticker}
                {t.type === "CRYPTO" && <span className="ml-0.5 text-[9px]" style={{ color: "#fbbf24" }}>₿</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {holdings.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--text-muted)" }}>
          Thêm holdings để xem chỉ số kỹ thuật
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* RSI */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>RSI (14)</span>
              <div className="flex items-center gap-2">
                {latestRsi !== null && <span className="num text-sm font-bold" style={{ color: rsiColor }}>{latestRsi}</span>}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: rsiBg, color: rsiColor, border: `1px solid ${rsiBg}` }}>
                  {rsiStatus}
                </span>
              </div>
            </div>
            {loading ? <Skeleton /> : !rsiData.length ? NO_DATA : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={rsiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--chart-tick)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--chart-tick)", fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip {...TOOLTIP} />
                  <ReferenceLine y={70} stroke="var(--negative)" strokeDasharray="3 3" strokeOpacity={0.6} />
                  <ReferenceLine y={30} stroke="var(--positive)" strokeDasharray="3 3" strokeOpacity={0.6} />
                  <Line type="monotone" dataKey="rsi" stroke="#f97316" strokeWidth={1.5} dot={false}
                    activeDot={{ r: 3, fill: "#f97316", stroke: "var(--bg-card)", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* MACD */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>MACD (12,26,9)</span>
              <div className="flex gap-3 text-[10px]">
                <span className="flex items-center gap-1" style={{ color: "#818cf8" }}>
                  <span className="w-3 h-0.5 rounded inline-block" style={{ background: "#6366f1" }} /> MACD
                </span>
                <span className="flex items-center gap-1" style={{ color: "#fb923c" }}>
                  <span className="w-3 h-0.5 rounded inline-block" style={{ background: "#f97316" }} /> Signal
                </span>
              </div>
            </div>
            {loading ? <Skeleton /> : !macdData.length ? NO_DATA : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={macdData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--chart-tick)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--chart-tick)", fontSize: 9 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip {...TOOLTIP} />
                  <ReferenceLine y={0} stroke="var(--border-2)" />
                  <Bar dataKey="hist" fill="#6366f1" opacity={0.65} radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="macd" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="signal" stroke="#f97316" strokeWidth={1.2} dot={false} strokeDasharray="3 3" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
