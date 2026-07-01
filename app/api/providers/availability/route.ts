import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema, HAS_DB } from "@/lib/db";
import { getCurrentProfessional } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { date, startTime, endTime } -> add an availability slot for MY profile.
export async function POST(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const prof = await getCurrentProfessional();
  if (!prof || prof.status !== "verified") return NextResponse.json({ ok: false, error: "Verified providers only" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as { date?: string; startTime?: string; endTime?: string };
  if (!b.date || !b.startTime || !b.endTime) {
    return NextResponse.json({ ok: false, error: "date, startTime and endTime are required" }, { status: 400 });
  }
  if (b.endTime <= b.startTime) {
    return NextResponse.json({ ok: false, error: "End time must be after start time" }, { status: 400 });
  }

  const [row] = await db().insert(schema.availability).values({
    professionalId: prof.id, date: b.date, startTime: b.startTime, endTime: b.endTime
  }).returning({ id: schema.availability.id });
  return NextResponse.json({ ok: true, id: row.id });
}

// DELETE { id } -> remove one of MY slots (only if not booked).
export async function DELETE(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const prof = await getCurrentProfessional();
  if (!prof || prof.status !== "verified") return NextResponse.json({ ok: false, error: "Verified providers only" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as { id?: string };
  if (!b.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const [slot] = await db().select().from(schema.availability).where(eq(schema.availability.id, b.id)).limit(1);
  if (!slot || slot.professionalId !== prof.id) return NextResponse.json({ ok: false, error: "Not your slot" }, { status: 404 });
  if (slot.isBooked) return NextResponse.json({ ok: false, error: "This slot is already booked" }, { status: 409 });

  await db().delete(schema.availability).where(and(eq(schema.availability.id, b.id), eq(schema.availability.professionalId, prof.id)));
  return NextResponse.json({ ok: true });
}
