"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { portfolio as portfolioApi, prices as pricesApi } from "@/lib/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Landmark, DollarSign, Bitcoin, ArrowUpRight, ArrowDownRight } from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

const COIN_PALETTE: Record<string, string> = {
  BTC:"#f7931a", ETH:"#627eea", BNB:"#f3ba2f", SOL:"#9945ff",
  XRP:"#00aae4", ADA:"#0033ad", LINK:"#2a5ada", DOT:"#e6007a",
  AVAX:"#e84142", MATIC:"#8247e5", UNI:"#ff007a", ATOM:"#2e3148",
  LTC:"#bfbbbb", DOGE:"#c2a633", SHIB:"#e01a2b", FIL:"#0090ff",
};
const coinColor = (t: string) => COIN_PALETTE[t.toUpperCase()] ?? "#6366f1";

const ASSET_CONFIG = [
  { key:"crypto",  label:"Crypto",    icon:Bitcoin,    color:"#a78bfa", grad:"linear-gradient(135deg,#7c3aed22,#a78bfa11)" },
  { key:"stock",   label:"Cổ phiếu",  icon:TrendingUp, color:"#60a5fa", grad:"linear-gradient(135deg,#2563eb22,#60a5fa11)" },
  { key:"savings", label:"Tiết kiệm", icon:Landmark,   color:"#34d399", grad:"linear-gradient(135deg,#05966922,#34d39911)" },
  { key:"usdt",    label:"USDT",      icon:DollarSign, color:"#22d3ee", grad:"linear-gradient(135deg,#089118 22,#22d3ee11)" },
];

const COIN_COLORS = ["#a78bfa","#60a5fa","#34d399","#f97316","#f43f5e","#facc15","#2dd4bf","#fb923c"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{ background:"var(--bg-card)", border:`1px solid ${d.payload.fill}44` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background:d.payload.fill }} />
        <span className="font-bold" style={{ color:"var(--text-primary)" }}>{d.name}</span>
      </div>
      <p className="num font-bold" style={{ color:d.payload.fill }}>{fmt(d.value)} ₫</p>
      <p style={{ color:"var(--text-muted)" }}>{d.payload.pct}% danh mục</p>
    </div>
  );
};

function CenterLabel({ total, label }: { total:number; label:string }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-0.8em" fontSize="18" fontWeight="800" fill="var(--text-primary)" fontFamily="monospace">{fmt(total)}</tspan>
      <tspan x="50%" dy="1.6em" fontSize="10" fill="var(--text-muted)">{label}</tspan>
    </text>
  );
}

export default function AllocationPage() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [summary, setSummary]   = useState<any>(null);
  const [usdVnd, setUsdVnd]     = useState(25_400);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"crypto"|"stock">("overview");
  const [hovered, setHovered]   = useState<number|null>(null);

  useEffect(() => {
    Promise.all([portfolioApi.holdings(), portfolioApi.summary(), pricesApi.forexRate()])
      .then(([h,s,fx]) => { setHoldings(h); setSummary(s); setUsdVnd(fx.rate); })
      .finally(() => setLoading(false));
  }, []);

  const liveRate   = summary?.usdVnd ?? usdVnd;
  const cryptoVal  = summary?.crypto?.value  ?? 0;
  const stockVal   = summary?.stocks?.value  ?? 0;
  const savingsVnd = summary?.savingsVnd      ?? 0;
  const cashVnd    = (summary?.cashUsd ?? 0) * liveRate;
  const totalVal   = cryptoVal + stockVal + savingsVnd + cashVnd;

  const assetData = [
    { key:"crypto",  name:"Crypto",    value:cryptoVal,  pnl:summary?.crypto?.pnl ?? 0,        pct:totalVal?(cryptoVal /totalVal*100).toFixed(1):"0", fill:"#a78bfa" },
    { key:"stock",   name:"Cổ phiếu",  value:stockVal,   pnl:summary?.stocks?.pnl ?? 0,        pct:totalVal?(stockVal  /totalVal*100).toFixed(1):"0", fill:"#60a5fa" },
    { key:"savings", name:"Tiết kiệm", value:savingsVnd,  pnl:summary?.savingsInterest ?? 0,    pct:totalVal?(savingsVnd/totalVal*100).toFixed(1):"0", fill:"#34d399" },
    { key:"usdt",    name:"USDT",      value:cashVnd,     pnl:0,                                pct:totalVal?(cashVnd   /totalVal*100).toFixed(1):"0", fill:"#22d3ee" },
  ].filter(d => d.value > 0);

  const cryptoBreak = holdings.filter(h=>h.type==="CRYPTO")
    .map((h,i)=>{ const v=h.shares*(h.livePrice??h.currentPrice)*(h.currency==="USD"?liveRate:1); return {name:h.ticker,value:v,fill:COIN_COLORS[i%COIN_COLORS.length],pct:cryptoVal>0?(v/cryptoVal*100).toFixed(1):"0"}; })
    .filter(d=>d.value>0).sort((a,b)=>b.value-a.value);

  const stockBreak = holdings.filter(h=>h.type==="STOCK")
    .map((h,i)=>{ const v=h.shares*(h.livePrice??h.currentPrice)*(h.currency==="USD"?liveRate:1); return {name:h.ticker,value:v,fill:COIN_COLORS[i%COIN_COLORS.length],pct:stockVal>0?(v/stockVal*100).toFixed(1):"0"}; })
    .filter(d=>d.value>0).sort((a,b)=>b.value-a.value);

  const tabs = [
    { id:"overview" as const, label:"Tổng quan", data:assetData,   total:totalVal,  centerLabel:"tổng tài sản" },
    { id:"crypto"   as const, label:"Crypto",    data:cryptoBreak, total:cryptoVal, centerLabel:"crypto" },
    { id:"stock"    as const, label:"Cổ phiếu",  data:stockBreak,  total:stockVal,  centerLabel:"cổ phiếu" },
  ];
  const current = tabs.find(t=>t.id===activeTab)!;

  return (
    <div className="min-h-screen" style={{ background:"var(--bg-primary)" }}>
      <Sidebar />
      <div className="ml-56 flex flex-col min-h-screen">

        <header className="sticky top-0 z-20 backdrop-blur-xl px-6 py-3"
          style={{ background:"var(--bg-topbar,rgba(7,9,18,0.88))", borderBottom:"1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold tracking-tight" style={{ color:"var(--text-primary)" }}>Phân bổ danh mục</p>
              <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>Tỷ trọng theo loại tài sản và từng mã</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 space-y-4">

        {/* Asset cards */}
        <div className="grid grid-cols-4 gap-3">
          {ASSET_CONFIG.map(cfg => {
            const d = assetData.find(a=>a.key===cfg.key);
            const Icon = cfg.icon;
            const pos = d && d.pnl >= 0;
            return (
              <div key={cfg.key} className="card p-4 relative overflow-hidden"
                style={{ border:`1px solid ${cfg.color}33` }}>
                {/* glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background:cfg.grad }} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background:`${cfg.color}22`, border:`1px solid ${cfg.color}44` }}>
                      <Icon className="w-4 h-4" style={{ color:cfg.color }} />
                    </div>
                    {d && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background:`${cfg.color}22`, color:cfg.color, border:`1px solid ${cfg.color}44` }}>
                        {d.pct}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color:`${cfg.color}99` }}>{cfg.label}</p>
                  {loading
                    ? <div className="h-6 w-24 shimmer-skeleton rounded" />
                    : <>
                        <p className="num text-xl font-black" style={{ color:"var(--text-primary)" }}>
                          {d ? fmt(d.value) : "0"}<span className="text-sm font-semibold ml-1" style={{ color:"var(--text-muted)" }}>₫</span>
                        </p>
                        {d && d.pnl !== 0 && (
                          <p className="num text-xs font-semibold mt-0.5 flex items-center gap-0.5"
                            style={{ color:pos?"var(--positive)":"var(--negative)" }}>
                            {pos ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                            {pos?"+":""}{fmt(d.pnl)} ₫
                          </p>
                        )}
                      </>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart + table */}
        <div className="grid grid-cols-[340px_1fr] gap-4">

          {/* Donut */}
          <div className="card p-5" style={{ border:"1px solid var(--border)" }}>
            <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background:"var(--bg-input)" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={activeTab===t.id ? { background:"var(--accent)", color:"#fff" } : { color:"var(--text-muted)" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-52"><div className="w-36 h-36 rounded-full shimmer-skeleton" /></div>
            ) : current.data.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-sm" style={{ color:"var(--text-muted)" }}>Chưa có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={current.data} cx="50%" cy="50%"
                    innerRadius={65} outerRadius={95} paddingAngle={2} dataKey="value" strokeWidth={0}
                    onMouseEnter={(_,i)=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
                    {current.data.map((d,i) => (
                      <Cell key={i} fill={d.fill}
                        opacity={hovered===null||hovered===i?1:0.3}
                        style={{ transition:"opacity 0.2s,transform 0.2s", cursor:"pointer",
                          transform:hovered===i?"scale(1.06)":"scale(1)", transformOrigin:"center",
                          filter:hovered===i?`drop-shadow(0 0 6px ${d.fill}88)`:"none" }} />
                    ))}
                    <CenterLabel total={current.total} label={current.centerLabel} />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {!loading && (
              <div className="space-y-1.5 mt-2">
                {current.data.map((d,i) => (
                  <div key={d.name}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ background:hovered===i?`${d.fill}18`:"transparent", border:hovered===i?`1px solid ${d.fill}33`:"1px solid transparent" }}
                    onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:d.fill }} />
                      <span className="text-xs font-semibold" style={{ color:"var(--text-secondary)" }}>{d.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num text-xs font-semibold" style={{ color:"var(--text-primary)" }}>{fmt(d.value)} ₫</span>
                      <span className="num text-[11px] font-black w-10 text-right" style={{ color:d.fill }}>{d.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="card overflow-hidden" style={{ border:"1px solid var(--border)" }}>
            <div className="px-5 py-4" style={{ borderBottom:"1px solid var(--border)" }}>
              <h3 className="font-semibold text-sm" style={{ color:"var(--text-primary)" }}>Chi tiết từng tài sản</h3>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-12 shimmer-skeleton rounded-xl"/>)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom:"1px solid var(--border)" }}>
                      {["Tài sản","Loại","Giá trị (₫)","Tỷ trọng","P&L"].map(h=>(
                        <th key={h} className="py-3 px-5 text-left text-[10px] font-bold uppercase tracking-wider"
                          style={{ color:"var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings
                      .map(h=>{ const v=h.shares*(h.livePrice??h.currentPrice)*(h.currency==="USD"?liveRate:1); const cost=h.shares*h.buyPrice*(h.currency==="USD"?liveRate:1); return {...h,val:v,pnl:v-cost,pct:totalVal>0?v/totalVal*100:0}; })
                      .filter(h=>h.val>0).sort((a,b)=>b.val-a.val)
                      .map(h=>{
                        const pos = h.pnl >= 0;
                        const cc = coinColor(h.ticker);
                        const cfg = h.type==="CRYPTO" ? ASSET_CONFIG[0] : ASSET_CONFIG[1];
                        return (
                          <tr key={h.id} style={{ borderBottom:"1px solid var(--border)" }}
                            onMouseEnter={e=>(e.currentTarget.style.background=`${cc}08`)}
                            onMouseLeave={e=>(e.currentTarget.style.background="")}>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                                  style={{ background:`linear-gradient(135deg,${cc},${cc}bb)`, boxShadow:`0 2px 8px ${cc}44` }}>
                                  {h.ticker.slice(0,3)}
                                </div>
                                <div>
                                  <p className="font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>{h.ticker}</p>
                                  <p className="text-[11px]" style={{ color:"var(--text-muted)" }}>{h.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}33` }}>
                                {h.type==="CRYPTO"?"Crypto":"Cổ phiếu"}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="num font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>{fmt(h.val)} ₫</span>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"var(--bg-input)", maxWidth:80 }}>
                                  <div className="h-full rounded-full" style={{ width:`${Math.min(h.pct,100)}%`, background:`linear-gradient(90deg,${cc},${cc}bb)` }} />
                                </div>
                                <span className="num text-[11px] font-bold" style={{ color:cc }}>{h.pct.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-md flex items-center justify-center"
                                  style={{ background:pos?"var(--positive-soft)":"var(--negative-soft)" }}>
                                  {pos ? <ArrowUpRight className="w-3 h-3" style={{ color:"var(--positive)" }}/> : <ArrowDownRight className="w-3 h-3" style={{ color:"var(--negative)" }}/>}
                                </div>
                                <div>
                                  <p className="num text-[12px] font-bold" style={{ color:pos?"var(--positive)":"var(--negative)" }}>
                                    {pos?"+":""}{fmt(h.pnl)} ₫
                                  </p>
                                  <p className="num text-[10px]" style={{ color:pos?"var(--positive)":"var(--negative)" }}>
                                    {pos?"+":""}{h.shares>0&&h.buyPrice>0?(((h.livePrice??h.currentPrice)-h.buyPrice)/h.buyPrice*100).toFixed(2):"0.00"}%
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {/* Savings row */}
                    {savingsVnd > 0 && (() => {
                      const pct = totalVal > 0 ? savingsVnd/totalVal*100 : 0;
                      return (
                        <tr style={{ borderBottom:"1px solid var(--border)" }}
                          onMouseEnter={e=>(e.currentTarget.style.background="#34d39908")}
                          onMouseLeave={e=>(e.currentTarget.style.background="")}>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background:"linear-gradient(135deg,#34d399,#10b981)", boxShadow:"0 2px 8px #34d39944" }}>
                                <Landmark className="w-4 h-4 text-white" />
                              </div>
                              <p className="font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>Tiết kiệm</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background:"#34d39918", color:"#34d399", border:"1px solid #34d39933" }}>Tiết kiệm</span>
                          </td>
                          <td className="py-3.5 px-5"><span className="num font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>{fmt(savingsVnd)} ₫</span></td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"var(--bg-input)", maxWidth:80 }}>
                                <div className="h-full rounded-full" style={{ width:`${Math.min(pct,100)}%`, background:"linear-gradient(90deg,#34d399,#10b981)" }} />
                              </div>
                              <span className="num text-[11px] font-bold" style={{ color:"#34d399" }}>{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            {(summary?.savingsInterest??0)>0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background:"var(--positive-soft)" }}>
                                  <ArrowUpRight className="w-3 h-3" style={{ color:"var(--positive)" }}/>
                                </div>
                                <p className="num text-[12px] font-bold" style={{ color:"var(--positive)" }}>+{fmt(summary.savingsInterest)} ₫</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* USDT row */}
                    {cashVnd > 0 && (() => {
                      const pct = totalVal > 0 ? cashVnd/totalVal*100 : 0;
                      return (
                        <tr onMouseEnter={e=>(e.currentTarget.style.background="#22d3ee08")}
                          onMouseLeave={e=>(e.currentTarget.style.background="")}>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background:"linear-gradient(135deg,#22d3ee,#0891b2)", boxShadow:"0 2px 8px #22d3ee44" }}>
                                <DollarSign className="w-4 h-4 text-white" />
                              </div>
                              <p className="font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>USDT</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background:"#22d3ee18", color:"#22d3ee", border:"1px solid #22d3ee33" }}>Stablecoin</span>
                          </td>
                          <td className="py-3.5 px-5"><span className="num font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>{fmt(cashVnd)} ₫</span></td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"var(--bg-input)", maxWidth:80 }}>
                                <div className="h-full rounded-full" style={{ width:`${Math.min(pct,100)}%`, background:"linear-gradient(90deg,#22d3ee,#0891b2)" }} />
                              </div>
                              <span className="num text-[11px] font-bold" style={{ color:"#22d3ee" }}>{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5"><span className="num text-[12px]" style={{ color:"var(--text-muted)" }}>—</span></td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}
