"use client";

import { useEffect, useState } from "react";
import type { LabTest } from "@/lib/lab-catalog";

export default function LabBooking({ tests, city }: { tests: LabTest[]; city: string }) {
  const [selected, setSelected] = useState<LabTest | null>(null);
  const [me, setMe] = useState<{ name: string | null; phone: string | null } | null>(null);
  const [form, setForm] = useState({ patientName: "", patientPhone: "", address: "", pincode: "", collectionType: "home", slotDate: "", slotTime: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (j.user) { setMe(j.user); setForm((f) => ({ ...f, patientName: j.user.name ?? "", patientPhone: j.user.phone?.replace(/^91/, "") ?? "" })); }
    });
  }, []);

  async function book() {
    setError("");
    if (!selected) return;
    if (!me) { window.location.href = "/login?next=/lab"; return; }
    if (!form.patientName.trim() || form.patientPhone.length < 10) return setError("Enter name and valid phone.");
    if (form.collectionType === "home" && !form.address.trim()) return setError("Address required for home collection.");
    setBusy(true);
    try {
      const r = await fetch("/api/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSlug: selected.slug, testName: selected.name, priceInr: selected.priceInr, ...form })
      });
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
        <h3 className="h3">✓ Test booked</h3>
        <p className="mt-2 text-sm text-muted">We'll confirm your {selected?.name} collection slot shortly. The report will appear in your account.</p>
        <a href="/account" className="btn-primary mt-4 inline-block">Go to my account</a>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
      <div className="grid gap-3 sm:grid-cols-2">
        {tests.map((t) => (
          <button
            key={t.slug}
            onClick={() => setSelected(t)}
            className={`card p-4 text-left transition ${selected?.slug === t.slug ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{t.name}</span>
              <span className="text-sm font-bold text-primary">₹{t.priceInr}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{t.description}</p>
            <div className="mt-2 flex gap-2 text-[11px] text-muted">
              <span className="rounded bg-slate-100 px-2 py-0.5">{t.sampleType}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5">Report in {t.tatHours}h</span>
            </div>
          </button>
        ))}
      </div>

      <div className="card h-fit p-5 lg:sticky lg:top-20">
        <h3 className="h3">{selected ? `Book: ${selected.name}` : "Select a test"}</h3>
        {selected && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
              <input className="input" inputMode="numeric" placeholder="Phone" value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
            </div>
            <select className="input" value={form.collectionType} onChange={(e) => setForm({ ...form, collectionType: e.target.value })}>
              <option value="home">Home collection</option>
              <option value="walkin">Walk-in at lab</option>
            </select>
            {form.collectionType === "home" && (
              <>
                <textarea className="input" rows={2} placeholder={`Address in ${city}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <input className="input" inputMode="numeric" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="date" value={form.slotDate} onChange={(e) => setForm({ ...form, slotDate: e.target.value })} />
              <input className="input" type="time" value={form.slotTime} onChange={(e) => setForm({ ...form, slotTime: e.target.value })} />
            </div>
            <button className="btn-primary w-full" disabled={busy} onClick={book}>
              {busy ? "Booking…" : `Book · ₹${selected.priceInr}`}
            </button>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <p className="text-[11px] text-muted">Pay the phlebotomist at collection, or online once payments go live.</p>
          </div>
        )}
      </div>
    </div>
  );
}
