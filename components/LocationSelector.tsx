"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Navigation, Search, X } from "lucide-react";
import type { Locality } from "@/lib/types";

type Props = {
  localities: Locality[];
  /** Currently selected locality name (e.g. 'Gomtinagar'). */
  value: string | null;
  onChange: (locality: Locality | null) => void;
  /** Optional: when a pincode resolves to a locality */
  onPincodeResolved?: (pincode: string, locality: Locality | null) => void;
  className?: string;
  /** Compact = just a pill button; full = inline input. */
  variant?: "pill" | "inline";
  pincodeMap?: Record<string, string>;
};

/**
 * Combined locality + pincode picker for Lucknow.
 *
 * Features:
 *  • Searchable list of localities
 *  • Type a 6-digit pincode → resolved to its locality
 *  • "Use my current location" → reverse-distance match against locality coords
 *  • Persists last selection in localStorage as `hanuone:locality`
 */
export default function LocationSelector({
  localities,
  value,
  onChange,
  onPincodeResolved,
  className = "",
  variant = "pill",
  pincodeMap = {}
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Restore from localStorage
  useEffect(() => {
    if (typeof window === "undefined" || value) return;
    const saved = window.localStorage.getItem("hanuone:locality");
    if (saved) {
      const found = localities.find((l) => l.name === saved);
      if (found) onChange(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(l: Locality | null) {
    if (typeof window !== "undefined") {
      if (l) window.localStorage.setItem("hanuone:locality", l.name);
      else window.localStorage.removeItem("hanuone:locality");
    }
    onChange(l);
    setOpen(false);
    setQuery("");
    setError(null);
  }

  const trimmed = query.trim();
  const isPincode = /^\d{6}$/.test(trimmed);

  const filtered = useMemo(() => {
    if (!query.trim()) return localities.slice(0, 60);
    const q = query.trim().toLowerCase();
    return localities
      .filter((l) => l.name.toLowerCase().includes(q))
      .slice(0, 60);
  }, [localities, query]);

  function applyPincode() {
    if (!isPincode) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }
    const localityName = pincodeMap[trimmed];
    if (!localityName) {
      setError(`No clinics indexed for pincode ${trimmed} yet.`);
      onPincodeResolved?.(trimmed, null);
      return;
    }
    const loc = localities.find((l) => l.name === localityName) ?? null;
    onPincodeResolved?.(trimmed, loc);
    if (loc) commit(loc);
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your browser does not support geolocation.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const localitiesWithCoords = localities.filter((l) => l.lat != null && l.lng != null);
        if (!localitiesWithCoords.length) {
          setError("Locality coordinates aren't loaded yet.");
          setLocating(false);
          return;
        }
        let best: { l: Locality; d: number } | null = null;
        for (const l of localitiesWithCoords) {
          const d = haversine(latitude, longitude, l.lat!, l.lng!);
          if (!best || d < best.d) best = { l, d };
        }
        setLocating(false);
        if (best) {
          if (best.d > 35) {
            setError(`You appear to be ${Math.round(best.d)} km from Lucknow. Pick a locality manually.`);
            return;
          }
          commit(best.l);
        }
      },
      (err) => {
        setLocating(false);
        setError(err.code === 1 ? "Permission denied — pick a locality below." : "Could not get your location.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
    );
  }

  const labelText = value ?? "Choose locality or pincode";

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-ink hover:border-primary/40"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin size={14} className="text-primary" />
            <span className="truncate">{labelText}</span>
          </span>
          <ChevronDown size={14} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <MapPin size={14} className="text-primary" />
          <span className="truncate">{labelText}</span>
          <button
            type="button"
            className="ml-auto text-xs text-primary hover:underline"
            onClick={() => setOpen((v) => !v)}
          >
            Change
          </button>
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-2 w-[min(420px,90vw)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
            <Search size={14} className="text-slate-400" />
            <input
              autoFocus
              type="text"
              inputMode="search"
              placeholder="Search locality or 6-digit pincode"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isPincode) applyPincode();
              }}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear">
                <X size={14} className="text-slate-400" />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={useMyLocation}
              className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-bg px-3 py-1.5 text-xs text-primary hover:border-primary/40"
            >
              <Navigation size={12} />
              {locating ? "Finding…" : "Use my location"}
            </button>
            {isPincode && (
              <button
                type="button"
                onClick={applyPincode}
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Use pincode {trimmed}
              </button>
            )}
            {value && (
              <button
                type="button"
                onClick={() => commit(null)}
                className="ml-auto text-xs text-muted hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>

          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

          <ul className="mt-3 max-h-72 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <li className="px-2 py-3 text-xs text-muted">No localities match "{query}".</li>
            )}
            {filtered.map((l) => {
              const isActive = l.name === value;
              return (
                <li key={l.id ?? l.slug}>
                  <button
                    type="button"
                    onClick={() => commit(l)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-bg ${
                      isActive ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-400" />
                      {l.name}
                    </span>
                    {l.doctor_count > 0 && (
                      <span className="text-[11px] text-muted">{l.doctor_count}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
