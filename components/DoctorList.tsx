import DoctorCard from "./DoctorCard";
import type { Doctor } from "@/lib/types";

export default function DoctorList({
  doctors,
  emptyMessage = "No doctors found. Try adjusting your filters."
}: {
  doctors: Doctor[];
  emptyMessage?: string;
}) {
  if (!doctors.length) {
    return (
      <div className="card grid place-items-center py-16 text-center text-sm text-muted">
        <div>
          <div className="text-2xl">🔍</div>
          <p className="mt-2">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {doctors.map((d, i) => (
        <DoctorCard key={d.id} doctor={d} index={i} />
      ))}
    </div>
  );
}
