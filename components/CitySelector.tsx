"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, MapPin, Navigation, Check } from "lucide-react";
import { SERVICE_CITIES, type ServiceCity, findCityByName, nearestCity, defaultCity } from "@/lib/cities-list";

const STORAGE_KEY = "hanuone:city";

type Props = {
  /** Initial city detected on the server (Vercel geo). */
  initialCityName?: string | null;
  variant?: "pill" | "compact";
  className?: string;
};

/**
 * City selector with three resolution layers:
 *   1. localStorage (user previously chose)
 *   2. geolocation API (auto-detect on first visit, asks permission)
 *   3. server geo header / fallback to Lucknow
 */
export default function CitySelector({ initialCityName, variant = "pill", className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState<ServiceCity>(() =>
    findCityByName(initialCityName ?? null) ?? defaultCity()
  );
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Outside click + Escape to close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Restore from localStorage on first mount; otherwise try geolocation once.
  useEffect(() => {
    setHasMounted(true);
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    const found = findCityByName(saved);
    if (found) {
      setCity(found);
      return;
    }
    // Auto-detect on first visit only (no saved choice)
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const match = nearestCity(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        if (match && match.name !== city.name) {
          commit(match, /* silent */ true);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(next: ServiceCity, silent = false) {
    setCity(next);
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next.name);
      // Also set a cookie so server components can read the choice.
      document.cookie = `hanuone_city=${encodeURIComponent(next.name)}; path=/; max-age=31536000; SameSite=Lax`;
    }
    setHint(silent ? `Set to ${next.name} based on your location` : null);
    if (!silent && typeof window !== "undefined") setTimeout(() => setHint(null), 2500);

    // Reload server data so doctor lists, locality counts etc. reflect the new city.
    router.refresh();
  }

  function detectAgain() {
    if (!navigator.geolocation) {
      setHint("Geolocation not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const match = nearestCity(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        if (match) commit(match);
        else setHint("You're far from our service cities. Pick one manually.");
      },
      (err) => {
        setLocating(false);
        setHint(err.code === 1 ? "Permission denied. Pick a city below." : "Could not detect your location.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  }

  // Avoid mismatch flash; render initial server value until mounted.
  const label = hasMounted ? city.name : (initialCityName ?? defaultCity().name);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm transition hover:shadow ${variant === "pill" ? "border border-primary/15" : ""}`}
      >
        <MapPin size={14} className="text-accent" />
        <span>{label}</span>
        <ChevronDown size={14} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[300px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="px-3 pb-2 pt-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Choose your city</div>
          </div>
          <ul className="space-y-0.5">
            {SERVICE_CITIES.map((c) => {
              const active = c.name === city.name;
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => commit(c)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-bg ${active ? "bg-primary/5 text-primary" : "text-ink"}`}
                  >
                    <span>
                      <span className="font-semibold">{c.name}</span>
                      <span className="ml-2 text-xs text-muted">{c.state}</span>
                    </span>
                    {active && <Check size={14} className="text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={detectAgain}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-primary hover:bg-bg"
            >
              <Navigation size={14} />
              {locating ? "Detecting your location..." : "Use my current location"}
            </button>
          </div>
          {hint && (
            <div className="mt-1 px-3 pb-1 text-[11px] text-muted">{hint}</div>
          )}
          <div className="px-3 pb-1 text-[11px] text-muted">
            Coming soon to more cities. Email <a className="text-primary hover:underline" href="mailto:care@hanuone.com">care@hanuone.com</a>.
          </div>
        </div>
      )}
    </div>
  );
}
