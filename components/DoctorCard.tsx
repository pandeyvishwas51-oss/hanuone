import Link from "next/link";
import Image from "next/image";
import { MapPin, BadgeCheck, Star, Video, Stethoscope } from "lucide-react";
import WhatsAppButton from "./WhatsAppButton";
import type { Doctor } from "@/lib/types";
import { formatFeeRange } from "@/lib/utils";

type Props = {
  doctor: Doctor;
  className?: string;
  /** Position in a grid — drives a staggered entrance (capped so late cards aren't slow). */
  index?: number;
};

function initials(name: string) {
  return name.replace(/^Dr\.?\s*/i, "").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function DoctorCard({ doctor, className = "", index = 0 }: Props) {
  const fee = formatFeeRange(doctor.consultation_fee_min, doctor.consultation_fee_max);
  const hasRating = doctor.rating != null && (doctor.review_count ?? 0) > 0;
  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={`group flex animate-fade-in-up flex-col overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-[0_1px_3px_rgba(1,88,108,0.06)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_12px_28px_-12px_rgba(1,88,108,0.3)] ${className}`}
    >
      <div className="flex items-start gap-3.5 p-4 pb-3">
        <div className="relative h-16 w-16 flex-none">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 ring-1 ring-primary/10">
            {doctor.profile_image_url ? (
              <Image src={doctor.profile_image_url} alt={doctor.name} fill sizes="64px" className="object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-lg font-bold text-primary">{initials(doctor.name)}</div>
            )}
          </div>
          {doctor.verified && (
            <span title="Verified" className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white ring-1 ring-primary/10">
              <BadgeCheck size={16} className="text-accent" fill="currentColor" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/doctors/${doctor.slug}`} className="block truncate text-[15px] font-bold text-ink transition group-hover:text-primary">
            {doctor.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-primary"><Stethoscope size={13} /> {doctor.specialization}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
            {doctor.experience_years != null && <span>{doctor.experience_years}+ yrs exp</span>}
            {hasRating && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                <Star size={12} fill="currentColor" /> {Number(doctor.rating).toFixed(1)} <span className="font-normal text-muted">({doctor.review_count})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-4 text-xs text-muted">
        <MapPin size={13} className="flex-none" />
        <span className="truncate">{doctor.locality}, {doctor.city}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-primary/5 bg-primary/[0.02] px-4 py-2.5">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted"><Video size={13} /> Video consult</span>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted">Fee from</div>
          <div className="text-sm font-bold text-ink">{fee}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3">
        <Link href={`/book/${doctor.slug}`} className="btn-primary flex-1 text-center">Book now</Link>
        <Link href={`/doctors/${doctor.slug}`} className="btn-outline flex-1 text-center">Profile</Link>
        <WhatsAppButton phone={doctor.whatsapp ?? doctor.phone} doctorName={doctor.name} variant="icon" />
      </div>
    </article>
  );
}
