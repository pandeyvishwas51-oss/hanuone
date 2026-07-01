"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, CheckCircle2, Wallet, MapPin, Phone, Navigation, Activity, IndianRupee } from "lucide-react";
import { StatCard, SectionCard, Pill, statusTone, Tabs, EmptyState } from "@/components/portal/ui";
import { formatINR } from "@/lib/utils";

function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

type Visit = { id: string; patientName: string; patientPhone: string; serviceType: string; serviceName: string | null; address: string; pincode: string | null; scheduledAt: string | null; status: string; patientPhotoUrl: string | null };
type Earnings = { rows: { id: string; amount: number; type: string | null; description: string | null }[]; credited: number; paidOut: number; balance: number };
type Prof = { fullName: string; role: string; city: string | null; gender: string | null };

const NEXT: Record<string, { label: string; to: string }> = {
  assigned: { label: "I'm on the way", to: "on_the_way" },
  on_the_way: { label: "I've arrived", to: "arrived" },
  arrived: { label: "Start visit", to: "in_progress" }
};
function initials(name: string) { return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }

export default function NurseDashboard({ prof, visits, earnings }: { prof: Prof; visits: Visit[]; earnings: Earnings }) {
  const router = useRouter();
  const [tab, setTab] = useState<"visits" | "earnings">("visits");
  const [busy, setBusy] = useState<string | null>(null);

  const active = visits.filter((v) => v.status !== "completed" && v.status !== "cancelled");
  const done = visits.filter((v) => v.status === "completed");

  async function advance(visitId: string, status: string) {
    setBusy(visitId);
    await fetch("/api/providers/visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitId, status }) });
    setBusy(null); router.refresh();
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a7d96] via-[#0e8fa8] to-[#13a8c4] p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium text-white/70">{greeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{prof.fullName}</h1>
          <p className="mt-0.5 text-sm capitalize text-white/70">{prof.role} · {prof.city || "Lucknow"}{prof.gender ? ` · ${prof.gender}` : ""}</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70"><ClipboardList size={14} /> Active</div><div className="mt-1 text-xl font-bold">{active.length}</div></div>
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70"><CheckCircle2 size={14} /> Done</div><div className="mt-1 text-xl font-bold">{done.length}</div></div>
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70"><Wallet size={14} /> Balance</div><div className="mt-1 text-xl font-bold">{formatINR(earnings.balance)}</div></div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Tabs active={tab} onChange={setTab} tabs={[{ key: "visits", label: "My visits" }, { key: "earnings", label: "Earnings" }]} />

        {tab === "visits" && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Active · {active.length}</h3>
              {active.length === 0 ? <EmptyState icon={<ClipboardList size={22} />} title="No active visits" hint="New assignments appear here." /> : (
                <div className="space-y-2">{active.map((v) => <VisitRow key={v.id} v={v} busy={busy === v.id} onAdvance={advance} />)}</div>
              )}
            </div>
            {done.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Completed · {done.length}</h3>
                <div className="space-y-2">{done.map((v) => <VisitRow key={v.id} v={v} busy={false} onAdvance={advance} />)}</div>
              </div>
            )}
          </div>
        )}

        {tab === "earnings" && (
          <div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Credited" value={formatINR(earnings.credited)} icon={<IndianRupee size={16} />} accent="#16a34a" />
              <StatCard label="Paid out" value={formatINR(earnings.paidOut)} icon={<Wallet size={16} />} accent="#64748b" />
              <StatCard label="Balance" value={formatINR(earnings.balance)} icon={<Wallet size={16} />} accent="#FE7D15" />
            </div>
            <div className="mt-4">
              <SectionCard title="Ledger">
                {earnings.rows.length === 0 ? <EmptyState icon={<Activity size={22} />} title="No earnings yet" /> : (
                  <div className="space-y-1.5">
                    {earnings.rows.map((r) => (
                      <div key={r.id} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                        <div className="text-sm text-slate-700">{r.description || (r.type === "payout" ? "Payout" : "Credit")}</div>
                        <div className={`text-sm font-semibold ${r.type === "payout" ? "text-rose-600" : "text-emerald-600"}`}>{r.type === "payout" ? "−" : "+"}{formatINR(r.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VisitRow({ v, busy, onAdvance }: { v: Visit; busy: boolean; onAdvance: (id: string, s: string) => void }) {
  const next = NEXT[v.status];
  const isVitals = v.serviceType === "vitals";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0a7d96] to-[#13a8c4] text-xs font-bold text-white">{initials(v.patientName)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{v.patientName}</span>
            <Pill tone={statusTone(v.status)}>{v.status.replace(/_/g, " ")}</Pill>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} className="shrink-0" /> {v.address}{v.pincode ? `, ${v.pincode}` : ""}</div>
          <div className="mt-0.5 text-xs text-slate-500">{v.serviceName || v.serviceType}</div>
        </div>
        <a href={`tel:${v.patientPhone}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Call patient"><Phone size={15} /></a>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <button disabled={busy} onClick={() => onAdvance(v.id, next.to)} className="flex items-center gap-1.5 rounded-lg bg-[#0a7d96] px-3 py-2 text-xs font-semibold text-white hover:bg-[#087085] disabled:opacity-50">
            <Navigation size={13} /> {busy ? "…" : next.label}
          </button>
        )}
        {(v.status === "in_progress" || v.status === "arrived") && (
          <Link href={`/care/visits/${v.id}`} className="rounded-lg bg-[#FE7D15] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e06b08]">{isVitals ? "Record vitals" : "Open visit"}</Link>
        )}
        {v.status !== "completed" && v.status !== "cancelled" && (
          <Link href={`/care/visits/${v.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Details</Link>
        )}
      </div>
    </div>
  );
}
