"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LocationSelector from "./LocationSelector";
import type { Locality } from "@/lib/types";
import { PINCODE_MAP } from "@/lib/pincode-map";

export default function HeaderLocationChip({ localities }: { localities: Locality[] }) {
  const router = useRouter();
  const [value, setValue] = useState<Locality | null>(null);

  function handleChange(loc: Locality | null) {
    setValue(loc);
    if (loc) router.push(`/localities/${loc.slug}`);
  }

  return (
    <div className="hidden sm:block">
      <LocationSelector
        localities={localities}
        value={value?.name ?? null}
        onChange={handleChange}
        pincodeMap={PINCODE_MAP}
        variant="pill"
        className="w-[220px]"
      />
    </div>
  );
}
