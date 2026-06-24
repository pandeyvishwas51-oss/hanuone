import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import DoctorProfileHero from "@/components/DoctorProfileHero";
import DoctorJsonLd from "@/components/SeoHead";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import DoctorCard from "@/components/DoctorCard";
import ReviewCard from "@/components/ReviewCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  getAllDoctorSlugs,
  getDoctorBySlug,
  getReviewsForDoctor,
  getSimilarDoctors
} from "@/lib/queries";
import { buildTelLink, formatFeeRange, truncate } from "@/lib/utils";
import { breadcrumbJsonLd, medicalWebPageJsonLd, speakableJsonLd, doctorAnswer } from "@/lib/seo";
import AnswerBlock from "@/components/AnswerBlock";
import JsonLd from "@/components/JsonLd";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllDoctorSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const doctor = await getDoctorBySlug(params.slug);
  if (!doctor) return { title: "Doctor not found" };
  const title = `${doctor.name}, Best ${doctor.specialization} in ${doctor.locality}, Lucknow`;
  const description = truncate(
    `${doctor.name} is a ${doctor.experience_years ? `${doctor.experience_years}-year experienced ` : ""}${doctor.specialization} in ${doctor.locality}, ${doctor.city}. Consultation fee ${formatFeeRange(doctor.consultation_fee_min, doctor.consultation_fee_max)}. Contact directly via WhatsApp.`,
    180
  );
  return {
    title,
    description,
    alternates: { canonical: `/doctors/${doctor.slug}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/doctors/${doctor.slug}`,
      images: doctor.profile_image_url
        ? [{ url: doctor.profile_image_url, alt: doctor.name }]
        : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: doctor.profile_image_url ? [doctor.profile_image_url] : undefined
    }
  };
}

export default async function DoctorProfilePage({ params }: { params: { slug: string } }) {
  const doctor = await getDoctorBySlug(params.slug);
  if (!doctor) notFound();

  const [reviews, similar] = await Promise.all([
    getReviewsForDoctor(doctor.id),
    getSimilarDoctors(doctor)
  ]);

  const tel = buildTelLink(doctor.phone);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapsQuery = encodeURIComponent(
    `${doctor.clinic_name ?? ""} ${doctor.clinic_address}`.trim()
  );
  const mapsSrc = mapsKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${mapsQuery}`
    : `https://maps.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <div className="container-page py-6 sm:py-10">
      <DoctorJsonLd doctor={doctor} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", href: "/" },
              {
                name: `${doctor.specialization}s in Lucknow`,
                href: `/specializations/${slugify(doctor.specialization)}`
              },
              { name: doctor.name, href: `/doctors/${doctor.slug}` }
            ])
          )
        }}
      />

      <JsonLd
        data={[
          medicalWebPageJsonLd({
            url: `/doctors/${doctor.slug}`,
            name: `${doctor.name} — ${doctor.specialization} in ${doctor.locality}, ${doctor.city}`,
            description: doctorAnswer(doctor)
          }),
          speakableJsonLd(`/doctors/${doctor.slug}`)
        ]}
      />

      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: `${doctor.specialization}s in Lucknow`, href: `/specializations/${slugify(doctor.specialization)}` },
          { label: doctor.name }
        ]}
      />

      <div className="mt-4">
        <DoctorProfileHero doctor={doctor} />
      </div>

      <div className="mt-4">
        <AnswerBlock
          question={`Who is ${doctor.name} and what do they treat?`}
          answer={doctorAnswer(doctor)}
          updated={new Date().toISOString().slice(0, 10)}
        />
      </div>

      {/* Tabs as anchored sections (server-rendered) */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-8">
          <SectionAbout doctor={doctor} />
          <SectionClinic doctor={doctor} mapsSrc={mapsSrc} />
          <section id="reviews" className="card p-6">
            <h2 className="h3">Reviews</h2>
            <p className="mt-1 text-sm text-muted">
              {doctor.review_count > 0
                ? `${doctor.review_count} reviews · ${doctor.rating?.toFixed(1) ?? "-"} ★`
                : "No reviews yet, be the first to share your experience."}
            </p>
            {reviews.length > 0 && (
              <div className="mt-4 grid gap-3">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            )}
          </section>
          <section id="similar" className="card p-6">
            <h2 className="h3">Similar doctors</h2>
            {similar.length === 0 ? (
              <p className="mt-1 text-sm text-muted">
                We'll show similar doctors as more get listed.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {similar.map((d) => (
                  <DoctorCard key={d.id} doctor={d} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Quick contact
            </div>
            <div className="mt-2 text-sm text-ink">{doctor.clinic_name || "Clinic"}</div>
            <div className="text-xs text-muted">{doctor.clinic_address}</div>
            {doctor.timing && <div className="mt-2 text-xs text-muted">⏱ {doctor.timing}</div>}
            <div className="mt-4 flex flex-col gap-2">
              <a href={`/book/${doctor.slug}`} className="btn-primary text-center">
                Book video consult
              </a>
              <WhatsAppButton
                phone={doctor.whatsapp ?? doctor.phone}
                doctorName={doctor.name}
              />
              {tel && (
                <a href={tel} className="btn-outline">
                  Call clinic
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky mobile CTA bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/10 bg-white p-3 shadow-md sm:hidden">
        <div className="flex gap-2">
          {tel && (
            <a href={tel} className="btn-outline flex-1">
              Call
            </a>
          )}
          <div className="flex-1">
            <WhatsAppButton
              phone={doctor.whatsapp ?? doctor.phone}
              doctorName={doctor.name}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SectionAbout({ doctor }: { doctor: NonNullable<Awaited<ReturnType<typeof getDoctorBySlug>>> }) {
  return (
    <section id="about" className="card p-6">
      <h2 className="h3">About Dr. {doctor.name.replace(/^Dr\.?\s*/i, "")}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label="Qualifications" value={(doctor.qualifications ?? []).join(", ") || "-"} />
        <Field label="Experience" value={doctor.experience_years ? `${doctor.experience_years} years` : "-"} />
        <Field label="Specialization" value={doctor.specialization} />
        <Field label="Languages" value={(doctor.languages ?? []).join(", ") || "-"} />
        <Field
          label="Sub-specialties"
          value={(doctor.sub_specializations ?? []).join(", ") || "-"}
        />
        <Field
          label="Consultation fee"
          value={formatFeeRange(doctor.consultation_fee_min, doctor.consultation_fee_max)}
        />
      </div>
    </section>
  );
}

function SectionClinic({
  doctor,
  mapsSrc
}: {
  doctor: NonNullable<Awaited<ReturnType<typeof getDoctorBySlug>>>;
  mapsSrc: string;
}) {
  return (
    <section id="clinic" className="card overflow-hidden">
      <div className="p-6">
        <h2 className="h3">Clinic information</h2>
        <div className="mt-2 text-sm">
          <div className="font-medium text-ink">{doctor.clinic_name || "Clinic"}</div>
          <div className="text-muted">{doctor.clinic_address}</div>
          {doctor.timing && <div className="mt-2 text-muted">⏱ {doctor.timing}</div>}
        </div>
      </div>
      <div className="aspect-video w-full bg-slate-100">
        <iframe
          title="Clinic map"
          src={mapsSrc}
          width="100%"
          height="100%"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="border-0"
        />
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-sm text-ink">{value}</div>
    </div>
  );
}
