"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { savings as savingsApi, prices as pricesApi } from "@/lib/api";
import {
  Plus, Trash2, Pencil, Check, Landmark, TrendingUp, Clock,
  Wallet, X, ChevronDown, ChevronUp, PlusCircle, AlertCircle,
  ArrowUpRight, Building2,
} from "lucide-react";

type SavingsType = "BANK" | "MOMO";

function fmt(n: number) {
  const a = Math.abs(n), sign = n < 0 ? "-" : "";
  if (a >= 1_000_000_000) return `${sign}${(a/1_000_000_000).toFixed(2)}tỷ`;
  if (a >= 1_000_000)     return `${sign}${(a/1_000_000).toFixed(1)}M`;
  if (a >= 1_000)         return `${sign}${Math.round(a/1_000)}K`;
  return `${sign}${Math.round(a).toLocaleString("vi-VN")}`;
}
function fmtFull(n: number) { return Math.round(n).toLocaleString("vi-VN"); }
function fmtInput(raw: string) { const d=raw.replace(/\D/g,""); return d?parseInt(d,10).toLocaleString("vi-VN"):""; }
function parseInput(s: string) { return parseFloat(s.replace(/\./g,"").replace(/,/g,""))||0; }

const inputSt: React.CSSProperties = {
  background:"var(--bg-input)", border:"1px solid var(--border-2)",
  color:"var(--text-primary)", borderRadius:12, width:"100%",
  padding:"10px 14px", fontSize:13, outline:"none",
};
function onFocusAccent(e: React.FocusEvent<any>) { e.currentTarget.style.borderColor="var(--accent)"; }
function onBlurBorder(e: React.FocusEvent<any>)  { e.currentTarget.style.borderColor="var(--border-2)"; }

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color:"var(--text-muted)" }}>{children}</label>;
}
function MoneyInput({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return <input type="text" inputMode="numeric" value={value} placeholder={placeholder??"0"} style={inputSt}
    onChange={e=>onChange(fmtInput(e.target.value))} onFocus={onFocusAccent} onBlur={onBlurBorder} />;
}

/* ── Forms ── */
function BankForm({ initial, onSave, onCancel }: { initial?:any; onSave:(d:any)=>Promise<void>; onCancel:()=>void }) {
  const [f,setF] = useState({
    bank:initial?.bank??"", name:initial?.name??"",
    amount:initial?fmtInput(String(initial.amount)):"",
    interestRate:initial?String(initial.interestRate):"",
    startDate:initial?new Date(initial.startDate).toISOString().split("T")[0]:"",
    maturityDate:initial?.maturityDate?new Date(initial.maturityDate).toISOString().split("T")[0]:"",
    isRolling:initial?.isRolling??false, note:initial?.note??"",
  });
  const [saving,setSaving]=useState(false); const [err,setErr]=useState("");
  const set=(k:string,v:any)=>setF(p=>({...p,[k]:v}));
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setSaving(true); setErr("");
    try { await onSave({...f,savingsType:"BANK",bank:f.bank,currency:"VND",amount:parseInput(f.amount),interestRate:parseFloat(f.interestRate),startDate:f.startDate||undefined,maturityDate:f.maturityDate||undefined}); }
    catch(e:any){setErr(e.message);} finally{setSaving(false);}
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          {k:"bank",label:"Ngân hàng",ph:"Vietcombank, BIDV..."},
          {k:"name",label:"Tên khoản",ph:"Tiết kiệm 6 tháng"},
        ].map(({k,label,ph})=>(
          <div key={k}><Label>{label}</Label>
            <input required style={inputSt} placeholder={ph} value={(f as any)[k]} onFocus={onFocusAccent} onBlur={onBlurBorder}
              onChange={e=>set(k,e.target.value)} />
          </div>
        ))}
        <div><Label>Số tiền gốc (VND)</Label><MoneyInput value={f.amount} onChange={v=>set("amount",v)} placeholder="100.000.000"/></div>
        <div><Label>Lãi suất (%/năm)</Label>
          <input required type="number" step="0.01" min="0" max="100" style={inputSt} placeholder="5.5"
            value={f.interestRate} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>set("interestRate",e.target.value)}/>
        </div>
        <div><Label>Ngày gửi</Label><input required type="date" style={inputSt} value={f.startDate} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>set("startDate",e.target.value)}/></div>
        <div><Label>Ngày đáo hạn</Label><input required type="date" style={inputSt} value={f.maturityDate} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>set("maturityDate",e.target.value)}/></div>
      </div>
      <div><Label>Ghi chú</Label><input style={inputSt} placeholder="Tuỳ chọn..." value={f.note} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>set("note",e.target.value)}/></div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={f.isRolling} onChange={e=>set("isRolling",e.target.checked)} className="w-4 h-4 rounded accent-indigo-500"/>
        <span className="text-sm" style={{color:"var(--text-secondary)"}}>Tự động tái tục khi đáo hạn</span>
      </label>
      {err&&<div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{background:"var(--negative-soft)",color:"var(--negative)",border:"1px solid rgba(239,68,68,0.2)"}}><AlertCircle className="w-4 h-4 shrink-0"/>{err}</div>}
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{background:"var(--bg-input)",color:"var(--text-secondary)",border:"1px solid var(--border)"}}>Huỷ</button>
        <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{background:"var(--accent)",color:"#fff"}}>
          <Check className="w-4 h-4"/>{saving?"Đang lưu...":"Lưu khoản tiết kiệm"}
        </button>
      </div>
    </form>
  );
}

function MomoForm({ initial, onSave, onCancel }: { initial?:any; onSave:(d:any)=>Promise<void>; onCancel:()=>void }) {
  const [f,setF]=useState({name:initial?.name??"",amount:initial?fmtInput(String(initial.amount)):"",interestRate:initial?String(initial.interestRate):"",note:initial?.note??""});
  const [saving,setSaving]=useState(false); const [err,setErr]=useState("");
  const set=(k:string,v:any)=>setF(p=>({...p,[k]:v}));
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setSaving(true); setErr("");
    try { await onSave({savingsType:"MOMO",bank:"MoMo",currency:"VND",...f,amount:parseInput(f.amount),interestRate:parseFloat(f.interestRate)}); }
    catch(e:any){setErr(e.message);} finally{setSaving(false);}
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.2)"}}>
        <span className="text-lg mt-0.5">💡</span>
        <p className="text-xs leading-relaxed" style={{color:"#fb923c"}}>Lãi kép tính theo tháng — lãi tháng trước cộng vào gốc. Có thể nạp thêm tiền bất cứ lúc nào.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Tên tài khoản</Label><input required style={inputSt} placeholder="Tiết kiệm MoMo" value={f.name} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>set("name",e.target.value)}/></div>
        <div><Label>Lãi suất (%/năm)</Label><input required type="number" step="0.01" min="0" max="100" style={inputSt} placeholder="5.0" value={f.interestRate} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>set("interestRate",e.target.value)}/></div>
        <div><Label>Số tiền gốc (VND)</Label><MoneyInput value={f.amount} onChange={v=>set("amount",v)} placeholder="50.000.000"/></div>
        <div><Label>Ghi chú</Label><input style={inputSt} placeholder="Tuỳ chọn..." value={f.note} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>set("note",e.target.value)}/></div>
      </div>
      {err&&<div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{background:"var(--negative-soft)",color:"var(--negative)",border:"1px solid rgba(239,68,68,0.2)"}}><AlertCircle className="w-4 h-4 shrink-0"/>{err}</div>}
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{background:"var(--bg-input)",color:"var(--text-secondary)",border:"1px solid var(--border)"}}>Huỷ</button>
        <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{background:"#f97316",color:"#fff"}}>
          <Check className="w-4 h-4"/>{saving?"Đang lưu...":"Lưu tài khoản MoMo"}
        </button>
      </div>
    </form>
  );
}

/* ── Deposit Modal ── */
function DepositModal({ accountId, onDone, onCancel }: { accountId:string; onDone:()=>void; onCancel:()=>void }) {
  const [amount,setAmount]=useState(""); const [date,setDate]=useState(new Date().toISOString().split("T")[0]);
  const [note,setNote]=useState(""); const [saving,setSaving]=useState(false); const [err,setErr]=useState("");
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); const n=parseInput(amount);
    if(!n||n<=0){setErr("Nhập số tiền hợp lệ");return;}
    setSaving(true); setErr("");
    try{await savingsApi.addDeposit(accountId,{amount:n,depositedAt:date,note:note||undefined}); onDone();}
    catch(e:any){setErr(e.message);} finally{setSaving(false);}
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}>
      <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{background:"var(--bg-card)",border:"1px solid var(--border-2)"}}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-base" style={{color:"var(--text-primary)"}}>Nạp thêm tiền</h3>
            <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>Lãi sẽ được tính từ ngày nạp</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl" style={{background:"var(--bg-input)",color:"var(--text-muted)"}}><X className="w-4 h-4"/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Số tiền nạp (VND)</Label><MoneyInput value={amount} onChange={setAmount} placeholder="10.000.000"/></div>
          <div><Label>Ngày nạp</Label><input type="date" style={inputSt} value={date} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>setDate(e.target.value)}/></div>
          <div><Label>Ghi chú</Label><input style={inputSt} placeholder="Tuỳ chọn..." value={note} onFocus={onFocusAccent} onBlur={onBlurBorder} onChange={e=>setNote(e.target.value)}/></div>
          {err&&<p className="text-xs" style={{color:"var(--negative)"}}>{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{background:"var(--bg-input)",color:"var(--text-secondary)",border:"1px solid var(--border)"}}>Huỷ</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50" style={{background:"#f97316",color:"#fff"}}>
              {saving?"Đang lưu...":"Xác nhận nạp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Account Card ── */
function AccountCard({ a, usdVnd, onEdit, onDelete, onRefresh }: any) {
  const [showDeps, setShowDeps] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [deletingDep, setDeletingDep] = useState<string|null>(null);
  const isMomo = a.savingsType === "MOMO";
  const mult = a.currency==="USD"?usdVnd:1;
  const valueVnd = a.currentValue*mult;
  const interestVnd = a.accruedInterest*mult;
  const principalVnd = a.totalPrincipal*mult;
  const color = isMomo ? "#f97316" : "#6366f1";
  const prog = !isMomo && a.progressPct!=null ? Math.min(a.progressPct,100) : null;

  const handleDeleteDep = async (id:string) => {
    setDeletingDep(id);
    try { await savingsApi.deleteDeposit(id); onRefresh(); } finally { setDeletingDep(null); }
  };

  return (
    <>
      {depositModal && <DepositModal accountId={a.id} onDone={()=>{setDepositModal(false);onRefresh();}} onCancel={()=>setDepositModal(false)}/>}

      <div className="card overflow-hidden" style={{border:`1px solid ${color}22`}}>
        {/* Colored top bar */}
        <div className="h-1 w-full" style={{background:`linear-gradient(90deg,${color},${color}88)`}}/>

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{background:`${color}18`,border:`1px solid ${color}33`}}>
                {isMomo ? <Wallet className="w-5 h-5" style={{color}}/> : <Building2 className="w-5 h-5" style={{color}}/>}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[15px]" style={{color:"var(--text-primary)"}}>{a.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{background:`${color}15`,color,border:`1px solid ${color}30`}}>
                    {a.bank}
                  </span>
                  {a.isMatured && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:"rgba(251,191,36,0.12)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.25)"}}>Đáo hạn</span>}
                  {a.isRolling && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:"var(--positive-soft)",color:"var(--positive)"}}>Tái tục</span>}
                  {isMomo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:"rgba(251,146,60,0.12)",color:"#fb923c"}}>Lãi kép</span>}
                </div>
                <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>
                  {a.interestRate}%/năm
                  {!isMomo && a.maturityDate && ` · Đáo hạn ${new Date(a.maturityDate).toLocaleDateString("vi-VN")}`}
                  {isMomo && ` · ${a.monthsElapsed} tháng · ${a.deposits.length} lần nạp`}
                </p>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {isMomo && (
                <button onClick={()=>setDepositModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{background:"rgba(249,115,22,0.12)",color:"#f97316",border:"1px solid rgba(249,115,22,0.25)"}}>
                  <PlusCircle className="w-3.5 h-3.5"/> Nạp thêm
                </button>
              )}
              <button onClick={()=>onEdit(a)} className="p-2 rounded-xl transition-colors"
                style={{color:"var(--text-muted)",background:"var(--bg-input)"}}
                onMouseEnter={e=>(e.currentTarget.style.color="var(--accent)")}
                onMouseLeave={e=>(e.currentTarget.style.color="var(--text-muted)")}>
                <Pencil className="w-3.5 h-3.5"/>
              </button>
              <button onClick={()=>onDelete(a.id)} className="p-2 rounded-xl transition-colors"
                style={{color:"var(--text-muted)",background:"var(--bg-input)"}}
                onMouseEnter={e=>(e.currentTarget.style.color="var(--negative)")}
                onMouseLeave={e=>(e.currentTarget.style.color="var(--text-muted)")}>
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {label:"Giá trị hiện tại", value:`${fmtFull(valueVnd)} ₫`, color:"var(--text-primary)", big:true},
              {label:"Lãi tích lũy",     value:`+${fmtFull(interestVnd)} ₫`, color:"var(--positive)"},
              {label:"Vốn gốc",          value:`${fmt(principalVnd)} ₫`, color:"var(--text-secondary)"},
            ].map(s=>(
              <div key={s.label} className="p-3 rounded-xl" style={{background:"var(--bg-input)"}}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:"var(--text-muted)"}}>{s.label}</p>
                <p className={`num font-bold ${s.big?"text-base":"text-sm"}`} style={{color:s.color}}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Progress bar (Bank only) */}
          {prog !== null && (
            <div>
              <div className="flex justify-between text-[10px] mb-1.5" style={{color:"var(--text-muted)"}}>
                <span>{new Date(a.startDate).toLocaleDateString("vi-VN")}</span>
                <span className="font-bold" style={{color:a.isMatured?"#fbbf24":color}}>{prog.toFixed(0)}%{a.daysLeft>0?` · còn ${a.daysLeft} ngày`:""}</span>
                <span>{a.maturityDate?new Date(a.maturityDate).toLocaleDateString("vi-VN"):""}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{background:"var(--bg-input)"}}>
                <div className="h-full rounded-full transition-all" style={{width:`${prog}%`,background:a.isMatured?"linear-gradient(90deg,#fbbf24,#f59e0b)":`linear-gradient(90deg,${color},${color}bb)`}}/>
              </div>
            </div>
          )}

          {/* Momo deposit history toggle */}
          {isMomo && a.deposits.length > 0 && (
            <button onClick={()=>setShowDeps(v=>!v)}
              className="flex items-center gap-1.5 mt-3 text-xs font-semibold"
              style={{color:"var(--text-muted)"}}>
              {showDeps?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
              {showDeps?"Ẩn lịch sử":"Xem lịch sử nạp tiền"}
            </button>
          )}
        </div>

        {/* Deposit history panel */}
        {isMomo && showDeps && a.deposits.length > 0 && (
          <div className="px-5 pb-4 pt-2 space-y-1.5" style={{borderTop:"1px solid var(--border)",background:"var(--bg-input)"}}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 pt-1" style={{color:"var(--text-muted)"}}>Lịch sử nạp tiền</p>
            {/* Initial */}
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl" style={{background:"var(--bg-card)"}}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{background:"#f97316"}}/>
                <span className="text-xs" style={{color:"var(--text-secondary)"}}>Gốc ban đầu</span>
                <span className="text-[10px]" style={{color:"var(--text-muted)"}}>{new Date(a.startDate).toLocaleDateString("vi-VN")}</span>
              </div>
              <span className="num text-xs font-bold" style={{color:"var(--text-primary)"}}>{fmtFull(a.amount)} ₫</span>
            </div>
            {a.deposits.map((d:any)=>(
              <div key={d.id} className="flex items-center justify-between py-1.5 px-3 rounded-xl group/dep" style={{background:"var(--bg-card)"}}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{background:"var(--positive)"}}/>
                  <span className="text-xs" style={{color:"var(--text-secondary)"}}>Nạp thêm</span>
                  <span className="text-[10px]" style={{color:"var(--text-muted)"}}>{new Date(d.depositedAt).toLocaleDateString("vi-VN")}</span>
                  {d.note&&<span className="text-[10px] italic" style={{color:"var(--text-muted)"}}>({d.note})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-xs font-bold" style={{color:"var(--positive)"}}>+{fmtFull(d.amount)} ₫</span>
                  <button onClick={()=>handleDeleteDep(d.id)} disabled={deletingDep===d.id}
                    className="opacity-0 group-hover/dep:opacity-100 transition-opacity p-1 rounded-lg disabled:opacity-30"
                    style={{color:"var(--text-muted)"}}
                    onMouseEnter={e=>(e.currentTarget.style.color="var(--negative)")}
                    onMouseLeave={e=>(e.currentTarget.style.color="var(--text-muted)")}>
                    <X className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Main Page ── */
export default function SavingsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [usdVnd, setUsdVnd]     = useState(25_400);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<SavingsType>("BANK");
  const [modal, setModal]       = useState<null|"bank"|"momo">(null);
  const [editing, setEditing]   = useState<any>(null);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);

  const load = async () => {
    try {
      const [list,fx] = await Promise.all([savingsApi.list(), pricesApi.forexRate()]);
      setAccounts(list); setUsdVnd(fx.rate);
    } catch{} finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);

  const handleSave = async (data:any) => {
    if(editing){await savingsApi.update(editing.id,data);setEditing(null);}
    else{await savingsApi.create(data);setModal(null);}
    load();
  };
  const handleDelete = async (id:string) => {
    setDeleting(id);
    try{await savingsApi.delete(id);load();}finally{setDeleting(null);setDeleteId(null);}
  };

  const toVnd = (a:any) => a.currency==="USD"?usdVnd:1;
  const bankAcc  = accounts.filter(a=>a.savingsType==="BANK");
  const momoAcc  = accounts.filter(a=>a.savingsType==="MOMO");
  const visible  = activeTab==="BANK"?bankAcc:momoAcc;
  const totalVnd = accounts.reduce((s,a)=>s+a.currentValue*toVnd(a),0);
  const totalInt = accounts.reduce((s,a)=>s+a.accruedInterest*toVnd(a),0);
  const totalPrincipal = accounts.reduce((s,a)=>s+a.totalPrincipal*toVnd(a),0);

  const isFormOpen = !!modal || !!editing;
  const formType: SavingsType = editing ? editing.savingsType : modal==="momo" ? "MOMO" : "BANK";

  return (
    <div className="min-h-screen" style={{background:"var(--bg-primary)"}}>
      <Sidebar/>
      <div className="ml-56 p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between py-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{color:"var(--text-primary)"}}>Tiết kiệm</h1>
            <p className="text-sm mt-0.5" style={{color:"var(--text-muted)"}}>
              {accounts.length} khoản · Ngân hàng (lãi đơn) · MoMo (lãi kép)
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{setModal("bank");setEditing(null);}}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{background:"var(--accent-soft)",color:"var(--accent)",border:"1px solid var(--accent-border)"}}>
              <Building2 className="w-4 h-4"/> Ngân hàng
            </button>
            <button onClick={()=>{setModal("momo");setEditing(null);}}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{background:"rgba(249,115,22,0.12)",color:"#f97316",border:"1px solid rgba(249,115,22,0.3)"}}>
              <Wallet className="w-4 h-4"/> MoMo
            </button>
          </div>
        </div>

        {/* Summary */}
        {!loading && accounts.length>0 && (
          <div className="grid grid-cols-4 gap-3">
            {[
              {label:"Tổng giá trị",  value:`${fmtFull(totalVnd)} ₫`,      icon:Landmark,     color:"#6366f1"},
              {label:"Vốn gốc",       value:`${fmt(totalPrincipal)} ₫`,    icon:Wallet,       color:"#60a5fa"},
              {label:"Lãi tích lũy",  value:`+${fmtFull(totalInt)} ₫`,     icon:ArrowUpRight, color:"#22c55e"},
              {label:"Số khoản",      value:`${bankAcc.length} Ngân hàng · ${momoAcc.length} MoMo`, icon:Clock, color:"#f97316"},
            ].map(c=>{
              const Icon=c.icon;
              return (
                <div key={c.label} className="card p-4 flex items-center gap-3" style={{border:`1px solid ${c.color}22`}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{background:`${c.color}15`,border:`1px solid ${c.color}30`}}>
                    <Icon className="w-5 h-5" style={{color:c.color}}/>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{c.label}</p>
                    <p className="num font-black text-base leading-tight" style={{color:c.color}}>{c.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab + list */}
        <div>
          {/* Tab bar */}
          <div className="flex items-center gap-2 mb-4">
            {([
              {id:"BANK"as SavingsType, label:"Ngân hàng", icon:Building2, count:bankAcc.length, color:"#6366f1"},
              {id:"MOMO"as SavingsType, label:"MoMo",      icon:Wallet,    count:momoAcc.length, color:"#f97316"},
            ]).map(t=>{
              const Icon=t.icon; const sel=activeTab===t.id;
              return (
                <button key={t.id} onClick={()=>{setActiveTab(t.id);}}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={sel
                    ?{background:`${t.color}18`,color:t.color,border:`1px solid ${t.color}35`}
                    :{color:"var(--text-muted)",background:"var(--bg-card)",border:"1px solid var(--border)"}}>
                  <Icon className="w-4 h-4"/>
                  {t.label}
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{background:sel?`${t.color}25`:"var(--bg-input)",color:sel?t.color:"var(--text-muted)"}}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[...Array(2)].map((_,i)=><div key={i} className="h-48 shimmer-skeleton rounded-2xl"/>)}
            </div>
          ) : visible.length===0 ? (
            <div className="card flex flex-col items-center justify-center py-20 gap-4" style={{border:"1px solid var(--border)"}}>
              {activeTab==="BANK"
                ?<Building2 className="w-12 h-12" style={{color:"var(--text-muted)"}}/>
                :<Wallet    className="w-12 h-12" style={{color:"var(--text-muted)"}}/>}
              <div className="text-center">
                <p className="font-semibold text-sm" style={{color:"var(--text-primary)"}}>
                  Chưa có khoản {activeTab==="BANK"?"ngân hàng":"MoMo"} nào
                </p>
                <p className="text-xs mt-1" style={{color:"var(--text-muted)"}}>Nhấn nút bên trên để thêm</p>
              </div>
              <button onClick={()=>setModal(activeTab==="BANK"?"bank":"momo")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{background:activeTab==="BANK"?"var(--accent)":"#f97316",color:"#fff"}}>
                <Plus className="w-4 h-4"/> Thêm ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {visible.map(a=>(
                <AccountCard key={a.id} a={a} usdVnd={usdVnd}
                  onEdit={(acc:any)=>{setEditing(acc);setModal(null);}}
                  onDelete={(id:string)=>setDeleteId(id)}
                  onRefresh={load}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{background:"var(--bg-card)",border:"1px solid var(--border-2)"}}>
            <h3 className="font-bold text-base mb-2" style={{color:"var(--text-primary)"}}>Xoá khoản tiết kiệm?</h3>
            <p className="text-sm mb-5" style={{color:"var(--text-muted)"}}>Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{background:"var(--bg-input)",color:"var(--text-secondary)",border:"1px solid var(--border)"}}>Huỷ</button>
              <button onClick={()=>handleDelete(deleteId)} disabled={!!deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{background:"var(--negative)"}}>
                {deleting?"Đang xoá...":"Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit form modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}>
          <div className="rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto" style={{background:"var(--bg-card)",border:"1px solid var(--border-2)"}}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-lg" style={{color:"var(--text-primary)"}}>
                  {editing?`Chỉnh sửa: ${editing.name}`:formType==="BANK"?"Thêm khoản ngân hàng":"Thêm tài khoản MoMo"}
                </h2>
                <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>
                  {formType==="BANK"?"Lãi đơn theo kỳ hạn":"Lãi kép tính theo tháng"}
                </p>
              </div>
              <button onClick={()=>{setModal(null);setEditing(null);}}
                className="p-2 rounded-xl" style={{background:"var(--bg-input)",color:"var(--text-muted)"}}>
                <X className="w-4 h-4"/>
              </button>
            </div>
            {formType==="BANK"
              ?<BankForm initial={editing} onSave={handleSave} onCancel={()=>{setModal(null);setEditing(null);}}/>
              :<MomoForm initial={editing} onSave={handleSave} onCancel={()=>{setModal(null);setEditing(null);}}/>
            }
          </div>
        </div>
      )}
    </div>
  );
}
