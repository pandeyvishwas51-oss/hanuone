"use client";

import { useEffect, useState } from "react";

export default function MedicineOrder({ city }: { city: string }) {
  const [me, setMe] = useState<{ name: string | null; phone: string | null } | null>(null);
  const [form, setForm] = useState({ patientName: "", patientPhone: "", address: "", pincode: "", notes: "" });
  const [rxUrl, setRxUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (j.user) { setMe(j.user); setForm((f) => ({ ...f, patientName: j.user.name ?? "", patientPhone: j.user.phone?.replace(/^91/, "") ?? "" })); }
    });
  }, []);

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
      <div className="card p-6">
        <h3 className="h3">✓ Order received</h3>
        <p className="mt-2 text-sm text-muted">A partner pharmacy will confirm availability and price on WhatsApp shortly.</p>
        <a href="/account" className="btn-primary mt-4 inline-block">Go to my account</a>
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <input className="input" placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
        <input className="input" inputMode="numeric" placeholder="Phone" value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
      </div>
      <textarea className="input mt-3" rows={2} placeholder={`Delivery address in ${city}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <input className="input mt-3" inputMode="numeric" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
      <textarea className="input mt-3" rows={2} placeholder="Or list medicines here (name, quantity)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

      <button className="btn-primary mt-4 w-full" disabled={busy || uploading} onClick={placeOrder}>
        {busy ? "Placing…" : "Place order"}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
