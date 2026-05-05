"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2, Mail, Lock, User, Eye, EyeOff,
  TrendingUp, ShieldCheck, Sparkles, ArrowRight,
} from "lucide-react";
import { auth as authApi } from "@/lib/api";
import { setToken } from "@/lib/auth";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Theo dõi real-time",
    desc: "Cổ phiếu & crypto cập nhật liên tục",
  },
  {
    icon: Sparkles,
    title: "AI Analysis",
    desc: "Claude Sonnet phân tích danh mục tự động",
  },
  {
    icon: ShieldCheck,
    title: "Chỉ số kỹ thuật",
    desc: "RSI, MACD và biểu đồ chuyên sâu",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res =
        mode === "login"
          ? await authApi.login(email, password)
          : await authApi.register(email, password, name);
      setToken(res.access_token);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1fr]">

      {/* ════════════════════════════════
          LEFT — Branding panel
      ════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #07101f 0%, #0e1f40 55%, #071628 100%)" }}
      >
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Glow orbs */}
          <div className="absolute -top-10 -left-10 w-80 h-80 bg-blue-600/12 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-blue-400/6 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl p-2.5 shadow-xl shadow-blue-600/40 ring-1 ring-white/20">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base tracking-tight leading-none">Portfolio</p>
            <p className="text-white/40 text-[11px] mt-0.5">Investment Tracker</p>
          </div>
        </div>

        {/* Hero text + features */}
        <div className="relative space-y-10">
          <div>
            <h2 className="text-white text-[2.6rem] font-bold leading-[1.15] tracking-tight">
              Quản lý đầu tư<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #60a5fa 0%, #38bdf8 100%)" }}
              >
                thông minh hơn
              </span>
            </h2>
            <p className="text-white/50 mt-4 text-[15px] leading-relaxed max-w-sm">
              Theo dõi cổ phiếu, crypto và nhận phân tích AI chuyên sâu để đưa ra quyết định đầu tư tốt hơn.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="bg-blue-500/12 ring-1 ring-blue-500/20 rounded-xl p-2.5 shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats bar */}
        <div className="relative flex gap-10 pt-8 border-t border-white/[0.07]">
          {[
            { value: "Cổ phiếu & Crypto", label: "Tài sản hỗ trợ" },
            { value: "Claude Sonnet 4.6", label: "AI Engine" },
            { value: "RSI · MACD", label: "Kỹ thuật" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white text-sm font-bold">{s.value}</p>
              <p className="text-white/35 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════
          RIGHT — Form panel
      ════════════════════════════════ */}
      <div className="flex flex-col justify-center min-h-screen bg-[#f8fafc] px-8 py-12 sm:px-12 lg:px-16">

        {/* Mobile-only logo */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl p-2.5 shadow-lg shadow-blue-600/30">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-900 font-bold text-lg tracking-tight">Portfolio Tracker</p>
        </div>

        <div className="w-full max-w-sm mx-auto anim-fade-in-up">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[1.75rem] font-bold text-slate-900 tracking-tight leading-tight">
              {mode === "login" ? "Chào mừng trở lại 👋" : "Tạo tài khoản"}
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              {mode === "login"
                ? "Nhập thông tin để truy cập dashboard của bạn"
                : "Đăng ký miễn phí và bắt đầu theo dõi danh mục"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name — register only */}
            {mode === "register" && (
              <Field label="Họ tên">
                <InputIcon icon={<User className="w-4 h-4" />} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={INPUT_CLS}
                />
              </Field>
            )}

            {/* Email */}
            <Field label="Email">
              <InputIcon icon={<Mail className="w-4 h-4" />} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className={INPUT_CLS}
              />
            </Field>

            {/* Password */}
            <Field label="Mật khẩu">
              <InputIcon icon={<Lock className="w-4 h-4" />} />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                required
                minLength={6}
                className={`${INPUT_CLS} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </Field>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                <span className="shrink-0 font-bold">!</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm group"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <button
              onClick={switchMode}
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
            </button>
          </p>

          {/* Demo */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Tài khoản demo:{" "}
              <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">test@invest.local</span>
              {" / "}
              <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">password123</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

const INPUT_CLS =
  "w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-sm hover:border-slate-300";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}

function InputIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      {icon}
    </span>
  );
}
