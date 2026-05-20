"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import LocationSelector from "./LocationSelector";
import type { Locality, Specialization } from "@/lib/types";
import { PINCODE_MAP } from "@/lib/pincode-map";

type Props = {
  specializations: Specialization[];
  localities: Locality[];
  variant?: "hero" | "compact";
};

export default function SearchBar({ specializations, localities, variant = "hero" }: Props) {
  const router = useRouter();
  const [specialty, setSpecialty] = useState("");
  const [locality, setLocality] = useState<Locality | null>(null);
  const [q, setQ] = useState("");

  // Restore locality from localStorage on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("hanuone:locality");
    if (saved && !locality) {
      const found = localities.find((l) => l.name === saved);
      if (found) setLocality(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (specialty) params.set("specialty", specialty);
    if (locality) params.set("locality", locality.name);
    const trimmed = q.trim();
    if (trimmed) {
      // If a 6-digit pincode is typed, prefer routing through the pincode page
      if (/^\d{6}$/.test(trimmed)) {
        const target = PINCODE_MAP[trimmed];
        if (target) params.set("locality", target);
        params.set("pincode", trimmed);
      } else {
        params.set("q", trimmed);
      }
    }
    router.push(`/doctors${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid w-full gap-2 rounded-2xl bg-white p-3 shadow-card sm:grid-cols-12"
    >
      <label className="sm:col-span-4">
        <span className="sr-only">Specialty</span>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="input"
        >
          <option value="">All specialties</option>
          {specializations.map((s) => (
            <option key={s.slug} value={s.name}>
              {s.icon ? `${s.icon} ` : ""}
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-3">
        <LocationSelector
          localities={localities}
          value={locality?.name ?? null}
          onChange={setLocality}
          pincodeMap={PINCODE_MAP}
        />
      </div>
      <label className="sm:col-span-3">
        <span className="sr-only">Search</span>
        <input
          type="search"
          inputMode="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Doctor, clinic or pincode"
          className="input"
        />
      </label>
      <button type="submit" className="btn-primary sm:col-span-2">
        <Search size={16} />
        Search
      </button>
    </form>
  );
}
