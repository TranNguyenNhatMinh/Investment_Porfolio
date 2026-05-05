"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { portfolio as portfolioApi, binance as binanceApi, prices as pricesApi } from "@/lib/api";
import { Plus, Trash2, X, RefreshCw, ArrowUpRight, ArrowDownRight, Zap, BarChart2, Wallet } from "lucide-react";

const COIN_PALETTE: Record<string, string> = {
  BTC:"#f7931a",ETH:"#627eea",BNB:"#f3ba2f",SOL:"#9945ff",
  XRP:"#00aae4",ADA:"#0033ad",LINK:"#2a5ada",DOT:"#e6007a",
  AVAX:"#e84142",MATIC:"#8247e5",UNI:"#ff007a",LTC:"#bfbbbb",
  DOGE:"#c2a633",FIL:"#0090ff",
};
const coinColor = (t: string) => COIN_PALETTE[t.toUpperCase()] ?? "#6366f1";

function fmt(n: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1_000_000_000) return `${sign}${(a/1_000_000_000).toFixed(1)}tỷ`;
  if (a >= 1_000_000)     return `${sign}${(a/1_000_000).toFixed(1)}M`;
  if (a >= 1_000)         return `${sign}${Math.round(a/1_000)}K`;
  return `${sign}${Math.round(a)}`;
}

const EMPTY_FORM = { type:"STOCK", ticker:"", name:"", shares:"", buyPrice:"", currentPrice:"", sector:"", currency:"VND" };

export default function HoldingsPage() {
  const [holdings, setHoldings]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const tab = "CRYPTO";
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [syncing, setSyncing]     = useState(false);
  const [syncMsg, setSyncMsg]     = useState<{ok:boolean;msg:string}|null>(null);
  const [usdVnd, setUsdVnd]       = useState(25_400);
  const [deleteId, setDeleteId]   = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([portfolioApi.holdings(), pricesApi.forexRate()])
      .then(([h,fx]) => { setHoldings(h); setUsdVnd(fx.rate); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError("");
    try {
      await portfolioApi.createHolding({
        type: "CRYPTO", ticker: form.ticker.toUpperCase(),
        name: form.name || form.ticker.toUpperCase(),
        shares: Number(form.shares), buyPrice: Number(form.buyPrice),
        currentPrice: Number(form.currentPrice), currency: "USD",
      });
      setShowForm(false); setForm({...EMPTY_FORM}); load();
    } catch(err:any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null);
    try { const r=await binanceApi.sync(); setSyncMsg({ok:true,msg:`Đã sync ${r.count} tài sản`}); load(); }
    catch(e:any) { setSyncMsg({ok:false,msg:e.message}); }
    finally { setSyncing(false); }
  };

  const handleDelete = async (id: string) => {
    await portfolioApi.deleteHolding(id); setDeleteId(null); load();
  };

  const filtered = holdings.filter(h=>h.type===tab);
  const totalVal = filtered.reduce((s,h)=>s+h.shares*(h.livePrice??h.currentPrice)*(h.currency==="USD"?usdVnd:1),0);
  const totalCost= filtered.reduce((s,h)=>s+h.shares*h.buyPrice*(h.currency==="USD"?usdVnd:1),0);
  const totalPnl = totalVal-totalCost;
  const totalPct = totalCost>0?(totalPnl/totalCost)*100:0;
  const pos = totalPnl >= 0;

  return (
    <div className="min-h-screen" style={{ background:"var(--bg-primary)" }}>
      <Sidebar />
      <div className="ml-56 flex flex-col min-h-screen">

        {/* Sticky topbar */}
        <header className="sticky top-0 z-20 backdrop-blur-xl px-6 py-3"
          style={{ background:"var(--bg-topbar,rgba(7,9,18,0.88))", borderBottom:"1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold tracking-tight" style={{ color:"var(--text-primary)" }}>Danh mục nắm giữ</p>
              <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>{holdings.length} tài sản đang theo dõi</p>
            </div>
            <div className="flex items-center gap-2">
              {tab==="CRYPTO" && (
                <button onClick={handleSync} disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold disabled:opacity-50"
                  style={{ background:"rgba(234,179,8,0.12)", color:"#eab308", border:"1px solid rgba(234,179,8,0.25)" }}>
                  <Zap className={`w-3.5 h-3.5 ${syncing?"animate-pulse":""}`} />
                  {syncing?"Đang sync...":"Sync Binance"}
                </button>
              )}
              <button onClick={()=>setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold"
                style={{ background:"var(--accent)", color:"#fff" }}>
                <Plus className="w-3.5 h-3.5" /> Thêm mới
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 space-y-4">

        {/* Sync message */}
        {syncMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ background:syncMsg.ok?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)", color:syncMsg.ok?"var(--positive)":"var(--negative)", border:`1px solid ${syncMsg.ok?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}` }}>
            {syncMsg.msg}
          </div>
        )}

        {/* Summary cards */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"Tổng giá trị", value:`${fmt(totalVal)} ₫`, icon:Wallet,   color:"#6366f1" },
              { label:"Vốn đầu tư",   value:`${fmt(totalCost)} ₫`, icon:BarChart2,color:"#60a5fa" },
              { label:"Lãi / Lỗ",     value:`${pos?"+":""}${fmt(totalPnl)} ₫`, icon:pos?ArrowUpRight:ArrowDownRight, color:pos?"#22c55e":"#ef4444",
                sub:`${pos?"+":""}${totalPct.toFixed(2)}%` },
            ].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="card p-4 flex items-center gap-4"
                  style={{ border:`1px solid ${c.color}22` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background:`${c.color}18`, border:`1px solid ${c.color}33` }}>
                    <Icon className="w-5 h-5" style={{ color:c.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{c.label}</p>
                    <p className="num font-black text-lg leading-tight" style={{ color:c.color }}>{c.value}</p>
                    {c.sub && <p className="num text-xs font-semibold" style={{ color:c.color }}>{c.sub}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab + Table */}
        <div className="card overflow-hidden" style={{ border:"1px solid var(--border)" }}>
          {/* Tab bar */}
          <div className="px-5 py-4" style={{ borderBottom:"1px solid var(--border)" }}>
            <span className="text-[13px] font-bold" style={{ color:"var(--text-primary)" }}>
              Crypto · {holdings.filter(h => h.type === "CRYPTO").length} coin
            </span>
          </div>

          {/* Content */}
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_,i)=><div key={i} className="h-16 shimmer-skeleton rounded-xl"/>)}
            </div>
          ) : filtered.length===0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background:"var(--bg-input)", border:"1px solid var(--border-2)" }}>
                <Plus className="w-7 h-7" style={{ color:"var(--text-muted)" }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color:"var(--text-primary)" }}>Chưa có coin nào</p>
                <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>Nhấn Sync Binance hoặc thêm thủ công</p>
              </div>
              <button onClick={()=>setShowForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background:"var(--accent)", color:"#fff" }}>
                <Plus className="w-4 h-4" /> Thêm ngay
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:"1px solid var(--border)" }}>
                  {["Tài sản","SL","Giá mua","Giá hiện tại","Giá trị","P&L",""].map((h,i)=>(
                    <th key={i} className={`py-3 px-5 text-[10px] font-bold uppercase tracking-wider ${i===0?"text-left":"text-right"}`}
                      style={{ color:"var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a,b)=>{
                  const va=a.shares*(a.livePrice??a.currentPrice)*(a.currency==="USD"?usdVnd:1);
                  const vb=b.shares*(b.livePrice??b.currentPrice)*(b.currency==="USD"?usdVnd:1);
                  return vb-va;
                }).map(h=>{
                  const mult = h.currency==="USD"?usdVnd:1;
                  const live = h.livePrice??h.currentPrice;
                  const val  = h.shares*live*mult;
                  const pnl  = (live-h.buyPrice)*h.shares*mult;
                  const pct  = ((live-h.buyPrice)/h.buyPrice)*100;
                  const pos  = pnl>=0;
                  const cc   = coinColor(h.ticker);
                  const cur  = h.currency==="USD"?"$":"₫";
                  return (
                    <tr key={h.id} className="group"
                      style={{ borderBottom:"1px solid var(--border)" }}
                      onMouseEnter={e=>(e.currentTarget.style.background=`${cc}07`)}
                      onMouseLeave={e=>(e.currentTarget.style.background="")}>

                      {/* Asset */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0"
                            style={{ background:`linear-gradient(135deg,${cc},${cc}bb)`, boxShadow:`0 2px 10px ${cc}44` }}>
                            {h.ticker.slice(0,3)}
                          </div>
                          <div>
                            <p className="font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>{h.ticker}</p>
                            <p className="text-[11px]" style={{ color:"var(--text-muted)" }}>{h.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Shares */}
                      <td className="py-4 px-5 text-right">
                        <span className="num font-semibold text-[13px]" style={{ color:"var(--text-secondary)" }}>
                          {h.shares % 1 === 0 ? h.shares : h.shares.toFixed(6)}
                        </span>
                      </td>

                      {/* Buy price */}
                      <td className="py-4 px-5 text-right">
                        <span className="num text-[12px]" style={{ color:"var(--text-muted)" }}>
                          {cur}{h.buyPrice.toLocaleString("en-US",{maximumFractionDigits:h.currency==="USD"?4:0})}
                        </span>
                      </td>

                      {/* Live price */}
                      <td className="py-4 px-5 text-right">
                        <span className="num font-semibold text-[13px]" style={{ color:"var(--text-primary)" }}>
                          {cur}{live.toLocaleString("en-US",{maximumFractionDigits:h.currency==="USD"?4:0})}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="py-4 px-5 text-right">
                        <span className="num font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>
                          {fmt(val)} ₫
                        </span>
                      </td>

                      {/* P&L */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="num font-bold text-[13px]" style={{ color:pos?"var(--positive)":"var(--negative)" }}>
                            {pos?"+":""}{fmt(pnl)} ₫
                          </span>
                          <span className="inline-flex items-center gap-0.5 num text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background:pos?"var(--positive-soft)":"var(--negative-soft)", color:pos?"var(--positive)":"var(--negative)" }}>
                            {pos?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}
                            {Math.abs(pct).toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      {/* Delete */}
                      <td className="py-4 px-5 text-right">
                        <button onClick={()=>setDeleteId(h.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg"
                          style={{ color:"var(--text-muted)" }}
                          onMouseEnter={e=>(e.currentTarget.style.color="var(--negative)")}
                          onMouseLeave={e=>(e.currentTarget.style.color="var(--text-muted)")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </main>
      </div>

      {/* ── Delete confirm modal ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ background:"var(--bg-card)", border:"1px solid var(--border-2)" }}>
            <h3 className="font-bold text-base mb-2" style={{ color:"var(--text-primary)" }}>Xoá tài sản?</h3>
            <p className="text-sm mb-5" style={{ color:"var(--text-muted)" }}>Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background:"var(--bg-input)", color:"var(--text-secondary)", border:"1px solid var(--border)" }}>
                Huỷ
              </button>
              <button onClick={()=>handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background:"var(--negative)" }}>
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}>
          <div className="rounded-2xl p-6 w-full max-w-lg shadow-2xl" style={{ background:"var(--bg-card)", border:"1px solid var(--border-2)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg" style={{ color:"var(--text-primary)" }}>Thêm tài sản mới</h2>
              <button onClick={()=>{setShowForm(false);setError("");}} className="p-2 rounded-xl"
                style={{ background:"var(--bg-input)", color:"var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {key:"ticker",      label:"Mã ticker",          placeholder:"BTC, ETH..."},
                  {key:"name",        label:"Tên đầy đủ",         placeholder:"Bitcoin"},
                  {key:"shares",      label:"Số lượng",           placeholder:"0.001", type:"number"},
                  {key:"buyPrice",    label:"Giá mua (USD)",       placeholder:"50000", type:"number"},
                  {key:"currentPrice",label:"Giá hiện tại (USD)", placeholder:"55000", type:"number"},
                ].map(f=>(
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:"var(--text-muted)" }}>{f.label}</label>
                    <input type={f.type??"text"} placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))}
                      required={f.key!=="sector"}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                      style={{ background:"var(--bg-input)", border:"1px solid var(--border-2)", color:"var(--text-primary)" }}
                      onFocus={e=>(e.currentTarget.style.borderColor="var(--accent)")}
                      onBlur={e=>(e.currentTarget.style.borderColor="var(--border-2)")}
                    />
                  </div>
                ))}
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background:"var(--negative-soft)", color:"var(--negative)", border:"1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={()=>{setShowForm(false);setError("");}}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background:"var(--bg-input)", color:"var(--text-secondary)", border:"1px solid var(--border)" }}>
                  Huỷ
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background:"var(--accent)" }}>
                  {submitting?"Đang lưu...":"Thêm tài sản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
