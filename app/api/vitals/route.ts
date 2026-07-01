import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { evaluateVitals, type VitalsInput } from "@/lib/vitals-thresholds";
import { VitalsReportDoc } from "@/lib/pdf/vitals";
import { uploadPrivate } from "@/lib/storage";
import { audit, clientIp } from "@/lib/audit";
import { notifyVitalsEscalation } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = VitalsInput & {
  patientName: string;
  patientPhone: string;
  reason?: string;
  allergies?: string;
  currentMeds?: string;
  history?: string;
  bpDiastolic?: number | null;
  temperatureC?: number | null;
  randomBloodSugar?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  providerNotes?: string;
};

const num = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));
// Reject physiologically-impossible / abusive values (else they're stored,
// escalation-evaluated, and baked into the patient PDF).
const numRange = (v: unknown, min: number, max: number) => {
  const n = num(v);
  return n != null && Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const cap = (v: string | undefined, n: number) => (v?.slice(0, n) ?? null);

// POST /api/vitals -> record a Vital Checkup, flag abnormals, generate report.
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }

  let body: Partial<Body> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.patientName?.trim() || !body.patientPhone?.trim()) {
    return NextResponse.json({ ok: false, error: "Patient name and phone required" }, { status: 400 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const vitals: VitalsInput = {
    bpSystolic: numRange(body.bpSystolic, 0, 400),
    bpDiastolic: numRange(body.bpDiastolic, 0, 300),
    heartRate: numRange(body.heartRate, 0, 300),
    spo2: numRange(body.spo2, 0, 100),
    temperatureC: numRange(body.temperatureC, 20, 45),
    randomBloodSugar: numRange(body.randomBloodSugar, 0, 1000),
    respiratoryRate: numRange(body.respiratoryRate, 0, 100),
    painScale: numRange(body.painScale, 0, 10)
  };
  const evalResult = evaluateVitals(vitals);

  try {
    const [visit] = await db()
      .insert(schema.vitalVisits)
      .values({
        patientUserId: user.id,
        patientName: body.patientName!.trim().slice(0, 120),
        patientPhone: body.patientPhone!.trim().slice(0, 20),
        reason: cap(body.reason, 2000),
        allergies: cap(body.allergies, 1000),
        currentMeds: cap(body.currentMeds, 1000),
        history: cap(body.history, 2000),
        bpSystolic: vitals.bpSystolic,
        bpDiastolic: vitals.bpDiastolic,
        heartRate: vitals.heartRate,
        spo2: vitals.spo2,
        temperatureC: vitals.temperatureC != null ? String(vitals.temperatureC) : null,
        randomBloodSugar: vitals.randomBloodSugar,
        weightKg: (() => { const w = numRange(body.weightKg, 0, 500); return w != null ? String(w) : null; })(),
        heightCm: (() => { const h = numRange(body.heightCm, 0, 300); return h != null ? String(h) : null; })(),
        respiratoryRate: vitals.respiratoryRate,
        painScale: vitals.painScale,
        flags: JSON.stringify(evalResult.flags),
        providerNotes: cap(body.providerNotes, 2000),
        escalated: evalResult.escalate
      })
      .returning();

    // Build + store the report PDF.
    const rows = [
      { label: "Blood pressure", value: vitals.bpSystolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic ?? "-"} mmHg` : "-", flag: evalResult.flags.bpSystolic },
      { label: "Heart rate", value: vitals.heartRate ? `${vitals.heartRate} bpm` : "-", flag: evalResult.flags.heartRate },
      { label: "SpO₂", value: vitals.spo2 ? `${vitals.spo2}%` : "-", flag: evalResult.flags.spo2 },
      { label: "Temperature", value: vitals.temperatureC ? `${vitals.temperatureC}°C` : "-", flag: evalResult.flags.temperatureC },
      { label: "Random blood sugar", value: vitals.randomBloodSugar ? `${vitals.randomBloodSugar} mg/dL` : "-", flag: evalResult.flags.randomBloodSugar },
      { label: "Respiratory rate", value: vitals.respiratoryRate ? `${vitals.respiratoryRate}/min` : "-", flag: evalResult.flags.respiratoryRate },
      { label: "Pain scale", value: vitals.painScale != null ? `${vitals.painScale}/10` : "-", flag: evalResult.flags.painScale }
    ];
    const buffer = await renderToBuffer(
      VitalsReportDoc({
        patientName: visit.patientName,
        date: new Date().toISOString().slice(0, 10),
        rows,
        summary: evalResult.summary,
        escalate: evalResult.escalate,
        providerNotes: visit.providerNotes
      })
    );
    const url = await uploadPrivate("vitals", `${user.id}/${visit.id}.pdf`, buffer, "application/pdf");
    if (url) await db().update(schema.vitalVisits).set({ reportPdfUrl: url }).where(eq(schema.vitalVisits.id, visit.id));

    await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "vital_visits", entityId: visit.id, meta: { escalated: evalResult.escalate }, ipAddress: clientIp(req) });

    // Clinical safety: a self-recorded CRITICAL reading must page the on-call
    // team, not just show an on-screen message.
    if (evalResult.escalate) {
      await notifyVitalsEscalation({
        patientName: visit.patientName,
        patientPhone: visit.patientPhone,
        flags: evalResult.flags as unknown as Record<string, string>
      });
    }

    return NextResponse.json({ ok: true, visitId: visit.id, evaluation: evalResult, reportUrl: url });
  } catch (e) {
    console.error("[vitals]", e);
    return NextResponse.json({ ok: false, error: "Could not save vitals" }, { status: 500 });
  }
}
