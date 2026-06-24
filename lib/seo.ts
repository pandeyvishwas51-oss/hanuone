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
  email: "care@hanuone.com",
  phoneE164: "+919876543210",
  social: {
    instagram: "https://www.instagram.com/hanu.one",
    linkedin: "https://www.linkedin.com/company/hanuone/",
    twitter: "https://x.com/hanu_one"
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
    sameAs: [SITE.social.instagram, SITE.social.linkedin, SITE.social.twitter],
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

// ============================================================
// AEO (Answer Engine Optimization)
// Schema + concise "citable answer" text that AI engines can quote directly.
// ============================================================

/**
 * MedicalWebPage with E-E-A-T trust signals (lastReviewed / reviewedBy).
 * AI engines weight recency + a named reviewer when deciding what to cite.
 */
export function medicalWebPageJsonLd(args: {
  url: string;
  name: string;
  description: string;
  lastReviewed?: string; // ISO date
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": abs(args.url) + "#webpage",
    url: abs(args.url),
    name: args.name,
    description: args.description,
    inLanguage: ["en-IN", "hi-IN"],
    lastReviewed: args.lastReviewed ?? new Date().toISOString().slice(0, 10),
    reviewedBy: { "@type": "Organization", name: SITE.name, url: SITE.url },
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Organization", name: SITE.name, logo: abs(SITE.logo) }
  };
}

/**
 * Speakable: marks the citable answer block + page heading as the parts an
 * assistant should read aloud / quote.
 */
export function speakableJsonLd(url: string, cssSelectors = [".answer-block", "h1"]) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: abs(url),
    speakable: { "@type": "SpeakableSpecification", cssSelector: cssSelectors }
  };
}

// --- Citable answer generators (40–60 words, fact-dense, brand-attributed) ---

export function doctorAnswer(d: {
  name: string;
  specialization: string;
  locality: string;
  city?: string | null;
  experience_years?: number | null;
  consultation_fee_min?: number | null;
  rating?: number | null;
}): string {
  const city = d.city || "Lucknow";
  const exp = d.experience_years ? `${d.experience_years}+ years of experience` : "verified credentials";
  const fee = d.consultation_fee_min ? `Consultation fees start around ₹${d.consultation_fee_min}.` : "";
  const rated = d.rating ? ` Rated ${d.rating}/5 by patients.` : "";
  return `${d.name} is a ${d.specialization.toLowerCase()} in ${d.locality}, ${city}, listed on Hanuone with ${exp}. ${fee}${rated} You can view qualifications, clinic timings and book a verified appointment on Hanuone.`.replace(
    /\s+/g,
    " "
  ).trim();
}

export function specialtyAnswer(specialty: string, city = "Lucknow", count?: number): string {
  const n = count && count > 0 ? `${count} verified ${specialty.toLowerCase()}s` : `verified ${specialty.toLowerCase()}s`;
  return `Hanuone lists ${n} in ${city}, each cross-checked against the National Medical Commission and state medical councils. You can filter by locality, pincode, consultation fee and rating, then book a teleconsult or clinic visit. Consultations typically range ₹300–₹1500.`;
}

export function localityAnswer(locality: string, city = "Lucknow", count?: number): string {
  const n = count && count > 0 ? `${count} verified doctors and clinics` : `verified doctors and clinics`;
  return `Hanuone lists ${n} in ${locality}, ${city} across general medicine, paediatrics, gynaecology, orthopaedics, dermatology, ENT and more. Each profile shows qualifications, fees and timings, and you can book a teleconsult or clinic visit directly.`;
}
