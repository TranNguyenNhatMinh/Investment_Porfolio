"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2, Bitcoin, TrendingUp, Landmark,
  LayoutDashboard, Wallet, Gift, History,
  RefreshCw, CreditCard, Settings, LogOut,
  ChevronRight, Bot, Repeat, PieChart, Sparkles,
} from "lucide-react";
import { auth as authApi } from "@/lib/api";
import { clearToken } from "@/lib/auth";

const SECTIONS = [
  {
    id: "crypto",
    label: "Crypto",
    icon: Bitcoin,
    color: "#f97316",
    basePaths: ["/crypto", "/holdings", "/earn", "/trades", "/agent", "/autoinvest"],
    items: [
      { label: "Dashboard",   href: "/crypto",      icon: LayoutDashboard },
      { label: "Holdings",    href: "/holdings",    icon: Wallet },
      { label: "Earn",        href: "/earn",        icon: Gift },
      { label: "AutoInvest",  href: "/autoinvest",  icon: Repeat },
      { label: "Lịch sử GD", href: "/trades",      icon: History },
      { label: "Dip Agent",   href: "/agent",       icon: Bot },
    ],
  },
  {
    id: "stocks",
    label: "Chứng khoán",
    icon: TrendingUp,
    color: "#60a5fa",
    basePaths: ["/stocks"],
    items: [
      { label: "Dashboard", href: "/stocks",      icon: LayoutDashboard },
      { label: "DSIP",      href: "/stocks/dsip", icon: RefreshCw },
    ],
  },
  {
    id: "savings",
    label: "Tiết kiệm",
    icon: Landmark,
    color: "#34d399",
    basePaths: ["/savings"],
    items: [
      { label: "Dashboard",  href: "/savings",          icon: LayoutDashboard },
      { label: "Tài khoản",  href: "/savings/accounts", icon: CreditCard },
    ],
  },
] as const;

const SYSTEM_LINKS = [
  { href: "/ai",       label: "AI Phân tích", icon: Sparkles, color: "#a78bfa" },
  { href: "/settings", label: "Cài đặt",      icon: Settings, color: "#94a3b8" },
] as const;

export default function Sidebar() {
  const pathname     = usePathname();
  const router       = useRouter();
  const [user, setUser]         = useState<{ email: string; name?: string; avatar?: string } | null>(null);
  const [openSection, setOpen]  = useState<string | null>(null);

  useEffect(() => { authApi.me().then(setUser).catch(() => {}); }, []);

  useEffect(() => {
    for (const s of SECTIONS) {
      if (s.basePaths.some(p => pathname.startsWith(p))) { setOpen(s.id); return; }
    }
  }, [pathname]);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const isHome       = pathname === "/";
  const isAllocation = pathname === "/allocation";

  return (
    <div className="fixed left-0 top-0 h-full w-56 flex flex-col z-20"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}>

      {/* ── Logo ── */}
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)", boxShadow: "0 4px 14px rgba(99,102,241,0.45)" }}>
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-bold text-white tracking-tight">Portfolio</p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }}>Investment Tracker</p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: "none" }}>

        {/* Label: Danh mục */}
        <p className="text-[9px] font-black uppercase tracking-[0.22em] px-5 mb-2"
          style={{ color: "rgba(255,255,255,0.18)" }}>Danh mục</p>

        {/* Tổng quan */}
        <NavItem href="/" active={isHome} color="#6366f1" icon={<BarChart2 className="w-4 h-4" />} label="Tổng quan" />

        {/* Phân bổ */}
        <NavItem href="/allocation" active={isAllocation} color="#6366f1" icon={<PieChart className="w-4 h-4" />} label="Phân bổ" />

        {/* Sections */}
        <div className="mt-1 space-y-0.5">
          {SECTIONS.map(section => {
            const Icon    = section.icon;
            const isActive = section.basePaths.some(p => pathname.startsWith(p));
            const isOpen   = openSection === section.id;

            return (
              <div key={section.id}>
                <button
                  onClick={() => setOpen(isOpen ? null : section.id)}
                  className="w-full flex items-center gap-2.5 px-3 mx-2 py-2 rounded-xl text-[12px] font-semibold transition-all"
                  style={{
                    width: "calc(100% - 16px)",
                    background: isActive ? `${section.color}15` : "transparent",
                    color: isActive ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.40)",
                  }}>
                  {/* Left accent */}
                  <span className="w-[3px] h-4 rounded-full shrink-0 transition-all"
                    style={{ background: isActive ? section.color : "transparent" }} />
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isActive ? `${section.color}25` : "rgba(255,255,255,0.05)" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: isActive ? section.color : "rgba(255,255,255,0.30)" }} />
                  </div>
                  <span className="flex-1 text-left">{section.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-200"
                    style={{ color: "rgba(255,255,255,0.20)", transform: isOpen ? "rotate(90deg)" : "rotate(0)" }} />
                </button>

                {/* Sub items */}
                {isOpen && (
                  <div className="mt-0.5 mb-1 ml-6 mr-2 pl-3 space-y-0.5"
                    style={{ borderLeft: `1px solid ${section.color}25` }}>
                    {section.items.map(item => {
                      const ItemIcon  = item.icon;
                      const itemActive = pathname === item.href
                        || (item.href !== `/${section.id}` && pathname.startsWith(item.href));
                      return (
                        <Link key={item.href} href={item.href}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                          style={{
                            background: itemActive ? `${section.color}18` : "transparent",
                            color: itemActive ? "#fff" : "rgba(255,255,255,0.35)",
                          }}>
                          <ItemIcon className="w-3 h-3 shrink-0"
                            style={{ color: itemActive ? section.color : "rgba(255,255,255,0.22)" }} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-5 my-3" style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

        {/* Label: Hệ thống */}
        <p className="text-[9px] font-black uppercase tracking-[0.22em] px-5 mb-2"
          style={{ color: "rgba(255,255,255,0.18)" }}>Hệ thống</p>

        {SYSTEM_LINKS.map(({ href, label, icon: Icon, color }) => {
          const active = pathname.startsWith(href);
          return (
            <NavItem key={href} href={href} active={active} color={color}
              icon={<Icon className="w-4 h-4" />} label={label} />
          );
        })}
      </nav>

      {/* ── User ── */}
      <div className="p-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar"
              className="w-7 h-7 rounded-full shrink-0 object-cover ring-2 ring-indigo-500/40" />
          ) : (
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-white truncate leading-tight">
              {user?.name ?? "Người dùng"}
            </p>
            <p className="text-[10px] truncate leading-tight" style={{ color: "rgba(255,255,255,0.28)" }}>
              {user?.email ?? "..."}
            </p>
          </div>
          <button
            onClick={() => { clearToken(); router.push("/login"); }}
            className="p-1.5 rounded-lg transition-all shrink-0 group"
            style={{ color: "rgba(255,255,255,0.28)" }}
            title="Đăng xuất"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.10)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable flat nav item ── */
function NavItem({ href, active, color, icon, label }: {
  href: string; active: boolean; color: string;
  icon: React.ReactNode; label: string;
}) {
  return (
    <Link href={href}
      className="flex items-center gap-2.5 px-3 mx-2 py-2 rounded-xl text-[12px] font-semibold transition-all relative"
      style={{
        width: "calc(100% - 16px)",
        background: active ? `${color}15` : "transparent",
        color: active ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.40)",
      }}>
      <span className="w-[3px] h-4 rounded-full shrink-0"
        style={{ background: active ? color : "transparent" }} />
      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: active ? `${color}25` : "rgba(255,255,255,0.05)" }}>
        <span style={{ color: active ? color : "rgba(255,255,255,0.30)" }}>{icon}</span>
      </div>
      {label}
    </Link>
  );
}
