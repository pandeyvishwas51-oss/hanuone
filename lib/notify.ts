// Outbound notifications: MSG91 (SMS/WhatsApp) + Resend (email). Best-effort.
import { sendSms } from "./msg91";

const RESEND_KEY = process.env.RESEND_API_KEY?.trim();
const RESEND_FROM = process.env.RESEND_FROM || "Hanuone <onboarding@resend.dev>";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL?.trim() || "ops@hanuone.in";

async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_KEY) return { ok: false, reason: "no resend key" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html })
    });
    return { ok: r.ok, reason: r.ok ? undefined : `resend ${r.status}` };
  } catch (e) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

export async function notifyConsultBooked(p: {
  patientPhone: string;
  patientName: string;
  patientEmail?: string | null;
  doctorName: string;
  whenText: string;
  joinUrl: string;
}) {
  await Promise.allSettled([
    sendSms(
      p.patientPhone,
      `Hanuone: Your consult with ${p.doctorName} is confirmed for ${p.whenText}. Join: ${p.joinUrl}`
    ),
    sendEmail(
      [NOTIFY_EMAIL, ...(p.patientEmail ? [p.patientEmail] : [])],
      `Consult confirmed: ${p.patientName} → ${p.doctorName}`,
      `<div style="font-family:system-ui;max-width:560px">
        <h2 style="color:#0F4C5C">Consultation confirmed</h2>
        <p>Patient: <b>${p.patientName}</b> (${p.patientPhone})</p>
        <p>Doctor: <b>${p.doctorName}</b></p>
        <p>When: <b>${p.whenText}</b></p>
        <p>Join link: <a href="${p.joinUrl}">${p.joinUrl}</a></p>
      </div>`
    )
  ]);
}

export async function notifyPrescriptionReady(p: { patientPhone: string; doctorName: string; url: string }) {
  await sendSms(p.patientPhone, `Hanuone: Your e-prescription from ${p.doctorName} is ready. View: ${p.url}`);
}
