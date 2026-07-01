import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";
import { TELEMEDICINE_CONSENT_TEXT } from "@/lib/compliance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  doctorSlug: string;
  slotId?: string;
  patientName: string;
  patientPhone: string;
  mode?: "video" | "audio" | "clinic";
  context?: string;
  consent?: boolean;
};

// POST /api/consult -> create a consultation in `pending_payment` (consent-gated).
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Please log in to book" }, { status });
  }

  // Throttle consult creation (each holds a slot + writes consent/consultation rows).
  const rl = await rateLimit(`consult:${clientIp(req)}`, 6, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests. Please wait a moment." }, { status: 429 });

  let body: Partial<Body> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // NMC hard gate: no consult without explicit telemedicine consent.
  if (body.consent !== true) {
    return NextResponse.json({ ok: false, error: "Telemedicine consent is required" }, { status: 422 });
  }
  if (!body.doctorSlug || !body.patientName?.trim() || !body.patientPhone?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing patient or doctor details" }, { status: 400 });
  }

  if (!HAS_DB) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  // Tracks a slot we reserved, so we can release it if a later write fails
  // (neon-http has no interactive transactions — this is the compensating undo).
  let reservedSlotId: string | null = null;
  try {
    const [doctor] = await db()
      .select()
      .from(schema.doctors)
      .where(eq(schema.doctors.slug, body.doctorSlug))
      .limit(1);
    if (!doctor) return NextResponse.json({ ok: false, error: "Doctor not found" }, { status: 404 });

    // Resolve slot + fee.
    let scheduledAt: Date | null = null;
    let feeInr = doctor.consultationFeeMin ?? 400;
    if (body.slotId) {
      // Reserve the slot ATOMICALLY: only one consult can flip isBooked false->true,
      // so two patients racing the same slot can't both succeed.
      const [slot] = await db()
        .update(schema.providerSlots)
        .set({ isBooked: true })
        .where(and(eq(schema.providerSlots.id, body.slotId), eq(schema.providerSlots.isBooked, false)))
        .returning();
      if (!slot) {
        return NextResponse.json({ ok: false, error: "Slot no longer available" }, { status: 409 });
      }
      reservedSlotId = slot.id;
      scheduledAt = new Date(`${slot.date}T${slot.startTime}:00`);
      if (slot.feeInr) feeInr = slot.feeInr;
    }

    const ip = clientIp(req);
    // 1) Record telemedicine consent (immutable).
    const [consent] = await db()
      .insert(schema.consents)
      .values({
        userId: user.id,
        type: "telemedicine",
        granted: true,
        consentText: TELEMEDICINE_CONSENT_TEXT,
        patientIdentity: body.patientName!.trim(),
        rmpIdentity: `${doctor.name} (${doctor.specialization})`,
        mode: body.mode ?? "video",
        ipAddress: ip,
        userAgent: req.headers.get("user-agent")
      })
      .returning({ id: schema.consents.id });

    // 2) Create the consultation.
    const videoRoom = `ho-${nanoid(10)}`;
    const [consult] = await db()
      .insert(schema.consultations)
      .values({
        doctorId: doctor.id,
        patientUserId: user.id,
        slotId: body.slotId ?? null,
        patientName: body.patientName!.trim().slice(0, 120),
        patientPhone: body.patientPhone!.trim().slice(0, 20),
        mode: body.mode ?? "video",
        scheduledAt,
        status: "pending_payment",
        context: body.context?.trim().slice(0, 2000) || null,
        videoRoom,
        feeInr,
        consentId: consent?.id ?? null
      })
      .returning();

    await audit({ actorUserId: user.id, actorRole: user.role, action: "consent", entity: "consents", entityId: consent?.id, ipAddress: ip });
    await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "consultations", entityId: consult.id, meta: { doctor: doctor.slug }, ipAddress: ip });

    return NextResponse.json({ ok: true, consultationId: consult.id, feeInr, videoRoom });
  } catch (e) {
    console.error("[consult]", e);
    // Compensating undo: release the slot we reserved so it isn't lost forever.
    if (reservedSlotId) {
      await db().update(schema.providerSlots).set({ isBooked: false }).where(eq(schema.providerSlots.id, reservedSlotId)).catch((err) => console.error("[consult] slot release failed", err));
    }
    return NextResponse.json({ ok: false, error: "Could not create consultation" }, { status: 500 });
  }
}
