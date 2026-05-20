import Link from "next/link";
import type { Specialization } from "@/lib/types";

export default function SpecialtyCard({ specialty }: { specialty: Specialization }) {
  return (
    <Link
      href={`/specializations/${specialty.slug}`}
      className="card flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className="text-3xl" aria-hidden>
        {specialty.icon || "🩺"}
      </span>
      <span className="text-sm font-semibold text-ink">{specialty.name}</span>
      {specialty.name_hindi && (
        <span className="hi text-xs text-muted">{specialty.name_hindi}</span>
      )}
      {specialty.doctor_count > 0 && (
        <span className="text-[11px] text-muted">{specialty.doctor_count} doctors</span>
      )}
    </Link>
  );
}
