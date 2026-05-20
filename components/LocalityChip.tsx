import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Locality } from "@/lib/types";

export default function LocalityChip({ locality }: { locality: Locality }) {
  return (
    <Link href={`/localities/${locality.slug}`} className="chip">
      <MapPin size={12} />
      <span>{locality.name}</span>
      {locality.doctor_count > 0 && (
        <span className="text-[10px] text-muted">· {locality.doctor_count}</span>
      )}
    </Link>
  );
}
