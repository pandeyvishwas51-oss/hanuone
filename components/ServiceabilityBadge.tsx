"use client";

import { useEffect, useRef, useState } from "react";

type Result = { pincode: string | null; live: string[]; comingSoon: string[] };

const LABELS: Record<string, string> = {
  teleconsult: "Doctor teleconsult",
  clinic: "Clinic visits",
  medicine: "Medicine delivery",
  lab: "Lab tests at home",
  nursing: "Home nursing",
  physio: "Physiotherapy",
  vitals: "Vital Checkup",
  ai: "AI Health Assistant"
};

/**
 * Lets a user check which services are live in their pincode. Remembers the
 * pincode in localStorage so other pages can gate on it.
 */
export default function ServiceabilityBadge() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  // Guards against setState after unmount (the mount auto-check can resolve late).
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("hanuone:pincode") : null;
    if (saved && /^\d{6}$/.test(saved)) {
      setPincode(saved);
      check(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function check(pin: string) {
    if (!/^\d{6}$/.test(pin)) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/serviceability?pincode=${pin}`);
      const j = await r.json();
      if (mountedRef.current && j.ok) {
        setResult({ pincode: j.pincode, live: j.live, comingSoon: j.comingSoon });
        window.localStorage.setItem("hanuone:pincode", pin);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">Check what is available in your area</span>
        <div className="ml-auto flex items-center gap-2">
          <input
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && check(pincode)}
            placeholder="Enter 6-digit pincode"
            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => check(pincode)}
            disabled={loading || pincode.length !== 6}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? "…" : "Check"}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Available now</div>
            <ul className="mt-1.5 space-y-1">
              {result.live.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-ink">
                  <span className="text-emerald-600">✓</span> {LABELS[s] ?? s}
                </li>
              ))}
            </ul>
          </div>
          {result.comingSoon.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Coming soon to {result.pincode}</div>
              <ul className="mt-1.5 space-y-1">
                {result.comingSoon.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-muted">
                    <span className="text-amber-500">◷</span> {LABELS[s] ?? s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
