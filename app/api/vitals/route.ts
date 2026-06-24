import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { evaluateVitals, type VitalsInput } from "@/lib/vitals-thresholds";
import { VitalsReportDoc } from "@/lib/pdf/vitals";
import { uploadPrivate } from "@/lib/storage";
import { audit, clientIp } from "@/lib/audit";

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
    bpSystolic: num(body.bpSystolic),
    bpDiastolic: num(body.bpDiastolic),
    heartRate: num(body.heartRate),
    spo2: num(body.spo2),
    temperatureC: num(body.temperatureC),
    randomBloodSugar: num(body.randomBloodSugar),
    respiratoryRate: num(body.respiratoryRate),
    painScale: num(body.painScale)
  };
  const evalResult = evaluateVitals(vitals);

  try {
    const [visit] = await db()
      .insert(schema.vitalVisits)
      .values({
        patientUserId: user.id,
        patientName: body.patientName!.trim(),
        patientPhone: body.patientPhone!.trim(),
        reason: body.reason ?? null,
        allergies: body.allergies ?? null,
        currentMeds: body.currentMeds ?? null,
        history: body.history ?? null,
        bpSystolic: vitals.bpSystolic,
        bpDiastolic: vitals.bpDiastolic,
        heartRate: vitals.heartRate,
        spo2: vitals.spo2,
        temperatureC: vitals.temperatureC != null ? String(vitals.temperatureC) : null,
        randomBloodSugar: vitals.randomBloodSugar,
        weightKg: body.weightKg != null ? String(num(body.weightKg)) : null,
        heightCm: body.heightCm != null ? String(num(body.heightCm)) : null,
        respiratoryRate: vitals.respiratoryRate,
        painScale: vitals.painScale,
        flags: JSON.stringify(evalResult.flags),
        providerNotes: body.providerNotes ?? null,
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

    return NextResponse.json({ ok: true, visitId: visit.id, evaluation: evalResult, reportUrl: url });
  } catch (e) {
    console.error("[vitals]", e);
    return NextResponse.json({ ok: false, error: "Could not save vitals" }, { status: 500 });
  }
}
