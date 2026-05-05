"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { binance as binanceApi } from "@/lib/api";
import { TrendingUp, Gift, Clock, Percent, CheckCircle2, ArrowUpRight, Zap } from "lucide-react";

const COIN_PALETTE: Record<string, string> = {
  BTC:"#f7931a", ETH:"#627eea", BNB:"#f3ba2f", SOL:"#9945ff",
  XRP:"#00aae4", ADA:"#0033ad", LINK:"#2a5ada", DOT:"#e6007a",
  AVAX:"#e84142", MATIC:"#8247e5", USDT:"#26a17b", BUSD:"#f0b90b",
};
const coinColor = (t: string) => COIN_PALETTE[t?.toUpperCase()] ?? "#6366f1";

function fmtNum(n: number, dec = 6) {
  if (!n) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: dec });
}

function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3" style={{ border:"1px solid var(--border)" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shimmer-skeleton rounded-xl"/>
        <div className="h-4 w-20 shimmer-skeleton rounded"/>
      </div>
      <div className="space-y-2">
        {[80,60,70].map(w=><div key={w} className="h-3 shimmer-skeleton rounded" style={{ width:`${w}%` }}/>)}
      </div>
    </div>
  );
}

export default function EarnPage() {
  const [flexible, setFlexible] = useState<any>(null);
  const [dividends, setDividends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([binanceApi.earnFlexible(), binanceApi.dividends(100)])
      .then(([f,d]) => { setFlexible(f); setDividends(d); })
      .finally(() => setLoading(false));
  }, []);

  const positions: any[] = flexible?.rows ?? [];
  const divRows: any[]   = dividends?.rows ?? [];

  const groupedDiv = divRows.reduce((acc: any, d: any) => {
    acc[d.asset] = (acc[d.asset] ?? 0) + parseFloat(d.amount);
    return acc;
  }, {});

  const totalPositions = positions.length;
  const totalYesterdayRewards = positions.reduce((s,p)=>s+parseFloat(p.yesterdayRealTimeRewards??0),0);
  const totalCumRewards = positions.reduce((s,p)=>s+parseFloat(p.cumulativeTotalRewards??0),0);

  return (
    <div className="min-h-screen" style={{ background:"var(--bg-primary)" }}>
      <Sidebar/>
      <div className="ml-56 flex flex-col min-h-screen">

        {/* Sticky topbar */}
        <header className="sticky top-0 z-20 backdrop-blur-xl px-6 py-3"
          style={{ background:"var(--bg-topbar,rgba(7,9,18,0.88))", borderBottom:"1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold tracking-tight" style={{ color:"var(--text-primary)" }}>Binance Earn</p>
              <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>Lãi định kỳ và phần thưởng từ Simple Earn</p>
            </div>
            {!loading && totalPositions > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{ background:"var(--positive-soft)", color:"var(--positive)", border:"1px solid rgba(34,197,94,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
                {totalPositions} vị thế đang hoạt động
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 space-y-4">

        {/* Stats */}
        {!loading && totalPositions > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"Vị thế đang earn", value:`${totalPositions} coin`,          icon:Zap,        color:"#facc15" },
              { label:"Nhận hôm qua",     value:`≈ ${fmtNum(totalYesterdayRewards,6)}`, icon:ArrowUpRight,color:"#22c55e" },
              { label:"Tổng đã nhận",     value:`≈ ${fmtNum(totalCumRewards,4)}`,  icon:Gift,       color:"#a78bfa" },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="card p-4 flex items-center gap-4" style={{ border:`1px solid ${s.color}22` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background:`${s.color}15`, border:`1px solid ${s.color}30` }}>
                    <Icon className="w-5 h-5" style={{ color:s.color }}/>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{s.label}</p>
                    <p className="num font-black text-lg leading-tight" style={{ color:s.color }}>{s.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Flexible Earn positions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:"rgba(251,191,36,0.15)" }}>
              <Percent className="w-3.5 h-3.5" style={{ color:"#fbbf24" }}/>
            </div>
            <h2 className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>Simple Earn Flexible</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_,i)=><SkeletonCard key={i}/>)}
            </div>
          ) : positions.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 gap-3" style={{ border:"1px solid var(--border)" }}>
              <Percent className="w-10 h-10" style={{ color:"var(--text-muted)" }}/>
              <p className="text-sm" style={{ color:"var(--text-muted)" }}>Không có vị thế Earn nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {positions.map((p:any) => {
                const cc = coinColor(p.asset);
                const apr = (parseFloat(p.latestAnnualPercentageRate)*100).toFixed(2);
                const total = parseFloat(p.totalAmount);
                const cumRewards = parseFloat(p.cumulativeTotalRewards??0);
                const yesterdayRewards = parseFloat(p.yesterdayRealTimeRewards??0);
                return (
                  <div key={p.productId} className="card overflow-hidden" style={{ border:`1px solid ${cc}25` }}>
                    <div className="h-0.5" style={{ background:`linear-gradient(90deg,${cc},${cc}55)` }}/>
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0"
                            style={{ background:`linear-gradient(135deg,${cc},${cc}bb)`, boxShadow:`0 2px 10px ${cc}44` }}>
                            {p.asset.slice(0,3)}
                          </div>
                          <div>
                            <p className="font-bold text-[15px]" style={{ color:"var(--text-primary)" }}>{p.asset}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                style={{ background:`${cc}18`, color:cc, border:`1px solid ${cc}30` }}>
                                APR {apr}%
                              </span>
                              {p.autoSubscribe && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background:"var(--accent-soft)", color:"var(--accent)", border:"1px solid var(--accent-border)" }}>
                                  Auto
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color:"var(--positive)" }}/>
                      </div>

                      {/* Stats */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color:"var(--text-muted)" }}>Đang gửi</span>
                          <span className="num font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>
                            {fmtNum(total,6)} <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>{p.asset}</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color:"var(--text-muted)" }}>Hôm qua nhận</span>
                          <span className="num font-semibold text-[13px]" style={{ color:"var(--positive)" }}>
                            +{fmtNum(yesterdayRewards,6)} {p.asset}
                          </span>
                        </div>
                        <div className="h-px" style={{ background:"var(--border)" }}/>
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color:"var(--text-muted)" }}>Tổng đã nhận</span>
                          <span className="num font-black text-[14px]" style={{ color:cc }}>
                            {fmtNum(cumRewards,6)} {p.asset}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tổng thưởng theo coin */}
        {!loading && Object.keys(groupedDiv).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:"rgba(167,139,250,0.15)" }}>
                <TrendingUp className="w-3.5 h-3.5" style={{ color:"#a78bfa" }}/>
              </div>
              <h2 className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>
                Tổng phần thưởng đã nhận
                <span className="ml-2 text-[11px] font-normal" style={{ color:"var(--text-muted)" }}>
                  ({dividends?.total ?? 0} giao dịch)
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {Object.entries(groupedDiv).sort((a:any,b:any)=>b[1]-a[1]).map(([asset,amount]:any) => {
                const cc = coinColor(asset);
                return (
                  <div key={asset} className="card p-3 text-center" style={{ border:`1px solid ${cc}20` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black text-white mx-auto mb-2"
                      style={{ background:`linear-gradient(135deg,${cc},${cc}bb)` }}>
                      {asset.slice(0,3)}
                    </div>
                    <p className="text-[10px] font-bold" style={{ color:cc }}>{asset}</p>
                    <p className="num text-[11px] font-black mt-0.5" style={{ color:"var(--text-primary)" }}>
                      {fmtNum(amount as number, 4)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lịch sử */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:"var(--accent-soft)" }}>
              <Clock className="w-3.5 h-3.5" style={{ color:"var(--accent)" }}/>
            </div>
            <h2 className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>Lịch sử nhận thưởng</h2>
          </div>

          <div className="card overflow-hidden" style={{ border:"1px solid var(--border)" }}>
            {loading ? (
              <div className="p-5 space-y-2.5">
                {[...Array(5)].map((_,i)=><div key={i} className="h-11 shimmer-skeleton rounded-xl"/>)}
              </div>
            ) : divRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <Clock className="w-10 h-10" style={{ color:"var(--text-muted)" }}/>
                <p className="text-sm" style={{ color:"var(--text-muted)" }}>Chưa có lịch sử</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom:"1px solid var(--border)" }}>
                      {["Thời gian","Loại","Số lượng","Tài sản"].map((h,i)=>(
                        <th key={h} className={`py-3 px-5 text-[10px] font-bold uppercase tracking-wider ${i>=2?"text-right":"text-left"}`}
                          style={{ color:"var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {divRows.slice(0,50).map((d:any) => {
                      const cc = coinColor(d.asset);
                      return (
                        <tr key={d.id} style={{ borderBottom:"1px solid var(--border)" }}
                          onMouseEnter={e=>(e.currentTarget.style.background=`${cc}07`)}
                          onMouseLeave={e=>(e.currentTarget.style.background="")}>
                          <td className="py-3 px-5 text-[11px]" style={{ color:"var(--text-muted)" }}>
                            {new Date(d.divTime).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                          </td>
                          <td className="py-3 px-5 text-[11px] max-w-[200px] truncate" style={{ color:"var(--text-secondary)" }}>
                            {d.enInfo}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className="num font-bold text-[13px]" style={{ color:cc }}>
                              +{parseFloat(d.amount).toFixed(6)}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right">
                            <span className="inline-flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white"
                                style={{ background:`linear-gradient(135deg,${cc},${cc}bb)` }}>
                                {d.asset.slice(0,3)}
                              </div>
                              <span className="font-bold text-[12px]" style={{ color:"var(--text-primary)" }}>{d.asset}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {divRows.length>50 && (
                  <div className="py-3 text-center text-xs" style={{ color:"var(--text-muted)" }}>
                    Hiển thị 50/{divRows.length} giao dịch
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        </main>
      </div>
    </div>
  );
}
