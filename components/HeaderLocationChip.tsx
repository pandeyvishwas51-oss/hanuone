"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import LocationSelector from "./LocationSelector";
import type { Locality } from "@/lib/types";
import { PINCODE_MAP } from "@/lib/pincode-map";

export default function HeaderLocationChip({ localities }: { localities: Locality[] }) {
  const router = useRouter();
  const [value, setValue] = useState<Locality | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("hanuone:locality");
    if (saved) {
      const found = localities.find((l) => l.name === saved);
      if (found) setValue(found);
    }
  }, [localities]);

  function handleChange(loc: Locality | null) {
    setValue(loc);
    if (loc) router.push(`/localities/${loc.slug}`);
  }

  return (
    <>
      {/* Compact mobile pill */}
      <div className="md:hidden">
        <LocationSelector
          localities={localities}
          value={value?.name ?? null}
          onChange={handleChange}
          pincodeMap={PINCODE_MAP}
          variant="pill"
          className="w-[148px]"
        />
      </div>
      {/* Wider desktop pill */}
      <div className="hidden md:block">
        <LocationSelector
          localities={localities}
          value={value?.name ?? null}
          onChange={handleChange}
          pincodeMap={PINCODE_MAP}
          variant="pill"
          className="w-[220px]"
        />
      </div>
    </>
  );
}
