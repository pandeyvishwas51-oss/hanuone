"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, CheckCircle2, CalendarDays, Stethoscope, ChevronRight, Inbox } from "lucide-react";
import { parseLocalDate, formatLocalDate } from "@/lib/utils";

type Booking = {
  id: string;
  doctorSlug: string;
  doctorName: string;
  patientName: string;
  patientPhone: string;
  preferredDate: string;
  preferredTime: string;
  reason: string | null;
  city: string | null;
  status: string;
  createdAt: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  completed: "bg-blue-100 text-blue-800"
};

function isUpcoming(b: Booking) {
  if (b.status === "cancelled" || b.status === "completed") return false;
  const d = parseLocalDate(b.preferredDate); // local, not UTC — avoids IST off-by-one
  if (Number.isNaN(d.getTime())) return true; // undated → treat as upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNeedsLogin(false);
    try {
      const r = await fetch("/api/my-bookings", { method: "POST" });
      const data = await r.json();
      if (r.status === 401) { setNeedsLogin(true); return; }
      if (!r.ok || !data.ok) { setError(data.error || "Could not load bookings."); return; }
      setBookings(data.bookings ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Restore the tab from ?tab= on load so a refresh/back keeps the view.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "past") setTab("past");
  }, []);

  function selectTab(t: "upcoming" | "past") {
    setTab(t);
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u);
  }

  const { upcoming, past } = useMemo(() => {
    const up: Booking[] = []; const pa: Booking[] = [];
    (bookings ?? []).forEach((b) => (isUpcoming(b) ? up : pa).push(b));
    return { upcoming: up, past: pa };
  }, [bookings]);

  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        {/* Hero */}
        <div className="animate-fade-in-up overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary to-primary-400 p-6 text-white shadow-card sm:p-7">
          <div className="flex items-center gap-2 text-xs font-medium text-white/70"><CalendarDays size={14} /> Your appointments</div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">My bookings</h1>
          <p className="mt-1 text-sm text-white/80">Consultations tied to your Hanuone account.</p>
        </div>

        {/* Filter tabs */}
        {!needsLogin && !error && (
          <div className="mt-5 inline-flex rounded-xl border border-primary/10 bg-white p-1 shadow-sm">
            {(["upcoming", "past"] as const).map((t) => (
              <button
                key={t}
                onClick={() => selectTab(t)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === t ? "bg-primary text-white shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {t}{!loading && bookings != null && <span className={`ml-1.5 text-xs ${tab === t ? "text-white/70" : "text-muted"}`}>{t === "upcoming" ? upcoming.length : past.length}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 skeleton rounded" />
                    <div className="h-3 w-56 skeleton rounded" />
                  </div>
                  <div className="h-5 w-20 skeleton rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {needsLogin && (
          <div className="mt-5 card animate-fade-in-up p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><CalendarDays size={22} /></span>
            <p className="mt-3 text-sm text-muted">Please log in to see your bookings.</p>
            <Link href="/login?next=/my-bookings" className="btn-primary mt-4 inline-block">Log in</Link>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button onClick={load} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">Retry</button>
          </div>
        )}

        {/* List */}
        {!loading && bookings != null && !error && (
          shown.length === 0 ? (
            <div className="mt-5 card animate-fade-in-up p-8 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Inbox size={22} /></span>
              <p className="mt-3 text-sm font-medium text-ink">No {tab} bookings</p>
              <p className="mt-1 text-sm text-muted">{tab === "upcoming" ? "Book a consultation to get started." : "Your completed and past visits will appear here."}</p>
              {tab === "upcoming" && <Link href="/doctors" className="btn-primary mt-4 inline-block">Find a doctor</Link>}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {shown.map((b, i) => (
                <Link
                  key={b.id}
                  href={`/doctors/${b.doctorSlug}`}
                  className="group block animate-fade-in-up rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_1px_3px_rgba(1,88,108,0.06)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_12px_28px_-12px_rgba(1,88,108,0.3)]"
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/10"><Stethoscope size={18} /></span>
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-bold text-ink transition group-hover:text-primary">{b.doctorName}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="inline-flex items-center gap-1"><Calendar size={12} /> {formatLocalDate(b.preferredDate)}</span>
                          <span className="inline-flex items-center gap-1"><Clock size={12} /> {b.preferredTime}</span>
                          {b.city && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {b.city}</span>}
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex flex-none items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[b.status] || "bg-slate-100 text-slate-700"}`}>
                      {b.status === "confirmed" && <CheckCircle2 size={12} className="mr-1" />}
                      {b.status}
                    </span>
                  </div>
                  {b.reason && <p className="mt-3 line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">“{b.reason}”</p>}
                  <div className="mt-3 flex items-center justify-end text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                    View doctor <ChevronRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
