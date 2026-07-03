import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema, HAS_DB } from "@/lib/db";
import { getCurrentProfessional } from "@/lib/provider";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLOW = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

// POST { bookingId, status } -> update one of MY appointments. Completing it
// credits earnings once.
export async function POST(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const prof = await getCurrentProfessional();
  if (!prof || prof.status !== "verified") return NextResponse.json({ ok: false, error: "Verified providers only" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as { bookingId?: string; status?: string };
  if (!b.bookingId || !b.status || !FLOW.includes(b.status)) {
    return NextResponse.json({ ok: false, error: "bookingId and valid status required" }, { status: 400 });
  }

  // Ownership: appointment requests live in `doctor_bookings`, keyed by the
  // catalog doctor_id. Resolve this provider's doctor row and confirm the
  // booking is theirs — stops cross-doctor IDOR. (doctor_bookings has no
  // updatedAt column, so we set status only.)
  if (!prof.userId) return NextResponse.json({ ok: false, error: "No doctor profile linked to your account yet" }, { status: 404 });
  const [doc] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.userId, prof.userId)).limit(1);
  if (!doc) return NextResponse.json({ ok: false, error: "No doctor profile linked to your account yet" }, { status: 404 });

  const [booking] = await db().select().from(schema.doctorBookings).where(eq(schema.doctorBookings.id, b.bookingId)).limit(1);
  if (!booking || booking.doctorId !== doc.id) {
    return NextResponse.json({ ok: false, error: "Not your booking" }, { status: 404 });
  }

  await db().update(schema.doctorBookings).set({ status: b.status }).where(eq(schema.doctorBookings.id, b.bookingId));

  await audit({ actorUserId: prof.userId, actorRole: "provider", action: "update", entity: "doctor_bookings", entityId: b.bookingId, meta: { status: b.status }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true });
}
