import type { Doctor } from "@/lib/types";

type Props = { doctor: Doctor };

/**
 * Renders JSON-LD Physician schema for a doctor profile page.
 * Use inside the page body, Next.js will keep it in the rendered HTML for SEO.
 */
export default function DoctorJsonLd({ doctor }: Props) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctor.name,
    medicalSpecialty: doctor.specialization,
    address: {
      "@type": "PostalAddress",
      streetAddress: doctor.clinic_address,
      addressLocality: doctor.locality,
      addressRegion: doctor.city,
      addressCountry: "IN",
      postalCode: doctor.pincode || undefined
    }
  };
  if (doctor.phone) data.telephone = doctor.phone;
  if (doctor.profile_image_url) data.image = doctor.profile_image_url;
  if (doctor.rating != null) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: doctor.rating,
      reviewCount: doctor.review_count || 1
    };
  }
  if (doctor.consultation_fee_min != null || doctor.consultation_fee_max != null) {
    data.priceRange = `₹${doctor.consultation_fee_min ?? ""}-₹${doctor.consultation_fee_max ?? ""}`;
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
