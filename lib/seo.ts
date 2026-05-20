/**
 * Centralised SEO helpers: site config, JSON-LD builders, FAQs.
 *
 * All structured-data objects are returned as plain objects and serialised
 * with `JSON.stringify` inside a `<script type="application/ld+json">` tag.
 */

export const SITE = {
  name: "Hanuone",
  legalName: "Hanuone",
  tagline: "Lucknow ke Trusted Doctors, Ek Jagah",
  description:
    "Hanuone is a free, verified directory of doctors in Lucknow. Search by specialty, locality or pincode and contact any clinic via WhatsApp.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.vercel.app",
  domain:
    (process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.vercel.app").replace(
      /^https?:\/\//,
      ""
    ),
  logo: "/logo.svg",
  ogImage: "/og-image.svg",
  email: "ritiktech970@gmail.com",
  phoneE164: "+919876543210",
  social: {
    instagram: "https://instagram.com/Hanuone_0",
    facebook: "https://www.facebook.com/share/1CZnNMGXk5/",
    twitter: "https://x.com/Hanuone_0"
  },
  area: { city: "Lucknow", region: "Uttar Pradesh", country: "IN" }
} as const;

export function abs(path = "/") {
  if (path.startsWith("http")) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

// ------------------------------------------------------------
// Organization + WebSite (sitewide JSON-LD)
// ------------------------------------------------------------
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: abs(SITE.logo),
    email: SITE.email,
    sameAs: [SITE.social.instagram, SITE.social.facebook, SITE.social.twitter],
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.area.city,
      addressRegion: SITE.area.region,
      addressCountry: SITE.area.country
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SITE.email,
        availableLanguage: ["en", "hi"],
        areaServed: "IN"
      }
    ]
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: ["en-IN", "hi-IN"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/doctors?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

// ------------------------------------------------------------
// BreadcrumbList JSON-LD
// ------------------------------------------------------------
export function breadcrumbJsonLd(items: { name: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.href ? { item: abs(it.href) } : {})
    }))
  };
}

// ------------------------------------------------------------
// ItemList JSON-LD for doctor result pages
// ------------------------------------------------------------
export function doctorItemListJsonLd(
  doctors: { name: string; slug: string; specialization: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: doctors.length,
    itemListElement: doctors.slice(0, 50).map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(`/doctors/${d.slug}`),
      name: `${d.name} - ${d.specialization}`
    }))
  };
}

// ------------------------------------------------------------
// FAQPage JSON-LD
// ------------------------------------------------------------
export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a }
    }))
  };
}

// ------------------------------------------------------------
// MedicalSpecialty / MedicalBusiness for specialty + locality pages
// ------------------------------------------------------------
export function medicalSpecialtyJsonLd(args: {
  specialty: string;
  city?: string;
  url: string;
  description: string;
  doctorCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalSpecialty",
    name: `${args.specialty} in ${args.city ?? "Lucknow"}`,
    url: abs(args.url),
    relevantSpecialty: args.specialty,
    description: args.description,
    ...(args.doctorCount != null
      ? { numberOfEmployees: { "@type": "QuantitativeValue", value: args.doctorCount } }
      : {})
  };
}

export function placeJsonLd(args: {
  locality: string;
  city?: string;
  url: string;
  description: string;
  lat?: number | null;
  lng?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${args.locality}, ${args.city ?? "Lucknow"}`,
    url: abs(args.url),
    description: args.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: args.locality,
      addressRegion: SITE.area.region,
      addressCountry: SITE.area.country
    },
    ...(args.lat && args.lng
      ? { geo: { "@type": "GeoCoordinates", latitude: args.lat, longitude: args.lng } }
      : {})
  };
}

// ------------------------------------------------------------
// Common FAQs reused across pages
// ------------------------------------------------------------
export const HOME_FAQS = [
  {
    q: "Is Hanuone free for patients?",
    a: "Yes. Hanuone is and will always be free for families searching for doctors. We do not charge consultation or booking fees, and there are no ads on doctor profiles."
  },
  {
    q: "How are doctors verified on Hanuone?",
    a: "Every listed doctor is cross-checked against public registries (National Medical Commission, state medical councils) and Google Business profiles. Doctors can claim their profile to update photos, fees and timings."
  },
  {
    q: "Can I find doctors by pincode in Lucknow?",
    a: "Yes. Type any 6-digit Lucknow pincode like 226010, 226020 or 226018 in the search bar and you will see doctors in that area, ranked by experience and rating."
  },
  {
    q: "How do I contact a doctor?",
    a: "Every doctor profile has a WhatsApp button. Tap it to open WhatsApp with a pre-filled message that mentions you found them on Hanuone."
  },
  {
    q: "Do you have specialists across Lucknow?",
    a: "We list cardiologists, gynecologists, pediatricians, orthopedics, dermatologists, neurologists, ENT specialists, dentists, physiotherapists and many more across Gomtinagar, Hazratganj, Aliganj, Indira Nagar, Mahanagar and 90+ Lucknow localities."
  }
];

export function specialtyFaqs(specialty: string) {
  const s = specialty.toLowerCase();
  return [
    {
      q: `How do I find the best ${s} in Lucknow?`,
      a: `Browse Hanuone's ${specialty.toLowerCase()} listings sorted by rating, experience and consultation fee. Each profile shows qualifications, clinic timings and a direct WhatsApp link.`
    },
    {
      q: `What is the average consultation fee for a ${s} in Lucknow?`,
      a: `Most ${s}s in Lucknow charge between INR 300 and INR 1500 per consultation. The exact range is shown on every doctor profile, and many offer discounted follow-ups.`
    },
    {
      q: `Can I find a ${s} near my locality?`,
      a: `Yes. Use the locality filter on the listings page or enter your 6-digit pincode in the search bar to see ${s}s practising near you in Lucknow.`
    },
    {
      q: `Are the ${s} profiles verified?`,
      a: `Yes. Every ${s} listed on Hanuone is cross-checked against public registries before being published.`
    }
  ];
}

export function localityFaqs(locality: string) {
  return [
    {
      q: `How many doctors are listed in ${locality}, Lucknow?`,
      a: `Hanuone lists every verified clinic in ${locality} across cardiology, gynaecology, paediatrics, orthopaedics, dermatology, ENT and more. Counts are updated as new clinics are added each week.`
    },
    {
      q: `Can I contact a ${locality} doctor on WhatsApp?`,
      a: `Yes. Every doctor profile in ${locality} has a WhatsApp button that opens a pre-filled message to the clinic.`
    },
    {
      q: `Do you list senior care services in ${locality}?`,
      a: `Phase 2 of Hanuone is the Home Care Network where doctors, nurses and caregivers can register to offer home visits in ${locality} and across Lucknow.`
    }
  ];
}
