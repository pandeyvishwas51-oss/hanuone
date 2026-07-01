"use client";

import { useEffect, useState } from "react";

export default function MedicineOrder({ city }: { city: string }) {
  const [me, setMe] = useState<{ name: string | null; phone: string | null } | null>(null);
  const [form, setForm] = useState({ patientName: "", patientPhone: "", patientEmail: "", address: "", pincode: "", notes: "" });
  const [rxUrl, setRxUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [serviceable, setServiceable] = useState<boolean | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (ignore || !j.user) return;
      setMe(j.user); setForm((f) => ({ ...f, patientName: j.user.name ?? "", patientPhone: j.user.phone?.replace(/^91/, "") ?? "" }));
    }).catch(() => {});
    return () => { ignore = true; };
  }, []);

  // `ignore` discards a stale serviceability response on fast pincode edits.
  useEffect(() => {
    if (form.pincode.length !== 6) { setServiceable(null); return; }
    let ignore = false;
    fetch(`/api/serviceability?pincode=${form.pincode}`).then((r) => r.json()).then((j) => { if (!ignore) setServiceable(j.ok ? j.live.includes("medicine") : null); }).catch(() => { if (!ignore) setServiceable(null); });
    return () => { ignore = true; };
  }, [form.pincode]);

  async function upload(file: File) {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Upload failed");
      setRxUrl(j.url ?? "uploaded");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function placeOrder() {
    if (busy) return; // guard against double-submit → duplicate paid orders
    setError("");
    if (!me) { window.location.href = "/login?next=/medicine"; return; }
    if (!form.patientName.trim() || form.patientPhone.length < 10 || !form.address.trim()) return setError("Name, phone and address are required.");
    if (!rxUrl && !form.notes.trim()) return setError("Upload a prescription or list your medicines in notes.");
    setBusy(true);
    try {
      const r = await fetch("/api/medicine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, city, prescriptionUrl: rxUrl && rxUrl !== "uploaded" ? rxUrl : undefined, items: form.notes ? [{ name: form.notes }] : undefined })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not place order");
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
        <h3 className="h3">✓ Order received</h3>
        <p className="mt-2 text-sm text-muted">A partner pharmacy will confirm availability and price on WhatsApp shortly.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/account" className="btn-primary inline-block">Go to my account</a>
          <button
            type="button"
            onClick={() => { setDone(false); setRxUrl(null); setError(""); setForm((f) => ({ ...f, address: "", pincode: "", notes: "" })); }}
            className="btn-outline"
          >
            New order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card max-w-2xl p-6">
      <label className="block">
        <span className="label">Upload prescription (image or PDF)</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {uploading && <p className="mt-1 text-xs text-muted">Uploading…</p>}
      {rxUrl && <p className="mt-1 text-xs text-emerald-600">✓ Prescription attached</p>}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className="input" aria-label="Patient name" autoComplete="name" placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
        <input className="input" aria-label="Phone number" autoComplete="tel" inputMode="numeric" placeholder="Phone" value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
      </div>
      <input className="input mt-3" type="email" aria-label="Email for order updates" autoComplete="email" placeholder="Email (for order updates)" value={form.patientEmail} onChange={(e) => setForm({ ...form, patientEmail: e.target.value })} />
      <textarea className="input mt-3" rows={2} aria-label="Delivery address" autoComplete="street-address" placeholder={`Delivery address in ${city}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <input className="input mt-3" inputMode="numeric" aria-label="Pincode" autoComplete="postal-code" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
      {serviceable === false && <p className="mt-1 text-xs text-amber-700">Delivery isn&apos;t live in {form.pincode} yet — we&apos;ll notify you when we cover your area.</p>}
      {serviceable === true && <p className="mt-1 text-xs text-emerald-600">✓ Delivery available in {form.pincode}.</p>}
      <textarea className="input mt-3" rows={2} aria-label="Medicines list" placeholder="Or list medicines here (name, quantity)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

      {/* Sticky on mobile so the primary action stays reachable above the bottom nav. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-1 mt-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-1 pb-1 pt-3 md:static md:mx-0 md:bg-none md:p-0">
        <button className="btn-primary w-full" disabled={busy || uploading} onClick={placeOrder}>
          {busy ? "Placing…" : "Place order"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 animate-fade-in-up text-sm text-rose-600">{error}</p>}
    </div>
  );
}
