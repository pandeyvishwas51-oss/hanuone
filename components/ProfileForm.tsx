"use client";

import { useEffect, useState } from "react";

type Profile = {
  name?: string; email?: string; phone?: string; address?: string; altPhone?: string;
  city?: string; pincode?: string; gender?: string; dob?: string; bloodGroup?: string;
  emergencyName?: string; emergencyPhone?: string; marketingOptIn?: boolean;
};

export default function ProfileForm() {
  const [p, setP] = useState<Profile>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let ignore = false;
    fetch("/api/account/profile").then((r) => r.json()).then((j) => {
      if (ignore) return;
      if (j.ok && j.profile) setP({ ...j.profile, marketingOptIn: j.profile.marketingOptIn ?? true });
      setLoaded(true);
    }).catch(() => { if (!ignore) setLoaded(true); });
    return () => { ignore = true; };
  }, []);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  async function save() {
    if (saving) return; // guard double-submit
    setSaving(true); setSaveError("");
    try {
      const r = await fetch("/api/account/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setSaveError(j.error || "Could not save. Please try again.");
        return;
      }
      setSaved(true);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <div className="card p-5 text-sm text-muted">Loading profile…</div>;

  const filled = [p.address, p.altPhone, p.gender, p.emergencyPhone].filter(Boolean).length;
  const pct = Math.round((filled / 4) * 100);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="h3">My profile</h3>
        <span className="text-xs text-muted">{pct}% complete</span>
      </div>
      <p className="mt-1 text-sm text-muted">Add your details so home visits, bookings and emergencies are faster and safer.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><input className="input" value={p.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Email"><input className="input bg-slate-50" value={p.email ?? ""} readOnly /></Field>
        <Field label="Mobile"><input className="input bg-slate-50" value={p.phone ?? ""} readOnly /></Field>
        <Field label="Alternative number"><input className="input" inputMode="numeric" value={p.altPhone ?? ""} onChange={(e) => set("altPhone", e.target.value.replace(/\D/g, "").slice(0, 13))} /></Field>
        <Field label="Address" full><textarea className="input" rows={2} value={p.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="City"><input className="input" value={p.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Pincode"><input className="input" inputMode="numeric" value={p.pincode ?? ""} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} /></Field>
        <Field label="Gender">
          <select className="input" value={p.gender ?? ""} onChange={(e) => set("gender", e.target.value)}>
            <option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
          </select>
        </Field>
        <Field label="Date of birth"><input className="input" type="date" value={p.dob ?? ""} onChange={(e) => set("dob", e.target.value)} /></Field>
        <Field label="Blood group">
          <select className="input" value={p.bloodGroup ?? ""} onChange={(e) => set("bloodGroup", e.target.value)}>
            <option value="">Select</option>{["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Emergency contact name"><input className="input" value={p.emergencyName ?? ""} onChange={(e) => set("emergencyName", e.target.value)} /></Field>
        <Field label="Emergency contact phone"><input className="input" inputMode="numeric" value={p.emergencyPhone ?? ""} onChange={(e) => set("emergencyPhone", e.target.value.replace(/\D/g, "").slice(0, 13))} /></Field>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={p.marketingOptIn ?? true} onChange={(e) => set("marketingOptIn", e.target.checked)} />
        Send me health tips, offers and reminders by email.
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save profile"}</button>
        {saved && <span className="text-sm text-emerald-700">✓ Saved</span>}
        {saveError && <span className="text-sm text-rose-600">{saveError}</span>}
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-xs font-medium text-muted ${full ? "sm:col-span-2" : ""}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
