import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authorizeVisit } from "@/lib/provider";
import { evaluateVitals } from "@/lib/vitals-thresholds";
import { notify, notifyVitalsEscalation } from "@/lib/notify";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { bpSystolic, bpDiastolic, heartRate, spo2, temperatureC, randomBloodSugar, respiratoryRate, providerNotes }
// The assigned nurse records the patient's vitals for a vitals visit.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "provider" && user.role !== "admin" && !user.isAdmin)) {
    return NextResponse.json({ ok: false, error: "Provider only" }, { status: 403 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const { ok: owns, visit } = await authorizeVisit(params.id, user);
  if (!visit) return NextResponse.json({ ok: false, error: "Visit not found" }, { status: 404 });
  if (!owns) return NextResponse.json({ ok: false, error: "This visit is not assigned to you" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, number | string | undefined>;
  const num = (v: unknown) => (typeof v === "number" && !Number.isNaN(v) ? v : v && !Number.isNaN(Number(v)) ? Number(v) : null);

  // Zero is never a valid reading for these physiological signs — treat as "not provided".
  const pos = (v: unknown) => { const n = num(v); return typeof n === "number" && n > 0 ? n : null; };
  const tempC = b.temperatureC != null && Number(b.temperatureC) > 0 ? String(b.temperatureC) : null;
  const vitals = {
    bpSystolic: pos(b.bpSystolic),
    bpDiastolic: pos(b.bpDiastolic),
    heartRate: pos(b.heartRate),
    spo2: pos(b.spo2),
    randomBloodSugar: pos(b.randomBloodSugar),
    respiratoryRate: pos(b.respiratoryRate),
    temperatureC: tempC
  };

  // Reject a clinically meaningless all-empty submission.
  const hasReading = [vitals.bpSystolic, vitals.bpDiastolic, vitals.heartRate, vitals.spo2, vitals.randomBloodSugar, vitals.respiratoryRate].some((v) => v != null) || tempC != null;
  if (!hasReading) {
    return NextResponse.json({ ok: false, error: "Enter at least one vital reading before saving." }, { status: 400 });
  }

  const evalResult = evaluateVitals({
    bpSystolic: vitals.bpSystolic, bpDiastolic: vitals.bpDiastolic, heartRate: vitals.heartRate,
    spo2: vitals.spo2, randomBloodSugar: vitals.randomBloodSugar, respiratoryRate: vitals.respiratoryRate,
    temperatureC: vitals.temperatureC ? Number(vitals.temperatureC) : null
  });

  await db().insert(schema.vitalVisits).values({
    patientUserId: visit.patientUserId,
    patientName: visit.patientName,
    patientPhone: visit.patientPhone,
    bpSystolic: vitals.bpSystolic,
    bpDiastolic: vitals.bpDiastolic,
    heartRate: vitals.heartRate,
    spo2: vitals.spo2,
    randomBloodSugar: vitals.randomBloodSugar,
    respiratoryRate: vitals.respiratoryRate,
    temperatureC: vitals.temperatureC,
    flags: Object.keys(evalResult.flags).length ? JSON.stringify(evalResult.flags) : null,
    escalated: evalResult.escalate,
    providerNotes: typeof b.providerNotes === "string" ? b.providerNotes : null
  });

  // Complete the visit + notify the patient their report is ready.
  await db().update(schema.serviceVisits).set({ status: "completed", updatedAt: new Date() }).where(eq(schema.serviceVisits.id, params.id));
  await notify(
    { phone: visit.patientPhone, userId: visit.patientUserId },
    { title: "Your Vital Checkup report is ready", body: evalResult.escalate ? "Some readings need attention. Please consult a doctor soon. Your full report is in your account." : "Your vitals are recorded. View the report and your trends in your account.", url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/vitals` }
  );

  // Auto-escalation: abnormal vitals alert the on-call team so the triage queue
  // gets actioned immediately, not just left for the patient. Shared helper keeps
  // the staff and self-serve (/api/vitals) routes in lockstep.
  if (evalResult.escalate) {
    await notifyVitalsEscalation({
      patientName: visit.patientName,
      patientPhone: visit.patientPhone,
      flags: evalResult.flags as unknown as Record<string, string>
    });
  }
  await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "vital_visits", entityId: params.id, meta: { escalated: evalResult.escalate }, ipAddress: clientIp(req) });

  return NextResponse.json({ ok: true, escalated: evalResult.escalate, flags: evalResult.flags });
}
