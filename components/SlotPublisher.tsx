"use client";

import { useState } from "react";

const DEFAULT_TIMES = ["10:00", "10:30", "11:00", "11:30", "17:00", "17:30", "18:00", "18:30"];

export default function SlotPublisher() {
  const [doctorSlug, setDoctorSlug] = useState("");
  const [date, setDate] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [feeInr, setFeeInr] = useState("400");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function toggle(t: string) {
    setTimes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  }

  async function publish() {
    setError("");
    setMsg("");
    if (!doctorSlug.trim() || !date || times.length === 0) return setError("Enter your slug, a date, and pick times.");
    setBusy(true);
    try {
      const r = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorSlug: doctorSlug.trim(), date, times, feeInr: Number(feeInr) || undefined })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not publish");
      setMsg(`Published ${j.created} slot(s) for ${date}.`);
      setTimes([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="h3">Publish slots</h2>
      <div className="mt-3 space-y-3">
        <input className="input" placeholder="Your doctor slug (e.g. dr-anita-mishra-general-physician)" value={doctorSlug} onChange={(e) => setDoctorSlug(e.target.value.trim())} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="Fee ₹" value={feeInr} onChange={(e) => setFeeInr(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={`rounded-full border px-3 py-1.5 text-sm ${times.includes(t) ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-muted"}`}
            >
              {times.includes(t) ? "✓ " : ""}{t}
            </button>
          ))}
        </div>
        <button className="btn-primary w-full" disabled={busy} onClick={publish}>
          {busy ? "Publishing…" : `Publish ${times.length || ""} slot(s)`}
        </button>
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
