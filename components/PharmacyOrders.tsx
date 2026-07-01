"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";

export type Order = {
  id: string;
  patientName: string;
  patientPhone: string;
  address: string;
  pincode: string | null;
  prescriptionUrl: string | null;
  items: string | null;
  status: string;
  amountInr: number | null;
  createdAt: string | null;
};

const FLOW: Record<string, { next: string; label: string } | null> = {
  placed: { next: "confirmed", label: "Accept order" },
  confirmed: { next: "dispatched", label: "Dispatch" },
  dispatched: { next: "delivered", label: "Mark delivered" },
  delivered: null,
  cancelled: null
};
const COLOR: Record<string, string> = {
  placed: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  dispatched: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-600"
};

export default function PharmacyOrders({ initial }: { initial: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState<Record<string, { name: string; phone: string }>>({});

  async function update(id: string, patch: Record<string, unknown>) {
    setBusy(id); setError("");
    try {
      const r = await fetch("/api/pro/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) { setError(j.error || "Couldn't update the order — try again."); return; }
      // Only reflect the new status once the server accepted it.
      if (patch.status) setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: patch.status as string } : o)));
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  if (orders.length === 0) {
    return <div className="card p-6 text-sm text-muted">No medicine orders yet. New orders will appear here for you to validate and dispatch.</div>;
  }

  return (
    <div className="grid gap-3">
      {error && <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {orders.map((o) => {
        const step = FLOW[o.status];
        let items: { name: string; qty?: number }[] = [];
        try {
          items = o.items ? JSON.parse(o.items) : [];
        } catch {
          /* ignore */
        }
        const d = delivery[o.id] || { name: "", phone: "" };
        return (
          <div key={o.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-ink">{o.patientName}</div>
                <div className="text-xs text-muted">{o.address}{o.pincode ? `, ${o.pincode}` : ""}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLOR[o.status] ?? "bg-slate-100"}`}>{o.status}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <a href={`tel:${o.patientPhone}`} className="font-medium text-primary">Call patient</a>
              {o.prescriptionUrl && (
                <a href={o.prescriptionUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary">View prescription</a>
              )}
              {o.amountInr ? <span className="text-muted">{formatINR(o.amountInr)}</span> : null}
            </div>

            {items.length > 0 && (
              <ul className="mt-2 text-sm text-ink">
                {items.map((it, i) => (
                  <li key={i}>• {it.name}{it.qty ? ` × ${it.qty}` : ""}</li>
                ))}
              </ul>
            )}

            {(o.status === "confirmed" || o.status === "placed") && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={d.name}
                  aria-label="Delivery person name"
                  onChange={(e) => setDelivery((m) => ({ ...m, [o.id]: { ...d, name: e.target.value } }))}
                  placeholder="Delivery person"
                  className="w-32 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                />
                <input
                  value={d.phone}
                  aria-label="Delivery person phone"
                  onChange={(e) => setDelivery((m) => ({ ...m, [o.id]: { ...d, phone: e.target.value } }))}
                  placeholder="Phone"
                  className="w-28 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                />
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {step && (
                <button
                  disabled={busy === o.id}
                  onClick={() =>
                    update(o.id, {
                      status: step.next,
                      ...(step.next === "dispatched" && d.name ? { deliveryPersonName: d.name, deliveryPersonPhone: d.phone } : {})
                    })
                  }
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                >
                  {busy === o.id ? "Saving…" : step.label}
                </button>
              )}
              {o.status !== "delivered" && o.status !== "cancelled" && (
                <button
                  disabled={busy === o.id}
                  onClick={() => update(o.id, { status: "cancelled" })}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
