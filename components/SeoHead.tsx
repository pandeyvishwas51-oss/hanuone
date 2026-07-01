import type { Doctor } from "@/lib/types";
import { abs } from "@/lib/seo";

type Props = { doctor: Doctor };

/**
 * Renders JSON-LD Physician schema for a doctor profile page.
 */
export default function DoctorJsonLd({ doctor }: Props) {
  const physicianId = abs(`/doctors/${doctor.slug}#physician`);
  const clinicId = abs(`/doctors/${doctor.slug}#clinic`);

  const address = {
    "@type": "PostalAddress",
    streetAddress: doctor.clinic_address,
    addressLocality: doctor.locality,
    addressRegion: doctor.city,
    addressCountry: "IN",
    postalCode: doctor.pincode || undefined
  };
  const geo =
    doctor.latitude && doctor.longitude
      ? { "@type": "GeoCoordinates", latitude: doctor.latitude, longitude: doctor.longitude }
      : undefined;
  // Local-GEO signal: the service area this doctor covers.
  const areaServed = [
    { "@type": "City", name: doctor.city },
    { "@type": "Place", name: `${doctor.locality}, ${doctor.city}` }
  ];
  const priceRange =
    doctor.consultation_fee_min != null || doctor.consultation_fee_max != null
      ? `INR ${doctor.consultation_fee_min ?? ""}${
          doctor.consultation_fee_max && doctor.consultation_fee_max !== doctor.consultation_fee_min
            ? `-${doctor.consultation_fee_max}`
            : ""
        }`
      : undefined;
  const aggregateRating =
    doctor.rating != null && (doctor.review_count ?? 0) > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: doctor.rating,
          reviewCount: doctor.review_count,
          bestRating: 5,
          worstRating: 1
        }
      : undefined;

  const physician: Record<string, unknown> = {
    "@type": "Physician",
    "@id": physicianId,
    name: doctor.name,
    medicalSpecialty: doctor.specialization,
    url: abs(`/doctors/${doctor.slug}`),
    address,
    areaServed,
    // Bind the physician to the clinic node below.
    worksFor: { "@id": clinicId }
  };
  if (geo) physician.geo = geo;
  if (doctor.phone) physician.telephone = doctor.phone;
  if (doctor.profile_image_url) physician.image = doctor.profile_image_url;
  if (doctor.qualifications && doctor.qualifications.length) {
    physician.alumniOf = doctor.qualifications.map((q) => ({ "@type": "EducationalOrganization", name: q }));
  }
  if (doctor.languages && doctor.languages.length) physician.knowsLanguage = doctor.languages;
  if (doctor.timing) physician.openingHours = doctor.timing;
  // Only emit AggregateRating when there are REAL reviews — fabricating one
  // violates Google's structured-data policy.
  if (aggregateRating) physician.aggregateRating = aggregateRating;
  if (priceRange) physician.priceRange = priceRange;
  if (doctor.experience_years) physician.yearsOfExperience = doctor.experience_years;

  // The clinic the physician practises at — a MedicalClinic LocalBusiness, the
  // highest-payoff local markup (eligible for local SERP enhancements).
  const clinic: Record<string, unknown> = {
    "@type": "MedicalClinic",
    "@id": clinicId,
    name: doctor.clinic_name || `${doctor.name} — Clinic`,
    url: abs(`/doctors/${doctor.slug}`),
    address,
    areaServed,
    medicalSpecialty: doctor.specialization
  };
  if (geo) clinic.geo = geo;
  if (doctor.phone) clinic.telephone = doctor.phone;
  if (doctor.profile_image_url) clinic.image = doctor.profile_image_url;
  if (doctor.timing) clinic.openingHours = doctor.timing;
  if (priceRange) clinic.priceRange = priceRange;
  if (aggregateRating) clinic.aggregateRating = aggregateRating;

  const data = { "@context": "https://schema.org", "@graph": [physician, clinic] };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
