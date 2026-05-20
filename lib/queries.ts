import { supabase } from "./supabase";
import {
  LOCAL_DOCTORS,
  LOCAL_LOCALITIES,
  LOCAL_SPECIALIZATIONS,
  PINCODE_TO_LOCALITY,
  findLocalDoctorBySlug,
  findLocalityBySlug,
  findSpecializationBySlug,
  LOCAL_DATA_AVAILABLE
} from "./local-data";
import type {
  Doctor,
  DoctorSearchParams,
  Locality,
  Review,
  Specialization
} from "./types";
import { asArray, titleCase } from "./utils";

const PAGE_SIZE = 20;

const HAS_SUPABASE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ------------------------------------------------------------
// Specializations + Localities
// ------------------------------------------------------------
export async function getAllSpecializations(): Promise<Specialization[]> {
  if (!HAS_SUPABASE) return LOCAL_SPECIALIZATIONS;
  const { data, error } = await supabase
    .from("specializations")
    .select("*")
    .order("doctor_count", { ascending: false })
    .order("name", { ascending: true });
  if (error) {
    console.error("[getAllSpecializations]", error.message);
    return LOCAL_SPECIALIZATIONS;
  }
  return data && data.length > 0 ? data : LOCAL_SPECIALIZATIONS;
}

export async function getSpecializationBySlug(slug: string): Promise<Specialization | null> {
  if (!HAS_SUPABASE) return findSpecializationBySlug(slug);
  const { data, error } = await supabase
    .from("specializations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[getSpecializationBySlug]", error.message);
    return findSpecializationBySlug(slug);
  }
  return data ?? findSpecializationBySlug(slug);
}

export async function getAllLocalities(): Promise<Locality[]> {
  if (!HAS_SUPABASE) return LOCAL_LOCALITIES;
  const { data, error } = await supabase
    .from("localities")
    .select("*")
    .order("doctor_count", { ascending: false })
    .order("name", { ascending: true });
  if (error) {
    console.error("[getAllLocalities]", error.message);
    return LOCAL_LOCALITIES;
  }
  return data && data.length > 0 ? data : LOCAL_LOCALITIES;
}

export async function getLocalityBySlug(slug: string): Promise<Locality | null> {
  if (!HAS_SUPABASE) return findLocalityBySlug(slug);
  const { data, error } = await supabase
    .from("localities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[getLocalityBySlug]", error.message);
    return findLocalityBySlug(slug);
  }
  return data ?? findLocalityBySlug(slug);
}

// ------------------------------------------------------------
// Local search (used as fallback)
// ------------------------------------------------------------
function localSearch(params: DoctorSearchParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const specialties = asArray(params.specialty).filter(Boolean) as string[];
  const localities = asArray(params.locality).filter(Boolean) as string[];
  const q = params.q?.trim().toLowerCase();

  // Resolve a pincode to a locality (if user typed a 6-digit number)
  let resolvedPincode: string | null = null;
  if (q && /^\d{6}$/.test(q)) {
    resolvedPincode = q;
  }

  let list = LOCAL_DOCTORS.filter((d) => d.is_active);

  if (specialties.length) {
    const set = new Set(specialties.map((s) => s.toLowerCase()));
    list = list.filter((d) => set.has(d.specialization.toLowerCase()));
  }
  if (localities.length) {
    const set = new Set(localities.map((s) => s.toLowerCase()));
    list = list.filter((d) => set.has(d.locality.toLowerCase()));
  }
  if (resolvedPincode) {
    list = list.filter((d) => d.pincode === resolvedPincode);
  } else if (q) {
    list = list.filter((d) => {
      const blob = `${d.name} ${d.specialization} ${d.clinic_name ?? ""} ${d.clinic_address} ${d.locality} ${d.pincode ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }
  if (typeof params.feeMin === "number") {
    list = list.filter((d) => (d.consultation_fee_min ?? 0) >= params.feeMin!);
  }
  if (typeof params.feeMax === "number") {
    list = list.filter((d) => (d.consultation_fee_max ?? d.consultation_fee_min ?? 0) <= params.feeMax!);
  }
  if (typeof params.minRating === "number" && params.minRating > 0) {
    list = list.filter((d) => (d.rating ?? 0) >= params.minRating!);
  }

  const sortBy = params.sort ?? "relevance";
  list = [...list].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count;
      case "fee_low":
        return (a.consultation_fee_min ?? Number.POSITIVE_INFINITY) -
          (b.consultation_fee_min ?? Number.POSITIVE_INFINITY);
      case "fee_high":
        return (b.consultation_fee_max ?? 0) - (a.consultation_fee_max ?? 0);
      case "experience":
        return (b.experience_years ?? 0) - (a.experience_years ?? 0);
      default:
        // relevance: verified first, then experience, then rating
        return (
          Number(b.verified) - Number(a.verified) ||
          (b.experience_years ?? 0) - (a.experience_years ?? 0) ||
          (b.rating ?? 0) - (a.rating ?? 0) ||
          b.review_count - a.review_count
        );
    }
  });

  const total = list.length;
  const start = (page - 1) * pageSize;
  return {
    doctors: list.slice(start, start + pageSize),
    total,
    page,
    pageSize
  };
}

// ------------------------------------------------------------
// Doctors
// ------------------------------------------------------------
export async function getDoctorBySlug(slug: string): Promise<Doctor | null> {
  if (!HAS_SUPABASE) return findLocalDoctorBySlug(slug);
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    console.error("[getDoctorBySlug]", error.message);
    return findLocalDoctorBySlug(slug);
  }
  return data ?? findLocalDoctorBySlug(slug);
}

export async function getFeaturedDoctors(limit = 8): Promise<Doctor[]> {
  if (!HAS_SUPABASE) {
    return [...LOCAL_DOCTORS]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count)
      .slice(0, limit);
  }
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("is_active", true)
    .order("rating", { ascending: false, nullsFirst: false })
    .order("review_count", { ascending: false })
    .limit(limit);
  if (error || !data || data.length === 0) {
    return [...LOCAL_DOCTORS]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count)
      .slice(0, limit);
  }
  return data;
}

export async function getSimilarDoctors(doctor: Doctor, limit = 4): Promise<Doctor[]> {
  if (!HAS_SUPABASE) {
    return LOCAL_DOCTORS
      .filter((d) => d.specialization === doctor.specialization && d.slug !== doctor.slug)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, limit);
  }
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("is_active", true)
    .eq("specialization", doctor.specialization)
    .neq("id", doctor.id)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !data) {
    return LOCAL_DOCTORS
      .filter((d) => d.specialization === doctor.specialization && d.slug !== doctor.slug)
      .slice(0, limit);
  }
  return data;
}

export async function searchDoctors(params: DoctorSearchParams): Promise<{
  doctors: Doctor[];
  total: number;
  page: number;
  pageSize: number;
}> {
  if (!HAS_SUPABASE || !LOCAL_DATA_AVAILABLE) {
    if (!HAS_SUPABASE) return localSearch(params);
  }

  // If user typed a pincode in q, translate to locality automatically
  const localParams: DoctorSearchParams = { ...params };
  if (params.q && /^\d{6}$/.test(params.q.trim()) && PINCODE_TO_LOCALITY[params.q.trim()]) {
    const loc = PINCODE_TO_LOCALITY[params.q.trim()];
    localParams.locality = [...asArray(params.locality), loc];
    localParams.q = undefined;
  }

  const page = Math.max(1, localParams.page ?? 1);
  const pageSize = localParams.pageSize ?? PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("doctors")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  const specialties = asArray(localParams.specialty).filter(Boolean) as string[];
  const localities = asArray(localParams.locality).filter(Boolean) as string[];

  if (specialties.length === 1) query = query.ilike("specialization", specialties[0]);
  else if (specialties.length > 1) query = query.in("specialization", specialties.map(titleCase));

  if (localities.length === 1) query = query.ilike("locality", localities[0]);
  else if (localities.length > 1) query = query.in("locality", localities.map(titleCase));

  if (localParams.q && localParams.q.trim()) {
    const q = `%${localParams.q.trim()}%`;
    query = query.or(
      `name.ilike.${q},specialization.ilike.${q},clinic_address.ilike.${q},locality.ilike.${q},pincode.ilike.${q}`
    );
  }

  if (typeof localParams.feeMin === "number") query = query.gte("consultation_fee_min", localParams.feeMin);
  if (typeof localParams.feeMax === "number") query = query.lte("consultation_fee_max", localParams.feeMax);
  if (typeof localParams.minRating === "number" && localParams.minRating > 0) query = query.gte("rating", localParams.minRating);

  switch (localParams.sort) {
    case "rating":
      query = query
        .order("rating", { ascending: false, nullsFirst: false })
        .order("review_count", { ascending: false });
      break;
    case "fee_low":
      query = query.order("consultation_fee_min", { ascending: true, nullsFirst: false });
      break;
    case "fee_high":
      query = query.order("consultation_fee_max", { ascending: false, nullsFirst: false });
      break;
    case "experience":
      query = query.order("experience_years", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query
        .order("verified", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .order("review_count", { ascending: false });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error || !data) {
    console.error("[searchDoctors]", error?.message);
    return localSearch(localParams);
  }
  if (data.length === 0 && (count ?? 0) === 0 && LOCAL_DATA_AVAILABLE) {
    // Supabase has no rows yet — fall back to local data so the site is useful.
    return localSearch(localParams);
  }
  return { doctors: data, total: count ?? 0, page, pageSize };
}

// ------------------------------------------------------------
// Reviews
// ------------------------------------------------------------
export async function getReviewsForDoctor(doctorId: string, limit = 10): Promise<Review[]> {
  if (!HAS_SUPABASE || doctorId.startsWith("local-")) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[getReviewsForDoctor]", error.message);
    return [];
  }
  return data ?? [];
}

// ------------------------------------------------------------
// Waitlist
// ------------------------------------------------------------
export async function getWaitlistCount(): Promise<number> {
  if (!HAS_SUPABASE) return 0;
  const { count, error } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error("[getWaitlistCount]", error.message);
    return 0;
  }
  return count ?? 0;
}

// ------------------------------------------------------------
// Static params for SEO combo pages
// ------------------------------------------------------------
export async function getCombinationsForStaticParams() {
  if (!HAS_SUPABASE) {
    const seen = new Set<string>();
    const out: { locality: string; specialty: string }[] = [];
    for (const d of LOCAL_DOCTORS) {
      const localitySlug = LOCAL_LOCALITIES.find((l) => l.name === d.locality)?.slug;
      const specialtySlug = LOCAL_SPECIALIZATIONS.find((s) => s.name === d.specialization)?.slug;
      if (!localitySlug || !specialtySlug) continue;
      const key = `${localitySlug}/${specialtySlug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ locality: localitySlug, specialty: specialtySlug });
    }
    return out;
  }
  const { data, error } = await supabase
    .from("doctors")
    .select("specialization, locality")
    .eq("is_active", true);
  if (error || !data) return [];
  const seen = new Set<string>();
  const out: { locality: string; specialty: string }[] = [];
  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  for (const row of data) {
    const key = `${slugify(row.locality)}/${slugify(row.specialization)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ locality: slugify(row.locality), specialty: slugify(row.specialization) });
  }
  return out;
}

export async function getAllDoctorSlugs(): Promise<string[]> {
  if (!HAS_SUPABASE) return LOCAL_DOCTORS.map((d) => d.slug);
  const { data, error } = await supabase.from("doctors").select("slug").eq("is_active", true);
  if (error || !data || data.length === 0) return LOCAL_DOCTORS.map((d) => d.slug);
  return data.map((d) => d.slug);
}

// ------------------------------------------------------------
// Pincode helpers
// ------------------------------------------------------------
export async function resolvePincodeToLocality(pincode: string): Promise<Locality | null> {
  const trimmed = pincode.trim();
  if (!/^\d{6}$/.test(trimmed)) return null;
  const localName = PINCODE_TO_LOCALITY[trimmed];
  if (localName) {
    return findLocalityBySlug(localName.toLowerCase().replace(/[^a-z0-9]+/g, "-")) ?? null;
  }
  if (HAS_SUPABASE) {
    const { data } = await supabase
      .from("doctors")
      .select("locality")
      .eq("pincode", trimmed)
      .limit(1);
    if (data && data.length > 0) {
      const name = data[0].locality;
      return findLocalityBySlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    }
  }
  return null;
}
