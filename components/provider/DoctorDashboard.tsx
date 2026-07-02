"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarClock, Wallet, Stethoscope, Phone, Plus, Trash2, IndianRupee, Video } from "lucide-react";
import { PageHeader, StatCard, SectionCard, Pill, statusTone, Tabs, EmptyState } from "@/components/portal/ui";
import { formatINR } from "@/lib/utils";

type Booking = { id: string; patientName: string; patientPhone: string; patientAddress: string | null; serviceType: string; bookingDate: string; startTime: string | null; endTime: string | null; status: string | null; amount: number | null; paymentStatus: string | null; notes: string | null };
type Consult = { id: string; patientName: string; patientPhone: string | null; status: string; mode: string | null; scheduledAt: string | null; feeInr: number | null };
type Slot = { id: string; date: string; startTime: string; endTime: string; isBooked: boolean | null };
type Earnings = { rows: { id: string; amount: number; type: string | null; description: string | null; createdAt: string }[]; credited: number; paidOut: number; balance: number };
type Prof = { fullName: string; role: string; specialization: string | null; city: string | null };

const TODAY = new Date().toISOString().slice(0, 10);
const NEXT_ACTION: Record<string, { label: string; to: string; primary?: boolean }[]> = {
  pending: [{ label: "Confirm", to: "confirmed", primary: true }, { label: "Decline", to: "cancelled" }],
  confirmed: [{ label: "Start", to: "in_progress", primary: true }, { label: "Cancel", to: "cancelled" }],
  in_progress: [{ label: "Complete", to: "completed", primary: true }]
};

function initials(name: string) { return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }

export default function DoctorDashboard({ prof, bookings, availability, earnings, consultations = [] }: { prof: Prof; bookings: Booking[]; availability: Slot[]; earnings: Earnings; consultations?: Consult[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"appointments" | "availability" | "earnings">("appointments");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  // Mirror the server bookings into local state for optimistic status flips.
  // Re-syncs whenever the server passes fresh data (after router.refresh()).
  const [rows, setRows] = useState(bookings);
  useEffect(() => { setRows(bookings); }, [bookings]);

  const today = rows.filter((b) => b.bookingDate === TODAY && b.status !== "cancelled");
  const upcoming = rows.filter((b) => b.bookingDate > TODAY && b.status !== "cancelled");
  const weekEarnings = useMemo(() => {
    const since = new Date(Date.now() - 7 * 864e5);
    return earnings.rows.filter((r) => r.type === "credit" && new Date(r.createdAt) >= since).reduce((s, r) => s + r.amount, 0);
  }, [earnings.rows]);
  // 7-day booking-count sparkline.
  const spark = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10));
    return days.map((d) => rows.filter((b) => b.bookingDate === d).length);
  }, [rows]);

  async function setStatus(bookingId: string, status: string) {
    const prev = rows.find((b) => b.id === bookingId)?.status ?? null;
    setBusy(bookingId); setErr("");
    // Optimistic: flip the status pill instantly; roll back if the server fails.
    setRows((list) => list.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    try {
      const r = await fetch("/api/providers/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, status }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || "Could not update the appointment."); }
      router.refresh(); // background reconcile with authoritative server data
    } catch (e) {
      setRows((list) => list.map((b) => (b.id === bookingId ? { ...b, status: prev } : b)));
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title={`Dr. ${prof.fullName}`} subtitle={`${prof.specialization || "Doctor"} · ${prof.city || "Lucknow"}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today" value={String(today.length)} icon={<CalendarCheck size={16} />} accent="#01586C" spark={spark} />
        <StatCard label="Upcoming" value={String(upcoming.length)} icon={<CalendarClock size={16} />} accent="#0a7d96" />
        <StatCard label="This week" value={formatINR(weekEarnings)} icon={<IndianRupee size={16} />} accent="#16a34a" />
        <StatCard label="Balance" value={formatINR(earnings.balance)} icon={<Wallet size={16} />} accent="#FE7D15" />
      </div>

      <div className="mt-6">
        <Tabs active={tab} onChange={setTab} tabs={[{ key: "appointments", label: "Appointments" }, { key: "availability", label: "Availability" }, { key: "earnings", label: "Earnings" }]} />

        {tab === "appointments" && (
          <div className="space-y-6">
            {err && <p role="alert" className="animate-fade-in-up rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
            {consultations.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><Video size={13} /> Video consultations · {consultations.length}</h3>
                <div className="space-y-2">{consultations.map((c) => <ConsultRow key={c.id} c={c} />)}</div>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Today · {today.length}</h3>
              {today.length === 0 ? <EmptyState icon={<CalendarCheck size={22} />} title="No appointments today" hint="Enjoy the breather." /> : (
                <div className="space-y-2">{today.map((b) => <BookingRow key={b.id} b={b} busy={busy === b.id} onStatus={setStatus} />)}</div>
              )}
            </div>
            {upcoming.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Upcoming · {upcoming.length}</h3>
                <div className="space-y-2">{upcoming.map((b) => <BookingRow key={b.id} b={b} busy={busy === b.id} onStatus={setStatus} />)}</div>
              </div>
            )}
          </div>
        )}

        {tab === "availability" && <AvailabilityManager slots={availability} />}
        {tab === "earnings" && <EarningsView earnings={earnings} />}
      </div>
    </div>
  );
}

function BookingRow({ b, busy, onStatus }: { b: Booking; busy: boolean; onStatus: (id: string, s: string) => void }) {
  const actions = NEXT_ACTION[b.status || "pending"] || [];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#01586C] to-[#0a7d96] text-xs font-bold text-white">{initials(b.patientName)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{b.patientName}</span>
          <Pill tone={statusTone(b.status)}>{(b.status || "pending").replace(/_/g, " ")}</Pill>
          {b.paymentStatus === "paid" && <Pill tone="green">paid</Pill>}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{b.serviceType} · {b.bookingDate}{b.startTime ? ` · ${b.startTime}` : ""}{b.amount ? ` · ${formatINR(b.amount)}` : ""}</div>
        {b.notes && <div className="mt-0.5 truncate text-xs italic text-slate-500">{b.notes}</div>}
      </div>
      <a href={`tel:${b.patientPhone}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Call patient"><Phone size={15} /></a>
      <div className="flex gap-2">
        {actions.map((a) => (
          <button key={a.to} disabled={busy} onClick={() => onStatus(b.id, a.to)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${a.primary ? "bg-[#01586C] text-white hover:bg-[#024a5a]" : "border border-slate-200 text-slate-600 hover:bg-slate-50"} disabled:opacity-50`}>
            {busy ? "…" : a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConsultRow({ c }: { c: Consult }) {
  const paid = c.status !== "pending_payment";
  const terminal = c.status === "completed" || c.status === "cancelled";
  const when = c.scheduledAt ? new Date(c.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Flexible time";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/15 bg-primary/[0.03] p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#01586C] to-[#0a7d96] text-white"><Video size={16} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{c.patientName}</span>
          <Pill tone={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</Pill>
          {paid && !terminal && <Pill tone="green">paid</Pill>}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{c.mode || "video"} consult · {when}{c.feeInr ? ` · ${formatINR(c.feeInr)}` : ""}</div>
      </div>
      {c.patientPhone && <a href={`tel:${c.patientPhone}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Call patient"><Phone size={15} /></a>}
      {paid && !terminal ? (
        <a href={`/consult/${c.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#01586C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#024a5a]"><Video size={14} /> Join call</a>
      ) : (
        <a href={`/consult/${c.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Open</a>
      )}
    </div>
  );
}

function AvailabilityManager({ slots }: { slots: Slot[] }) {
  const router = useRouter();
  const [date, setDate] = useState(""); const [start, setStart] = useState("10:00"); const [end, setEnd] = useState("13:00");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  async function add() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/providers/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, startTime: start, endTime: end }) });
    const j = await r.json(); setBusy(false);
    if (!j.ok) return setErr(j.error || "Could not add");
    setDate(""); router.refresh();
  }
  async function remove(id: string) {
    setErr("");
    const r = await fetch("/api/providers/availability", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return setErr(j.error || "Could not remove the slot."); }
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
      <SectionCard title="Add a slot">
        <input type="date" min={TODAY} aria-label="Date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="mt-2 flex gap-2">
          <input type="time" aria-label="Start time" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="time" aria-label="End time" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <button disabled={busy || !date} onClick={add} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#01586C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#024a5a] disabled:opacity-50"><Plus size={15} /> {busy ? "Adding…" : "Add slot"}</button>
        {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      </SectionCard>
      <SectionCard title={`Upcoming slots · ${slots.length}`}>
        {slots.length === 0 ? <EmptyState icon={<CalendarClock size={22} />} title="No slots yet" hint="Add availability so patients can book you." /> : (
          <div className="space-y-2">
            {slots.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                <div className="text-sm text-slate-700">{new Date(s.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {s.startTime}–{s.endTime} {s.isBooked && <Pill tone="green">booked</Pill>}</div>
                {!s.isBooked && <button onClick={() => remove(s.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove slot"><Trash2 size={15} /></button>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function EarningsView({ earnings }: { earnings: Earnings }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Credited" value={formatINR(earnings.credited)} icon={<IndianRupee size={16} />} accent="#16a34a" />
        <StatCard label="Paid out" value={formatINR(earnings.paidOut)} icon={<Wallet size={16} />} accent="#64748b" />
        <StatCard label="Balance" value={formatINR(earnings.balance)} icon={<Wallet size={16} />} accent="#FE7D15" />
      </div>
      <div className="mt-4">
        <SectionCard title="Ledger">
          {earnings.rows.length === 0 ? <EmptyState icon={<Stethoscope size={22} />} title="No earnings yet" hint="Completed appointments appear here." /> : (
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
  );
}
