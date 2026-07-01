import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const last10 = (user.phone || "").replace(/\D/g, "").slice(-10);
  if (last10.length !== 10) return NextResponse.json({ ok: true, bookings: [] });

  // Match the session user's own number (last 10 digits, +91/0 tolerant).
  const bookings = await db()
    .select()
    .from(schema.doctorBookings)
    .where(sql`right(regexp_replace(${schema.doctorBookings.patientPhone}, '\\D', '', 'g'), 10) = ${last10}`)
    .orderBy(sql`${schema.doctorBookings.createdAt} desc`)
    .limit(50);

  return NextResponse.json({ ok: true, bookings });
}
