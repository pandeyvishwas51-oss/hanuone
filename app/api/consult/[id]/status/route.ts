import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { completeConsultation } from "@/lib/order-confirm";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["in_progress", "completed"] as const;
type Allowed = (typeof ALLOWED)[number];

// POST /api/consult/[id]/status { status } -> the consult's own doctor (or an
// admin) advances the consultation lifecycle. Completing it is the trigger that
// unblocks downstream automation (review request, follow-up, payout).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const next = body.status as Allowed;
  if (!ALLOWED.includes(next)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  const [consult] = await db().select().from(schema.consultations).where(eq(schema.consultations.id, params.id)).limit(1);
  if (!consult) return NextResponse.json({ ok: false, error: "Consultation not found" }, { status: 404 });

  // Authorize: only the doctor who owns this consult, or an admin, may change it.
  const isAdmin = user.role === "admin" || user.isAdmin;
  let isOwningDoctor = false;
  if (consult.doctorId) {
    const [doc] = await db()
      .select({ id: schema.doctors.id })
      .from(schema.doctors)
      .where(and(eq(schema.doctors.id, consult.doctorId), eq(schema.doctors.userId, user.id)))
      .limit(1);
    isOwningDoctor = !!doc;
  }
  if (!isAdmin && !isOwningDoctor) {
    return NextResponse.json({ ok: false, error: "Not your consultation" }, { status: 403 });
  }

  if (next === "completed") {
    const changed = await completeConsultation(params.id);
    await audit({ actorUserId: user.id, actorRole: user.role, action: "update", entity: "consultations", entityId: params.id, meta: { status: "completed", firstTransition: changed }, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true, status: "completed", changed });
  }

  // in_progress: only meaningful from a paid/booked consult.
  const [updated] = await db()
    .update(schema.consultations)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(and(eq(schema.consultations.id, params.id), eq(schema.consultations.status, "booked")))
    .returning({ id: schema.consultations.id });
  await audit({ actorUserId: user.id, actorRole: user.role, action: "update", entity: "consultations", entityId: params.id, meta: { status: "in_progress" }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true, status: "in_progress", changed: !!updated });
}
