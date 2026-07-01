"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PatientPhotoCapture from "@/components/PatientPhotoCapture";

type Visit = { id: string; patientName: string; patientPhone: string; serviceType: string; serviceName: string | null; address: string; pincode: string | null; status: string; patientPhotoUrl: string | null };

const STEPS = ["assigned", "on_the_way", "arrived", "in_progress", "completed"];
const NEXT: Record<string, { label: string; to: string }> = {
  assigned: { label: "I'm on the way", to: "on_the_way" },
  on_the_way: { label: "I've arrived", to: "arrived" },
  arrived: { label: "Start the visit", to: "in_progress" }
};

const VITAL_FIELDS: { key: string; label: string; unit: string; placeholder: string }[] = [
  { key: "bpSystolic", label: "BP systolic", unit: "mmHg", placeholder: "120" },
  { key: "bpDiastolic", label: "BP diastolic", unit: "mmHg", placeholder: "80" },
  { key: "heartRate", label: "Heart rate", unit: "bpm", placeholder: "72" },
  { key: "spo2", label: "SpO₂", unit: "%", placeholder: "98" },
  { key: "temperatureC", label: "Temperature", unit: "°C", placeholder: "36.8" },
  { key: "randomBloodSugar", label: "Blood sugar", unit: "mg/dL", placeholder: "110" },
  { key: "respiratoryRate", label: "Resp. rate", unit: "/min", placeholder: "16" }
];

export default function VisitWorkspace({ visit }: { visit: Visit }) {
  const router = useRouter();
  const [status, setStatus] = useState(visit.status);
  const [busy, setBusy] = useState(false);
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(visit.status === "completed");
  const [escalated, setEscalated] = useState(false);
  const [gpsVerified, setGpsVerified] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [err, setErr] = useState("");

  const isVitals = visit.serviceType === "vitals";
  const next = NEXT[status];
  const stepIdx = STEPS.indexOf(status);

  // EVV-style proof: capture the nurse's GPS at on-the-way + arrival and stamp
  // it on the visit so the check-in is location-verified.
  function captureLocation(to: string) {
    if (!("geolocation" in navigator) || (to !== "on_the_way" && to !== "arrived")) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetch(`/api/visits/${visit.id}/location`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, status: to })
        }).then(() => { if (to === "arrived") setGpsVerified(true); }).catch(() => {});
      },
      () => {/* permission denied — status still advances, just unverified */},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function triggerSos() {
    if (!confirm("Send an emergency SOS to the HanuONE team with your live location?")) return;
    const send = (lat?: number, lng?: number) => {
      fetch("/api/care/sos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat, lng, visitId: visit.id }) })
        .then(() => setSosSent(true)).catch(() => setSosSent(true));
    };
    if ("geolocation" in navigator) navigator.geolocation.getCurrentPosition((p) => send(p.coords.latitude, p.coords.longitude), () => send(), { timeout: 6000 });
    else send();
  }

  async function advance(to: string) {
    setBusy(true); setErr("");
    captureLocation(to);
    try {
      const r = await fetch("/api/providers/visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitId: visit.id, status: to }) });
      if (!r.ok) { setErr("Couldn't update — check your connection and try again."); return; }
      setStatus(to); router.refresh(); // only reflect the status the server accepted
    } catch {
      setErr("You appear to be offline. The update wasn't saved — try again.");
    } finally {
      setBusy(false); // always re-enable the button, even offline
    }
  }

  async function saveVitals() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch(`/api/visits/${visit.id}/vitals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...vitals, providerNotes: notes }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setErr(j.error || "Could not save vitals"); return; }
      setEscalated(!!j.escalated); setDone(true); setStatus("completed"); router.refresh();
    } catch {
      setErr("You appear to be offline. Vitals weren't saved — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function completePlain() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/providers/visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitId: visit.id, status: "completed" }) });
      if (!r.ok) { setErr("Couldn't complete the visit — try again."); return; }
      setDone(true); setStatus("completed"); router.refresh();
    } catch {
      setErr("You appear to be offline. The visit wasn't marked complete — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="py-6">
        <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h1 className="text-lg font-bold text-emerald-800">Visit completed</h1>
          <p className="mt-2 text-sm text-emerald-700">{isVitals ? "Vitals recorded and the patient has been notified their report is ready." : "The visit is marked complete and the patient has been notified."}</p>
          {escalated && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700">Some readings were flagged abnormal. The patient was advised to consult a doctor.</p>}
          <Link href="/care" className="mt-5 inline-block rounded-xl bg-[#0a7d96] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#087085]">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <Link href="/care" className="text-sm font-semibold text-[#0a7d96]">← Back to dashboard</Link>
        <button onClick={triggerSos} disabled={sosSent} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60">
          {sosSent ? "✓ SOS sent" : "🚨 SOS"}
        </button>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="bg-gradient-to-br from-[#0a7d96] to-[#13a8c4] p-5 text-white">
          <h1 className="text-xl font-bold">{visit.patientName}</h1>
          <p className="mt-0.5 text-sm text-white/80">{visit.serviceName || visit.serviceType}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/90">
            <a href={`tel:${visit.patientPhone}`} className="font-semibold underline-offset-2 hover:underline">{visit.patientPhone}</a>
            <span>•</span><span>{visit.address}{visit.pincode ? `, ${visit.pincode}` : ""}</span>
          </div>
        </div>
        <div className="p-5">
          {/* progress tracker */}
          <div className="flex items-center gap-1">
            {STEPS.slice(0, 4).map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-[#0a7d96]" : "bg-slate-200"}`} />
            ))}
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-xs font-medium capitalize text-slate-500">
            {status.replace(/_/g, " ")}
            {gpsVerified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold normal-case text-emerald-700">📍 Location verified</span>}
          </p>
          {next && (
            <button disabled={busy} onClick={() => advance(next.to)} className="mt-4 w-full rounded-xl bg-[#0a7d96] px-4 py-3 text-sm font-semibold text-white hover:bg-[#087085] disabled:opacity-50">{busy ? "…" : next.label}</button>
          )}
          {err && <p role="alert" className="mt-2 text-sm text-rose-600">{err}</p>}
        </div>
      </div>

      {/* Patient photo on arrival (eyes auto-blurred for privacy) */}
      {(status === "arrived" || status === "in_progress") && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Patient photo (privacy-safe)</div>
          {visit.patientPhotoUrl ? (
            <p className="text-sm font-semibold text-emerald-700">Photo captured ✓</p>
          ) : (
            <PatientPhotoCapture visitId={visit.id} onDone={() => router.refresh()} />
          )}
        </div>
      )}

      {/* Vitals form (vitals visits) or plain completion */}
      {status === "in_progress" && (
        isVitals ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Record vitals</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {VITAL_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-xs text-slate-500">{f.label} <span className="text-[10px] text-slate-400">({f.unit})</span></span>
                  <input inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={f.placeholder} value={vitals[f.key] ?? ""} onChange={(e) => setVitals((v) => ({ ...v, [f.key]: e.target.value }))} />
                </label>
              ))}
            </div>
            <textarea className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button disabled={busy} onClick={saveVitals} className="mt-3 w-full rounded-xl bg-[#FE7D15] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e06b08] disabled:opacity-50">{busy ? "Saving…" : "Save vitals & complete visit"}</button>
            {err && <p role="alert" className="mt-2 text-sm text-rose-600">{err}</p>}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Visit notes</div>
            <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} placeholder="What did you do during the visit?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button disabled={busy} onClick={completePlain} className="mt-3 w-full rounded-xl bg-[#0a7d96] px-4 py-3 text-sm font-semibold text-white hover:bg-[#087085] disabled:opacity-50">{busy ? "…" : "Mark visit complete"}</button>
            {err && <p role="alert" className="mt-2 text-sm text-rose-600">{err}</p>}
          </div>
        )
      )}
    </div>
  );
}
