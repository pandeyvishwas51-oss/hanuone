import { NextResponse } from "next/server";
import { and, asc, eq, gte } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/slots?doctorSlug=...&date=YYYY-MM-DD  -> available (unbooked) slots.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctorSlug = searchParams.get("doctorSlug")?.trim();
  const date = searchParams.get("date")?.trim();
  if (!doctorSlug) {
    return NextResponse.json({ ok: false, error: "doctorSlug required" }, { status: 400 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: true, slots: [] });

  try {
    const [doctor] = await db()
      .select({ id: schema.doctors.id, fee: schema.doctors.consultationFeeMin })
      .from(schema.doctors)
      .where(eq(schema.doctors.slug, doctorSlug))
      .limit(1);
    if (!doctor) return NextResponse.json({ ok: true, slots: [] });

    const today = new Date().toISOString().slice(0, 10);
    const conds = [eq(schema.providerSlots.doctorId, doctor.id), eq(schema.providerSlots.isBooked, false)];
    if (date) conds.push(eq(schema.providerSlots.date, date));
    else conds.push(gte(schema.providerSlots.date, today));

    const slots = await db()
      .select()
      .from(schema.providerSlots)
      .where(and(...conds))
      .orderBy(asc(schema.providerSlots.date), asc(schema.providerSlots.startTime))
      .limit(100);

    return NextResponse.json({ ok: true, slots, defaultFee: doctor.fee ?? 400 });
  } catch (e) {
    console.error("[slots]", e);
    return NextResponse.json({ ok: true, slots: [] });
  }
}

// POST /api/slots  { doctorSlug, date, times:["10:00",...], durationMin?, mode?, feeInr? }
// Provider/admin publishes bookable slots for a doctor.
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  if (user.role !== "provider" && user.role !== "admin" && !user.isAdmin) {
    return NextResponse.json({ ok: false, error: "Providers only" }, { status: 403 });
  }
  let body: { doctorSlug?: string; date?: string; times?: string[]; durationMin?: number; mode?: string; feeInr?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.doctorSlug || !body.date || !Array.isArray(body.times) || body.times.length === 0) {
    return NextResponse.json({ ok: false, error: "doctorSlug, date and times[] required" }, { status: 400 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    const [doctor] = await db().select({ id: schema.doctors.id, fee: schema.doctors.consultationFeeMin }).from(schema.doctors).where(eq(schema.doctors.slug, body.doctorSlug)).limit(1);
    if (!doctor) return NextResponse.json({ ok: false, error: "Doctor not found" }, { status: 404 });
    const dur = body.durationMin ?? 15;
    const rows = body.times.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const end = new Date(0);
      end.setHours(h, (m || 0) + dur);
      const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
      return { doctorId: doctor.id, date: body.date!, startTime: t, endTime, mode: body.mode ?? "video", feeInr: body.feeInr ?? doctor.fee ?? 400, isBooked: false };
    });
    await db().insert(schema.providerSlots).values(rows);
    await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "provider_slots", entityId: doctor.id, meta: { count: rows.length, date: body.date }, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true, created: rows.length });
  } catch (e) {
    console.error("[slots POST]", e);
    return NextResponse.json({ ok: false, error: "Could not publish slots" }, { status: 500 });
  }
}
