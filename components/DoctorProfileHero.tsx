import Image from "next/image";
import { BadgeCheck, GraduationCap, Briefcase, MapPin, Languages } from "lucide-react";
import RatingStars from "./RatingStars";
import WhatsAppButton from "./WhatsAppButton";
import BookingDialog from "./BookingDialog";
import type { Doctor } from "@/lib/types";
import { buildTelLink, formatFeeRange } from "@/lib/utils";

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

export default function DoctorProfileHero({ doctor }: { doctor: Doctor }) {
  const tel = buildTelLink(doctor.phone);
  const fee = formatFeeRange(doctor.consultation_fee_min, doctor.consultation_fee_max);

  return (
    <section className="card animate-fade-in-up overflow-hidden">
      <div className="grid gap-6 p-6 md:grid-cols-[160px,1fr,260px] md:p-8">
        <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-2xl bg-primary/10 md:h-40 md:w-40">
          {doctor.profile_image_url ? (
            <Image
              src={doctor.profile_image_url}
              alt={doctor.name}
              fill
              sizes="160px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl font-semibold text-primary">
              {initials(doctor.name)}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="h2">{doctor.name}</h1>
            {doctor.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                <BadgeCheck size={14} /> Verified
              </span>
            )}
          </div>
          <div className="mt-1 text-base font-medium text-primary">{doctor.specialization}</div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
            {doctor.qualifications && doctor.qualifications.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap size={14} />
                {doctor.qualifications.join(", ")}
              </span>
            )}
            {doctor.experience_years != null && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase size={14} />
                {doctor.experience_years}+ years
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} />
              {doctor.locality}, {doctor.city}
            </span>
            {doctor.languages && doctor.languages.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Languages size={14} />
                {doctor.languages.join(", ")}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <RatingStars rating={doctor.rating} reviewCount={doctor.review_count} />
            <span className="text-sm font-semibold text-ink">{fee}</span>
          </div>
        </div>

        <aside className="card flex flex-col justify-between gap-3 bg-bg p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Contact</div>
            <div className="mt-1 text-sm text-ink">{doctor.clinic_name || "Clinic"}</div>
            <div className="text-xs text-muted">{doctor.clinic_address}</div>
          </div>
          <div className="flex flex-col gap-2">
            <BookingDialog doctorSlug={doctor.slug} doctorName={doctor.name} doctorCity={doctor.city} className="btn-primary" />
            <WhatsAppButton phone={doctor.whatsapp ?? doctor.phone} doctorName={doctor.name} />
            {tel && (
              <a href={tel} className="btn-outline">
                Call {doctor.phone}
              </a>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
