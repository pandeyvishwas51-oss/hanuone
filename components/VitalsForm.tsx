"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Field = { key: string; label: string; unit: string; placeholder?: string };
const VITALS: Field[] = [
  { key: "bpSystolic", label: "BP systolic", unit: "mmHg" },
  { key: "bpDiastolic", label: "BP diastolic", unit: "mmHg" },
  { key: "heartRate", label: "Heart rate", unit: "bpm" },
  { key: "spo2", label: "SpO₂", unit: "%" },
  { key: "temperatureC", label: "Temperature", unit: "°C" },
  { key: "randomBloodSugar", label: "Blood sugar", unit: "mg/dL" },
  { key: "respiratoryRate", label: "Respiratory rate", unit: "/min" },
  { key: "painScale", label: "Pain", unit: "0–10" },
  { key: "weightKg", label: "Weight", unit: "kg" },
  { key: "heightCm", label: "Height", unit: "cm" }
];

export default function VitalsForm({ defaultName, defaultPhone }: { defaultName: string; defaultPhone: string }) {
  const router = useRouter();
  const [me, setMe] = useState<{ name: string | null; phone: string | null } | null>(null);
  const [v, setV] = useState<Record<string, string>>({});
  const [intake, setIntake] = useState({ reason: "", allergies: "", currentMeds: "", history: "" });
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ evaluation: { summary: string; escalate: boolean; flags: Record<string, string> }; reportUrl?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (j.user) { setMe(j.user); setName(j.user.name ?? defaultName); setPhone(j.user.phone?.replace(/^91/, "") ?? defaultPhone); }
    });
  }, [defaultName, defaultPhone]);

  async function submit() {
    setError("");
    if (!name.trim() || phone.trim().length < 10) return setError("Enter name and a valid phone.");
    setBusy(true);
    try {
      const r = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName: name, patientPhone: phone, ...intake, ...v })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not save");
      setResult(j);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className={`card p-6 ${result.evaluation.escalate ? "border-rose-200" : ""}`}>
        <h3 className="h3">{result.evaluation.escalate ? "⚠ Needs attention" : "✓ Checkup recorded"}</h3>
        <p className="mt-2 text-sm text-muted">{result.evaluation.summary}</p>
        {result.evaluation.escalate && (
          <a href="/doctors" className="btn-primary mt-4 inline-block">Book a teleconsult now</a>
        )}
        <div className="mt-4 flex gap-2">
          {result.reportUrl && <a href={result.reportUrl} target="_blank" className="btn-outline">Download report</a>}
          <button className="btn-outline" onClick={() => { setResult(null); setV({}); }}>New checkup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="h3">New Vital Checkup</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <input className="input" placeholder="Patient name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
      </div>

      <div className="mt-3 grid gap-2">
        <input className="input" placeholder="Reason for checkup" value={intake.reason} onChange={(e) => setIntake({ ...intake, reason: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Allergies" value={intake.allergies} onChange={(e) => setIntake({ ...intake, allergies: e.target.value })} />
          <input className="input" placeholder="Current medicines" value={intake.currentMeds} onChange={(e) => setIntake({ ...intake, currentMeds: e.target.value })} />
        </div>
      </div>

      <h3 className="mt-5 text-sm font-semibold text-ink">Vitals</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {VITALS.map((f) => (
          <label key={f.key} className="block">
            <span className="label">{f.label} <span className="text-muted">({f.unit})</span></span>
            <input
              className="input mt-1"
              inputMode="decimal"
              value={v[f.key] ?? ""}
              onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <button className="btn-primary mt-5 w-full" disabled={busy} onClick={submit}>
        {busy ? "Saving…" : "Save & generate report"}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
