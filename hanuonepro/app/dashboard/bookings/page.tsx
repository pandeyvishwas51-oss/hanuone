"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientAddress: string | null;
  serviceType: string;
  bookingDate: string;
  status: string;
  notes: string | null;
  amount: number | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-pending",
  confirmed: "badge-verified",
  in_progress: "badge bg-blue-100 text-blue-800",
  completed: "badge-completed",
  cancelled: "badge-rejected"
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  async function load() {
    const r = await fetch("/api/bookings");
    const data = await r.json();
    if (data.ok) setBookings(data.bookings);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Bookings</h1>
      <p className="mt-1 text-sm text-muted">Track your assigned gigs and visits.</p>

      {bookings.length === 0 ? (
        <div className="mt-8 card p-8 text-center text-sm text-muted">
          No bookings yet. Once families request your services, they will appear here.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-ink">{b.patientName}</div>
                  <div className="text-xs text-muted">{b.serviceType} - {b.bookingDate}</div>
                  {b.patientAddress && <div className="mt-1 text-xs text-muted">{b.patientAddress}</div>}
                  <div className="mt-1 text-xs text-muted">{b.patientPhone}</div>
                </div>
                <span className={STATUS_BADGE[b.status] || "badge"}>{b.status.replace("_", " ")}</span>
              </div>
              {b.notes && <p className="mt-2 text-xs text-muted">{b.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {b.status === "pending" && (
                  <>
                    <button onClick={() => updateStatus(b.id, "confirmed")} className="btn-primary text-xs py-1.5 px-3">Accept</button>
                    <button onClick={() => updateStatus(b.id, "cancelled")} className="btn-outline text-xs py-1.5 px-3">Decline</button>
                  </>
                )}
                {b.status === "confirmed" && (
                  <button onClick={() => updateStatus(b.id, "in_progress")} className="btn-primary text-xs py-1.5 px-3">Start visit</button>
                )}
                {b.status === "in_progress" && (
                  <button onClick={() => updateStatus(b.id, "completed")} className="btn-primary text-xs py-1.5 px-3">Mark completed</button>
                )}
                {b.amount && <span className="ml-auto text-sm font-semibold text-ink">INR {b.amount}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
