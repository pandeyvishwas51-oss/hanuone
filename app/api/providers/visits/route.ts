import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema, HAS_DB } from "@/lib/db";
import { getCurrentProfessional } from "@/lib/provider";
import { notify } from "@/lib/notify";
import { createPayoutForSource } from "@/lib/payouts";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLOW = ["assigned", "on_the_way", "arrived", "in_progress", "completed", "cancelled"];
const PATIENT_MSG: Record<string, string> = {
  on_the_way: "Your HanuONE care professional is on the way.",
  arrived: "Your HanuONE care professional has arrived.",
  completed: "Your home visit is complete. Your report will appear in your account shortly."
};

// POST { visitId, status } -> advance one of MY assigned home visits.
export async function POST(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const prof = await getCurrentProfessional();
  if (!prof || prof.status !== "verified") return NextResponse.json({ ok: false, error: "Verified providers only" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as { visitId?: string; status?: string };
  if (!b.visitId || !b.status || !FLOW.includes(b.status)) {
    return NextResponse.json({ ok: false, error: "visitId and valid status required" }, { status: 400 });
  }

  const [visit] = await db().select().from(schema.serviceVisits).where(eq(schema.serviceVisits.id, b.visitId)).limit(1);
  if (!visit || visit.assignedProfessionalId !== prof.id) {
    return NextResponse.json({ ok: false, error: "Not your visit" }, { status: 404 });
  }

  await db().update(schema.serviceVisits).set({ status: b.status, updatedAt: new Date() }).where(eq(schema.serviceVisits.id, b.visitId));

  // Revenue automation: a completed visit creates the provider's payout. Idempotent
  // by (source_type, source_id) so re-marking complete can never double-pay.
  if (b.status === "completed") {
    await createPayoutForSource({
      sourceType: "visit",
      sourceId: visit.id,
      professionalId: prof.id,
      grossInr: visit.feeInr,
      kind: "visit"
    }).catch(() => {});
  }

  if (PATIENT_MSG[b.status]) {
    // Include a public live-tracking link (carries the per-visit token) when the
    // professional is en route, so the patient can follow along without a login.
    const trackUrl = (b.status === "on_the_way" && visit.trackingToken)
      ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/track/${visit.id}?token=${visit.trackingToken}`
      : undefined;
    await notify(
      { phone: visit.patientPhone, userId: visit.patientUserId },
      { title: "HanuONE home visit update", body: PATIENT_MSG[b.status], url: trackUrl }
    ).catch(() => {});
  }

  await audit({ actorUserId: prof.userId, actorRole: "provider", action: "update", entity: "service_visits", entityId: b.visitId, meta: { status: b.status }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true });
}
