"use client";

import { useState } from "react";
import { Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, Search, Pencil, Check, X } from "lucide-react";
import { portfolio as portfolioApi, binance as binanceApi } from "@/lib/api";

type Tab = "STOCK" | "CRYPTO";

function fmt(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}tỷ`;
  if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}

const COLORS = ["#6366f1","#3b82f6","#22c55e","#f97316","#ef4444","#a855f7","#14b8a6","#eab308"];
function tickerBg(ticker: string) {
  let h = 0; for (const c of ticker) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[h % COLORS.length];
}

function Badge({ pct }: { pct: number }) {
  const pos = pct >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 num text-[11px] font-bold px-1.5 py-0.5 rounded-md"
      style={{ background: pos ? "var(--positive-soft)" : "var(--negative-soft)", color: pos ? "var(--positive)" : "var(--negative)" }}>
      {pos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(7)].map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-3.5 shimmer-skeleton rounded" style={{ width: `${55 + (i * 17) % 35}%` }} />
        </td>
      ))}
    </tr>
  );
}

// Inline buy price editor
function BuyPriceEditor({ holding, onSave, onCancel }: { holding: any; onSave: (price: number) => Promise<void>; onCancel: () => void }) {
  const [val, setVal] = useState(String(holding.buyPrice));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(val.replace(/,/g, ""));
    if (isNaN(n) || n <= 0) return;
    setSaving(true);
    try { await onSave(n); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-28 px-2 py-1 text-xs rounded-lg outline-none num"
        style={{ background: "var(--bg-input)", border: "1px solid var(--accent)", color: "var(--text-primary)" }}
      />
      <button type="submit" disabled={saving} className="p-1 rounded-lg disabled:opacity-50" style={{ color: "var(--positive)" }}>
        <Check className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onCancel} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}

interface Props { holdings: any[]; usdVnd: number; loading: boolean; onRefresh: () => void; }

export default function HoldingsTable({ holdings, usdVnd, loading, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>("STOCK");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingBuyPrice, setEditingBuyPrice] = useState<string | null>(null);

  const handleSaveBuyPrice = async (id: string, price: number) => {
    await portfolioApi.updateHolding(id, { buyPrice: price });
    setEditingBuyPrice(null);
    onRefresh();
  };

  const handleSync = async () => {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await binanceApi.sync();
      // Hiện avg price đã tính được cho từng coin
      const details = (res.synced ?? [])
        .map((s: any) => s.avgBuyPrice
          ? `${s.asset}: avg $${s.avgBuyPrice.toFixed(2)}`
          : `${s.asset}: không tính được avg`)
        .join(" · ");
      setSyncMsg(`Sync xong ${res.count ?? 0} coin${details ? ` — ${details}` : ""}`);
      onRefresh();
    } catch (e: any) {
      setSyncMsg(e.message);
    } finally { setSyncing(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá holding này?")) return;
    setDeleting(id);
    try { await portfolioApi.deleteHolding(id); onRefresh(); }
    finally { setDeleting(null); }
  };

  const filtered = holdings
    .filter(h => h.type === tab)
    .filter(h => !search || h.ticker.toLowerCase().includes(search.toLowerCase()) || h.name?.toLowerCase().includes(search.toLowerCase()));

  const totalValue = filtered.reduce((s, h) => s + h.currentPrice * h.shares * (h.currency === "USD" ? usdVnd : 1), 0);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex-1">
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Danh mục nắm giữ</h2>
          {!loading && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {filtered.length} {tab === "STOCK" ? "cổ phiếu" : "coin"}
              {totalValue > 0 && <span className="num ml-2">· {fmt(totalValue)} ₫</span>}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã..."
            className="pl-7 pr-3 py-1.5 text-xs rounded-xl outline-none w-32 transition-all focus:w-44"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Sync (crypto only) */}
        {tab === "CRYPTO" && (
          <div className="flex flex-col items-end">
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 transition-all"
              style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Binance"}
            </button>
            {syncMsg && <span className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{syncMsg}</span>}
          </div>
        )}

        {/* Tab */}
        <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: "var(--bg-input)" }}>
          {(["STOCK", "CRYPTO"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(""); }}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
              style={tab === t
                ? { background: "var(--accent)", color: "#fff" }
                : { color: "var(--text-muted)" }}>
              {t === "STOCK" ? "Cổ phiếu" : "Crypto"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 && !loading ? (
        <div className="py-14 text-center">
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {search ? `Không tìm thấy "${search}"` : `Chưa có ${tab === "STOCK" ? "cổ phiếu" : "crypto"}`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Mã / Tên", "Số lượng", "Giá mua → Hiện tại", "P&L", "Giá trị", "Tỷ trọng", ""].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
                : filtered.map(h => {
                    const mult = h.currency === "USD" ? usdVnd : 1;
                    const pnl = (h.currentPrice - h.buyPrice) * h.shares * mult;
                    const pct = h.buyPrice > 0 ? ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100 : 0;
                    const val = h.currentPrice * h.shares * mult;
                    const alloc = totalValue > 0 ? (val / totalValue) * 100 : 0;
                    const cur = h.currency === "USD" ? "$" : "₫";
                    const color = tickerBg(h.ticker);

                    return (
                      <tr key={h.id} className="group transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                        {/* Ticker */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                              style={{ background: color }}>
                              {h.ticker.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>{h.ticker}</div>
                              <div className="text-[11px] truncate max-w-[100px]" style={{ color: "var(--text-muted)" }}>{h.name}</div>
                            </div>
                          </div>
                        </td>
                        {/* Qty */}
                        <td className="py-3 px-3">
                          <span className="num text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{h.shares}</span>
                        </td>
                        {/* Price — click giá mua để sửa */}
                        <td className="py-3 px-3">
                          {editingBuyPrice === h.id ? (
                            <BuyPriceEditor
                              holding={h}
                              onSave={(price) => handleSaveBuyPrice(h.id, price)}
                              onCancel={() => setEditingBuyPrice(null)}
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 group/price">
                              <button
                                onClick={() => setEditingBuyPrice(h.id)}
                                className="flex items-center gap-1 group/btn"
                                title="Click để sửa giá mua"
                              >
                                <span className="num text-[11px]" style={{ color: "var(--text-muted)" }}>
                                  {cur}{h.buyPrice.toLocaleString("vi-VN")}
                                </span>
                                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/btn:opacity-100 transition-opacity" style={{ color: "var(--accent)" }} />
                              </button>
                              <span style={{ color: "var(--border-2)" }}>→</span>
                              <span className="num text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{cur}{h.currentPrice.toLocaleString("vi-VN")}</span>
                            </div>
                          )}
                        </td>
                        {/* P&L + % */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="num text-[13px] font-bold" style={{ color: pnl >= 0 ? "var(--positive)" : "var(--negative)" }}>
                              {pnl >= 0 ? "+" : ""}{fmt(pnl)} ₫
                            </span>
                            <Badge pct={pct} />
                          </div>
                        </td>
                        {/* Value */}
                        <td className="py-3 px-3">
                          <span className="num text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(val)} ₫</span>
                        </td>
                        {/* Alloc bar */}
                        <td className="py-3 px-3 min-w-[90px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                              <div className="h-full rounded-full anim-bar-grow" style={{ width: `${alloc}%`, background: color }} />
                            </div>
                            <span className="num text-[10px] w-8 text-right" style={{ color: "var(--text-muted)" }}>{alloc.toFixed(0)}%</span>
                          </div>
                        </td>
                        {/* Delete */}
                        <td className="py-3 px-3 w-8">
                          <button onClick={() => handleDelete(h.id)} disabled={deleting === h.id}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all disabled:opacity-30"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--negative)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
