import Link from "next/link";
import Image from "next/image";
import { MapPin, BadgeCheck } from "lucide-react";
import RatingStars from "./RatingStars";
import WhatsAppButton from "./WhatsAppButton";
import BookingDialog from "./BookingDialog";
import type { Doctor } from "@/lib/types";
import { formatFeeRange } from "@/lib/utils";

type Props = {
  doctor: Doctor;
  className?: string;
};

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DoctorCard({ doctor, className = "" }: Props) {
  const fee = formatFeeRange(doctor.consultation_fee_min, doctor.consultation_fee_max);
  return (
    <article
      className={`card flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 flex-none overflow-hidden rounded-full bg-primary/10">
          {doctor.profile_image_url ? (
            <Image
              src={doctor.profile_image_url}
              alt={doctor.name}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-base font-semibold text-primary">
              {initials(doctor.name)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/doctors/${doctor.slug}`}
              className="truncate text-base font-semibold text-ink hover:text-primary"
            >
              {doctor.name}
            </Link>
            {doctor.verified && (
              <span title="Verified" className="inline-flex">
                <BadgeCheck size={16} className="text-accent" />
              </span>
            )}
          </div>
          <div className="text-sm text-primary">{doctor.specialization}</div>
          {doctor.experience_years != null && (
            <div className="text-xs text-muted">{doctor.experience_years}+ yrs experience</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-muted">
        <MapPin size={14} />
        <span className="truncate">
          {doctor.locality}, {doctor.city}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <RatingStars rating={doctor.rating} reviewCount={doctor.review_count} />
        <span className="text-sm font-medium text-ink">{fee}</span>
      </div>

      <div className="flex items-center gap-2">
        <BookingDialog doctorSlug={doctor.slug} doctorName={doctor.name} doctorCity={doctor.city} className="btn-primary flex-1" trigger="Book" />
        <Link href={`/doctors/${doctor.slug}`} className="btn-outline flex-1">
          View
        </Link>
        <WhatsAppButton phone={doctor.whatsapp ?? doctor.phone} doctorName={doctor.name} variant="icon" />
      </div>
    </article>
  );
}
