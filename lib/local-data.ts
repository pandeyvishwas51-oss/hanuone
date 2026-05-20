import type { Doctor, Locality, Specialization } from "./types";
import practoData from "@/data/practo_doctors.json";

/**
 * Local JSON fallback. Used at build/runtime when Supabase env vars are
 * missing OR when a query returns no rows from Supabase. This lets the site
 * be useful immediately with the 624 Lucknow doctors scraped from Practo.
 */

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SPEC_HINDI: Record<string, string> = {
  Cardiologist: "हृदय रोग विशेषज्ञ",
  Orthopedic: "हड्डी रोग विशेषज्ञ",
  Pediatrician: "बाल रोग विशेषज्ञ",
  Gynecologist: "स्त्री रोग विशेषज्ञ",
  Dermatologist: "त्वचा रोग विशेषज्ञ",
  Neurologist: "न्यूरोलॉजिस्ट",
  Diabetologist: "मधुमेह विशेषज्ञ",
  "ENT Specialist": "नाक, कान, गला विशेषज्ञ",
  Ophthalmologist: "नेत्र रोग विशेषज्ञ",
  "General Physician": "सामान्य चिकित्सक",
  Urologist: "मूत्र रोग विशेषज्ञ",
  Psychiatrist: "मनोचिकित्सक",
  Physiotherapist: "फिजियोथेरेपिस्ट",
  Oncologist: "कैंसर विशेषज्ञ",
  Gastroenterologist: "पेट रोग विशेषज्ञ",
  Dentist: "दंत चिकित्सक",
  Pulmonologist: "फेफड़ा विशेषज्ञ",
  Endocrinologist: "एंडोक्राइनोलॉजिस्ट",
  Nephrologist: "किडनी विशेषज्ञ",
  Rheumatologist: "गठिया विशेषज्ञ",
  Ayurveda: "आयुर्वेद",
  Homoeopath: "होम्योपैथ"
};

const SPEC_ICON: Record<string, string> = {
  Cardiologist: "❤️",
  Orthopedic: "🦴",
  Pediatrician: "👶",
  Gynecologist: "🏥",
  Dermatologist: "🌟",
  Neurologist: "🧠",
  Diabetologist: "💉",
  "ENT Specialist": "👂",
  Ophthalmologist: "👁️",
  "General Physician": "👨‍⚕️",
  Urologist: "🚻",
  Psychiatrist: "🧠",
  Physiotherapist: "💪",
  Oncologist: "🎗️",
  Gastroenterologist: "🩺",
  Dentist: "🦷",
  Pulmonologist: "🫁",
  Endocrinologist: "🧬",
  Nephrologist: "🩸",
  Rheumatologist: "🦴",
  Ayurveda: "🌿",
  Homoeopath: "💊"
};

type RawDoctor = {
  name: string;
  slug: string;
  specialization: string;
  sub_specializations: string[] | null;
  qualifications: string[] | null;
  experience_years: number | null;
  clinic_name: string | null;
  clinic_address: string;
  locality: string;
  city: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  consultation_fee_min: number | null;
  consultation_fee_max: number | null;
  timing: string | null;
  languages: string[] | null;
  rating: number | null;
  review_count: number;
  profile_image_url: string | null;
  verified: boolean;
  is_active: boolean;
  source: string | null;
  source_url: string | null;
};

const RAW = practoData as RawDoctor[];

export const LOCAL_DOCTORS: Doctor[] = RAW.map((d, i) => ({
  id: `local-${i}`,
  name: d.name,
  name_hindi: null,
  slug: d.slug,
  specialization: d.specialization,
  specialization_hindi: SPEC_HINDI[d.specialization] || null,
  sub_specializations: d.sub_specializations,
  qualifications: d.qualifications,
  experience_years: d.experience_years,
  clinic_name: d.clinic_name,
  clinic_address: d.clinic_address,
  locality: d.locality,
  city: d.city || "Lucknow",
  pincode: d.pincode,
  latitude: d.latitude,
  longitude: d.longitude,
  phone: d.phone,
  whatsapp: d.whatsapp,
  consultation_fee_min: d.consultation_fee_min,
  consultation_fee_max: d.consultation_fee_max,
  timing: d.timing,
  languages: d.languages,
  rating: d.rating,
  review_count: d.review_count ?? 0,
  profile_image_url: d.profile_image_url,
  verified: false,
  source: d.source ?? "practo",
  source_url: d.source_url,
  is_active: d.is_active ?? true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString()
}));

const localityCounts = new Map<string, number>();
const specCounts = new Map<string, number>();
const localityCoords = new Map<string, { lat: number; lng: number; n: number }>();
const localityPincodes = new Map<string, Set<string>>();
const pincodeLocality = new Map<string, string>();

for (const d of LOCAL_DOCTORS) {
  localityCounts.set(d.locality, (localityCounts.get(d.locality) ?? 0) + 1);
  specCounts.set(d.specialization, (specCounts.get(d.specialization) ?? 0) + 1);
  if (d.latitude && d.longitude) {
    const cur = localityCoords.get(d.locality);
    if (cur) {
      cur.lat += d.latitude;
      cur.lng += d.longitude;
      cur.n += 1;
    } else {
      localityCoords.set(d.locality, { lat: d.latitude, lng: d.longitude, n: 1 });
    }
  }
  if (d.pincode) {
    if (!localityPincodes.has(d.locality)) localityPincodes.set(d.locality, new Set());
    localityPincodes.get(d.locality)!.add(d.pincode);
    if (!pincodeLocality.has(d.pincode)) pincodeLocality.set(d.pincode, d.locality);
  }
}

export const LOCAL_LOCALITIES: Locality[] = Array.from(localityCounts.entries())
  .map(([name, count], i) => {
    const coords = localityCoords.get(name);
    return {
      id: `local-locality-${i}`,
      name,
      name_hindi: null,
      slug: slugify(name),
      doctor_count: count,
      lat: coords ? coords.lat / coords.n : null,
      lng: coords ? coords.lng / coords.n : null
    } satisfies Locality;
  })
  .sort((a, b) => b.doctor_count - a.doctor_count || a.name.localeCompare(b.name));

export const LOCAL_SPECIALIZATIONS: Specialization[] = Array.from(specCounts.entries())
  .map(([name, count], i) => ({
    id: `local-spec-${i}`,
    name,
    name_hindi: SPEC_HINDI[name] || null,
    icon: SPEC_ICON[name] || "🩺",
    slug: slugify(name === "ENT" ? "ent" : name),
    description: null,
    doctor_count: count
  }))
  .sort((a, b) => b.doctor_count - a.doctor_count || a.name.localeCompare(b.name));

export const LOCAL_PINCODES: { pincode: string; locality: string }[] = Array.from(
  pincodeLocality.entries()
)
  .map(([pincode, locality]) => ({ pincode, locality }))
  .sort((a, b) => a.pincode.localeCompare(b.pincode));

export const PINCODE_TO_LOCALITY: Record<string, string> = Object.fromEntries(
  pincodeLocality.entries()
);

export function findLocalDoctorBySlug(slug: string): Doctor | null {
  return LOCAL_DOCTORS.find((d) => d.slug === slug) ?? null;
}

export function findLocalityBySlug(slug: string): Locality | null {
  return LOCAL_LOCALITIES.find((l) => l.slug === slug) ?? null;
}

export function findSpecializationBySlug(slug: string): Specialization | null {
  return LOCAL_SPECIALIZATIONS.find((s) => s.slug === slug) ?? null;
}

export const LOCAL_DATA_AVAILABLE = LOCAL_DOCTORS.length > 0;
