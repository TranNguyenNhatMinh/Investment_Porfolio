"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { agent as agentApi } from "@/lib/api";
import {
  Bot, Play, RefreshCw, AlertTriangle, CheckCircle2, Clock,
  XCircle, FlaskConical, Zap, ShieldCheck, TrendingDown,
  DollarSign, Timer, BarChart3, Activity,
} from "lucide-react";

function fmtTime(d: string) {
  return new Date(d).toLocaleString("vi-VN", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}

const COIN_PALETTE: Record<string,string> = {
  BTC:"#f7931a",ETH:"#627eea",BNB:"#f3ba2f",SOL:"#9945ff",
  XRP:"#00aae4",ADA:"#0033ad",LINK:"#2a5ada",DOT:"#e6007a",
};
const coinColor = (t:string) => COIN_PALETTE[t?.toUpperCase()] ?? "#6366f1";

const STATUS_CFG: Record<string,{label:string;color:string;icon:any}> = {
  SUCCESS: { label:"Đã mua",  color:"#22c55e", icon:CheckCircle2 },
  DRY_RUN: { label:"Dry Run", color:"#6366f1", icon:FlaskConical },
  SKIPPED: { label:"Bỏ qua",  color:"#94a3b8", icon:Clock        },
  FAILED:  { label:"Lỗi",     color:"#ef4444", icon:XCircle      },
};

function SliderField({ label, icon: Icon, iconColor, unit, value, min, max, step = 1, onChange, description }: any) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="p-4 rounded-2xl space-y-3" style={{ background:"var(--bg-input)", border:"1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background:`${iconColor}18`, border:`1px solid ${iconColor}30` }}>
            <Icon className="w-3.5 h-3.5" style={{ color:iconColor }}/>
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color:"var(--text-primary)" }}>{label}</p>
            {description && <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>{description}</p>}
          </div>
        </div>
        <span className="num text-sm font-black px-3 py-1 rounded-xl"
          style={{ background:`${iconColor}18`, color:iconColor, border:`1px solid ${iconColor}30` }}>
          {unit}{value}
        </span>
      </div>
      <div className="relative h-2">
        <div className="absolute inset-0 rounded-full" style={{ background:"var(--border-2)" }}/>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width:`${Math.min(pct,100)}%`, background:`linear-gradient(90deg,${iconColor}88,${iconColor})` }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height:"100%" }}/>
      </div>
      <div className="flex justify-between text-[9px]" style={{ color:"var(--text-muted)" }}>
        <span>{unit}{min}</span><span>{unit}{max}</span>
      </div>
    </div>
  );
}

function Toggle({ label, sub, color, value, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl transition-all"
      style={{ background:"var(--bg-input)", border:`1px solid ${value?color+"30":"var(--border)"}` }}>
      <div>
        <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color:"var(--text-muted)" }}>{sub}</p>
      </div>
      <button onClick={onChange}
        className="relative shrink-0 rounded-full transition-all duration-200"
        style={{ width:48, height:26, background:value?color:"var(--border-2)" }}>
        <span className="absolute top-[3px] w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200"
          style={{ left:value?"calc(100% - 23px)":"3px" }}/>
      </button>
    </div>
  );
}

const COIN_PALETTE2: Record<string,string> = {
  BTC:"#f7931a",ETH:"#627eea",BNB:"#f3ba2f",SOL:"#9945ff",
  XRP:"#00aae4",ADA:"#0033ad",LINK:"#2a5ada",DOT:"#e6007a",AVAX:"#e84142",MATIC:"#8247e5",
};

function NumInput({ label, value, onChange, unit, min, max, hint }: any) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold" style={{ color:"var(--text-secondary)" }}>{label}</label>
        {hint && <span className="text-[10px]" style={{ color:"var(--text-muted)" }}>{hint}</span>}
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ background:"var(--bg-input)", border:"1px solid var(--border)" }}>
        <input
          type="text" inputMode="decimal"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => {
            const n = parseFloat(local);
            if (!isNaN(n) && n >= (min ?? 0)) onChange(n);
            else setLocal(String(value)); // revert nếu invalid
          }}
          className="flex-1 bg-transparent outline-none num text-sm font-bold"
          style={{ color:"var(--text-primary)" }}
        />
        <span className="text-xs font-bold shrink-0" style={{ color:"var(--accent)" }}>{unit}</span>
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [config, setConfig]         = useState<any>(null);
  const [logs, setLogs]             = useState<any[]>([]);
  const [status, setStatus]         = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [running, setRunning]       = useState(false);
  const [permission, setPermission] = useState<any>(null);
  const [runResult, setRunResult]   = useState<any>(null);
  const [form, setForm] = useState({
    isActive:false, isDryRun:false, threshold:5, amountUsdt:10, cooldownHours:4, maxPerDay:50,
  });
  const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
  const [detailCoin, setDetailCoin]       = useState<any>(null);
  const [expandedLog, setExpandedLog]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cfg,lg,st] = await Promise.all([
        agentApi.getConfig().catch(()=>null),
        agentApi.getLogs(30).catch(()=>[]),
        agentApi.getStatus().catch(()=>null),
      ]);
      setStatus(st);
      if (cfg) {
        setConfig(cfg);
        setForm({ isActive:cfg.isActive, isDryRun:cfg.isDryRun, threshold:cfg.threshold, amountUsdt:cfg.amountUsdt, cooldownHours:cfg.cooldownHours, maxPerDay:cfg.maxPerDay });
        if (cfg.selectedCoins && cfg.selectedCoins !== "ALL") {
          setSelectedCoins(cfg.selectedCoins.split(","));
        }
      }
      setLogs(lg);
    } finally { setLoading(false); }
  };
  useEffect(()=>{load();},[]);

  const buildPayload = (overrides: any = {}) => ({
    ...form,
    selectedCoins: selectedCoins.length === 0 ? "ALL" : selectedCoins.join(","),
    ...overrides,
  });

  const save = async () => {
    setSaving(true);
    try { const saved = await agentApi.upsertConfig(buildPayload()); setConfig(saved); }
    finally { setSaving(false); }
  };

  // Kiểm tra form có thay đổi so với config đã lưu không
  const hasUnsaved = config && (
    form.threshold     !== config.threshold     ||
    form.amountUsdt    !== config.amountUsdt    ||
    form.cooldownHours !== config.cooldownHours ||
    form.maxPerDay     !== config.maxPerDay     ||
    form.isActive      !== config.isActive      ||
    form.isDryRun      !== config.isDryRun      ||
    (selectedCoins.length === 0 ? "ALL" : selectedCoins.join(",")) !== (config.selectedCoins ?? "ALL")
  );

  const allCoins = status?.coins?.map((c:any) => c.coin) ?? [];
  const toggleCoin = (coin: string) => {
    setSelectedCoins(prev =>
      prev.includes(coin) ? prev.filter(c => c !== coin) : [...prev, coin]
    );
  };

  const runNow = async () => {
    if(!config){alert("Hãy lưu cấu hình trước!");return;}
    setRunning(true);
    setRunResult(null);
    try {
      const result = await agentApi.runNow();
      setRunResult(result);
      await load();
    } finally { setRunning(false); }
  };

  const clearTestLogs = async () => {
    if (!confirm("Xóa tất cả log test (Dry Run)?")) return;
    await agentApi.clearLogs("test");
    await load();
  };

  const clearAllLogs = async () => {
    if (!confirm("Xóa TẤT CẢ lịch sử? Không thể khôi phục.")) return;
    await agentApi.clearLogs("all");
    await load();
  };

  const todaySuccess = logs.filter(l=>l.status==="SUCCESS"&&new Date(l.executedAt).toDateString()===new Date().toDateString());
  const todaySpend   = todaySuccess.reduce((s,l)=>s+l.amountUsdt,0);

  return (
    <div className="min-h-screen" style={{ background:"var(--bg-primary)" }}>
      <Sidebar/>
      <div className="ml-56 p-6 space-y-5">

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center relative"
              style={{ background:"linear-gradient(135deg,#6366f1,#818cf8)", boxShadow:"0 4px 16px rgba(99,102,241,0.4)" }}>
              <Bot className="w-6 h-6 text-white"/>
              {config?.isActive && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 bg-green-400 animate-pulse"
                  style={{ borderColor:"var(--bg-primary)" }}/>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color:"var(--text-primary)" }}>Dip Buy Agent</h1>
              <p className="text-sm mt-0.5" style={{ color:"var(--text-muted)" }}>Tự động mua khi coin DCA giảm mạnh</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>agentApi.testPermission().then(setPermission)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background:"var(--bg-input)", color:"var(--text-secondary)", border:"1px solid var(--border)" }}>
              <ShieldCheck className="w-4 h-4"/> Test API
            </button>
            <button onClick={runNow} disabled={running}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background:"rgba(99,102,241,0.15)", color:"#6366f1", border:"1px solid rgba(99,102,241,0.3)" }}>
              <Play className={`w-4 h-4 ${running?"animate-pulse":""}`}/>
              {running?"Đang chạy...":"Chạy ngay"}
            </button>
            <button onClick={load} className="p-2.5 rounded-xl" style={{ background:"var(--bg-input)", color:"var(--text-muted)" }}>
              <RefreshCw className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {runResult && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: runResult.triggered > 0 ? "rgba(34,197,94,0.08)" : "rgba(99,102,241,0.08)",
              border: `1px solid ${runResult.triggered > 0 ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.2)"}`,
              color: runResult.triggered > 0 ? "var(--positive)" : "var(--text-secondary)",
            }}>
            <span className="text-base">{runResult.triggered > 0 ? "✅" : runResult.message?.startsWith("📈") ? "📈" : "⏳"}</span>
            <span>{runResult.message}</span>
            {runResult.checked > 0 && (
              <span className="ml-auto text-[11px] font-normal" style={{ color:"var(--text-muted)" }}>
                Đã check {runResult.checked} coins · {new Date().toLocaleTimeString("vi-VN")}
              </span>
            )}
          </div>
        )}

        {permission && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background:permission.ok?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)", border:`1px solid ${permission.ok?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`, color:permission.ok?"var(--positive)":"var(--negative)" }}>
            {permission.ok
              ?<><CheckCircle2 className="w-4 h-4 shrink-0"/>API key hợp lệ · Balance: <strong className="ml-1">${permission.balance?.toFixed(2)} USDT</strong></>
              :<><XCircle className="w-4 h-4 shrink-0"/>API key không có quyền trade — cần bật Spot &amp; Margin Trading</>}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-1 space-y-4">

            {logs.length>0 && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:"Mua hôm nay", value:`$${todaySpend.toFixed(2)}`,                           color:"#6366f1", icon:DollarSign},
                  {label:"Còn lại",     value:`$${Math.max(0,form.maxPerDay-todaySpend).toFixed(2)}`,  color:"#22c55e", icon:BarChart3},
                ].map(s=>{ const Icon=s.icon; return (
                  <div key={s.label} className="card p-4 flex items-center gap-3" style={{ border:`1px solid ${s.color}22` }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${s.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color:s.color }}/>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{s.label}</p>
                      <p className="num font-black text-base" style={{ color:s.color }}>{s.value}</p>
                    </div>
                  </div>
                );})}
              </div>
            )}

            {/* Config inputs */}
            <div className="card p-5 space-y-4" style={{ border:"1px solid var(--border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Tham số</p>
              <NumInput label="Mua khi giảm quá (%)" value={form.threshold} onChange={(v:number)=>setForm(p=>({...p,threshold:v}))} unit="%" min={0.1} max={30} hint="So với 24h trước"/>
<NumInput label="USDT mỗi lần mua" value={form.amountUsdt} onChange={(v:number)=>setForm(p=>({...p,amountUsdt:v}))} unit="USDT" min={5} max={1000} hint="Binance tối thiểu $5"/>
              <NumInput label="Cooldown sau mua (giờ)" value={form.cooldownHours} onChange={(v:number)=>setForm(p=>({...p,cooldownHours:v}))} unit="giờ" min={1} max={168} hint="Tránh mua liên tục"/>
              <NumInput label="Giới hạn mỗi ngày" value={form.maxPerDay} onChange={(v:number)=>setForm(p=>({...p,maxPerDay:v}))} unit="USDT/ngày" min={1} max={5000} hint="An toàn tài khoản"/>
            </div>

            {/* Coin selector */}
            {allCoins.length > 0 && (
              <div className="card p-5" style={{ border:"1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Áp dụng cho coin</p>
                  <button onClick={()=>setSelectedCoins([])} className="text-[10px] font-bold" style={{ color:"var(--accent)" }}>
                    {selectedCoins.length===0?"Tất cả ✓":"Chọn tất cả"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {allCoins.map((coin:string)=>{
                    const cc = COIN_PALETTE2[coin] ?? "#6366f1";
                    const isAll = selectedCoins.length === 0;
                    const active = isAll || selectedCoins.includes(coin);
                    return (
                      <button key={coin} onClick={()=>toggleCoin(coin)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm transition-all"
                        style={{
                          background: active ? `${cc}18` : "var(--bg-input)",
                          border: active ? `1px solid ${cc}40` : "1px solid var(--border)",
                          color: active ? cc : "var(--text-muted)",
                        }}>
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white shrink-0"
                          style={{ background:active?cc:"var(--border-2)" }}>
                          {coin.slice(0,3)}
                        </div>
                        {coin}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] mt-2" style={{ color:"var(--text-muted)" }}>
                  {selectedCoins.length===0 ? "Áp dụng cho tất cả coins" : `Đã chọn: ${selectedCoins.join(", ")}`}
                </p>
              </div>
            )}

            <Toggle label="Kích hoạt agent" sub="Chạy tự động mỗi 5 phút" color="#22c55e" value={form.isActive} onChange={()=>setForm(p=>({...p,isActive:!p.isActive}))}/>

            {hasUnsaved && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold"
                style={{ background:"rgba(234,179,8,0.10)", border:"1px solid rgba(234,179,8,0.25)", color:"#ca8a04" }}>
                ⚠️ Có thay đổi chưa lưu — nhấn Lưu để áp dụng
              </div>
            )}

            <button onClick={save} disabled={saving}
              className="w-full py-3 rounded-2xl text-sm font-black tracking-wide disabled:opacity-50 transition-all"
              style={{
                background: hasUnsaved
                  ? "linear-gradient(135deg,#f59e0b,#f97316)"
                  : "linear-gradient(135deg,#6366f1,#818cf8)",
                color:"#fff",
                boxShadow: hasUnsaved
                  ? "0 4px 16px rgba(245,158,11,0.4)"
                  : "0 4px 16px rgba(99,102,241,0.35)",
                transform: hasUnsaved ? "scale(1.01)" : "scale(1)",
              }}>
              {saving ? "Đang lưu..." : hasUnsaved ? "💾 Lưu thay đổi" : "✓ Đã lưu"}
            </button>
          </div>

          <div className="xl:col-span-2 space-y-4">

            {/* ── Kế hoạch đang chạy ── */}
            {config?.isActive && status?.coins?.length > 0 && (
              <div className="card overflow-hidden" style={{ border:"1px solid rgba(34,197,94,0.25)" }}>
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between"
                  style={{ background:"rgba(34,197,94,0.06)", borderBottom:"1px solid rgba(34,197,94,0.15)" }}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse inline-block"/>
                    <div>
                      <p className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>Kế hoạch đang chạy</p>
                      <p className="text-[10px] mt-0.5" style={{ color:"var(--text-muted)" }}>
                        Server tự check giá mỗi 5 phút — không cần mở app
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await agentApi.upsertConfig(buildPayload({ isActive: false }));
                      setForm(p => ({ ...p, isActive: false }));
                      await load();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
                    style={{ background:"rgba(239,68,68,0.10)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)" }}>
                    ⏸ Tạm dừng
                  </button>
                </div>

                {/* Coins */}
                <div className="divide-y" style={{ borderColor:"rgba(34,197,94,0.1)" }}>
                  {status.coins
                    .filter((c:any) => {
                      const saved = config?.selectedCoins ?? "ALL";
                      if (saved === "ALL") return true;
                      return saved.split(",").includes(c.coin);
                    })
                    .map((c:any) => {
                      const cc = coinColor(c.coin);
                      const change = c.change24h ?? 0;
                      const needDrop = config.threshold + change;
                      const willTrigger = change <= -config.threshold;
                      // 0% khi coin đang tăng, 100% khi đúng ngưỡng trigger
                      const fillPct = willTrigger ? 100 : Math.min(100, Math.max(0, (-change / config.threshold) * 100));
                      return (
                        <div key={c.coin} onClick={() => setDetailCoin(c)}
                          className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all hover:opacity-90"
                          style={{ background: willTrigger ? "rgba(34,197,94,0.06)" : "transparent" }}>

                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black text-white shrink-0"
                            style={{ background:`linear-gradient(135deg,${cc},${cc}99)` }}>
                            {c.coin.slice(0,3)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-[13px]" style={{ color:"var(--text-primary)" }}>{c.coin}</span>
                                <span className="num text-[12px] font-bold"
                                  style={{ color: change < 0 ? "var(--negative)" : "var(--positive)" }}>
                                  {change >= 0 ? "+" : ""}{change}%
                                </span>
                              </div>
                              {willTrigger ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse"
                                  style={{ background:"rgba(34,197,94,0.2)", color:"#22c55e" }}>
                                  ⚡ MUA NGAY
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold" style={{ color:"var(--text-muted)" }}>
                                  còn {needDrop > 0 ? needDrop.toFixed(2) : 0}% nữa
                                </span>
                              )}
                            </div>
                            {/* Progress bar */}
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"var(--border-2)" }}>
                              <div className="h-full rounded-full transition-all"
                                style={{ width:`${fillPct}%`, background: willTrigger ? "#22c55e" : `linear-gradient(90deg,${cc}88,${cc})` }}/>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>
                                Ngưỡng: -{config.threshold}% · ${config.amountUsdt}/lần
                              </p>
                              {c.triggerPrice > 0 && (
                                <p className="num text-[10px] font-semibold" style={{ color:"var(--text-muted)" }}>
                                  Mua khi ≤ ${c.triggerPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                  })}
                </div>
              </div>
            )}

            {/* Khi agent tắt */}
            {!config?.isActive && config && (
              <div className="card p-4 flex items-center gap-4" style={{ border:"1px solid var(--border)" }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl"
                  style={{ background:"rgba(148,163,184,0.1)" }}>⏸</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color:"var(--text-primary)" }}>Agent đang tạm dừng</p>
                  <p className="text-[11px] mt-0.5" style={{ color:"var(--text-muted)" }}>
                    Sẽ tự check giá mỗi 5 phút khi bật
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const saved = await agentApi.upsertConfig(buildPayload({ isActive: true }));
                    setConfig(saved);
                    setForm(p => ({ ...p, isActive: true }));
                    await load();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 shrink-0"
                  style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", color:"#fff", boxShadow:"0 4px 12px rgba(34,197,94,0.3)" }}>
                  ▶ Kích hoạt
                </button>
              </div>
            )}

            {/* ── Trạng thái coins ── */}
            {status?.coins?.length>0 && (
              <div className="card p-5" style={{ border:"1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>Giá 24h tất cả coins</h3>
                    <p className="text-[11px] mt-0.5" style={{ color:"var(--text-muted)" }}>Ngưỡng: -{form.threshold}%</p>
                  </div>
                  {status.summary.willTrigger>0 && (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{ background:"rgba(34,197,94,0.12)", color:"#22c55e", border:"1px solid rgba(34,197,94,0.25)" }}>
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"/>
                      {status.summary.willTrigger} sẵn sàng mua
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {status.coins.map((c:any)=>{ const cc=coinColor(c.coin); return (
                    <div key={c.coin} className="flex items-center justify-between px-3 py-3 rounded-xl"
                      style={{ background:c.willTrigger?`${cc}12`:"var(--bg-input)", border:c.willTrigger?`1px solid ${cc}35`:"1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black text-white"
                          style={{ background:`linear-gradient(135deg,${cc},${cc}bb)` }}>{c.coin.slice(0,3)}</div>
                        <span className="font-bold text-[13px]" style={{ color:"var(--text-primary)" }}>{c.coin}</span>
                      </div>
                      <div className="text-right">
                        <p className="num text-[13px] font-bold" style={{ color:(c.change24h??0)<0?"var(--negative)":"var(--positive)" }}>
                          {c.change24h!=null?`${c.change24h>=0?"+":""}${c.change24h}%`:"—"}
                        </p>
                        {c.willTrigger && <p className="text-[9px] font-black" style={{ color:cc }}>MUA</p>}
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            )}

            <div className="card overflow-hidden" style={{ border:"1px solid var(--border)" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:"1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>Lịch sử giao dịch</h2>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ background:config?.isActive?"rgba(34,197,94,0.12)":"var(--bg-input)", color:config?.isActive?"#22c55e":"var(--text-muted)" }}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${config?.isActive?"bg-green-400 animate-pulse":"bg-gray-500"}`}/>
                    {config?.isActive ? "ĐANG HOẠT ĐỘNG" : "TẮT"}
                  </div>
                  {logs.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:"var(--bg-input)", color:"var(--text-muted)" }}>
                      {logs.length} ghi chép
                    </span>
                  )}
                </div>
                {logs.length > 0 && (
                  <button onClick={clearAllLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
                    style={{ background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.15)" }}>
                    <XCircle className="w-3 h-3"/> Xóa lịch sử
                  </button>
                )}
              </div>

              {/* Stats bar — khi có lịch sử */}
              {!loading && logs.length > 0 && (() => {
                const successes = logs.filter(l=>l.status==="SUCCESS");
                const totalSpent = successes.reduce((s:number,l:any)=>s+l.amountUsdt,0);
                return (
                  <div className="grid grid-cols-3 divide-x px-0" style={{ borderBottom:"1px solid var(--border)", borderColor:"var(--border)" }}>
                    {[
                      { label:"Tổng lệnh mua", value:`${successes.length}`, unit:"lần" },
                      { label:"Tổng đã chi", value:`$${totalSpent.toFixed(2)}`, unit:"USDT" },
                      { label:"Bỏ qua", value:`${logs.filter(l=>l.status==="SKIPPED").length}`, unit:"lần" },
                    ].map(s=>(
                      <div key={s.label} className="px-5 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>{s.label}</p>
                        <p className="num font-black text-base mt-0.5" style={{ color:"var(--text-primary)" }}>
                          {s.value} <span className="text-[11px] font-normal" style={{ color:"var(--text-muted)" }}>{s.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Log list */}
              {loading ? (
                <div className="p-5 space-y-2.5">
                  {[...Array(4)].map((_,i)=><div key={i} className="h-16 shimmer-skeleton rounded-2xl"/>)}
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background:"var(--bg-input)" }}>
                    <Zap className="w-7 h-7" style={{ color:"var(--text-muted)" }}/>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm" style={{ color:"var(--text-primary)" }}>Chưa có hoạt động nào</p>
                    <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>Agent đang chờ thị trường giảm đủ ngưỡng</p>
                  </div>
                </div>
              ) : (
                <div>
                  {logs.map((log, idx) => {
                    const st = STATUS_CFG[log.status] ?? STATUS_CFG.SKIPPED;
                    const Icon = st.icon;
                    const cc = coinColor(log.coin);
                    const isExpanded = expandedLog === log.id;
                    const isSuccess = log.status === "SUCCESS";
                    return (
                      <div key={log.id} style={{ borderBottom: idx < logs.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all"
                          style={{ background: isExpanded ? `${cc}06` : "transparent" }}
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}>

                          {/* Status icon */}
                          <div className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                            style={{ background:`${st.color}12`, border:`1px solid ${st.color}25` }}>
                            <Icon className="w-4.5 h-4.5" style={{ color:st.color }}/>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-0.5">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0"
                                style={{ background:`linear-gradient(135deg,${cc},${cc}99)` }}>{log.coin?.slice(0,3)}</div>
                              <span className="font-bold text-[14px]" style={{ color:"var(--text-primary)" }}>{log.coin}</span>
                              <span className="num text-[12px] font-bold" style={{ color:log.changePercent<0?"var(--negative)":"var(--positive)" }}>
                                {log.changePercent>=0?"+":""}{log.changePercent?.toFixed(2)}%
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background:`${st.color}15`, color:st.color }}>{st.label}</span>
                            </div>
                            <p className="text-[11px]" style={{ color:"var(--text-muted)" }}>
                              {isSuccess
                                ? `Mua ${log.executedQty} ${log.coin} @ $${log.avgPrice?.toFixed(2)}`
                                : log.skipReason ?? log.errorMsg ?? "—"}
                            </p>
                          </div>

                          {/* Amount + time */}
                          <div className="text-right shrink-0">
                            <p className="num text-[15px] font-black" style={{ color: isSuccess ? "#22c55e" : "var(--text-muted)" }}>
                              {isSuccess ? `+$${log.amountUsdt}` : `$${log.amountUsdt}`}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color:"var(--text-muted)" }}>{fmtTime(log.executedAt)}</p>
                          </div>
                          <span className="text-[10px] shrink-0" style={{ color:"var(--text-muted)" }}>{isExpanded?"▲":"▼"}</span>
                        </div>

                        {/* Expanded */}
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-2 grid grid-cols-2 gap-2"
                            style={{ background:`${cc}04`, borderTop:`1px solid ${cc}12` }}>
                            {[
                              { label:"Thời điểm",   value: new Date(log.executedAt).toLocaleString("vi-VN") },
                              { label:"Số tiền",      value: `$${log.amountUsdt} USDT` },
                              ...(isSuccess ? [
                                { label:"Coin nhận",  value: `${log.executedQty} ${log.coin}` },
                                { label:"Giá mua",    value: `$${log.avgPrice?.toFixed(2)}` },
                                { label:"Order ID",   value: log.orderId ?? "—" },
                                { label:"Biến động",  value: `${log.changePercent>=0?"+":""}${log.changePercent?.toFixed(2)}%` },
                              ] : [
                                { label:"Lý do",      value: log.skipReason ?? log.errorMsg ?? "—" },
                                { label:"Biến động",  value: `${log.changePercent>=0?"+":""}${log.changePercent?.toFixed(2)}%` },
                              ]),
                            ].map(r => (
                              <div key={r.label} className="px-3 py-2.5 rounded-xl" style={{ background:"var(--bg-input)" }}>
                                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color:"var(--text-muted)" }}>{r.label}</p>
                                <p className="text-[12px] font-bold mt-0.5 num" style={{ color:"var(--text-primary)" }}>{r.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {detailCoin && config && (() => {
        const cc = coinColor(detailCoin.coin);
        const change = detailCoin.change24h ?? 0;
        const willTrigger = change <= -config.threshold;
        const needDrop = config.threshold + change;
        const coinLogs = logs.filter((l:any) => l.coin === detailCoin.coin && l.status === "SUCCESS");
        const todaySpendCoin = coinLogs
          .filter((l:any) => new Date(l.executedAt).toDateString() === new Date().toDateString())
          .reduce((s:number, l:any) => s + l.amountUsdt, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}
            onClick={()=>setDetailCoin(null)}>
            <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
              style={{ background:"var(--bg-card)", border:"1px solid var(--border-2)", boxShadow:"var(--shadow-dropdown)" }}
              onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[13px] font-black text-white"
                  style={{ background:`linear-gradient(135deg,${cc},${cc}bb)` }}>
                  {detailCoin.coin.slice(0,3)}
                </div>
                <div>
                  <h3 className="text-lg font-black" style={{ color:"var(--text-primary)" }}>{detailCoin.coin}</h3>
                  <p className="text-[11px]" style={{ color:"var(--text-muted)" }}>Chi tiết quy tắc</p>
                </div>
                <button onClick={()=>setDetailCoin(null)} className="ml-auto p-2 rounded-xl"
                  style={{ background:"var(--bg-input)", color:"var(--text-muted)" }}>✕</button>
              </div>

              {/* Trạng thái hiện tại */}
              <div className="px-4 py-3 rounded-xl text-center"
                style={{ background:willTrigger?"rgba(34,197,94,0.10)":"rgba(99,102,241,0.08)",
                  border:`1px solid ${willTrigger?"rgba(34,197,94,0.25)":"rgba(99,102,241,0.2)"}` }}>
                <p className="text-2xl font-black num" style={{ color:change<0?"var(--negative)":"var(--positive)" }}>
                  {change>=0?"+":""}{change}%
                </p>
                <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>Thay đổi 24h</p>
                {willTrigger
                  ? <p className="text-sm font-bold mt-2" style={{ color:"#22c55e" }}>🚨 Đủ điều kiện MUA ngay!</p>
                  : <p className="text-xs mt-2" style={{ color:"var(--text-muted)" }}>
                      Cần giảm thêm <strong>{needDrop>0?needDrop.toFixed(2):0}%</strong> để kích hoạt
                    </p>
                }
              </div>

              {/* Config */}
              <div className="space-y-2">
                {[
                  { label:"Điều kiện",     value:`Giảm > ${config.threshold}% trong 24h` },
                  { label:"Hành động",      value:`Mua $${config.amountUsdt} USDT` },
                  { label:"Cooldown",       value:`${config.cooldownHours} giờ sau mỗi lần` },
                  { label:"Giới hạn ngày",  value:`$${config.maxPerDay} USDT/ngày` },
                  { label:"Đã mua hôm nay", value:todaySpendCoin>0?`$${todaySpendCoin} USDT`:"Chưa có" },
                ].map(r=>(
                  <div key={r.label} className="flex justify-between items-center py-2 px-3 rounded-xl"
                    style={{ background:"var(--bg-input)" }}>
                    <span className="text-[11px]" style={{ color:"var(--text-muted)" }}>{r.label}</span>
                    <span className="text-[12px] font-semibold" style={{ color:"var(--text-primary)" }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Lịch sử mua coin này */}
              {coinLogs.slice(0,3).length>0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color:"var(--text-muted)" }}>
                    Lần mua gần nhất
                  </p>
                  {coinLogs.slice(0,3).map((l:any)=>(
                    <div key={l.id} className="flex justify-between text-[11px] py-1.5 px-3 rounded-lg mb-1"
                      style={{ background:"var(--bg-input)" }}>
                      <span style={{ color:"var(--positive)" }}>✅ ${l.amountUsdt} @ ${l.avgPrice?.toFixed(2)}</span>
                      <span style={{ color:"var(--text-muted)" }}>{fmtTime(l.executedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
