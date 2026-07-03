import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
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

  const [booking] = await db().select().from(schema.bookings).where(eq(schema.bookings.id, b.bookingId)).limit(1);
  if (booking && booking.professionalId === prof.id) {
    await db().update(schema.bookings).set({ status: b.status, updatedAt: new Date() }).where(eq(schema.bookings.id, b.bookingId));

    // Credit earnings once, when first completed.
    if (b.status === "completed" && booking.status !== "completed" && booking.amount) {
      await db().insert(schema.earnings).values({
        professionalId: prof.id,
        bookingId: booking.id,
        amount: booking.amount,
        type: "credit",
        description: `Completed: ${booking.serviceType} (${booking.patientName})`
      });
    }

    await audit({ actorUserId: prof.userId, actorRole: "provider", action: "update", entity: "bookings", entityId: b.bookingId, meta: { status: b.status }, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true });
  }

  // Patient consult REQUESTS live in `doctor_bookings` — same status flow, different table.
  const [doc] = prof.userId
    ? await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.userId, prof.userId)).limit(1)
    : [null];
  if (!doc) return NextResponse.json({ ok: false, error: "Not your booking" }, { status: 404 });

  const [request] = await db().select().from(schema.doctorBookings)
    .where(and(eq(schema.doctorBookings.id, b.bookingId), eq(schema.doctorBookings.doctorId, doc.id)))
    .limit(1);
  if (!request) return NextResponse.json({ ok: false, error: "Not your booking" }, { status: 404 });

  await db().update(schema.doctorBookings).set({ status: b.status }).where(eq(schema.doctorBookings.id, b.bookingId));
  await audit({ actorUserId: prof.userId, actorRole: "provider", action: "update", entity: "doctor_bookings", entityId: b.bookingId, meta: { status: b.status }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true });
}
