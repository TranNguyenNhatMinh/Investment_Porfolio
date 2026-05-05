"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { dsip as dsipApi } from "@/lib/api";
import { Plus, Trash2, ChevronDown, ChevronUp, PlusCircle, TrendingUp } from "lucide-react";

const KNOWN_FUNDS: Record<string, string> = {
  VCBFBCF: "Quỹ trái phiếu VCBF",
  VNDAF:   "Dragon Capital Advantage",
  VNDBF:   "Dragon Capital Bond",
  DCBF:    "Dragon Capital Bond Fund",
  DCDE:    "Dragon Capital Equity",
  VESAF:   "VinaCapital Equity",
  VIBF:    "VinaCapital Bond",
};

function fmt(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

export default function DsipPage() {
  const [plans, setPlans]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRecord, setShowRecord] = useState<string | null>(null);
  const [showNav,    setShowNav]    = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    dsipApi.plans().then(setPlans).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  /* ── Tổng thống kê ── */
  const totalInvested = plans.reduce((s, p) =>
    s + p.records.reduce((rs: number, r: any) => rs + r.totalInvested, 0), 0);
  const totalRecords  = plans.reduce((s, p) => s + p.records.length, 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="ml-56 p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              DSIP — Đầu tư định kỳ
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              Theo dõi kế hoạch đầu tư quỹ mở qua VNDirect
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 2px 12px rgba(99,102,241,0.35)" }}>
            <Plus className="w-4 h-4" /> Thêm kế hoạch
          </button>
        </div>

        {/* Stats */}
        {!loading && plans.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Số kế hoạch", value: plans.length, suffix: "" },
              { label: "Tổng đã đầu tư", value: fmt(totalInvested), suffix: " ₫" },
              { label: "Tổng lần nộp", value: totalRecords, suffix: " lần" },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="num text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}{s.suffix}</p>
              </div>
            ))}
          </div>
        )}

        {/* Plans */}
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 shimmer-skeleton rounded-2xl" />)}</div>
        ) : plans.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Chưa có kế hoạch DSIP nào</p>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Nhấn "Thêm kế hoạch" để bắt đầu theo dõi</p>
            <button onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Thêm kế hoạch
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => {
              const funds = plan.funds as { symbol: string; name: string; allocation: number }[];
              const invested = plan.records.reduce((s: number, r: any) => s + r.totalInvested, 0);
              const isExpanded = expanded === plan.id;

              return (
                <div key={plan.id} className="card overflow-hidden">
                  {/* Plan header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: plan.isActive ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)", color: plan.isActive ? "#22c55e" : "var(--text-muted)" }}>
                            {plan.isActive ? "Đang tiến hành" : "Tạm dừng"}
                          </span>
                          <h2 className="font-bold text-[15px]" style={{ color: "var(--text-primary)" }}>{plan.name}</h2>
                        </div>

                        {/* Fund allocation */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {funds.map(f => (
                            <div key={f.symbol} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                              style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
                              <span className="font-bold" style={{ color: "var(--accent)" }}>{f.symbol}</span>
                              <span style={{ color: "var(--text-muted)" }}>{f.allocation}%</span>
                            </div>
                          ))}
                        </div>

                        {/* Info row */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Định kỳ: </span>
                            <span className="num font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(plan.monthlyAmount)} ₫/tháng</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Ngày nộp: </span>
                            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Ngày {plan.scheduleDay}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Bắt đầu: </span>
                            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                              {new Date(plan.startDate).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          {plan.sourceAccount && (
                            <div>
                              <span style={{ color: "var(--text-muted)" }}>Tài khoản: </span>
                              <span className="num font-semibold" style={{ color: "var(--text-primary)" }}>{plan.sourceAccount}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right stats */}
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Đã đầu tư</p>
                        <p className="num text-xl font-bold" style={{ color: "var(--text-primary)" }}>{fmt(invested)} ₫</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{plan.records.length} lần</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                      <button onClick={() => setShowRecord(plan.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <PlusCircle className="w-3.5 h-3.5" /> Ghi nhận tháng này
                      </button>
                      <button onClick={() => setShowNav(plan.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>
                        <TrendingUp className="w-3.5 h-3.5" /> Cập nhật NAV
                      </button>
                      <button onClick={() => setExpanded(isExpanded ? null : plan.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Lịch sử ({plan.records.length})
                      </button>
                      <button onClick={async () => {
                        if (!confirm("Xóa kế hoạch này?")) return;
                        await dsipApi.deletePlan(plan.id);
                        load();
                      }} className="ml-auto p-1.5 rounded-lg transition-all"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* History table */}
                  {isExpanded && plan.records.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {["Ngày nộp", "Số tiền", "Chi tiết quỹ", ""].map(h => (
                              <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: "var(--text-muted)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {plan.records.map((r: any) => (
                            <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                                {new Date(r.investedAt).toLocaleDateString("vi-VN")}
                              </td>
                              <td className="px-5 py-3 num font-semibold" style={{ color: "var(--text-primary)" }}>
                                {fmt(r.totalInvested)} ₫
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {(r.fundData as any[]).map(fd => (
                                    <span key={fd.symbol} className="text-[11px] px-2 py-0.5 rounded"
                                      style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                                      {fd.symbol}: {fmt(fd.amount)}₫ · {fd.units?.toFixed(4) ?? "—"} đvị
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <button onClick={async () => {
                                  await dsipApi.deleteRecord(r.id);
                                  load();
                                }} className="p-1 rounded transition-all"
                                  style={{ color: "var(--text-muted)" }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Thêm kế hoạch */}
        {showForm && <PlanForm funds={KNOWN_FUNDS} onClose={() => setShowForm(false)} onSave={load} />}

        {/* Modal: Cập nhật NAV */}
        {showNav && (
          <NavForm
            plan={plans.find(p => p.id === showNav)!}
            onClose={() => setShowNav(null)}
            onSave={load}
          />
        )}

        {/* Modal: Ghi nhận tháng */}
        {showRecord && (
          <RecordForm
            plan={plans.find(p => p.id === showRecord)!}
            onClose={() => setShowRecord(null)}
            onSave={load}
          />
        )}
      </div>
    </div>
  );
}

/* ── Form thêm kế hoạch ── */
function PlanForm({ funds, onClose, onSave }: { funds: Record<string,string>; onClose: () => void; onSave: () => void }) {
  const [name, setName]           = useState("DSIP Linh hoạt");
  const [monthlyAmt, setMonthly]  = useState("1000000");
  const [scheduleDay, setDay]     = useState("12");
  const [startDate, setStart]     = useState(new Date().toISOString().split("T")[0]);
  const [sourceAcc, setSource]    = useState("");
  const [allocations, setAlloc]   = useState([{ symbol: "VCBFBCF", allocation: 30 }, { symbol: "VNDAF", allocation: 20 }, { symbol: "VNDBF", allocation: 50 }]);
  const [saving, setSaving]       = useState(false);

  const totalAlloc = allocations.reduce((s, a) => s + a.allocation, 0);

  const save = async () => {
    if (totalAlloc !== 100) return alert("Tổng tỷ lệ phân bổ phải = 100%");
    setSaving(true);
    await dsipApi.createPlan({
      name, monthlyAmount: Number(monthlyAmt), scheduleDay: Number(scheduleDay),
      startDate, sourceAccount: sourceAcc,
      funds: allocations.map(a => ({ symbol: a.symbol, name: funds[a.symbol] ?? a.symbol, allocation: a.allocation })),
    });
    onSave(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)" }}>
        <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Thêm kế hoạch DSIP</h2>

        <div className="space-y-3">
          <Field label="Tên kế hoạch" value={name} onChange={setName} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số tiền/tháng (₫)" value={monthlyAmt} onChange={setMonthly} type="number" />
            <Field label="Ngày nộp hàng tháng" value={scheduleDay} onChange={setDay} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày bắt đầu" value={startDate} onChange={setStart} type="date" />
            <Field label="Số tài khoản" value={sourceAcc} onChange={setSource} placeholder="0001806216" />
          </div>

          {/* Fund allocations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Phân bổ quỹ
              </label>
              <span className="text-xs font-bold" style={{ color: totalAlloc === 100 ? "#22c55e" : "#ef4444" }}>
                Tổng: {totalAlloc}%
              </span>
            </div>
            <div className="space-y-2">
              {allocations.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={a.symbol} onChange={e => {
                    const n = [...allocations]; n[i].symbol = e.target.value; setAlloc(n);
                  }} className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                    {Object.entries(funds).map(([sym, name]) => (
                      <option key={sym} value={sym}>{sym} — {name}</option>
                    ))}
                  </select>
                  <input type="number" value={a.allocation} onChange={e => {
                    const n = [...allocations]; n[i].allocation = Number(e.target.value); setAlloc(n);
                  }} className="w-20 px-3 py-2 rounded-xl text-sm text-center outline-none"
                    style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>%</span>
                  <button onClick={() => setAlloc(allocations.filter((_, j) => j !== i))}
                    className="p-1 rounded" style={{ color: "var(--text-muted)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => setAlloc([...allocations, { symbol: "VCBFBCF", allocation: 0 }])}
                className="flex items-center gap-1 text-xs font-semibold mt-1"
                style={{ color: "var(--accent)" }}>
                <Plus className="w-3.5 h-3.5" /> Thêm quỹ
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>Huỷ</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}>
            {saving ? "Đang lưu..." : "Lưu kế hoạch"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Form ghi nhận tháng ── */
function RecordForm({ plan, onClose, onSave }: { plan: any; onClose: () => void; onSave: () => void }) {
  const funds = plan.funds as { symbol: string; name: string; allocation: number }[];
  const [date, setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [total, setTotal]   = useState(String(plan.monthlyAmount));
  const [navs, setNavs]     = useState<Record<string, string>>(Object.fromEntries(funds.map(f => [f.symbol, ""])));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const fundData = funds.map(f => {
      const amount  = plan.monthlyAmount * f.allocation / 100;
      const nav     = Number(navs[f.symbol]) || 0;
      const units   = nav > 0 ? amount / nav : 0;
      return { symbol: f.symbol, amount, nav, units };
    });
    await dsipApi.addRecord(plan.id, {
      investedAt: date, totalInvested: Number(total), fundData,
    });
    onSave(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)" }}>
        <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Ghi nhận — {plan.name}</h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày nộp" value={date} onChange={setDate} type="date" />
            <Field label="Tổng tiền (₫)" value={total} onChange={setTotal} type="number" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              NAV từng quỹ (₫/đơn vị)
            </label>
            <div className="space-y-2">
              {funds.map(f => (
                <div key={f.symbol} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-bold shrink-0" style={{ color: "var(--text-primary)" }}>{f.symbol}</span>
                  <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{f.allocation}%</span>
                  <input type="number" placeholder="NAV hôm nay..."
                    value={navs[f.symbol]} onChange={e => setNavs({ ...navs, [f.symbol]: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
              NAV lấy từ VNDirect sau khi lệnh khớp. Để trống nếu chưa có.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>Huỷ</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "#22c55e" }}>
            {saving ? "Đang lưu..." : "Ghi nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2"
        style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
    </div>
  );
}

/* ── Form cập nhật NAV hiện tại ── */
function NavForm({ plan, onClose, onSave }: { plan: any; onClose: () => void; onSave: () => void }) {
  const funds = plan.funds as { symbol: string; name: string; allocation: number; currentNav?: number }[];
  const [navs, setNavs] = useState<Record<string, string>>(
    Object.fromEntries(funds.map(f => [f.symbol, f.currentNav ? String(f.currentNav) : ""]))
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const updatedFunds = funds.map(f => ({
      ...f,
      currentNav: Number(navs[f.symbol]) || f.currentNav || 0,
    }));
    await dsipApi.updatePlan(plan.id, { funds: updatedFunds });
    onSave(); onClose();
  };

  // Tính tổng units tích lũy từ records
  const unitMap: Record<string, number> = {};
  for (const r of (plan.records ?? [])) {
    for (const fd of (r.fundData ?? [])) {
      unitMap[fd.symbol] = (unitMap[fd.symbol] ?? 0) + (fd.units ?? 0);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)" }}>
        <div>
          <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Cập nhật NAV — {plan.name}</h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Nhập NAV hiện tại từ VNDirect để tính giá trị danh mục chính xác
          </p>
        </div>
        <div className="space-y-3">
          {funds.map(f => {
            const units    = unitMap[f.symbol] ?? 0;
            const nav      = Number(navs[f.symbol]) || 0;
            const curValue = units * nav;
            return (
              <div key={f.symbol} className="p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{f.symbol}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{f.allocation}% · {units.toFixed(4)} đơn vị</span>
                  {curValue > 0 && (
                    <span className="ml-auto num text-xs font-semibold" style={{ color: "#60a5fa" }}>
                      ≈ {fmt(curValue)} ₫
                    </span>
                  )}
                </div>
                <input type="number" placeholder="NAV hiện tại (₫/đơn vị)..."
                  value={navs[f.symbol]} onChange={e => setNavs({ ...navs, [f.symbol]: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>Huỷ</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "#60a5fa" }}>
            {saving ? "Đang lưu..." : "Lưu NAV"}
          </button>
        </div>
      </div>
    </div>
  );
}
