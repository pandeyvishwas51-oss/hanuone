import { NextResponse } from "next/server";
import { sql, or, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A normalized booking card shared by the two things a patient can book:
// simple appointment REQUESTS (doctor_bookings) and paid TELECONSULTS
// (consultations). Both surface in one "My bookings" list.
type Card = {
  id: string;
  kind: "request" | "consult";
  doctorSlug: string;
  doctorName: string;
  patientName: string;
  patientPhone: string;
  preferredDate: string | null;
  preferredTime: string;
  reason: string | null;
  city: string | null;
  status: string;
  href: string;
  createdAt: string | null;
};

// consultations use richer statuses; map them onto the badge vocabulary the
// My-bookings UI already styles (pending / confirmed / completed / cancelled).
function consultStatus(s: string | null): string {
  switch (s) {
    case "pending_payment": return "pending";
    case "booked":
    case "in_progress": return "confirmed";
    case "completed": return "completed";
    case "cancelled": return "cancelled";
    default: return s || "pending";
  }
}

// Returns ONLY the logged-in user's own bookings. Previously this accepted any
// phone with no auth and leaked every patient's bookings by enumeration.
export async function POST() {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 500 });
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }

  // Match bookings linked to this account (patientUserId) OR made with the user's
  // own phone number (last 10 digits, +91/0 tolerant) — so AI/voice bookings and
  // pre-login bookings with the same number both surface reliably.
  const last10 = (user.phone || "").replace(/\D/g, "").slice(-10);
  const bookingWhere = last10.length === 10
    ? or(eq(schema.doctorBookings.patientUserId, user.id), sql`right(regexp_replace(${schema.doctorBookings.patientPhone}, '\\D', '', 'g'), 10) = ${last10}`)
    : eq(schema.doctorBookings.patientUserId, user.id);
  const consultWhere = last10.length === 10
    ? or(eq(schema.consultations.patientUserId, user.id), sql`right(regexp_replace(${schema.consultations.patientPhone}, '\\D', '', 'g'), 10) = ${last10}`)
    : eq(schema.consultations.patientUserId, user.id);

  const [requests, consults] = await Promise.all([
    db().select().from(schema.doctorBookings).where(bookingWhere).orderBy(sql`${schema.doctorBookings.createdAt} desc`).limit(50),
    // Left-join the catalog so we can show the doctor's name/slug and deep-link
    // to the consult room. pending_payment consults are hidden: they were never
    // paid for, so they're not real bookings yet.
    db().select({
      id: schema.consultations.id,
      doctorSlug: schema.doctors.slug,
      doctorName: schema.doctors.name,
      patientName: schema.consultations.patientName,
      patientPhone: schema.consultations.patientPhone,
      scheduledAt: schema.consultations.scheduledAt,
      reason: schema.consultations.context,
      status: schema.consultations.status,
      createdAt: schema.consultations.createdAt
    }).from(schema.consultations)
      .leftJoin(schema.doctors, eq(schema.consultations.doctorId, schema.doctors.id))
      .where(consultWhere)
      .orderBy(sql`${schema.consultations.createdAt} desc`)
      .limit(50)
  ]);

  const requestCards: Card[] = requests.map((b) => ({
    id: b.id, kind: "request",
    doctorSlug: b.doctorSlug, doctorName: b.doctorName,
    patientName: b.patientName, patientPhone: b.patientPhone,
    preferredDate: b.preferredDate, preferredTime: b.preferredTime,
    reason: b.reason, city: b.city, status: b.status || "pending",
    href: `/doctors/${b.doctorSlug}`, createdAt: b.createdAt ? b.createdAt.toISOString() : null
  }));

  const consultCards: Card[] = consults
    .filter((c) => c.status !== "pending_payment")
    .map((c) => {
      const when = c.scheduledAt ? new Date(c.scheduledAt) : null;
      return {
        id: c.id, kind: "consult",
        doctorSlug: c.doctorSlug || "", doctorName: c.doctorName || "Your doctor",
        patientName: c.patientName, patientPhone: c.patientPhone,
        preferredDate: when ? when.toISOString().slice(0, 10) : null,
        preferredTime: when ? when.toTimeString().slice(0, 5) : "Scheduled",
        reason: c.reason, city: null, status: consultStatus(c.status),
        href: `/consult/${c.id}`, createdAt: c.createdAt ? c.createdAt.toISOString() : null
      };
    });

  const bookings = [...requestCards, ...consultCards].sort(
    (a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0)
  );

  return NextResponse.json({ ok: true, bookings });
}
