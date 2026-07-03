import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { validatePrescription, prescriptionValidUntil, type RxMed } from "@/lib/compliance";
import { PrescriptionDoc } from "@/lib/pdf/prescription";
import { uploadPrivate } from "@/lib/storage";
import { notifyPrescriptionReady } from "@/lib/notify";
import { completeConsultation } from "@/lib/order-confirm";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  consultationId: string;
  diagnosis?: string;
  medications: RxMed[];
  instructions?: string;
  nmcRegNo?: string;
  qualification?: string;
};

// POST /api/prescriptions -> doctor issues an e-prescription for a consultation.
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  if (user.role !== "provider" && user.role !== "admin" && !user.isAdmin) {
    return NextResponse.json({ ok: false, error: "Only the consulting doctor can issue a prescription" }, { status: 403 });
  }

  let body: Partial<Body> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const meds = Array.isArray(body.medications) ? body.medications.filter((m) => m?.name?.trim()) : [];
  if (!body.consultationId || meds.length === 0) {
    return NextResponse.json({ ok: false, error: "consultationId and at least one medicine required" }, { status: 400 });
  }

  // NMC hard block: Schedule X drugs cannot be prescribed via telemedicine.
  const rxCheck = validatePrescription(meds);
  if (!rxCheck.ok) {
    return NextResponse.json({ ok: false, error: rxCheck.reason, blocked: rxCheck.blocked }, { status: 422 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    const [consult] = await db().select().from(schema.consultations).where(eq(schema.consultations.id, body.consultationId)).limit(1);
    if (!consult) return NextResponse.json({ ok: false, error: "Consultation not found" }, { status: 404 });

    const [doctor] = consult.doctorId
      ? await db().select().from(schema.doctors).where(eq(schema.doctors.id, consult.doctorId)).limit(1)
      : [null];

    // Bind the prescriber to the consulting doctor: if this catalog doctor is
    // linked to a real provider account, only that provider (or an admin) may
    // issue prescriptions on their consults. Closes cross-provider Rx forgery.
    if (doctor?.userId && doctor.userId !== user.id && !user.isAdmin && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Only the consulting doctor can issue this prescription" }, { status: 403 });
    }

    const date = new Date().toISOString().slice(0, 10);
    const validUntil = prescriptionValidUntil();

    // 1) Persist the prescription row first to get an id.
    const [rx] = await db()
      .insert(schema.prescriptions)
      .values({
        consultationId: consult.id,
        doctorId: consult.doctorId,
        patientUserId: consult.patientUserId,
        doctorName: doctor?.name ?? "Doctor",
        nmcRegNo: body.nmcRegNo ?? null,
        qualification: body.qualification ?? ((doctor?.qualifications ?? []).join(", ") || null),
        diagnosis: body.diagnosis ?? null,
        medications: JSON.stringify(meds),
        instructions: body.instructions ?? null,
        validUntil
      })
      .returning();

    // 2) Render PDF and upload.
    const buffer = await renderToBuffer(
      PrescriptionDoc({
        doctorName: doctor?.name ?? "Doctor",
        nmcRegNo: body.nmcRegNo ?? null,
        qualification: rx.qualification,
        practiceAddress: doctor?.clinicAddress ?? null,
        patientName: consult.patientName,
        date,
        diagnosis: rx.diagnosis,
        medications: meds,
        instructions: rx.instructions,
        validUntil,
        rxId: rx.id
      })
    );
    const url = await uploadPrivate("prescriptions", `${consult.id}/${rx.id}.pdf`, buffer, "application/pdf");
    if (url) {
      await db().update(schema.prescriptions).set({ pdfUrl: url }).where(eq(schema.prescriptions.id, rx.id));
    }

    // 2b) Mirror the e-Rx into the doctor's EMR (emr_notes + rx_items) so it
    // also shows in their Clinic → Prescriptions / Patients record list — the
    // same dual-write the AI Scribe does (the patient-facing `prescriptions`
    // row above stays the source of truth). Scoped to the doctor's own
    // professional id so it lands in THEIR list. Best-effort.
    try {
      const [prof] = await db().select({ id: schema.professionals.id }).from(schema.professionals).where(eq(schema.professionals.userId, user.id)).limit(1);
      if (prof?.id) {
        const [note] = await db().insert(schema.emrNotes).values({
          professionalId: prof.id,
          patientUserId: consult.patientUserId,
          patientName: consult.patientName,
          patientPhone: consult.patientPhone,
          diagnosis: rx.diagnosis,
          advice: rx.instructions,
          patientSummary: rx.diagnosis ? null : "Teleconsult e-prescription",
          signed: true,
          signedAt: new Date()
        }).returning({ id: schema.emrNotes.id });
        if (meds.length) {
          await db().insert(schema.rxItems).values(meds.map((m, i) => ({
            noteId: note.id, drugName: m.name, dose: m.dosage ?? null,
            frequency: m.frequency ?? null, duration: m.duration ?? null, position: i
          })));
        }
      }
    } catch (e) {
      console.error("[prescriptions] emr mirror", e);
    }

    // 3) Mark consultation completed + notify. Route through completeConsultation
    // (not a raw update) so the doctor's payout is created, the status flip is
    // idempotently guarded, and the patient's review/notify automation fires —
    // issuing the e-Rx is the natural way a doctor finishes a teleconsult.
    await completeConsultation(consult.id);
    if (url) {
      await notifyPrescriptionReady({ patientPhone: consult.patientPhone, doctorName: doctor?.name ?? "your doctor", url });
    }
    await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "prescriptions", entityId: rx.id, meta: { consultationId: consult.id }, ipAddress: clientIp(req) });

    return NextResponse.json({ ok: true, prescriptionId: rx.id, pdfUrl: url, storedPdf: !!url });
  } catch (e) {
    console.error("[prescriptions]", e);
    return NextResponse.json({ ok: false, error: "Could not generate prescription" }, { status: 500 });
  }
}
