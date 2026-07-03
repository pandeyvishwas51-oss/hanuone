import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema, HAS_DB } from "@/lib/db";
import { getCurrentProfessional } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resolve the doctor catalog row this provider owns (slots live on providerSlots,
// keyed by doctorId — the same rows patients book from).
async function myDoctorId(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const [doc] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.userId, userId)).limit(1);
  return doc?.id ?? null;
}

// POST { date, startTime, endTime } -> publish a bookable slot patients can book.
export async function POST(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const prof = await getCurrentProfessional();
  if (!prof || prof.status !== "verified") return NextResponse.json({ ok: false, error: "Verified providers only" }, { status: 403 });
  const doctorId = await myDoctorId(prof.userId);
  if (!doctorId) return NextResponse.json({ ok: false, error: "No doctor profile linked to your account yet" }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as { date?: string; startTime?: string; endTime?: string };
  if (!b.date || !b.startTime || !b.endTime) {
    return NextResponse.json({ ok: false, error: "date, startTime and endTime are required" }, { status: 400 });
  }
  if (b.endTime <= b.startTime) {
    return NextResponse.json({ ok: false, error: "End time must be after start time" }, { status: 400 });
  }

  const [row] = await db().insert(schema.providerSlots).values({
    doctorId, date: b.date, startTime: b.startTime, endTime: b.endTime, mode: "video", isBooked: false
  }).returning({ id: schema.providerSlots.id });
  return NextResponse.json({ ok: true, id: row.id });
}

// DELETE { id } -> remove one of MY slots (only if not booked).
export async function DELETE(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const prof = await getCurrentProfessional();
  if (!prof || prof.status !== "verified") return NextResponse.json({ ok: false, error: "Verified providers only" }, { status: 403 });
  const doctorId = await myDoctorId(prof.userId);
  if (!doctorId) return NextResponse.json({ ok: false, error: "Not your slot" }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const [slot] = await db().select().from(schema.providerSlots).where(eq(schema.providerSlots.id, b.id)).limit(1);
  if (!slot || slot.doctorId !== doctorId) return NextResponse.json({ ok: false, error: "Not your slot" }, { status: 404 });
  if (slot.isBooked) return NextResponse.json({ ok: false, error: "This slot is already booked" }, { status: 409 });

  await db().delete(schema.providerSlots).where(and(eq(schema.providerSlots.id, b.id), eq(schema.providerSlots.doctorId, doctorId)));
  return NextResponse.json({ ok: true });
}
