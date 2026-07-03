import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { doctorId?, doctorSlug?, rating (1-5), reviewText?, consultationId? }
// A logged-in patient rates a doctor. Verified when they have a completed consult
// with that doctor. One review per patient per doctor (re-submitting updates it).
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const rl = await rateLimit(`review:${clientIp(req)}`, 10, 300);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { doctorId?: string; doctorSlug?: string; rating?: number; reviewText?: string; consultationId?: string };
  const rating = Math.round(Number(body.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "Rating must be 1–5" }, { status: 400 });
  }
  const reviewText = (body.reviewText ?? "").trim().slice(0, 1000) || null;

  // Resolve the doctor (by id or slug).
  const [doctor] = body.doctorId
    ? await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.id, body.doctorId)).limit(1)
    : body.doctorSlug
      ? await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.slug, body.doctorSlug)).limit(1)
      : [undefined];
  if (!doctor) return NextResponse.json({ ok: false, error: "Doctor not found" }, { status: 404 });

  // Integrity: only a patient who actually completed a consult with this doctor
  // may review them (prevents drive-by/fake reviews).
  const [completed] = await db().select({ id: schema.consultations.id })
    .from(schema.consultations)
    .where(and(eq(schema.consultations.patientUserId, user.id), eq(schema.consultations.doctorId, doctor.id), eq(schema.consultations.status, "completed")))
    .limit(1);
  if (!completed) {
    return NextResponse.json({ ok: false, error: "You can only review a doctor after a completed consultation." }, { status: 403 });
  }

  await db().insert(schema.reviews).values({
    doctorId: doctor.id,
    patientUserId: user.id,
    consultationId: body.consultationId ?? completed.id,
    reviewerName: user.name ?? "Patient",
    rating,
    reviewText,
    isVerified: true
  }).onConflictDoUpdate({
    target: [schema.reviews.patientUserId, schema.reviews.doctorId],
    set: { rating, reviewText, isVerified: true, createdAt: new Date() }
  });

  await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "reviews", entityId: doctor.id, meta: { rating } });
  return NextResponse.json({ ok: true, verified: true });
}
