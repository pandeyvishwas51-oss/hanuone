"use client";

import { useEffect, useState } from "react";
import { openCheckout } from "@/lib/razorpay-client";
import { localDateISO } from "@/lib/utils";
import type { LabTest } from "@/lib/lab-catalog";

export default function LabBooking({ tests, city }: { tests: LabTest[]; city: string }) {
  const [selected, setSelected] = useState<LabTest | null>(null);
  const [me, setMe] = useState<{ name: string | null; phone: string | null } | null>(null);
  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    address: "",
    pincode: "",
    collectionType: "home",
    slotDate: "",
    slotTime: "",
    paymentMode: "online"
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [serviceable, setServiceable] = useState<boolean | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (ignore || !j.user) return;
      setMe(j.user); setForm((f) => ({ ...f, patientName: j.user.name ?? "", patientPhone: j.user.phone?.replace(/^\+?91/, "") ?? "" }));
    }).catch(() => {});
    return () => { ignore = true; };
  }, []);

  // Serviceability check for home collection pincodes. The `ignore` guard discards
  // a stale response so fast pincode edits can't apply an older pincode's result.
  useEffect(() => {
    if (form.collectionType !== "home" || form.pincode.length !== 6) {
      setServiceable(null);
      return;
    }
    let ignore = false;
    fetch(`/api/serviceability?pincode=${form.pincode}`)
      .then((r) => r.json())
      .then((j) => { if (!ignore) setServiceable(j.ok ? j.live.includes("lab") : null); })
      .catch(() => { if (!ignore) setServiceable(null); });
    return () => { ignore = true; };
  }, [form.pincode, form.collectionType]);

  async function book() {
    if (busy) return; // guard against double-submit → duplicate paid orders
    setError("");
    if (!selected) return;
    if (!me) { window.location.href = "/login?next=/lab"; return; }
    if (!form.patientName.trim() || form.patientPhone.length < 10) return setError("Enter name and a valid 10-digit phone.");
    if (form.collectionType === "home" && !form.address.trim()) return setError("Address is required for home collection.");
    if (form.collectionType === "home" && form.pincode.length !== 6) return setError("Enter a 6-digit pincode.");
    setBusy(true);
    try {
      // 1) Create the lab order.
      const r = await fetch("/api/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSlug: selected.slug, testName: selected.name, priceInr: selected.priceInr, city, ...form })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not book the test.");

      // 2) If paying online, run the Razorpay flow (simulated until keys are live).
      if (form.paymentMode === "online") {
        const or = await fetch("/api/payments/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderType: "lab", orderId: j.orderId, amountInr: j.amountInr || selected.priceInr })
        });
        const oj = await or.json();
        if (!oj.ok) throw new Error(oj.error || "Could not start payment.");
        const pay = await openCheckout(oj, { name: form.patientName, contact: form.patientPhone });
        const vr = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pay)
        });
        const vj = await vr.json();
        if (!vj.ok) throw new Error(vj.error || "Payment verification failed.");
      }
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card animate-scale-in p-6" role="status">
        <h3 className="h3">✓ Test booked</h3>
        <p className="mt-2 text-sm text-muted">
          Your {selected?.name} is confirmed{form.paymentMode === "online" ? " and paid" : " (pay at collection)"}. We&apos;ve sent a confirmation on WhatsApp{form.patientEmail ? " and email" : ""}. The report will appear in your account.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/account" className="btn-primary inline-block">Go to my account</a>
          <button
            type="button"
            onClick={() => { setDone(false); setSelected(null); }}
            className="btn-outline"
          >
            Book another test
          </button>
        </div>
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
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">{t.name}</span>
              <span className="shrink-0 text-sm font-bold text-primary">₹{t.priceInr}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{t.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input className="input" aria-label="Patient name" autoComplete="name" placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
              <input className="input" aria-label="Phone number" autoComplete="tel" inputMode="numeric" placeholder="Phone" value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
            </div>
            <input className="input" type="email" aria-label="Email for confirmation and report" autoComplete="email" placeholder="Email (for confirmation + report)" value={form.patientEmail} onChange={(e) => setForm({ ...form, patientEmail: e.target.value })} />

            <select className="input" aria-label="Sample collection type" value={form.collectionType} onChange={(e) => setForm({ ...form, collectionType: e.target.value })}>
              <option value="home">Home sample collection</option>
              <option value="walkin">Walk-in at lab</option>
            </select>

            {form.collectionType === "home" && (
              <>
                <textarea className="input" rows={2} aria-label="Full address" autoComplete="street-address" placeholder={`Full address in ${city}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <input className="input" inputMode="numeric" aria-label="Pincode" autoComplete="postal-code" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
                {serviceable === false && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Home collection is not live in {form.pincode} yet. You can still book a walk-in, or we&apos;ll notify you when we cover your area.
                  </p>
                )}
                {serviceable === true && <p className="text-xs text-emerald-700">✓ Home collection available in {form.pincode}.</p>}
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted">Preferred date<input className="input mt-1" type="date" min={localDateISO()} value={form.slotDate} onChange={(e) => setForm({ ...form, slotDate: e.target.value })} /></label>
              <label className="text-[11px] text-muted">Preferred time<input className="input mt-1" type="time" value={form.slotTime} onChange={(e) => setForm({ ...form, slotTime: e.target.value })} /></label>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted">Payment</div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(["online", "cod"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm({ ...form, paymentMode: m })}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${form.paymentMode === m ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-muted"}`}
                  >
                    {m === "online" ? "Pay online now" : "Pay at collection"}
                  </button>
                ))}
              </div>
            </div>

            {/* Sticky on mobile so the primary action is always reachable above
                the bottom nav; resets to inline on desktop. */}
            <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-1 bg-gradient-to-t from-bg via-bg/95 to-transparent px-1 pb-1 pt-3 md:static md:mx-0 md:bg-none md:p-0">
              <button className="btn-primary w-full" disabled={busy} onClick={book}>
                {busy ? "Processing…" : form.paymentMode === "online" ? `Pay ₹${selected.priceInr} & book` : `Book · pay ₹${selected.priceInr} later`}
              </button>
            </div>
            {error && <p role="alert" className="animate-fade-in-up text-sm text-rose-600">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
