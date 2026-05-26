"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Calendar, Clock, MapPin, CheckCircle2 } from "lucide-react";

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
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800"
};

export default function MyBookingsPage() {
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchBookings(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBookings(null);
    try {
      const r = await fetch("/api/my-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setError(data.error || "Could not load bookings.");
        return;
      }
      setBookings(data.bookings ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="h1">My bookings</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the phone number you used to book. We'll show all your consultation requests on Hanuone.
        </p>

        <form onSubmit={fetchBookings} className="mt-6 card flex items-end gap-3 p-5">
          <div className="flex-1">
            <label className="label">Phone</label>
            <div className="relative">
              <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                inputMode="tel"
                className="input pl-9"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Looking..." : "Find bookings"}
          </button>
        </form>

        {error && <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {bookings != null && (
          <div className="mt-6 space-y-3">
            {bookings.length === 0 ? (
              <div className="card p-6 text-center text-sm text-muted">
                No bookings found for {phone}. <Link href="/doctors" className="text-primary hover:underline">Find a doctor</Link> to book.
              </div>
            ) : (
              <>
                <div className="text-xs text-muted">{bookings.length} booking{bookings.length === 1 ? "" : "s"}</div>
                {bookings.map((b) => (
                  <div key={b.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/doctors/${b.doctorSlug}`} className="text-base font-semibold text-ink hover:text-primary">
                          {b.doctorName}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                          <span className="inline-flex items-center gap-1"><Calendar size={12} /> {b.preferredDate}</span>
                          <span className="inline-flex items-center gap-1"><Clock size={12} /> {b.preferredTime}</span>
                          {b.city && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {b.city}</span>}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status] || "bg-slate-100 text-slate-700"}`}>
                        {b.status === "confirmed" && <CheckCircle2 size={12} className="mr-1" />}
                        {b.status}
                      </span>
                    </div>
                    {b.reason && <p className="mt-2 text-xs text-muted">"{b.reason}"</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
