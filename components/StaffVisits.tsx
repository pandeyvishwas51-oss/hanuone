"use client";

import { useEffect, useRef, useState } from "react";
import PatientPhotoCapture from "@/components/PatientPhotoCapture";

export type Visit = {
  id: string;
  patientName: string;
  patientPhone: string;
  serviceType: string;
  serviceName: string | null;
  address: string;
  pincode: string | null;
  scheduledAt: string | null;
  status: string;
};

const FLOW: Record<string, { next: string; label: string } | null> = {
  assigned: { next: "on_the_way", label: "Start trip" },
  on_the_way: { next: "arrived", label: "Mark arrived" },
  arrived: { next: "in_progress", label: "Start service" },
  in_progress: { next: "completed", label: "Complete visit" },
  completed: null,
  cancelled: null
};

const STATUS_COLOR: Record<string, string> = {
  assigned: "bg-blue-50 text-blue-700",
  on_the_way: "bg-indigo-50 text-indigo-700",
  arrived: "bg-amber-50 text-amber-700",
  in_progress: "bg-violet-50 text-violet-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-600"
};

export default function StaffVisits({ initial }: { initial: Visit[] }) {
  const [visits, setVisits] = useState<Visit[]>(initial);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const watchRef = useRef<number | null>(null);

  async function saveVitals(id: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/visits/${id}/vitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vitals)
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { alert(j.error || "Couldn't save vitals — check your connection and try again."); return; }
      setRecordingId(null);
      setVitals({});
      setVisits((vs) => vs.map((v) => (v.id === id ? { ...v, status: "completed" } : v)));
      if (j.escalated) alert("Recorded. Some readings are critical — the patient has been advised to seek care.");
    } catch {
      alert("You appear to be offline. Vitals weren't saved — try again.");
    } finally {
      setBusy(null); // never leave the button stuck disabled
    }
  }

  // Stop watching GPS on unmount.
  useEffect(() => {
    return () => {
      if (watchRef.current != null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  async function pushLocation(id: string, lat: number, lng: number) {
    await fetch(`/api/visits/${id}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng })
    }).catch(() => {});
  }

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/visits/${id}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!r.ok) { alert("Couldn't update status — check your connection and try again."); return; }
      // Only reflect the status the server accepted.
      setVisits((vs) => vs.map((v) => (v.id === id ? { ...v, status } : v)));
      if (status === "completed") stopSharing();
    } catch {
      alert("You appear to be offline. The update wasn't saved — try again.");
    } finally {
      setBusy(null);
    }
  }

  function startSharing(id: string) {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Location not available on this device/browser.");
      return;
    }
    setSharingId(id);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => pushLocation(id, pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }
  function stopSharing() {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setSharingId(null);
  }

  if (visits.length === 0) {
    return <div className="card p-6 text-sm text-muted">No visits assigned yet. New home visits will appear here.</div>;
  }

  return (
    <div className="grid gap-3">
      {visits.map((v) => {
        const step = FLOW[v.status];
        const sharing = sharingId === v.id;
        return (
          <div key={v.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-ink">{v.patientName}</div>
                <div className="text-xs text-muted">
                  {(v.serviceName || v.serviceType)} · {v.scheduledAt ? new Date(v.scheduledAt).toLocaleString("en-IN") : "ASAP"}
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[v.status] ?? "bg-slate-100"}`}>
                {v.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="mt-2 text-sm text-ink">📍 {v.address}{v.pincode ? `, ${v.pincode}` : ""}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <a href={`tel:${v.patientPhone}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-primary/30 px-4 font-semibold text-primary active:scale-95">
                📞 Call patient
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.address + " " + (v.pincode ?? ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-primary/30 px-4 font-semibold text-primary active:scale-95"
              >
                🧭 Navigate
              </a>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {step && (
                <button
                  disabled={busy === v.id}
                  onClick={() => setStatus(v.id, step.next)}
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-600 active:scale-95 disabled:opacity-50"
                >
                  {step.label}
                </button>
              )}
              {(v.status === "on_the_way" || v.status === "arrived") &&
                (sharing ? (
                  <button onClick={stopSharing} className="inline-flex min-h-[44px] items-center rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-600 active:scale-95">
                    Stop sharing location
                  </button>
                ) : (
                  <button onClick={() => startSharing(v.id)} className="inline-flex min-h-[44px] items-center rounded-lg border border-primary/30 px-4 text-sm font-semibold text-primary active:scale-95">
                    Share live location
                  </button>
                ))}
              {v.status !== "completed" && v.status !== "cancelled" && (
                <button
                  disabled={busy === v.id}
                  onClick={() => setStatus(v.id, "cancelled")}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-500 active:scale-95"
                >
                  Cancel
                </button>
              )}
              {sharing && <span className="text-[11px] text-emerald-600">● Sharing your location with the patient</span>}
            </div>

            {(v.status === "arrived" || v.status === "in_progress") && (
              <div className="mt-3 rounded-lg border border-slate-200 p-3">
                <div className="mb-1 text-xs font-semibold text-ink">Patient photo (eyes blurred for privacy)</div>
                <PatientPhotoCapture visitId={v.id} />
              </div>
            )}

            {v.serviceType === "vitals" && v.status !== "completed" && v.status !== "cancelled" && (
              <div className="mt-3 rounded-lg border border-slate-200 p-3">
                {recordingId === v.id ? (
                  <div>
                    <div className="text-xs font-semibold text-ink">Record patient vitals</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {[
                        ["bpSystolic", "BP sys"], ["bpDiastolic", "BP dia"], ["heartRate", "Pulse"],
                        ["spo2", "SpO2 %"], ["temperatureC", "Temp °C"], ["randomBloodSugar", "Sugar"]
                      ].map(([k, label]) => (
                        <input key={k} inputMode="decimal" placeholder={label} value={vitals[k] ?? ""} onChange={(e) => setVitals((s) => ({ ...s, [k]: e.target.value }))} className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                      ))}
                    </div>
                    <input placeholder="Notes (optional)" value={vitals.providerNotes ?? ""} onChange={(e) => setVitals((s) => ({ ...s, providerNotes: e.target.value }))} className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                    <div className="mt-2 flex gap-2">
                      <button disabled={busy === v.id} onClick={() => saveVitals(v.id)} className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white active:scale-95 disabled:opacity-50">Save report</button>
                      <button onClick={() => { setRecordingId(null); setVitals({}); }} className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-500 active:scale-95">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setRecordingId(v.id); setVitals({}); }} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary active:scale-95">+ Record vitals</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
