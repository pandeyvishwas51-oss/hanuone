"use client";

import Link from "next/link";
import { Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  UserCheck, Send, ShieldAlert, CalendarDays, Wallet, UserPlus, Stethoscope,
  Activity, Home, ArrowUpRight, AlertCircle, Zap
} from "lucide-react";

type Recent = { id: string; patientName: string; mode: string | null; status: string; createdAt: string | null };
type Props = {
  stats: { consults: number; lab: number; medicine: number; vitals: number; visits: number; providers: number; leads: number; payments: number };
  alerts: { pendingApprovals: number; flaggedVitals: number; unassigned: number };
  recent: Recent[];
  volume: number[];
};

const QUICK = [
  { label: "Providers", desc: "Verify & manage", href: "/console/providers", icon: UserCheck, color: "#01586C" },
  { label: "Dispatch", desc: "Assign visits", href: "/console/dispatch", icon: Send, color: "#0a7d96" },
  { label: "Triage", desc: "Flagged vitals", href: "/console/triage", icon: ShieldAlert, color: "#dc2626" },
  { label: "Bookings", desc: "All orders", href: "/console/bookings", icon: CalendarDays, color: "#7c3aed" },
  { label: "Finance", desc: "Payouts", href: "/console/finance", icon: Wallet, color: "#16a34a" },
  { label: "Leads", desc: "Onboarding", href: "/admin/leads", icon: UserPlus, color: "#ea580c" }
];

function statusTone(s: string) {
  const v = (s || "").toLowerCase();
  if (["completed", "booked", "paid"].includes(v)) return "bg-emerald-100 text-emerald-700";
  if (["pending", "pending_payment"].includes(v)) return "bg-amber-100 text-amber-700";
  if (["cancelled", "refunded"].includes(v)) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

export default function ConsoleHome({ stats, alerts, recent, volume }: Props) {
  const series = volume.map((v) => ({ v }));
  const tiles = [
    { label: "Consults", value: stats.consults, icon: <Stethoscope size={15} /> },
    { label: "Home visits", value: stats.visits, icon: <Home size={15} /> },
    { label: "Vitals", value: stats.vitals, icon: <Activity size={15} /> },
    { label: "Providers", value: stats.providers, icon: <UserCheck size={15} /> }
  ];
  const alertCards = [
    { n: alerts.pendingApprovals, label: "providers awaiting verification", href: "/console/providers", icon: <UserCheck size={18} />, tone: "amber" },
    { n: alerts.flaggedVitals, label: "vitals flagged for triage", href: "/console/triage", icon: <AlertCircle size={18} />, tone: "rose" },
    { n: alerts.unassigned, label: "visits waiting for dispatch", href: "/console/dispatch", icon: <Zap size={18} />, tone: "blue" }
  ].filter((a) => a.n > 0);
  const toneMap: Record<string, string> = { amber: "border-amber-200 bg-amber-50 text-amber-900", rose: "border-rose-200 bg-rose-50 text-rose-900", blue: "border-sky-200 bg-sky-50 text-sky-900" };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg sm:p-7">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#0a7d96]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/60">HanuONE Operations</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Command center</h1>
            <p className="mt-0.5 text-sm text-white/60">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · live across all services</p>
          </div>
          <Link href="/console/dispatch" className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:shadow-md"><Send size={15} /> Dispatch</Link>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">{t.icon} {t.label}</div>
              <div className="mt-1 text-xl font-bold">{t.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alertCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {alertCards.map((a) => (
            <Link key={a.label} href={a.href} className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:shadow-sm ${toneMap[a.tone]}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/60">{a.icon}</span>
              <div className="flex-1"><div className="text-xl font-bold leading-none">{a.n}</div><div className="mt-0.5 text-xs font-medium opacity-80">{a.label}</div></div>
              <ArrowUpRight size={16} className="opacity-60" />
            </Link>
          ))}
        </div>
      )}

      {/* Quick launch */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK.map((q) => (
          <Link key={q.label} href={q.href} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${q.color}14`, color: q.color }}><q.icon size={19} /></span>
            <div className="mt-2.5 text-sm font-bold text-slate-800">{q.label}</div>
            <div className="text-[11px] text-slate-400">{q.desc}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><h2 className="text-sm font-bold text-slate-800">Recent consultations</h2><Link href="/console/bookings" className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">All bookings <ArrowUpRight size={13} /></Link></div>
          <div className="p-2">
            {recent.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No consultations yet.</p> : recent.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Stethoscope size={15} /></span>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{c.patientName}</div><div className="text-xs text-slate-400">{c.mode || "video"}</div></div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(c.status)}`}>{c.status.replace(/_/g, " ")}</span>
                <div className="hidden text-xs text-slate-400 sm:block">{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Booking volume · 14 days</span>
          <div className="mt-3 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 11 }} labelFormatter={() => ""} formatter={(v: number) => [v, "bookings"]} /><Bar dataKey="v" fill="#0a7d96" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2"><div className="text-lg font-bold text-slate-800">{stats.lab}</div><div className="text-[11px] text-slate-400">Lab orders</div></div>
            <div className="rounded-xl bg-slate-50 p-2"><div className="text-lg font-bold text-slate-800">{stats.medicine}</div><div className="text-[11px] text-slate-400">Medicine</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
