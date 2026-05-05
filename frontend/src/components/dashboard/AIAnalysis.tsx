"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Send, RefreshCw, BarChart2, ShieldAlert,
  TrendingUp, RotateCcw, Zap, Bot,
} from "lucide-react";
import { analyze as analyzeApi } from "@/lib/api";

const QUICK = [
  { label: "Tối ưu danh mục",  icon: BarChart2,   prompt: "Tối ưu danh mục"  },
  { label: "Phân tích rủi ro", icon: ShieldAlert,  prompt: "Phân tích rủi ro" },
  { label: "Gợi ý DCA",        icon: TrendingUp,   prompt: "Gợi ý DCA"        },
  { label: "Đánh giá hiệu suất",icon: Zap,          prompt: "Đánh giá hiệu suất danh mục của tôi" },
];

function renderMarkdown(text: string) {
  return text.split("\n").filter(Boolean).map((line, i) => {
    const bold = (s: string) => (
      <span dangerouslySetInnerHTML={{ __html: s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
    );
    if (/^#{1,3}\s/.test(line)) return (
      <p key={i} className="font-bold text-sm mt-5 mb-2 pb-2"
        style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>
        {line.replace(/^#{1,3}\s/, "")}
      </p>
    );
    if (/^[-*]\s/.test(line)) return (
      <div key={i} className="flex gap-3 text-[13px] leading-relaxed my-0.5">
        <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
        <span style={{ color: "var(--text-secondary)" }}>{bold(line.slice(2))}</span>
      </div>
    );
    return (
      <p key={i} className="text-[13px] leading-relaxed my-0.5" style={{ color: "var(--text-secondary)" }}>
        {bold(line)}
      </p>
    );
  });
}

interface Props { fullPage?: boolean; }

export default function AIAnalysis({ fullPage }: Props) {
  const [result, setResult]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [question, setQuestion] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }, [question]);

  useEffect(() => {
    if (result && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [result]);

  const run = async (q?: string) => {
    const prompt = q ?? (question.trim() || undefined);
    setLoading(true); setError(""); setLastPrompt(prompt ?? "Phân tích danh mục");
    try {
      const res = await analyzeApi.portfolio(prompt);
      setResult(res.analysis);
      setQuestion("");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (fullPage) {
    return (
      <div className="flex flex-col h-full">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-8 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
              <Sparkles className="w-4.5 h-4.5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>AI Analysis</h1>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Claude Sonnet 4.6 · Phân tích danh mục đầu tư</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(result || error) && (
              <button onClick={() => { setResult(null); setError(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                <RotateCcw className="w-3 h-3" /> Làm mới
              </button>
            )}
            <button onClick={() => run()} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}>
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Đang phân tích..." : "Phân tích ngay"}
            </button>
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Empty state */}
          {!loading && !error && !result && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto relative"
                  style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
                  <Bot className="w-8 h-8" style={{ color: "var(--accent)" }} />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2"
                    style={{ borderColor: "var(--bg-primary)" }} />
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Phân tích danh mục với AI</p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    Đặt câu hỏi hoặc chọn một gợi ý để bắt đầu
                  </p>
                </div>
              </div>

              {/* Quick action grid */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                {QUICK.map(({ label, icon: Icon, prompt }) => (
                  <button key={label} onClick={() => run(prompt)} disabled={loading}
                    className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-border)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-2)")}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--accent-soft)" }}>
                      <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
                <Sparkles className="w-6 h-6 animate-pulse" style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Đang phân tích...</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>"{lastPrompt}"</p>
              </div>
              <div className="w-full max-w-xl space-y-2.5 mt-4">
                {[75, 55, 88, 45, 70, 60, 80].map((w, i) => (
                  <div key={i} className="h-2.5 shimmer-skeleton rounded-full mx-auto"
                    style={{ width: `${w}%`, animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex-1 flex items-center justify-center px-8">
              <div className="flex items-start gap-3 p-5 rounded-2xl max-w-xl w-full"
                style={{ background: "var(--negative-soft)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--negative)" }} />
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: "var(--negative)" }}>Đã có lỗi xảy ra</p>
                  <p className="text-xs" style={{ color: "var(--negative)" }}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {!loading && result && (
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6" style={{ scrollbarWidth: "none" }}>
              <div className="max-w-3xl mx-auto">
                {/* Prompt badge */}
                <div className="flex justify-end mb-4">
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>
                    {lastPrompt}
                  </span>
                </div>
                {/* AI response */}
                <div className="p-5 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--accent-soft)" }}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Claude Sonnet 4.6</span>
                  </div>
                  <div className="space-y-0.5">{renderMarkdown(result)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 px-8 py-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (question.trim()) run(); } }}
                placeholder="Đặt câu hỏi về danh mục của bạn... (Enter để gửi)"
                rows={1}
                className="w-full px-4 py-3 text-sm rounded-xl outline-none resize-none leading-relaxed"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-2)",
                  color: "var(--text-primary)",
                  maxHeight: 120,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
              />
            </div>
            <button onClick={() => { if (question.trim()) run(); }}
              disabled={loading || !question.trim()}
              className="p-3 rounded-xl disabled:opacity-30 shrink-0 transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
            Shift+Enter để xuống dòng · AI có thể mắc sai sót, hãy kiểm tra thông tin trước khi quyết định
          </p>
        </div>
      </div>
    );
  }

  /* ── Compact card mode (dashboard) ── */
  return (
    <div className="relative overflow-hidden rounded-2xl flex flex-col"
      style={{ background:"linear-gradient(145deg,#0d0f1f 0%,#111327 60%,#0a0d1a 100%)", border:"1px solid rgba(99,102,241,0.18)", minHeight:0 }}>

      {/* Background mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position:"absolute", top:-40, right:-20, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 65%)" }}/>
        <div style={{ position:"absolute", bottom:-30, left:20, width:150, height:150, borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 65%)" }}/>
        <div style={{ position:"absolute", top:"40%", left:"30%", width:120, height:120, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 65%)" }}/>
      </div>

      {/* ── Empty / Loading / Result state ── */}
      <div className="relative flex-1">

        {/* Empty state */}
        {!loading && !error && !result && (
          <div className="flex flex-col items-center justify-center px-6 py-8 gap-5">
            {/* Icon */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background:"linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))", border:"1px solid rgba(99,102,241,0.4)", boxShadow:"0 0 24px rgba(99,102,241,0.2)" }}>
                <Sparkles className="w-7 h-7" style={{ color:"#a78bfa" }}/>
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2"
                style={{ borderColor:"#0d0f1f" }}/>
            </div>
            {/* Text */}
            <div className="text-center space-y-1">
              <p className="font-bold text-sm text-white">Hỏi AI về danh mục</p>
              <p className="text-[11px]" style={{ color:"rgba(255,255,255,0.35)" }}>Claude Sonnet 4.6 phân tích realtime</p>
            </div>
            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {QUICK.slice(0,3).map(({label,icon:Icon,prompt})=>(
                <button key={label} onClick={()=>run(prompt)} disabled={loading}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center transition-all disabled:opacity-40 group"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(99,102,241,0.15)";e.currentTarget.style.borderColor="rgba(99,102,241,0.4)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background:"rgba(99,102,241,0.2)" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color:"#a78bfa" }}/>
                  </div>
                  <span className="text-[10px] font-semibold leading-tight" style={{ color:"rgba(255,255,255,0.6)" }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center px-6 py-8 gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background:"rgba(99,102,241,0.2)", border:"1px solid rgba(99,102,241,0.35)" }}>
              <Sparkles className="w-6 h-6 animate-pulse" style={{ color:"#a78bfa" }}/>
            </div>
            <p className="text-xs font-semibold" style={{ color:"rgba(255,255,255,0.5)" }}>Đang phân tích "{lastPrompt}"</p>
            <div className="w-full space-y-2">
              {[75,55,88,45,68].map((w,i)=>(
                <div key={i} className="h-2 shimmer-skeleton rounded-full"
                  style={{ width:`${w}%`, animationDelay:`${i*0.1}s` }}/>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="px-5 py-5">
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{ background:"rgba(239,68,68,0.1)", color:"#f87171", border:"1px solid rgba(239,68,68,0.2)" }}>
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5"/>{error}
            </div>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background:"rgba(99,102,241,0.25)" }}>
                <Sparkles className="w-3 h-3" style={{ color:"#a78bfa" }}/>
              </div>
              <span className="text-[10px] font-semibold" style={{ color:"rgba(255,255,255,0.35)" }}>Claude Sonnet 4.6</span>
              <button onClick={()=>{setResult(null);setError("");}}
                className="ml-auto p-1 rounded-md" style={{ color:"rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.05)" }}>
                <RotateCcw className="w-3 h-3"/>
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-0.5" style={{ scrollbarWidth:"none" }}>
              {renderMarkdown(result)}
            </div>
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="relative px-4 pb-4 pt-2">
        <div className="flex items-end gap-2 px-3 py-2.5 rounded-2xl"
          style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}>
          <textarea ref={textareaRef} value={question} onChange={e=>setQuestion(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(question.trim())run();}}}
            placeholder="Hỏi về danh mục của bạn..." rows={1}
            className="flex-1 text-xs outline-none resize-none leading-relaxed bg-transparent"
            style={{ color:"rgba(255,255,255,0.85)", maxHeight:80 }}
            onFocus={e=>(e.currentTarget.parentElement!.style.borderColor="rgba(99,102,241,0.5)")}
            onBlur={e=>(e.currentTarget.parentElement!.style.borderColor="rgba(255,255,255,0.1)")}/>
          <button onClick={()=>{if(question.trim())run();}} disabled={loading||!question.trim()}
            className="shrink-0 p-1.5 rounded-xl disabled:opacity-25 transition-all"
            style={{ background:question.trim()?"linear-gradient(135deg,#6366f1,#818cf8)":"rgba(255,255,255,0.08)", color:"#fff" }}>
            <Send className="w-3.5 h-3.5"/>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[9px]" style={{ color:"rgba(255,255,255,0.2)" }}>Enter để gửi</span>
          <button onClick={()=>run()} disabled={loading}
            className="flex items-center gap-1 text-[9px] font-bold disabled:opacity-40 transition-all"
            style={{ color:"#a78bfa" }}>
            <RefreshCw className={`w-2.5 h-2.5 ${loading?"animate-spin":""}`}/>
            {loading?"Đang phân tích...":"Phân tích ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}
