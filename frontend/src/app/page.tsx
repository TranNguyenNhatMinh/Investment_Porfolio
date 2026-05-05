"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import AuroraHero from "@/components/dashboard/AuroraHero";
import InvestmentBarChart from "@/components/dashboard/InvestmentBarChart";
import AllocationChart from "@/components/dashboard/AllocationChart";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import AIAnalysis from "@/components/dashboard/AIAnalysis";
import DcaSummary from "@/components/dashboard/DcaSummary";
import Sidebar from "@/components/Sidebar";
import { portfolio as portfolioApi, prices as pricesApi, binance as binanceApi, clearApiCache } from "@/lib/api";
import { subscribePrices } from "@/lib/socket";
import { useTheme } from "@/lib/theme";


function fmtUsd(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

/* ── Market ticker item ── */
function TickerItem({ symbol, price, change }: { symbol: string; price: number; change: number }) {
  const pos = change >= 0;
  return (
    <div className="flex items-center gap-2 px-4 py-2 shrink-0">
      <span className="text-[11px] font-bold tracking-wide" style={{ color: "var(--text-secondary)" }}>{symbol}</span>
      <span className="num text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>{fmtUsd(price)}</span>
      <span className="num text-[11px] font-bold flex items-center gap-0.5"
        style={{ color: pos ? "var(--positive)" : "var(--negative)" }}>
        {pos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(change).toFixed(2)}%
      </span>
    </div>
  );
}


const TICKERS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "LINKUSDT"];

export default function Dashboard() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const [holdings, setHoldings]   = useState<any[]>([]);
  const [summary,  setSummary]    = useState<any>(null);
  const [usdVnd,   setUsdVnd]     = useState(25_400);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [market,     setMarket]     = useState<{ symbol: string; price: number; change: number }[]>([]);
  const subscribedRef = useRef<string>("");

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      // Xóa cache summary/holdings để luôn lấy giá live mới nhất
      clearApiCache('/portfolio/summary');
      clearApiCache('/portfolio/holdings');
    } else {
      setRefreshing(true);
      clearApiCache();
    }
    try {
      const [h, s, fx] = await Promise.all([
        portfolioApi.holdings(),
        portfolioApi.summary(),
        pricesApi.forexRate(),
      ]);
      setHoldings(h);
      setSummary(s);
      setUsdVnd(fx.rate);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, []);

  // Market ticker prices
  useEffect(() => {
    Promise.allSettled(
      TICKERS.map(s => binanceApi.price(s.replace("USDT", "")).then((r: any) => ({
        symbol: s.replace("USDT", ""),
        price: r.price,
        change: r.changePercent24h,
      })))
    ).then(results => {
      setMarket(results.filter(r => r.status === "fulfilled").map(r => (r as any).value));
    });
  }, []);

  // WebSocket live prices
  useEffect(() => {
    if (!holdings.length) return;
    const tickers = holdings.filter(h => h.type === "STOCK").map(h => h.ticker);
    if (!tickers.length) return;
    const key = tickers.join(",");
    if (key === subscribedRef.current) return;
    subscribedRef.current = key;
    const unsub = subscribePrices(tickers, (quotes: any[]) => {
      setHoldings(prev => prev.map(h => {
        const q = quotes.find((q: any) => q.ticker === h.ticker);
        return q?.price ? { ...h, currentPrice: q.price } : h;
      }));
    });
    return unsub;
  }, [holdings.map(h => h.ticker).join(",")]); // eslint-disable-line

  const now = new Date();
  const dateStr = now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />

      <div className="ml-56 flex flex-col min-h-screen">

        {/* ══ STICKY TOPBAR ══════════════════════════════════════════ */}
        <header className="sticky top-0 z-20 backdrop-blur-xl px-6 py-2.5"
          style={{ background: isDark ? "rgba(7,9,18,0.90)" : "rgba(241,245,249,0.92)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Investment Dashboard</p>
              <p className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>{dateStr}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: "var(--positive-soft)", color: "var(--positive)", border: "1px solid rgba(34,197,94,0.20)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                LIVE
              </div>
              <button onClick={() => loadData(true)} disabled={refreshing}
                className="p-1.5 rounded-xl transition-colors" style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button onClick={toggle} className="p-1.5 rounded-xl transition-colors"
                style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Market ticker strip */}
        {market.length > 0 && (
          <div className="flex items-center gap-0 overflow-x-auto px-4 py-2"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
            {market.map(m => <TickerItem key={m.symbol} {...m} />)}
          </div>
        )}

        {/* ══ MAIN CONTENT ══════════════════════════════════════════ */}
        <main className="flex-1 p-5 space-y-5">

          {/* ── Aurora Hero (số to + breakdown + chart) ── */}
          <AuroraHero summary={summary} usdVnd={usdVnd} loading={loading} holdings={holdings} />

          {/* ── Bar chart đầu tư + Pie chart phân bổ ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <InvestmentBarChart />
            </div>
            <AllocationChart summary={summary} holdings={holdings} usdVnd={usdVnd} loading={loading} />
          </div>

          <DcaSummary />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <PerformanceChart holdings={holdings} usdVnd={usdVnd} loading={loading} />
            <AIAnalysis />
          </div>

        </main>

        <footer className="px-6 py-3 text-center text-[10px]"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
          Investment Portfolio · Dữ liệu chỉ mang tính tham khảo, không phải tư vấn tài chính.
        </footer>
      </div>
    </div>
  );
}
