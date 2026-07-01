"use client";

import { useState } from "react";

const PLANS = [
  { id: "once", label: "One-time", desc: "A single nurse visit", price: 299 },
  { id: "weekly", label: "Daily · 7 days", desc: "Nurse visits daily for a week", price: 1499 },
  { id: "monthly", label: "Daily · 30 days", desc: "Best for elderly care", price: 4999 }
];

export default function VitalCheckupBooking({ defaultName, defaultPhone, city }: { defaultName: string; defaultPhone: string; city: string }) {
  const [form, setForm] = useState({ name: defaultName, phone: defaultPhone, email: "", address: "", pincode: "", plan: "once", startDate: "", paymentMode: "online" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const plan = PLANS.find((p) => p.id === form.plan)!;

  async function book() {
    setError("");
    if (!form.name.trim() || form.phone.length < 10) return setError("Enter name and a valid phone.");
    if (!form.address.trim()) return setError("Enter your address for the nurse visit.");
    setBusy(true);
    try {
      const r = await fetch("/api/vitals/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not book");
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-6">
        <h3 className="h3">✓ Vital Checkup booked</h3>
        <p className="mt-2 text-sm text-muted">A verified nurse will visit, record your vitals, and the report + trends will appear here in your account. We&apos;ve confirmed it on WhatsApp{form.email ? " and email" : ""}.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="h3">Book a Vital Checkup</h3>
      <p className="mt-1 text-sm text-muted">Our verified nurse visits your home and records your vitals. You just relax.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {PLANS.map((p) => (
          <button key={p.id} onClick={() => setForm({ ...form, plan: p.id })} className={`rounded-xl border p-3 text-left ${form.plan === p.id ? "border-primary bg-primary/5" : "border-slate-200"}`}>
            <div className="text-sm font-semibold text-ink">{p.label}</div>
            <div className="text-[11px] text-muted">{p.desc}</div>
            <div className="mt-1 text-sm font-bold text-primary">₹{p.price}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input className="input" placeholder="Patient name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" inputMode="numeric" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
        <input className="input" type="email" placeholder="Email (for report)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <textarea className="input sm:col-span-2" rows={2} placeholder={`Full address in ${city}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="input" inputMode="numeric" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
        <select className="input" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
          <option value="online">Pay online now</option>
          <option value="cod">Pay at visit</option>
        </select>
      </div>

      <button className="btn-primary mt-4 w-full" disabled={busy} onClick={book}>
        {busy ? "Booking…" : `Book · ₹${plan.price}`}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <p className="mt-2 text-[11px] text-muted">A gender-matched, verified nurse is assigned for your safety. Female patients always get a female nurse.</p>
    </div>
  );
}
