"use client";

import { useEffect, useState } from "react";

type State = {
  status: string;
  staffLat: string | null;
  staffLng: string | null;
  etaMinutes: number | null;
  trackingUpdatedAt: string | null;
};

const STEPS = ["assigned", "on_the_way", "arrived", "in_progress", "completed"];
const LABEL: Record<string, string> = {
  requested: "Requested",
  assigned: "Professional assigned",
  on_the_way: "On the way to you",
  arrived: "Arrived at your location",
  in_progress: "Service in progress",
  completed: "Visit completed",
  cancelled: "Cancelled"
};

export default function TrackingView({ visitId }: { visitId: string }) {
  const [s, setS] = useState<State | null>(null);
  const [pollError, setPollError] = useState("");

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    // The public /track link carries ?token=… which authorizes the location read.
    const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    async function poll() {
      try {
        const r = await fetch(`/api/visits/${visitId}/location${qs}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok && j.ok) {
          setPollError("");
          setS({ status: j.status, staffLat: j.staffLat, staffLng: j.staffLng, etaMinutes: j.etaMinutes, trackingUpdatedAt: j.trackingUpdatedAt });
          // Stop polling once the visit is terminal — no point hammering the
          // endpoint every 8s (battery/server) on a finished or cancelled visit.
          if (j.status === "completed" || j.status === "cancelled") {
            if (timer) clearInterval(timer);
          }
        } else {
          setPollError(j.error === "Forbidden"
            ? "This tracking link is invalid or has expired."
            : "Connection lost — showing your last known status. We'll retry automatically.");
        }
      } catch {
        if (alive) setPollError("Connection lost — showing your last known status. We'll retry automatically.");
      }
    }
    poll();
    timer = setInterval(poll, 8000); // 8s polling; swap to Supabase Realtime later
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [visitId]);

  const lat = s?.staffLat ? Number(s.staffLat) : null;
  const lng = s?.staffLng ? Number(s.staffLng) : null;
  const hasLoc = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const currentStep = s ? STEPS.indexOf(s.status) : -1;

  // Free OpenStreetMap embed (no API key) centred on the staff location.
  const d = 0.01;
  const bbox = hasLoc ? `${lng! - d},${lat! - d},${lng! + d},${lat! + d}` : "";
  const mapSrc = hasLoc
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
    : "";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">{s ? LABEL[s.status] ?? s.status : "Loading…"}</div>
        {pollError && (
          <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{pollError}</p>
        )}
        {s?.etaMinutes ? <div className="mt-1 text-sm text-primary">ETA about {s.etaMinutes} min</div> : null}

        {/* Progress steps */}
        <div className="mt-4 flex items-center justify-between">
          {STEPS.map((st, i) => (
            <div key={st} className="flex flex-1 flex-col items-center">
              <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= currentStep ? "bg-primary text-white" : "bg-slate-200 text-slate-500"}`}>
                {i + 1}
              </div>
              <div className="mt-1 text-center text-[10px] text-muted">{LABEL[st]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        {hasLoc ? (
          <iframe title="Live location" src={mapSrc} className="h-[360px] w-full" loading="lazy" />
        ) : (
          <div className="grid h-[360px] place-items-center bg-slate-50 text-sm text-muted">
            {s && s.status !== "completed" && s.status !== "cancelled"
              ? "Live location will appear once your professional starts the trip."
              : "No live location to show."}
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">Location is shared only during your active visit and stops automatically when it completes.</p>
    </div>
  );
}
