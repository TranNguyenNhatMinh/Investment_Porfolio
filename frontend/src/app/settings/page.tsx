"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { auth as authApi, portfolio as portfolioApi, binance as binanceApi, exportApi, telegram as telegramApi } from "@/lib/api";
import {
  User, Wallet, RefreshCw, Shield, Bell, ChevronRight,
  CheckCircle2, AlertCircle, Eye, EyeOff, Zap, TrendingUp, Bitcoin, Landmark,
  Camera, Pencil, X, Download, FileSpreadsheet, FileText,
} from "lucide-react";

type NavId = "profile" | "budget" | "sync" | "security" | "notifications" | "export";

const NAV: { id: NavId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "profile",       label: "Tài khoản",         icon: User,            desc: "Thông tin cá nhân" },
  { id: "budget",        label: "Ngân sách",          icon: Wallet,          desc: "Kế hoạch tài chính tháng" },
  { id: "sync",          label: "Binance Sync",        icon: Zap,             desc: "Đồng bộ tài sản crypto" },
  { id: "security",      label: "Bảo mật",            icon: Shield,          desc: "Mật khẩu & xác thực" },
  { id: "notifications", label: "Thông báo",          icon: Bell,            desc: "Tùy chỉnh cảnh báo" },
  { id: "export",        label: "Xuất dữ liệu",       icon: Download,        desc: "Excel, PDF báo cáo" },
];

const BUDGET_FIELDS = [
  { key: "income",       label: "Thu nhập",          icon: TrendingUp, color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  { key: "stockInvest",  label: "Đầu tư cổ phiếu",  icon: TrendingUp, color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  { key: "cryptoInvest", label: "Đầu tư Crypto",     icon: Bitcoin,    color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { key: "spending",     label: "Chi tiêu",           icon: Landmark,   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
];

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

export default function SettingsPage() {
  const [active, setActive] = useState<NavId>("profile");
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ income: 0, stockInvest: 0, cryptoInvest: 0, spending: 0 });
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [notifs, setNotifs] = useState([
    { id: "price5",   label: "Giá thay đổi > 5%",           sub: "Cổ phiếu & Crypto",        on: true  },
    { id: "rsi",      label: "RSI Overbought / Oversold",    sub: "Cảnh báo kỹ thuật",         on: true  },
    { id: "weekly",   label: "Tổng kết danh mục hàng tuần", sub: "Gửi vào thứ 2 hàng tuần",   on: false },
    { id: "dca",      label: "Nhắc nhở DCA định kỳ",        sub: "Theo lịch đầu tư đã cài",   on: true  },
    { id: "budget",   label: "Cảnh báo vượt ngân sách",     sub: "Chi tiêu > 90% kế hoạch",   on: false },
  ]);

  const now = new Date();

  useEffect(() => {
    authApi.me().then(u => { setUser(u); setNameValue(u?.name ?? ""); }).catch(() => {});
    portfolioApi.budgets().then((b) => {
      if (b.length > 0) {
        const l = b[0];
        setForm({ income: l.income, stockInvest: l.stockInvest, cryptoInvest: l.cryptoInvest, spending: l.spending });
      }
    }).catch(() => {});
    telegramApi.status().then(r => setTgConfigured(r.configured)).catch(() => setTgConfigured(false));
  }, []);

  const testTelegram = async () => {
    setTgTesting(true); setTgResult(null);
    try {
      const r = await telegramApi.test(tgChatId || undefined);
      setTgResult({ ok: r.ok, msg: r.ok ? "Gửi thành công! Kiểm tra Telegram của mày." : (r.error ?? "Thất bại") });
    } catch (e: any) {
      setTgResult({ ok: false, msg: e.message });
    } finally { setTgTesting(false); }
  };

  const dispatchUserUpdate = (updated: any) => {
    setUser(updated);
    window.dispatchEvent(new CustomEvent("user-updated", { detail: updated }));
  };

  const [avatarError, setAvatarError] = useState("");
  const [tgConfigured, setTgConfigured] = useState<boolean | null>(null);
  const [tgChatId,     setTgChatId]     = useState("");
  const [tgTesting,    setTgTesting]    = useState(false);
  const [tgResult,     setTgResult]     = useState<{ ok: boolean; msg: string } | null>(null);

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAvatarError("");
    try {
      const compressed = await compressImage(file);
      setAvatarPreview(compressed);
    } catch { setAvatarError("Không thể đọc ảnh, thử file khác."); }
  };

  const handleConfirmAvatar = async () => {
    if (!avatarPreview) return;
    setAvatarLoading(true);
    setAvatarError("");
    try {
      const updated = await authApi.updateAvatar(avatarPreview);
      dispatchUserUpdate(updated);
      setAvatarSaved(true);
      setAvatarPreview(null);
      setTimeout(() => setAvatarSaved(false), 2500);
    } catch (e: any) {
      setAvatarError(e.message ?? "Upload thất bại");
    } finally { setAvatarLoading(false); }
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    const updated = await authApi.updateName(nameValue.trim());
    dispatchUserUpdate(updated);
    setEditingName(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  const handleSaveBudget = async () => {
    await portfolioApi.upsertBudget({ month: now.getMonth() + 1, year: now.getFullYear(), ...form });
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 2500);
  };

  const handleSyncBinance = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await binanceApi.sync();
      if (res?.error) {
        setSyncResult({ ok: false, msg: `Binance: ${res.error}` });
      } else {
        setSyncResult({ ok: true, msg: `Đã đồng bộ ${res.count ?? res.synced?.length ?? 0} tài sản từ Binance` });
      }
    } catch (e: any) {
      setSyncResult({ ok: false, msg: e.message ?? "Lỗi không xác định" });
    } finally {
      setSyncing(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (pwForm.next !== pwForm.confirm) { setPwError("Mật khẩu xác nhận không khớp"); return; }
    if (pwForm.next.length < 6) { setPwError("Mật khẩu mới phải ít nhất 6 ký tự"); return; }
    setPwLoading(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSuccess(false), 3500);
    } catch (e: any) {
      setPwError(e.message);
    } finally {
      setPwLoading(false);
    }
  };

  const totalBudget = form.stockInvest + form.cryptoInvest + form.spending;
  const investPct = form.income > 0 ? Math.round((form.stockInvest + form.cryptoInvest) / form.income * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="ml-56 flex gap-0 min-h-screen">

        {/* ── Left nav ── */}
        <aside className="w-64 shrink-0 border-r p-5 space-y-1 sticky top-0 h-screen overflow-y-auto"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className="mb-6 px-2">
            <h1 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Cài đặt</h1>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Quản lý tài khoản của bạn</p>
          </div>
          {NAV.map(n => {
            const Icon = n.icon;
            const sel = active === n.id;
            return (
              <button key={n.id} onClick={() => setActive(n.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                style={{
                  background: sel ? "var(--accent-soft)" : "transparent",
                  border: sel ? "1px solid var(--accent-border)" : "1px solid transparent",
                }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: sel ? "var(--accent)" : "var(--bg-input)" }}>
                  <Icon className="w-4 h-4" style={{ color: sel ? "#fff" : "var(--text-muted)" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight truncate"
                    style={{ color: sel ? "var(--accent)" : "var(--text-secondary)" }}>{n.label}</p>
                  <p className="text-[10px] leading-tight truncate" style={{ color: "var(--text-muted)" }}>{n.desc}</p>
                </div>
                {sel && <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "var(--accent)" }} />}
              </button>
            );
          })}
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 p-8 max-w-2xl">

          {/* PROFILE */}
          {active === "profile" && (
            <Section title="Tài khoản" desc="Thông tin hồ sơ cá nhân của bạn">

              {/* Avatar + name */}
              <div className="flex flex-col items-center gap-4 p-6 rounded-2xl mb-5"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>

                {/* Avatar */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-3xl shrink-0"
                    style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                    {(avatarPreview ?? user?.avatar)
                      ? <img src={avatarPreview ?? user?.avatar} alt="avatar" className="w-full h-full object-cover" />
                      : (user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U")}
                  </div>
                  {!avatarPreview && (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.55)" }}>
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>

                {/* Confirm / Cancel khi có preview */}
                {avatarPreview ? (
                  <div className="flex gap-2">
                    <button onClick={handleConfirmAvatar} disabled={avatarLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                      style={{ background: "var(--accent)", color: "#fff" }}>
                      {avatarLoading
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</>
                        : <><CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận</>}
                    </button>
                    <button onClick={() => setAvatarPreview(null)} disabled={avatarLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "var(--bg-input)", border: "1px solid var(--border-2)", color: "var(--text-secondary)" }}>
                      <X className="w-3.5 h-3.5" /> Hủy
                    </button>
                  </div>
                ) : (
                  <>
                    {avatarSaved && (
                      <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--positive)" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã cập nhật ảnh
                      </span>
                    )}
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", color: "var(--text-secondary)" }}>
                      <Camera className="w-3.5 h-3.5" /> Đổi ảnh đại diện
                    </button>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>JPG, PNG, WebP · Tối đa 1.5MB</p>
                  </>
                )}
                {avatarError && (
                  <p className="text-xs flex items-center gap-1" style={{ color: "var(--negative)" }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{avatarError}
                  </p>
                )}
              </div>

              {/* Name edit */}
              <div className="p-4 rounded-2xl mb-3" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Họ tên</p>
                {editingName ? (
                  <div className="flex gap-2 items-center">
                    <input value={nameValue} onChange={e => setNameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                      autoFocus
                      className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--accent)", color: "var(--text-primary)" }} />
                    <button onClick={handleSaveName}
                      className="px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ background: "var(--accent)", color: "#fff" }}>Lưu</button>
                    <button onClick={() => { setEditingName(false); setNameValue(user?.name ?? ""); }}
                      className="p-2 rounded-xl" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name ?? "—"}</p>
                    <button onClick={() => setEditingName(true)}
                      className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {nameSaved && (
                  <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: "var(--positive)" }}>
                    <CheckCircle2 className="w-3 h-3" /> Đã lưu tên
                  </p>
                )}
              </div>

              {/* Other info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Email", value: user?.email ?? "—" },
                  { label: "Tham gia", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—" },
                ].map(f => (
                  <div key={f.label} className="p-4 rounded-xl" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{f.label}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* BUDGET */}
          {active === "budget" && (
            <Section title={`Ngân sách tháng ${now.getMonth() + 1}/${now.getFullYear()}`} desc="Kế hoạch thu chi và đầu tư hàng tháng">

              {/* Summary bar */}
              {form.income > 0 && (
                <div className="p-4 rounded-2xl mb-6" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Tổng phân bổ</p>
                    <p className="num text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      {fmt(totalBudget)} / {fmt(form.income)} ₫
                    </p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(form.income > 0 ? totalBudget / form.income * 100 : 0, 100)}%`,
                        background: totalBudget > form.income ? "var(--negative)" : "var(--accent)",
                      }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Tỷ lệ đầu tư: <span className="font-bold" style={{ color: "var(--positive)" }}>{investPct}%</span>
                    </p>
                    <p className="num text-[10px] font-bold" style={{ color: totalBudget > form.income ? "var(--negative)" : "var(--text-muted)" }}>
                      {totalBudget > form.income ? `Vượt ${fmt(totalBudget - form.income)} ₫` : `Còn lại ${fmt(form.income - totalBudget)} ₫`}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                {BUDGET_FIELDS.map(({ key, label, icon: Icon, color, bg }) => (
                  <div key={key} className="p-4 rounded-2xl" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                        className="w-full px-3 py-2 pr-7 rounded-xl text-sm font-semibold outline-none transition-all num"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-2)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = color)}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>₫</span>
                    </div>
                    {form[key as keyof typeof form] > 0 && (
                      <p className="num text-[10px] mt-1.5 font-semibold" style={{ color }}>
                        ≈ {fmt(form[key as keyof typeof form])} ₫
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={handleSaveBudget}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: budgetSaved ? "rgba(34,197,94,0.15)" : "var(--accent)",
                  color: budgetSaved ? "var(--positive)" : "#fff",
                  border: budgetSaved ? "1px solid rgba(34,197,94,0.3)" : "none",
                }}>
                {budgetSaved ? <CheckCircle2 className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                {budgetSaved ? "Đã lưu thành công" : "Lưu ngân sách"}
              </button>
            </Section>
          )}

          {/* SYNC */}
          {active === "sync" && (
            <Section title="Binance Sync" desc="Tự động đồng bộ số dư crypto từ tài khoản Binance">
              <div className="p-5 rounded-2xl mb-5" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(234,179,8,0.15)" }}>
                    <Zap className="w-5 h-5" style={{ color: "#eab308" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Đồng bộ tức thì</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Kéo toàn bộ số dư spot từ Binance API</p>
                  </div>
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                  Quá trình đồng bộ sẽ cập nhật số lượng hiện có của từng coin trong danh mục dựa trên số dư thực tế trên Binance. Các lệnh đang chờ (open orders) sẽ không được tính.
                </p>
                <button onClick={handleSyncBinance} disabled={syncing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Đang đồng bộ..." : "Sync từ Binance"}
                </button>
              </div>

              {syncResult && (
                <div className="flex items-start gap-3 p-4 rounded-xl"
                  style={{
                    background: syncResult.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${syncResult.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}>
                  {syncResult.ok
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--positive)" }} />
                    : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--negative)" }} />}
                  <p className="text-sm font-medium" style={{ color: syncResult.ok ? "var(--positive)" : "var(--negative)" }}>
                    {syncResult.msg}
                  </p>
                </div>
              )}

              <div className="mt-5 p-4 rounded-xl" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Lưu ý</p>
                <ul className="space-y-1">
                  {["API Key cần quyền đọc số dư (Read Only)", "Không lưu Secret Key trên hệ thống", "Dữ liệu được mã hoá khi truyền"].map(t => (
                    <li key={t} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--text-muted)" }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          {/* SECURITY */}
          {active === "security" && (
            <Section title="Đổi mật khẩu" desc="Cập nhật mật khẩu để bảo vệ tài khoản">
              <div className="space-y-4 mb-5">
                {([
                  { key: "current", label: "Mật khẩu hiện tại",    placeholder: "Nhập mật khẩu hiện tại" },
                  { key: "next",    label: "Mật khẩu mới",          placeholder: "Tối thiểu 6 ký tự" },
                  { key: "confirm", label: "Xác nhận mật khẩu mới", placeholder: "Nhập lại mật khẩu mới" },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: "var(--text-muted)" }}>{label}</label>
                    <div className="relative">
                      <input
                        type={pwShow[key] ? "text" : "password"}
                        value={pwForm[key]}
                        onChange={(e) => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                        style={{
                          background: "var(--bg-input)",
                          border: "1px solid var(--border-2)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
                      />
                      <button onClick={() => setPwShow(s => ({ ...s, [key]: !s[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                        style={{ color: "var(--text-muted)" }}>
                        {pwShow[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pwError && (
                <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "var(--negative)" }} />
                  <p className="text-sm" style={{ color: "var(--negative)" }}>{pwError}</p>
                </div>
              )}
              {pwSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--positive)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--positive)" }}>Đổi mật khẩu thành công</p>
                </div>
              )}

              <button onClick={handleChangePassword} disabled={pwLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}>
                <Shield className="w-4 h-4" />
                {pwLoading ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </Section>
          )}

          {/* NOTIFICATIONS */}
          {active === "notifications" && (
            <Section title="Telegram Bot" desc="Nhận thông báo khi Dip Agent mua crypto, có lỗi xảy ra">

              {/* Status badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-2 h-2 rounded-full ${tgConfigured ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {tgConfigured === null ? "Đang kiểm tra..." : tgConfigured ? "Bot đã được cấu hình" : "Chưa cấu hình"}
                </span>
              </div>

              {/* Hướng dẫn setup */}
              <div className="p-4 rounded-2xl space-y-2 mb-5"
                style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}>
                <p className="text-[12px] font-bold" style={{ color: "var(--accent)" }}>Cách setup (1 lần duy nhất):</p>
                <ol className="space-y-1.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>1.</span> Chat với <code className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-input)" }}>@BotFather</code> → <code className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-input)" }}>/newbot</code> → lấy <b>token</b></li>
                  <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>2.</span> Nhắn bất kỳ gì cho bot đó để kích hoạt</li>
                  <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>3.</span> Mở link: <code className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-input)" }}>api.telegram.org/bot{"{TOKEN}"}/getUpdates</code> → lấy <b>chat_id</b></li>
                  <li><span className="font-bold" style={{ color: "var(--text-primary)" }}>4.</span> Thêm vào <code className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-input)" }}>.env</code> backend:</li>
                </ol>
                <div className="mt-2 p-3 rounded-xl font-mono text-[11px]"
                  style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}>
                  TELEGRAM_BOT_TOKEN=123456:ABC...<br />
                  TELEGRAM_CHAT_ID=987654321
                </div>
              </div>

              {/* Test section */}
              <div className="space-y-3">
                <p className="text-[12px] font-semibold" style={{ color: "var(--text-secondary)" }}>Kiểm tra kết nối</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Chat ID (để trống nếu đã set trong .env)"
                    value={tgChatId}
                    onChange={e => setTgChatId(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-input)", border: "1px solid var(--border-2)", color: "var(--text-primary)" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
                  />
                  <button onClick={testTelegram} disabled={tgTesting}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 shrink-0"
                    style={{ background: "var(--accent)", color: "#fff" }}>
                    {tgTesting ? "Đang gửi..." : "Gửi test"}
                  </button>
                </div>

                {tgResult && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: tgResult.ok ? "var(--positive-soft)" : "var(--negative-soft)",
                      color:      tgResult.ok ? "var(--positive)"      : "var(--negative)",
                      border:     `1px solid ${tgResult.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}>
                    {tgResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {tgResult.msg}
                  </div>
                )}
              </div>

              {/* Events được notify */}
              <div className="mt-5">
                <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Sự kiện được thông báo tự động</p>
                <div className="space-y-2">
                  {[
                    { icon: "✅", label: "Dip Agent mua thành công", desc: "Coin, số lượng, giá thực thi, tổng ngày" },
                    { icon: "🧪", label: "Dip Agent phát hiện cơ hội (dry run)", desc: "Khi agent chạy test không mua thật" },
                    { icon: "⚠️", label: "Dip Agent gặp lỗi", desc: "Khi không thể đặt lệnh" },
                  ].map(e => (
                    <div key={e.label} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "var(--bg-input)" }}>
                      <span className="text-base shrink-0">{e.icon}</span>
                      <div>
                        <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{e.label}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{e.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {active === "export" && (
            <Section title="Xuất dữ liệu" desc="Tải về báo cáo danh mục đầu tư">
              <div className="space-y-4">
                <div className="p-5 rounded-2xl flex items-center justify-between gap-4"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(34,197,94,0.12)" }}>
                      <FileSpreadsheet className="w-5 h-5" style={{ color: "#22c55e" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Excel (.xlsx)</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        5 sheet: Tổng quan · Danh mục · Tiết kiệm · DCA · Theo tháng
                      </p>
                    </div>
                  </div>
                  <button onClick={() => exportApi.excel()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
                    <Download className="w-4 h-4" /> Tải xuống
                  </button>
                </div>

                <div className="p-5 rounded-2xl flex items-center justify-between gap-4"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(239,68,68,0.12)" }}>
                      <FileText className="w-5 h-5" style={{ color: "#ef4444" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>PDF báo cáo</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Mở trang báo cáo → Ctrl+P → Save as PDF
                      </p>
                    </div>
                  </div>
                  <button onClick={() => exportApi.pdf()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.20)" }}>
                    <FileText className="w-4 h-4" /> Xem báo cáo
                  </button>
                </div>

                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  * Dữ liệu xuất tại thời điểm tải về, bao gồm giá live hiện tại.
                </p>
              </div>
            </Section>
          )}

        </main>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
