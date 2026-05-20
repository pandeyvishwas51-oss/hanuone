import type { Doctor } from "@/lib/types";
import { abs } from "@/lib/seo";

type Props = { doctor: Doctor };

/**
 * Renders JSON-LD Physician schema for a doctor profile page.
 */
export default function DoctorJsonLd({ doctor }: Props) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Physician",
    "@id": abs(`/doctors/${doctor.slug}#physician`),
    name: doctor.name,
    medicalSpecialty: doctor.specialization,
    url: abs(`/doctors/${doctor.slug}`),
    address: {
      "@type": "PostalAddress",
      streetAddress: doctor.clinic_address,
      addressLocality: doctor.locality,
      addressRegion: doctor.city,
      addressCountry: "IN",
      postalCode: doctor.pincode || undefined
    }
  };
  if (doctor.latitude && doctor.longitude) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: doctor.latitude,
      longitude: doctor.longitude
    };
  }
  if (doctor.phone) data.telephone = doctor.phone;
  if (doctor.profile_image_url) data.image = doctor.profile_image_url;
  if (doctor.qualifications && doctor.qualifications.length) {
    data.alumniOf = doctor.qualifications.map((q) => ({
      "@type": "EducationalOrganization",
      name: q
    }));
  }
  if (doctor.languages && doctor.languages.length) {
    data.knowsLanguage = doctor.languages;
  }
  if (doctor.timing) data.openingHours = doctor.timing;
  if (doctor.rating != null) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: doctor.rating,
      reviewCount: Math.max(1, doctor.review_count || 1),
      bestRating: 5,
      worstRating: 1
    };
  }
  if (doctor.consultation_fee_min != null || doctor.consultation_fee_max != null) {
    data.priceRange = `INR ${doctor.consultation_fee_min ?? ""}${
      doctor.consultation_fee_max && doctor.consultation_fee_max !== doctor.consultation_fee_min
        ? `-${doctor.consultation_fee_max}`
        : ""
    }`;
  }
  if (doctor.experience_years) {
    data.yearsOfExperience = doctor.experience_years;
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
