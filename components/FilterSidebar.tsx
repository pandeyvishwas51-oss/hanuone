"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Filter, X } from "lucide-react";
import type { Locality, Specialization } from "@/lib/types";
import { PINCODE_MAP } from "@/lib/pincode-map";

type Props = {
  specializations: Specialization[];
  localities: Locality[];
};

export default function FilterSidebar({ specializations, localities }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const selectedSpecs = useMemo(() => params.getAll("specialty"), [params]);
  const selectedLocs = useMemo(() => params.getAll("locality"), [params]);
  const feeMax = Number(params.get("feeMax") ?? 2000);
  const minRating = Number(params.get("minRating") ?? 0);
  const pincode = params.get("pincode") ?? "";

  function update(next: URLSearchParams) {
    next.delete("page");
    startTransition(() => {
      router.push(`/doctors?${next.toString()}`);
    });
  }

  function toggleParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    const all = next.getAll(key);
    next.delete(key);
    if (all.includes(value)) {
      all.filter((v) => v !== value).forEach((v) => next.append(key, v));
    } else {
      [...all, value].forEach((v) => next.append(key, v));
    }
    update(next);
  }

  function setSingle(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
    update(next);
  }

  function clearAll() {
    const q = params.get("q");
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    update(next);
  }

  const Body = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Filters</div>
        <button onClick={clearAll} className="text-xs text-primary hover:underline">
          Clear all
        </button>
      </div>

      <fieldset>
        <legend className="label">Pincode</legend>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit pincode"
            defaultValue={pincode}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = (e.target as HTMLInputElement).value.trim();
                const next = new URLSearchParams(params.toString());
                if (/^\d{6}$/.test(value)) {
                  next.set("pincode", value);
                  const matched = PINCODE_MAP[value];
                  if (matched) {
                    const all = next.getAll("locality").filter((l) => l !== matched);
                    next.delete("locality");
                    [...all, matched].forEach((l) => next.append("locality", l));
                  }
                } else {
                  next.delete("pincode");
                }
                update(next);
              }
            }}
            className="input"
          />
          {pincode && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                next.delete("pincode");
                update(next);
              }}
              className="text-xs text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        {pincode && PINCODE_MAP[pincode] && (
          <div className="mt-1 text-[11px] text-muted">
            Pincode {pincode} → {PINCODE_MAP[pincode]}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="label">Specialty</legend>
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {specializations.map((s) => {
            const checked = selectedSpecs.includes(s.name);
            return (
              <label key={s.slug} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleParam("specialty", s.name)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>{s.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Locality</legend>
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {localities.map((l) => {
            const checked = selectedLocs.includes(l.name);
            return (
              <label key={l.slug} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleParam("locality", l.name)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>{l.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Max consultation fee: ₹{feeMax}</legend>
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={feeMax}
          onChange={(e) => setSingle("feeMax", e.target.value)}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[11px] text-muted">
          <span>₹100</span>
          <span>₹2000</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Minimum rating</legend>
        <div className="flex flex-wrap gap-1.5">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setSingle("minRating", r === 0 ? null : String(r))}
              className={`rounded-full border px-3 py-1 text-xs ${
                minRating === r
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 text-ink"
              }`}
            >
              {r === 0 ? "Any" : `${r}+ ★`}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );

  return (
    <>
      <div className="sticky top-20 hidden md:block">
        <div className="card p-5">{Body}</div>
      </div>

      <div className="md:hidden">
        <button onClick={() => setOpen(true)} className="btn-outline w-full">
          <Filter size={14} />
          Filters
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[88%] max-w-md overflow-y-auto bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Filters</span>
              <button onClick={() => setOpen(false)} aria-label="Close filters">
                <X size={18} />
              </button>
            </div>
            {Body}
            <button onClick={() => setOpen(false)} className="btn-primary mt-6 w-full">
              {isPending ? "Updating..." : "Show results"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
