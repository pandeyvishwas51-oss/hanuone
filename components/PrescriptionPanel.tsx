"use client";

import { useState } from "react";

type Med = { name: string; dosage: string; frequency: string; duration: string };

export default function PrescriptionPanel({ consultationId }: { consultationId: string }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [instructions, setInstructions] = useState("");
  const [nmcRegNo, setNmcRegNo] = useState("");
  const [meds, setMeds] = useState<Med[]>([{ name: "", dosage: "", frequency: "", duration: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  function update(i: number, key: keyof Med, val: string) {
    setMeds((m) => m.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));
  }

  async function issue() {
    if (busy) return; // guard double-submit → no duplicate prescriptions issued/sent
    setError("");
    const valid = meds.filter((m) => m.name.trim());
    if (!valid.length) return setError("Add at least one medicine.");
    setBusy(true);
    try {
      const r = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId, diagnosis, instructions, nmcRegNo, medications: valid })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not issue prescription");
      setPdfUrl(j.pdfUrl || "issued");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (pdfUrl) {
    return (
      <div className="card border-emerald-200 p-5" role="status">
        <h3 className="h3">✓ Prescription issued</h3>
        <p className="mt-1 text-sm text-muted">The patient has been notified.</p>
        {pdfUrl !== "issued" && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-outline mt-3 inline-block">View PDF</a>}
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="h3">Issue e-prescription</h3>
      <p className="mt-1 text-xs text-muted">Schedule X drugs are blocked automatically (NMC 2022).</p>
      <div className="mt-3 space-y-3">
        <input className="input" placeholder="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        <input className="input" placeholder="Your NMC registration number" value={nmcRegNo} onChange={(e) => setNmcRegNo(e.target.value)} />

        <div className="space-y-2">
          {meds.map((m, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input className="input" placeholder="Medicine" value={m.name} onChange={(e) => update(i, "name", e.target.value)} />
              <input className="input" placeholder="Dosage" value={m.dosage} onChange={(e) => update(i, "dosage", e.target.value)} />
              <input className="input" placeholder="Frequency" value={m.frequency} onChange={(e) => update(i, "frequency", e.target.value)} />
              <input className="input" placeholder="Duration" value={m.duration} onChange={(e) => update(i, "duration", e.target.value)} />
            </div>
          ))}
          <button className="text-sm font-medium text-primary" onClick={() => setMeds((m) => [...m, { name: "", dosage: "", frequency: "", duration: "" }])}>
            + Add medicine
          </button>
        </div>

        <textarea className="input" rows={2} placeholder="Advice / instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        <button className="btn-primary w-full" disabled={busy} onClick={issue}>
          {busy ? "Generating…" : "Issue & send to patient"}
        </button>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
