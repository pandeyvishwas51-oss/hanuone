"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/data";

export default function CitySelect({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(CITIES[0]);
  const router = useRouter();

  const onPick = (city: (typeof CITIES)[number]) => {
    setSelected(city);
    setOpen(false);
    if (city.status === "live") {
      router.push(`/doctors?city=${city.slug}`);
    }
  };

  const isDark = variant === "dark";

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
          isDark
            ? "bg-white/15 text-white ring-1 ring-white/40 backdrop-blur hover:bg-white/25"
            : "bg-white text-trust-700 ring-1 ring-slate-200 hover:ring-trust-600"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{selected.name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={open ? "rotate-180 transition" : "transition"}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <button aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className="absolute left-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 text-left shadow-xl"
          >
            {CITIES.map((c) => (
              <li key={c.slug}>
                <button
                  role="option"
                  aria-selected={selected.slug === c.slug}
                  onClick={() => onPick(c)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="font-medium">{c.name}</span>
                  {c.status === "live" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">● Live</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Coming soon</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
