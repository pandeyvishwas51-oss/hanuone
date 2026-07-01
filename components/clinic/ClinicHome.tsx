"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Sparkles, Users, CalendarRange, FileText, Receipt, BarChart3, Activity, Clock,
  Phone, ArrowUpRight, IndianRupee, CalendarCheck, AlertCircle, Stethoscope, Plus
} from "lucide-react";
import { formatINR } from "@/lib/utils";

type Booking = { id: string; patientName: string; patientPhone: string; serviceType: string; bookingDate: string; startTime: string | null; status: string | null; amount: number | null; paymentStatus: string | null };
type Note = { id: string; patientName: string; diagnosis: string | null; createdAt: string | null; patientAge: number | null };
type Earnings = { rows: { id: string; amount: number; type: string | null; createdAt: string }[]; credited: number; balance: number };
type Prof = { fullName: string; specialization: string | null; city: string | null };

const TODAY = new Date().toISOString().slice(0, 10);
function initials(n: string) { return n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

const QUICK = [
  { label: "AI Scribe", desc: "Talk → note + Rx", href: "/clinic/scribe", icon: Sparkles, color: "#7c3aed" },
  { label: "Appointments", desc: "Schedule & queue", href: "/clinic/appointments", icon: CalendarRange, color: "#01586C" },
  { label: "Patients", desc: "Records & history", href: "/clinic/patients", icon: Users, color: "#0a7d96" },
  { label: "Prescriptions", desc: "Rx history", href: "/clinic/prescriptions", icon: FileText, color: "#db2777" },
  { label: "Billing", desc: "Invoices & dues", href: "/clinic/billing", icon: Receipt, color: "#16a34a" },
  { label: "Analytics", desc: "Practice insights", href: "/clinic/analytics", icon: BarChart3, color: "#ea580c" }
];

export default function ClinicHome({ prof, bookings, earnings, notes }: { prof: Prof; bookings: Booking[]; earnings: Earnings; notes: Note[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const today = bookings.filter((b) => b.bookingDate === TODAY && b.status !== "cancelled").sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  const upcoming = bookings.filter((b) => b.bookingDate > TODAY && b.status !== "cancelled");
  const pendingConfirm = bookings.filter((b) => b.status === "pending").length;
  const todayRevenue = today.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + (b.amount ?? 0), 0);
  const weekRevenue = useMemo(() => {
    const since = new Date(Date.now() - 7 * 864e5);
    return earnings.rows.filter((r) => r.type === "credit" && new Date(r.createdAt) >= since).reduce((s, r) => s + r.amount, 0);
  }, [earnings.rows]);
  const revSeries = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const key = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10);
    return { v: bookings.filter((b) => b.bookingDate === key && b.paymentStatus === "paid").reduce((s, b) => s + (b.amount ?? 0), 0) };
  }), [bookings]);

  async function setStatus(id: string, status: string) {
    setBusy(id); setError("");
    try {
      const r = await fetch("/api/providers/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: id, status }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) { setError(j.error || "Couldn't update the booking — try again."); return; }
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#01586C] via-[#0a7d96] to-[#0e8fa8] p-6 text-white shadow-lg sm:p-7">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-16 top-20 h-32 w-32 rounded-full bg-[#FE7D15]/20 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/70">{greeting()},</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dr. {prof.fullName}</h1>
            <p className="mt-0.5 text-sm text-white/70">{prof.specialization || "Physician"} · {prof.city || "Lucknow"} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/clinic/scribe" className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#01586C] shadow-sm transition hover:shadow-md"><Sparkles size={16} /> Start consult</Link>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat icon={<CalendarCheck size={15} />} label="Today" value={String(today.length)} />
          <HeroStat icon={<Clock size={15} />} label="Upcoming" value={String(upcoming.length)} />
          <HeroStat icon={<IndianRupee size={15} />} label="Today's revenue" value={formatINR(todayRevenue)} />
          <HeroStat icon={<Activity size={15} />} label="Balance" value={formatINR(earnings.balance)} />
        </div>
      </div>

      {/* Quick launch */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK.map((q) => (
          <Link key={q.label} href={q.href} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <span className="grid h-10 w-10 place-items-center rounded-xl transition group-hover:scale-105" style={{ background: `${q.color}14`, color: q.color }}><q.icon size={19} /></span>
            <div className="mt-2.5 text-sm font-bold text-slate-800">{q.label}</div>
            <div className="text-[11px] text-slate-500">{q.desc}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today's schedule */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-slate-800">Today's schedule</h2>
            <Link href="/clinic/appointments" className="flex items-center gap-1 text-xs font-semibold text-[#01586C] hover:underline">All appointments <ArrowUpRight size={13} /></Link>
          </div>
          <div className="p-3">
            {today.length === 0 ? (
              <div className="py-10 text-center"><CalendarCheck className="mx-auto mb-2 text-slate-300" size={28} /><p className="text-sm text-slate-400">No appointments today.</p></div>
            ) : (
              <div className="space-y-1">
                {today.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50">
                    <div className="w-12 shrink-0 text-right text-xs font-bold text-slate-500">{b.startTime || "—"}</div>
                    <div className="h-9 w-px shrink-0 bg-slate-100" />
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#01586C] to-[#0a7d96] text-[11px] font-bold text-white">{initials(b.patientName)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{b.patientName}</div>
                      <div className="text-xs text-slate-500">{b.serviceType}{b.amount ? ` · ${formatINR(b.amount)}` : ""}</div>
                    </div>
                    {b.status === "pending" ? (
                      <button disabled={busy === b.id} onClick={() => setStatus(b.id, "confirmed")} className="rounded-lg bg-[#01586C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#024a5a] disabled:opacity-50">{busy === b.id ? "…" : "Confirm"}</button>
                    ) : b.status === "confirmed" ? (
                      <button disabled={busy === b.id} onClick={() => setStatus(b.id, "in_progress")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busy === b.id ? "…" : "Start"}</button>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-500">{(b.status || "").replace(/_/g, " ")}</span>
                    )}
                    <a href={`tel:${b.patientPhone}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Call"><Phone size={14} /></a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Revenue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue · 14 days</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{formatINR(weekRevenue)} this wk</span></div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{formatINR(earnings.credited)}</div>
            <div className="mt-1 h-14">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revSeries} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs><linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient></defs>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 11 }} formatter={(v: number) => [formatINR(v), "Revenue"]} labelFormatter={() => ""} />
                  <Area type="monotone" dataKey="v" stroke="#16a34a" strokeWidth={2} fill="url(#rev2)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts */}
          {pendingConfirm > 0 && (
            <Link href="/clinic/appointments" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-600"><AlertCircle size={18} /></span>
              <div className="flex-1"><div className="text-sm font-bold text-amber-900">{pendingConfirm} appointment{pendingConfirm > 1 ? "s" : ""} to confirm</div><div className="text-xs text-amber-700">Review and confirm pending requests</div></div>
              <ArrowUpRight size={16} className="text-amber-600" />
            </Link>
          )}

          {/* Recent patients */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><span className="text-sm font-bold text-slate-800">Recent patients</span><Link href="/clinic/patients" className="text-xs font-semibold text-[#01586C] hover:underline">All</Link></div>
            <div className="p-2">
              {notes.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400"><Stethoscope className="mx-auto mb-1.5 text-slate-300" size={22} />Use the AI Scribe to build records.</div>
              ) : notes.slice(0, 5).map((n) => (
                <Link key={n.id} href={`/clinic/patients/${n.id}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">{initials(n.patientName)}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-700">{n.patientName}</div><div className="truncate text-[11px] text-slate-500">{n.diagnosis || "Consultation"}</div></div>
                  <div className="text-[11px] text-slate-500">{n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm ring-1 ring-white/15">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">{icon} {label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
