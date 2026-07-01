import { and, asc, desc, eq, ilike, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { HAS_DB, db, schema } from "./db";
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

const { doctors, specializations, localities, reviews, waitlist } = schema;

// Helper used by several queries to scope to an active city.
function cityWhere(city?: string | null) {
  return city && city.trim() ? eq(doctors.city, city) : undefined;
}

// ---------------------------------------------------------------------------
// Row -> Doctor mapper (Drizzle returns camelCase; site types are snake_case)
// ---------------------------------------------------------------------------
type DbDoctorRow = typeof doctors.$inferSelect;

function toDoctor(d: DbDoctorRow): Doctor {
  return {
    id: d.id,
    name: d.name,
    name_hindi: d.nameHindi ?? null,
    slug: d.slug,
    specialization: d.specialization,
    specialization_hindi: d.specializationHindi ?? null,
    sub_specializations: d.subSpecializations ?? null,
    qualifications: d.qualifications ?? null,
    experience_years: d.experienceYears ?? null,
    clinic_name: d.clinicName ?? null,
    clinic_address: d.clinicAddress,
    locality: d.locality,
    city: d.city ?? "Lucknow",
    pincode: d.pincode ?? null,
    latitude: d.latitude ? Number(d.latitude) : null,
    longitude: d.longitude ? Number(d.longitude) : null,
    phone: d.phone ?? null,
    whatsapp: d.whatsapp ?? null,
    consultation_fee_min: d.consultationFeeMin ?? null,
    consultation_fee_max: d.consultationFeeMax ?? null,
    timing: d.timing ?? null,
    languages: d.languages ?? null,
    rating: d.rating ? Number(d.rating) : null,
    review_count: d.reviewCount ?? 0,
    profile_image_url: d.profileImageUrl ?? null,
    verified: d.verified ?? false,
    source: d.source ?? null,
    source_url: d.sourceUrl ?? null,
    is_active: d.isActive ?? true,
    created_at: d.createdAt?.toISOString() ?? new Date(0).toISOString(),
    updated_at: d.updatedAt?.toISOString() ?? new Date(0).toISOString()
  };
}

type DbSpecRow = typeof specializations.$inferSelect;
type DbLocalityRow = typeof localities.$inferSelect;

function toSpec(s: DbSpecRow): Specialization {
  return {
    id: s.id,
    name: s.name,
    name_hindi: s.nameHindi ?? null,
    icon: s.icon ?? null,
    slug: s.slug,
    description: s.description ?? null,
    doctor_count: s.doctorCount ?? 0
  };
}

function toLocality(l: DbLocalityRow): Locality {
  return {
    id: l.id,
    name: l.name,
    name_hindi: l.nameHindi ?? null,
    slug: l.slug,
    doctor_count: l.doctorCount ?? 0,
    lat: l.lat ? Number(l.lat) : null,
    lng: l.lng ? Number(l.lng) : null
  };
}

// ---------------------------------------------------------------------------
// Specializations + Localities
// ---------------------------------------------------------------------------
export async function getAllSpecializations(city?: string): Promise<Specialization[]> {
  if (!HAS_DB) return LOCAL_SPECIALIZATIONS;
  try {
    if (city) {
      // Scope counts to the active city using a derived subquery.
      const rows = await db().execute<{ id: string; name: string; slug: string; description: string | null; icon: string | null; doctor_count: number }>(sql`
        SELECT s.id, s.name, s.slug, s.description, s.icon,
               COALESCE(c.cnt, 0)::int AS doctor_count
        FROM specializations s
        LEFT JOIN (
          SELECT specialization, COUNT(*) AS cnt FROM doctors WHERE is_active = true AND city = ${city} GROUP BY specialization
        ) c ON c.specialization = s.name
        ORDER BY doctor_count DESC, s.name ASC
      `);
      const arr = (rows as any).rows ?? rows;
      return (arr as any[]).map((r) => ({
        id: r.id, name: r.name, name_hindi: null, icon: r.icon ?? null,
        slug: r.slug, description: r.description ?? null,
        doctor_count: Number(r.doctor_count ?? 0)
      }));
    }
    const rows = await db()
      .select()
      .from(specializations)
      .orderBy(desc(specializations.doctorCount), asc(specializations.name));
    return rows.length ? rows.map(toSpec) : LOCAL_SPECIALIZATIONS;
  } catch (e) {
    console.error("[getAllSpecializations]", e);
    return LOCAL_SPECIALIZATIONS;
  }
}

export async function getSpecializationBySlug(slug: string): Promise<Specialization | null> {
  if (!HAS_DB) return findSpecializationBySlug(slug);
  try {
    const [row] = await db().select().from(specializations).where(eq(specializations.slug, slug)).limit(1);
    return row ? toSpec(row) : findSpecializationBySlug(slug);
  } catch {
    return findSpecializationBySlug(slug);
  }
}

export async function getAllLocalities(city?: string): Promise<Locality[]> {
  if (!HAS_DB) return LOCAL_LOCALITIES;
  try {
    if (city) {
      const rows = await db().execute<{ id: string; name: string; slug: string; lat: string | null; lng: string | null; doctor_count: number }>(sql`
        SELECT l.id, l.name, l.slug, l.lat::text, l.lng::text,
               COALESCE(c.cnt, 0)::int AS doctor_count
        FROM localities l
        LEFT JOIN (
          SELECT locality, COUNT(*) AS cnt FROM doctors WHERE is_active = true AND city = ${city} GROUP BY locality
        ) c ON c.locality = l.name
        WHERE l.city = ${city} OR c.cnt > 0
        ORDER BY doctor_count DESC, l.name ASC
      `);
      const arr = (rows as any).rows ?? rows;
      return (arr as any[]).map((r) => ({
        id: r.id, name: r.name, name_hindi: null, slug: r.slug,
        doctor_count: Number(r.doctor_count ?? 0),
        lat: r.lat ? Number(r.lat) : null,
        lng: r.lng ? Number(r.lng) : null
      }));
    }
    const rows = await db()
      .select()
      .from(localities)
      .orderBy(desc(localities.doctorCount), asc(localities.name));
    return rows.length ? rows.map(toLocality) : LOCAL_LOCALITIES;
  } catch {
    return LOCAL_LOCALITIES;
  }
}

export async function getLocalityBySlug(slug: string): Promise<Locality | null> {
  if (!HAS_DB) return findLocalityBySlug(slug);
  try {
    const [row] = await db().select().from(localities).where(eq(localities.slug, slug)).limit(1);
    return row ? toLocality(row) : findLocalityBySlug(slug);
  } catch {
    return findLocalityBySlug(slug);
  }
}

// ---------------------------------------------------------------------------
// Local search fallback
// ---------------------------------------------------------------------------
function localSearch(params: DoctorSearchParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? PAGE_SIZE;
  const specialtiesArr = asArray(params.specialty).filter(Boolean) as string[];
  const localitiesArr = asArray(params.locality).filter(Boolean) as string[];
  const q = params.q?.trim().toLowerCase();

  let resolvedPincode: string | null = null;
  if (q && /^\d{6}$/.test(q)) resolvedPincode = q;

  let list = LOCAL_DOCTORS.filter((d) => d.is_active);
  if (specialtiesArr.length) {
    const set = new Set(specialtiesArr.map((s) => s.toLowerCase()));
    list = list.filter((d) => set.has(d.specialization.toLowerCase()));
  }
  if (localitiesArr.length) {
    const set = new Set(localitiesArr.map((s) => s.toLowerCase()));
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
  if (typeof params.feeMin === "number") list = list.filter((d) => (d.consultation_fee_min ?? 0) >= params.feeMin!);
  // Unknown-fee doctors must NOT pass a "max fee" filter — coalescing NULL to 0
  // would misrepresent them as free and surface them under any budget cap.
  if (typeof params.feeMax === "number") list = list.filter((d) => (d.consultation_fee_max ?? d.consultation_fee_min ?? Number.POSITIVE_INFINITY) <= params.feeMax!);
  if (typeof params.minRating === "number" && params.minRating > 0) list = list.filter((d) => (d.rating ?? 0) >= params.minRating!);

  const sortBy = params.sort ?? "relevance";
  list = [...list].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count;
      case "fee_low":
        return (a.consultation_fee_min ?? Number.POSITIVE_INFINITY) - (b.consultation_fee_min ?? Number.POSITIVE_INFINITY);
      case "fee_high":
        return (b.consultation_fee_max ?? 0) - (a.consultation_fee_max ?? 0);
      case "experience":
        return (b.experience_years ?? 0) - (a.experience_years ?? 0);
      default:
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
  return { doctors: list.slice(start, start + pageSize), total, page, pageSize };
}

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------
export async function getDoctorBySlug(slug: string): Promise<Doctor | null> {
  if (!HAS_DB) return findLocalDoctorBySlug(slug);
  try {
    const [row] = await db()
      .select()
      .from(doctors)
      .where(and(eq(doctors.slug, slug), eq(doctors.isActive, true)))
      .limit(1);
    return row ? toDoctor(row) : findLocalDoctorBySlug(slug);
  } catch {
    return findLocalDoctorBySlug(slug);
  }
}

export async function getFeaturedDoctors(limit = 8, city?: string): Promise<Doctor[]> {
  if (!HAS_DB) {
    return [...LOCAL_DOCTORS]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count)
      .slice(0, limit);
  }
  try {
    const rows = await db()
      .select()
      .from(doctors)
      .where(city ? and(eq(doctors.isActive, true), eq(doctors.city, city)) : eq(doctors.isActive, true))
      .orderBy(desc(doctors.rating), desc(doctors.reviewCount))
      .limit(limit);
    return rows.length
      ? rows.map(toDoctor)
      : [...LOCAL_DOCTORS]
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count)
          .slice(0, limit);
  } catch {
    return [...LOCAL_DOCTORS]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.review_count - a.review_count)
      .slice(0, limit);
  }
}

export async function getSimilarDoctors(doctor: Doctor, limit = 4): Promise<Doctor[]> {
  if (!HAS_DB) {
    return LOCAL_DOCTORS.filter((d) => d.specialization === doctor.specialization && d.slug !== doctor.slug).slice(0, limit);
  }
  try {
    const rows = await db()
      .select()
      .from(doctors)
      .where(
        and(
          eq(doctors.isActive, true),
          eq(doctors.specialization, doctor.specialization),
          ne(doctors.id, doctor.id)
        )
      )
      .orderBy(desc(doctors.rating))
      .limit(limit);
    return rows.map(toDoctor);
  } catch {
    return LOCAL_DOCTORS.filter((d) => d.specialization === doctor.specialization && d.slug !== doctor.slug).slice(0, limit);
  }
}

export async function searchDoctors(params: DoctorSearchParams): Promise<{
  doctors: Doctor[];
  total: number;
  page: number;
  pageSize: number;
}> {
  if (!HAS_DB) return localSearch(params);

  // Handle pincode shortcut: route 6-digit q to a known locality
  const localParams: DoctorSearchParams = { ...params };
  if (params.q && /^\d{6}$/.test(params.q.trim()) && PINCODE_TO_LOCALITY[params.q.trim()]) {
    const loc = PINCODE_TO_LOCALITY[params.q.trim()];
    localParams.locality = [...asArray(params.locality), loc];
    localParams.q = undefined;
  }

  const page = Math.max(1, localParams.page ?? 1);
  const pageSize = localParams.pageSize ?? PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  try {
    const conditions: any[] = [eq(doctors.isActive, true)];
    if (localParams.city) conditions.push(eq(doctors.city, localParams.city));
    const specialtiesArr = (asArray(localParams.specialty).filter(Boolean) as string[]).map(titleCase);
    const localitiesArr = (asArray(localParams.locality).filter(Boolean) as string[]).map(titleCase);

    if (specialtiesArr.length === 1) conditions.push(ilike(doctors.specialization, specialtiesArr[0]));
    else if (specialtiesArr.length > 1) conditions.push(inArray(doctors.specialization, specialtiesArr));

    if (localitiesArr.length === 1) conditions.push(ilike(doctors.locality, localitiesArr[0]));
    else if (localitiesArr.length > 1) conditions.push(inArray(doctors.locality, localitiesArr));

    if (localParams.q && localParams.q.trim()) {
      const q = `%${localParams.q.trim()}%`;
      conditions.push(
        or(
          ilike(doctors.name, q),
          ilike(doctors.specialization, q),
          ilike(doctors.clinicAddress, q),
          ilike(doctors.locality, q),
          ilike(doctors.pincode, q)
        )!
      );
    }
    if (typeof localParams.feeMin === "number") conditions.push(sql`${doctors.consultationFeeMin} >= ${localParams.feeMin}`);
    if (typeof localParams.feeMax === "number") conditions.push(sql`${doctors.consultationFeeMax} <= ${localParams.feeMax}`);
    if (typeof localParams.minRating === "number" && localParams.minRating > 0) conditions.push(sql`${doctors.rating} >= ${localParams.minRating}`);

    const where = and(...conditions);

    const orderBy = (() => {
      switch (localParams.sort) {
        case "rating":
          return [desc(doctors.rating), desc(doctors.reviewCount)];
        case "fee_low":
          return [asc(doctors.consultationFeeMin)];
        case "fee_high":
          return [desc(doctors.consultationFeeMax)];
        case "experience":
          return [desc(doctors.experienceYears)];
        default:
          return [desc(doctors.verified), desc(doctors.rating), desc(doctors.reviewCount)];
      }
    })();

    const [rows, totalRow] = await Promise.all([
      db().select().from(doctors).where(where).orderBy(...orderBy).limit(pageSize).offset(offset),
      db().select({ count: sql<number>`count(*)::int` }).from(doctors).where(where)
    ]);

    if (rows.length === 0 && (totalRow[0]?.count ?? 0) === 0 && LOCAL_DATA_AVAILABLE) {
      return localSearch(localParams);
    }

    return {
      doctors: rows.map(toDoctor),
      total: totalRow[0]?.count ?? 0,
      page,
      pageSize
    };
  } catch (e) {
    console.error("[searchDoctors]", e);
    return localSearch(localParams);
  }
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function getReviewsForDoctor(doctorId: string, limit = 10): Promise<Review[]> {
  if (!HAS_DB || doctorId.startsWith("local-")) return [];
  try {
    const rows = await db()
      .select()
      .from(reviews)
      .where(eq(reviews.doctorId, doctorId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      doctor_id: r.doctorId ?? "",
      reviewer_name: r.reviewerName ?? null,
      rating: r.rating,
      review_text: r.reviewText ?? null,
      is_verified: r.isVerified ?? false,
      created_at: r.createdAt?.toISOString() ?? new Date(0).toISOString()
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------
export async function getWaitlistCount(): Promise<number> {
  if (!HAS_DB) return 0;
  try {
    const [row] = await db().select({ count: sql<number>`count(*)::int` }).from(waitlist);
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------
export async function getCombinationsForStaticParams() {
  if (!HAS_DB) {
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
  try {
    const rows = await db()
      .selectDistinct({ specialization: doctors.specialization, locality: doctors.locality })
      .from(doctors)
      .where(eq(doctors.isActive, true));
    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return rows.map((r) => ({
      locality: slugify(r.locality),
      specialty: slugify(r.specialization)
    }));
  } catch {
    return [];
  }
}

export async function getAllDoctorSlugs(): Promise<string[]> {
  if (!HAS_DB) return LOCAL_DOCTORS.map((d) => d.slug);
  try {
    const rows = await db().select({ slug: doctors.slug }).from(doctors).where(eq(doctors.isActive, true));
    return rows.length ? rows.map((r) => r.slug) : LOCAL_DOCTORS.map((d) => d.slug);
  } catch {
    return LOCAL_DOCTORS.map((d) => d.slug);
  }
}

/** Doctor slugs with their real updatedAt — used for honest sitemap lastmod. */
export async function getAllDoctorSlugsWithUpdated(): Promise<{ slug: string; updatedAt: Date | null }[]> {
  if (!HAS_DB) return LOCAL_DOCTORS.map((d) => ({ slug: d.slug, updatedAt: null }));
  try {
    const rows = await db()
      .select({ slug: doctors.slug, updatedAt: doctors.updatedAt })
      .from(doctors)
      .where(eq(doctors.isActive, true));
    return rows.length ? rows : LOCAL_DOCTORS.map((d) => ({ slug: d.slug, updatedAt: null }));
  } catch {
    return LOCAL_DOCTORS.map((d) => ({ slug: d.slug, updatedAt: null }));
  }
}

// ---------------------------------------------------------------------------
// Pincode resolver
// ---------------------------------------------------------------------------
export async function resolvePincodeToLocality(pincode: string): Promise<Locality | null> {
  const trimmed = pincode.trim();
  if (!/^\d{6}$/.test(trimmed)) return null;
  const localName = PINCODE_TO_LOCALITY[trimmed];
  if (localName) {
    return findLocalityBySlug(localName.toLowerCase().replace(/[^a-z0-9]+/g, "-")) ?? null;
  }
  return null;
}
