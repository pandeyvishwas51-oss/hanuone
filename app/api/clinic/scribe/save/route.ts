import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema, HAS_DB } from "@/lib/db";
import { getCurrentProfessional, isVerifiedDoctor } from "@/lib/provider";
import { sendSms } from "@/lib/msg91";
import { sendEmail } from "@/lib/notify";
import { audit, clientIp } from "@/lib/audit";
import type { ScribeMedication } from "@/lib/scribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveBody = {
  patientName?: string; patientPhone?: string; patientEmail?: string; patientAge?: number; patientSex?: string;
  note?: {
    chiefComplaint?: string; hpi?: string; examination?: string; assessment?: string; diagnosis?: string;
    investigations?: string; advice?: string; followUp?: string; redFlags?: string; patientSummary?: string;
    language?: string; medications?: ScribeMedication[];
  };
  transcript?: string;
  sendToPatient?: boolean;
};

// Prefix "Dr." only if the name doesn't already carry it — providers often
// store "Dr. Asha Verma" in full_name, so a blind prefix yields "Dr. Dr. …".
function drName(fullName: string): string {
  const n = (fullName || "").trim();
  return /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`;
}

function rxText(meds: ScribeMedication[]): string {
  return meds.map((m, i) => `${i + 1}. ${m.name}${m.dose ? " " + m.dose : ""}${m.frequency ? " · " + m.frequency : ""}${m.duration ? " · " + m.duration : ""}${m.instructions ? " (" + m.instructions + ")" : ""}`).join("\n");
}

// POST -> save a signed SOAP note + prescription, optionally send the e-Rx to the patient.
export async function POST(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const prof = await getCurrentProfessional();
  if (!isVerifiedDoctor(prof)) {
    return NextResponse.json({ ok: false, error: "Verified doctors only" }, { status: 403 });
  }

  const b = (await req.json().catch(() => ({}))) as SaveBody;
  const patientName = (b.patientName || "").trim();
  const note = b.note || {};
  if (!patientName) return NextResponse.json({ ok: false, error: "Patient name is required" }, { status: 400 });

  // Link to the patient account by phone (match on last 10 digits), if one exists.
  let patientUserId: string | null = null;
  const norm = (b.patientPhone || "").replace(/\D/g, "").slice(-10);
  if (norm.length === 10) {
    const [u] = await db().select({ id: schema.users.id }).from(schema.users).where(sql`right(${schema.users.phone}, 10) = ${norm}`).limit(1);
    patientUserId = u?.id ?? null;
  }

  const [row] = await db().insert(schema.emrNotes).values({
    professionalId: prof.id,
    patientUserId,
    patientName,
    patientPhone: b.patientPhone || null,
    patientAge: b.patientAge ?? null,
    patientSex: b.patientSex || null,
    chiefComplaint: note.chiefComplaint || null,
    hpi: note.hpi || null,
    examination: note.examination || null,
    assessment: note.assessment || null,
    diagnosis: note.diagnosis || null,
    investigations: note.investigations || null,
    advice: note.advice || null,
    followUp: note.followUp || null,
    redFlags: note.redFlags || null,
    patientSummary: note.patientSummary || null,
    transcript: b.transcript || null,
    language: note.language || "en",
    signed: true,
    signedAt: new Date()
  }).returning({ id: schema.emrNotes.id });

  const meds = (note.medications || []).filter((m) => m && m.name);
  if (meds.length) {
    await db().insert(schema.rxItems).values(meds.map((m, i) => ({
      noteId: row.id, drugName: m.name, dose: m.dose || null, frequency: m.frequency || null,
      duration: m.duration || null, instructions: m.instructions || null, position: i
    })));
  }

  // Also record a patient-facing prescription so the e-Rx shows up under
  // "Prescriptions" in the patient's account — not only in the doctor's EMR
  // note or a best-effort SMS/email. Resolve the doctor's catalog id (nullable
  // for providers without a linked catalog row); the account reads by
  // patientUserId, so a linked patient will see it immediately.
  try {
    const [doc] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(sql`${schema.doctors.userId} = ${prof.userId}`).limit(1);
    await db().insert(schema.prescriptions).values({
      doctorId: doc?.id ?? null,
      patientUserId,
      doctorName: drName(prof.fullName),
      diagnosis: note.diagnosis || null,
      medications: JSON.stringify(meds.map((m) => ({ name: m.name, dosage: m.dose || "", frequency: m.frequency || "", duration: m.duration || "" }))),
      instructions: [note.advice, note.followUp ? `Follow up: ${note.followUp}` : ""].filter(Boolean).join("\n") || null
    });
  } catch {
    /* patient-facing copy is best-effort; the signed EMR note is the source of truth */
  }

  // Send the e-prescription to the patient.
  let sent = false;
  if (b.sendToPatient) {
    const doctorName = drName(prof.fullName);
    const summary = note.patientSummary || "Your consultation notes are ready.";
    const rx = meds.length ? `\n\nPrescription:\n${rxText(meds)}` : "";
    if (b.patientPhone) {
      sent = await sendSms(b.patientPhone, `HanuONE e-Rx from ${doctorName}: ${summary}${rx}`.slice(0, 600)).then(() => true).catch(() => false);
    }
    if (b.patientEmail) {
      await sendEmail([b.patientEmail], `Your prescription from ${doctorName} — HanuONE`,
        `<div style="font-family:system-ui;max-width:600px"><h2 style="color:#01586C">${doctorName}</h2>
         <p>${summary}</p>${note.diagnosis ? `<p><b>Diagnosis:</b> ${note.diagnosis}</p>` : ""}
         ${meds.length ? `<h3>Prescription</h3><pre style="font-family:system-ui;white-space:pre-wrap">${rxText(meds)}</pre>` : ""}
         ${note.advice ? `<p><b>Advice:</b> ${note.advice}</p>` : ""}${note.followUp ? `<p><b>Follow up:</b> ${note.followUp}</p>` : ""}
         <p style="color:#64748b;font-size:12px">This e-prescription was generated and signed on HanuONE.</p></div>`).then((r) => { sent = sent || r.ok; }).catch(() => {});
    }
  }

  await audit({ actorUserId: prof.userId, actorRole: "provider", action: "create", entity: "emr_notes", entityId: row.id, meta: { meds: meds.length, sent }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true, noteId: row.id, sent });
}
