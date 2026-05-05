"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { binance as binanceApi, portfolio as portfolioApi } from "@/lib/api";
import {
  ArrowRight, RefreshCw, TrendingUp, DollarSign,
  CheckCircle2, XCircle, Clock, Repeat2, Zap,
  ShoppingCart, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

type Tab = "DCA" | "CONVERT" | "SPOT";
const DCA_START = new Date("2026-04-29T00:00:00.000Z");

const COIN_PALETTE: Record<string, string> = {
  BTC:"#f7931a", ETH:"#627eea", BNB:"#f3ba2f", SOL:"#9945ff",
  XRP:"#00aae4", ADA:"#0033ad", LINK:"#2a5ada", DOT:"#e6007a",
  AVAX:"#e84142", MATIC:"#8247e5", UNI:"#ff007a", LTC:"#bfbbbb",
  USDT:"#26a17b", USDC:"#2775ca",
};
const coinColor = (t: string) => COIN_PALETTE[t?.toUpperCase()] ?? "#6366f1";

function fmtDateFull(d: string | Date) {
  return new Date(d).toLocaleString("vi-VN", {
    weekday:"short", day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit",
  });
}
function fmtNum(n: number, dec = 6) {
  if (!n) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: dec });
}

/* ── DCA Section (giữ nguyên) ── */
function DcaSection() {
  const [plans, setPlans]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    binanceApi.autoInvestHistory(undefined, 500)
      .then((res: any) => {
        if (res?.error) { setError(res.error); return; }
        setPlans((res?.plans ?? []).filter((p: any) => new Date(p.time) >= DCA_START));
      })
      .catch((e: any) => setError(e?.message ?? "Lỗi"))
      .finally(() => setLoading(false));
  }, []);

  const coinSummary: Record<string, { spent: number; received: number; executions: number }> = {};
  for (const plan of plans) {
    for (const a of (plan.assets ?? [])) {
      if (!coinSummary[a.asset]) coinSummary[a.asset] = { spent:0, received:0, executions:0 };
      coinSummary[a.asset].spent      += a.spent  ?? 0;
      coinSummary[a.asset].received   += a.amount ?? 0;
      coinSummary[a.asset].executions += 1;
    }
  }

  const totalSpent = Object.values(coinSummary).reduce((s,c)=>s+c.spent, 0);
  const totalExec  = plans.length;
  const coinCount  = Object.keys(coinSummary).length;

  if (error) return (
    <div className="flex items-center gap-3 p-4 rounded-xl text-sm"
      style={{ background:"var(--negative-soft)", color:"var(--negative)", border:"1px solid rgba(239,68,68,0.2)" }}>
      <XCircle className="w-4 h-4 shrink-0"/>{error}
    </div>
  );

  return (
    <div className="space-y-5">
      {!loading && totalExec > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"Tổng đã đầu tư", value:`$${fmtNum(totalSpent,2)}`, icon:DollarSign, color:"#6366f1" },
            { label:"Số lần thực thi", value:`${totalExec} lần`,         icon:RefreshCw,  color:"#22c55e" },
            { label:"Coin đang DCA",   value:`${coinCount} coin`,         icon:TrendingUp, color:"#f97316" },
          ].map(s => { const Icon=s.icon; return (
            <div key={s.label} className="card p-4 flex items-center gap-4" style={{ border:`1px solid ${s.color}22` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:`${s.color}15`, border:`1px solid ${s.color}30` }}>
                <Icon className="w-5 h-5" style={{ color:s.color }}/>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{s.label}</p>
                <p className="num font-black text-xl" style={{ color:s.color }}>{s.value}</p>
              </div>
            </div>
          );})}
        </div>
      )}

      {!loading && Object.keys(coinSummary).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Object.entries(coinSummary).sort((a,b)=>b[1].spent-a[1].spent).map(([coin,s]) => {
            const cc  = coinColor(coin);
            const avg = s.received > 0 ? s.spent / s.received : 0;
            return (
              <div key={coin} className="card overflow-hidden" style={{ border:`1px solid ${cc}25` }}>
                <div className="h-0.5 w-full" style={{ background:`linear-gradient(90deg,${cc},${cc}66)` }}/>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white"
                        style={{ background:`linear-gradient(135deg,${cc},${cc}bb)`, boxShadow:`0 2px 8px ${cc}44` }}>
                        {coin.slice(0,3)}
                      </div>
                      <span className="font-bold text-[15px]" style={{ color:"var(--text-primary)" }}>{coin}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background:`${cc}18`, color:cc, border:`1px solid ${cc}30` }}>
                      {s.executions} lần
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[11px]" style={{ color:"var(--text-muted)" }}>Đã đầu tư</span>
                      <span className="num text-[13px] font-bold" style={{ color:"var(--text-primary)" }}>${fmtNum(s.spent,2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px]" style={{ color:"var(--text-muted)" }}>Đã nhận</span>
                      <span className="num text-[13px] font-semibold" style={{ color:cc }}>{fmtNum(s.received,6)}</span>
                    </div>
                    <div className="h-px" style={{ background:"var(--border)" }}/>
                    <div className="flex justify-between">
                      <span className="text-[11px]" style={{ color:"var(--text-muted)" }}>Giá TB mua</span>
                      <span className="num text-[13px] font-black" style={{ color:cc }}>${fmtNum(avg,2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card overflow-hidden" style={{ border:"1px solid var(--border)" }}>
        <div className="px-5 py-4" style={{ borderBottom:"1px solid var(--border)" }}>
          <h3 className="font-semibold text-sm" style={{ color:"var(--text-primary)" }}>
            Chi tiết từng lần DCA
            {!loading && <span className="ml-2 text-[11px] font-normal" style={{ color:"var(--text-muted)" }}>({plans.length} lần)</span>}
          </h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-2.5">
            {[...Array(5)].map((_,i)=><div key={i} className="h-12 shimmer-skeleton rounded-xl"/>)}
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Clock className="w-10 h-10" style={{ color:"var(--text-muted)" }}/>
            <p className="text-sm" style={{ color:"var(--text-muted)" }}>Chưa có lần DCA nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr style={{ borderBottom:"1px solid var(--border)" }}>
                  {["Thời gian","Kế hoạch","Coin","USDT bỏ ra","Nhận được","Giá thực mua","Trạng thái"].map(h=>(
                    <th key={h} className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider"
                      style={{ color:"var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map(plan =>
                  (plan.assets??[]).map((a:any, ai:number) => {
                    const cc = coinColor(a.asset);
                    const execPrice = a.executionPrice ?? (a.amount>0?a.spent/a.amount:0);
                    const ok = !['FAILED','CANCELED','ERROR'].includes(a.status?.toUpperCase());
                    return (
                      <tr key={`${plan.id}-${ai}`} style={{ borderBottom:"1px solid var(--border)" }}
                        onMouseEnter={e=>(e.currentTarget.style.background=`${cc}07`)}
                        onMouseLeave={e=>(e.currentTarget.style.background="")}>
                        <td className="py-3.5 px-4 text-[11px]" style={{ color:"var(--text-muted)" }}>{fmtDateFull(plan.time)}</td>
                        <td className="py-3.5 px-4 text-[12px]" style={{ color:"var(--text-secondary)" }}>{plan.planName||`Plan #${plan.planId}`}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0"
                              style={{ background:`linear-gradient(135deg,${cc},${cc}bb)` }}>
                              {a.asset?.slice(0,3)}
                            </div>
                            <span className="font-bold text-[12px]" style={{ color:"var(--text-primary)" }}>{a.asset}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="num font-semibold text-[13px]" style={{ color:"var(--negative)" }}>-${fmtNum(a.spent??0,4)}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="num font-bold text-[13px]" style={{ color:cc }}>+{fmtNum(a.amount??0,6)}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="num font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>${fmtNum(execPrice,2)}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {ok
                              ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color:"var(--positive)" }}/>
                              : <XCircle      className="w-3.5 h-3.5" style={{ color:"var(--negative)" }}/>}
                            <span className="text-[11px] font-semibold" style={{ color:ok?"var(--positive)":"var(--negative)" }}>
                              {ok?"Thành công":a.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Convert Section (bank statement style) ── */
function ConvertSection() {
  const [trades, setTrades]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [filter, setFilter]   = useState("ALL");

  useEffect(() => {
    binanceApi.convertHistory(1000)
      .then((res:any) => { if(res?.error){setError(res.error);return;} setTrades(res?.trades??[]); })
      .catch((e:any) => setError(e?.message??"Lỗi"))
      .finally(() => setLoading(false));
  }, []);

  const toAssets = Array.from(new Set(trades.map(t=>t.toAsset))).sort() as string[];
  const filtered = filter==="ALL" ? trades : trades.filter(t=>t.toAsset===filter||t.fromAsset===filter);
  const totalSpent    = filtered.filter(t=>["USDT","BUSD","USDC"].includes(t.fromAsset)).reduce((s,t)=>s+t.fromAmount,0);
  const totalReceived = filtered.filter(t=>["USDT","BUSD","USDC"].includes(t.toAsset)).reduce((s,t)=>s+t.toAmount,0);

  // Group by date
  const grouped: Record<string, typeof filtered> = {};
  for (const t of filtered) {
    const day = new Date(t.time).toLocaleDateString("vi-VN", {
      weekday:"long", day:"2-digit", month:"2-digit", year:"numeric",
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(t);
  }

  if (error) return (
    <div className="flex items-center gap-3 p-4 rounded-xl text-sm"
      style={{ background:"var(--negative-soft)", color:"var(--negative)", border:"1px solid rgba(239,68,68,0.2)" }}>
      <XCircle className="w-4 h-4 shrink-0"/>{error}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Stats */}
      {!loading && trades.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"Tổng giao dịch", value:`${trades.length} lần`, sub:`${toAssets.length} loại coin`, color:"#6366f1", icon:Repeat2   },
            { label:"USDT đã dùng",   value:`$${fmtNum(totalSpent,2)}`,    sub:"tổng bỏ ra",  color:"#ef4444", icon:DollarSign },
            { label:"USDT đã nhận",   value:`$${fmtNum(totalReceived,2)}`, sub:"tổng thu về", color:"#22c55e", icon:TrendingUp  },
          ].map(s => { const Icon=s.icon; return (
            <div key={s.label} className="card p-4 flex items-center gap-3" style={{ border:`1px solid ${s.color}18` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${s.color}12` }}>
                <Icon className="w-4 h-4" style={{ color:s.color }}/>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{s.label}</p>
                <p className="num font-black text-lg leading-tight" style={{ color:s.color }}>{s.value}</p>
                <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>{s.sub}</p>
              </div>
            </div>
          );})}
        </div>
      )}

      {/* Filter */}
      {toAssets.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL",...toAssets].map(a => {
            const cc = a==="ALL" ? "#6366f1" : coinColor(a);
            const sel = filter===a;
            return (
              <button key={a} onClick={()=>setFilter(a)}
                className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={sel
                  ?{background:cc, color:"#fff"}
                  :{background:"var(--bg-input)", color:"var(--text-muted)", border:"1px solid var(--border)"}}>
                {a==="ALL"?"Tất cả":a}
              </button>
            );
          })}
        </div>
      )}

      {/* Sao kê theo ngày */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_,i)=><div key={i} className="h-16 shimmer-skeleton rounded-xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-3">
          <Repeat2 className="w-10 h-10" style={{ color:"var(--text-muted)" }}/>
          <p className="text-sm" style={{ color:"var(--text-muted)" }}>Không có giao dịch nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([day, dayTrades]) => (
            <div key={day}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[11px] font-bold capitalize" style={{ color:"var(--text-muted)" }}>{day}</p>
                <div className="flex-1 h-px" style={{ background:"var(--border)" }}/>
                <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>{dayTrades.length} giao dịch</p>
              </div>

              {/* Transaction rows */}
              <div className="card overflow-hidden" style={{ border:"1px solid var(--border)" }}>
                {dayTrades.map((t, i) => {
                  const fromColor = coinColor(t.fromAsset);
                  const toColor   = coinColor(t.toAsset);
                  const ok        = t.status === "SUCCESS";
                  const time      = new Date(t.time).toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit" });
                  return (
                    <div key={t.id}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-input)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="")}>

                      {/* Time */}
                      <span className="num text-[11px] w-10 shrink-0" style={{ color:"var(--text-muted)" }}>{time}</span>

                      {/* From pill */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background:`${fromColor}12`, border:`1px solid ${fromColor}25` }}>
                        <span className="num text-[12px] font-bold" style={{ color:fromColor }}>-{fmtNum(t.fromAmount,4)}</span>
                        <span className="text-[11px] font-bold" style={{ color:fromColor }}>{t.fromAsset}</span>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color:"var(--text-muted)" }}/>

                      {/* To pill */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background:`${toColor}12`, border:`1px solid ${toColor}25` }}>
                        <span className="num text-[12px] font-bold" style={{ color:toColor }}>+{fmtNum(t.toAmount,6)}</span>
                        <span className="text-[11px] font-bold" style={{ color:toColor }}>{t.toAsset}</span>
                      </div>

                      {/* Rate */}
                      <span className="num text-[11px] flex-1 text-right" style={{ color:"var(--text-muted)" }}>
                        1 {t.toAsset} = {fmtNum(t.ratio,4)} {t.fromAsset}
                      </span>

                      {/* Status dot */}
                      <div className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: ok ? "var(--positive)" : "var(--negative)" }}/>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Spot Section ── */
function SpotSection() {
  const [coins,        setCoins]        = useState<string[]>([]);
  const [selected,     setSelected]     = useState<string>("ALL");
  const [trades,       setTrades]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [error,        setError]        = useState("");

  // Load danh sách coin từ holdings
  useEffect(() => {
    portfolioApi.holdings()
      .then((h: any[]) => {
        const tickers = h.filter(x => x.type === "CRYPTO").map(x => x.ticker as string);
        setCoins(tickers);
      })
      .catch(() => setCoins([]))
      .finally(() => setLoadingCoins(false));
  }, []);

  // Load trades khi coin hoặc "ALL" thay đổi
  useEffect(() => {
    if (loadingCoins || coins.length === 0) return;
    setLoading(true); setError(""); setTrades([]);

    const targets = selected === "ALL" ? coins : [selected];
    Promise.allSettled(
      targets.map(c =>
        binanceApi.trades(`${c}USDT`, 500).then((res: any) => {
          if (res?.error || !Array.isArray(res)) return [];
          return res.map((t: any) => ({ ...t, ticker: c }));
        }).catch(() => [])
      )
    ).then(results => {
      const all = results
        .flatMap(r => r.status === "fulfilled" ? r.value : [])
        .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setTrades(all);
    }).catch((e: any) => setError(e?.message ?? "Lỗi"))
      .finally(() => setLoading(false));
  }, [selected, coins.join(","), loadingCoins]); // eslint-disable-line

  const buys  = trades.filter(t => t.side === "BUY");
  const sells = trades.filter(t => t.side === "SELL");
  const totalBought = buys.reduce((s, t) => s + t.total, 0);
  const totalSold   = sells.reduce((s, t) => s + t.total, 0);
  const totalQtyBought = buys.reduce((s, t) => s + t.qty, 0);
  const avgBuy = totalQtyBought > 0 ? totalBought / totalQtyBought : 0;

  // Group theo ngày
  const grouped: Record<string, typeof trades> = {};
  for (const t of trades) {
    const day = new Date(t.time).toLocaleDateString("vi-VN", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(t);
  }

  const cc = selected === "ALL" ? "#6366f1" : coinColor(selected);

  return (
    <div className="space-y-5">

      {/* Coin selector */}
      {loadingCoins ? (
        <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className="h-8 w-16 shimmer-skeleton rounded-xl"/>)}</div>
      ) : coins.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Chưa có coin nào. Sync Binance trước.</p>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Nút Tất cả */}
          <button onClick={() => setSelected("ALL")}
            className="px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
            style={selected === "ALL"
              ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.4)" }
              : { background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            Tất cả
          </button>
          {coins.map(c => {
            const clr = coinColor(c); const sel = selected === c;
            return (
              <button key={c} onClick={() => setSelected(c)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
                style={sel
                  ? { background: clr, color: "#fff", boxShadow: `0 2px 8px ${clr}55` }
                  : { background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black"
                  style={{ background: sel ? "rgba(255,255,255,0.25)" : `${clr}25`, color: sel ? "#fff" : clr }}>
                  {c.slice(0,3)}
                </span>
                {c}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm"
          style={{ background: "var(--negative-soft)", color: "var(--negative)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <XCircle className="w-4 h-4 shrink-0"/>{error}
        </div>
      )}

      {/* Stats */}
      {!loading && trades.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Tổng giao dịch", value: `${trades.length} lần`,    icon: ShoppingCart,   color: cc          },
            { label: "USDT đã mua",    value: `$${fmtNum(totalBought,2)}`, icon: ArrowDownRight, color: "#ef4444"   },
            { label: "USDT đã bán",    value: `$${fmtNum(totalSold,2)}`,   icon: ArrowUpRight,   color: "#22c55e"   },
            { label: "Giá TB mua",     value: `$${fmtNum(avgBuy,2)}`,      icon: TrendingUp,     color: "#a78bfa"   },
          ].map(s => { const Icon = s.icon; return (
            <div key={s.label} className="card p-4 flex items-center gap-3" style={{ border: `1px solid ${s.color}18` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}12` }}>
                <Icon className="w-4 h-4" style={{ color: s.color }}/>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="num font-black text-base leading-tight" style={{ color: s.color }}>{s.value}</p>
              </div>
            </div>
          );})}
        </div>
      )}

      {/* Trade list grouped by date */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="h-14 shimmer-skeleton rounded-xl"/>)}</div>
      ) : trades.length === 0 && !error ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-3">
          <ShoppingCart className="w-10 h-10" style={{ color: "var(--text-muted)" }}/>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {selected === "ALL" ? "Không có spot trade nào" : `Không có spot trade nào cho ${selected}`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([day, dayTrades]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[11px] font-bold capitalize" style={{ color: "var(--text-muted)" }}>{day}</p>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }}/>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{dayTrades.length} lần</p>
              </div>
              <div className="card overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {dayTrades.map((t, i) => {
                  const isBuy     = t.side === "BUY";
                  const sideColor = isBuy ? "#ef4444" : "#22c55e";
                  const ticker    = t.ticker ?? selected;
                  const tColor    = coinColor(ticker);
                  const time      = new Date(t.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={i} className="flex items-center gap-4 px-4 py-3.5 transition-colors"
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-input)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>

                      {/* Time */}
                      <span className="num text-[11px] w-10 shrink-0" style={{ color: "var(--text-muted)" }}>{time}</span>

                      {/* Side badge */}
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md w-10 text-center shrink-0"
                        style={{ background: `${sideColor}15`, color: sideColor }}>
                        {isBuy ? "MUA" : "BÁN"}
                      </span>

                      {/* Coin */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white"
                          style={{ background: `linear-gradient(135deg,${tColor},${tColor}bb)` }}>
                          {ticker.slice(0,3)}
                        </div>
                        <span className="font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>{ticker}</span>
                      </div>

                      {/* Qty */}
                      <span className="num text-[13px] font-bold flex-1" style={{ color: tColor }}>
                        {isBuy ? "+" : "-"}{fmtNum(t.qty, 6)}
                      </span>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="num text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>${fmtNum(t.price, 2)}</p>
                        <p className="num text-[10px]" style={{ color: "var(--text-muted)" }}>mỗi {selected}</p>
                      </div>

                      {/* Total */}
                      <div className="text-right shrink-0 w-24">
                        <p className="num text-[13px] font-bold" style={{ color: isBuy ? "#ef4444" : "#22c55e" }}>
                          {isBuy ? "-" : "+"}${fmtNum(t.total, 2)}
                        </p>
                        <p className="num text-[10px]" style={{ color: "var(--text-muted)" }}>USDT</p>
                      </div>

                      {/* Fee */}
                      <div className="text-right shrink-0 w-24">
                        <p className="num text-[11px]" style={{ color: "var(--text-muted)" }}>
                          fee {fmtNum(t.fee, 6)} {t.feeAsset}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function TradesPage() {
  const [tab, setTab] = useState<Tab>("CONVERT");
  return (
    <div className="min-h-screen" style={{ background:"var(--bg-primary)" }}>
      <Sidebar/>
      <div className="ml-56 p-6 space-y-5">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#6366f1,#818cf8)", boxShadow:"0 4px 16px rgba(99,102,241,0.35)" }}>
              <Zap className="w-6 h-6 text-white"/>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color:"var(--text-primary)" }}>Lịch sử giao dịch</h1>
              <p className="text-sm mt-0.5" style={{ color:"var(--text-muted)" }}>DCA định kỳ · Chuyển đổi · Spot trade</p>
            </div>
          </div>
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background:"var(--bg-input)", border:"1px solid var(--border)" }}>
            {([
              { id:"CONVERT" as Tab, label:"Chuyển đổi", icon:Repeat2      },
              { id:"DCA"     as Tab, label:"DCA Định kỳ", icon:RefreshCw    },
              { id:"SPOT"    as Tab, label:"Spot Trade",  icon:ShoppingCart },
            ]).map(t => { const Icon=t.icon; const sel=tab===t.id; return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={sel
                  ?{background:"var(--accent)",color:"#fff",boxShadow:"0 2px 8px rgba(99,102,241,0.3)"}
                  :{color:"var(--text-muted)"}}>
                <Icon className="w-4 h-4"/>{t.label}
              </button>
            );})}
          </div>
        </div>
        {tab==="DCA" ? <DcaSection/> : tab==="CONVERT" ? <ConvertSection/> : <SpotSection/>}
      </div>
    </div>
  );
}
