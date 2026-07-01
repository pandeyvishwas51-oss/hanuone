// Outbound notifications: MSG91 (SMS) + WhatsApp Cloud API + Resend (email) +
// FCM push. Every channel is best-effort and no-op-safe without its key.
import { eq } from "drizzle-orm";
import { sendSms } from "./msg91";
import { HAS_DB, db, schema } from "./db";
import { sendPush } from "./push";

const RESEND_KEY = process.env.RESEND_API_KEY?.trim();
const RESEND_FROM = process.env.RESEND_FROM || "Hanuone <onboarding@resend.dev>";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL?.trim() || "ops@hanuone.com";

// Escape user-supplied text before embedding it in an HTML email body so a
// malicious name/notes value cannot inject markup/script into a webmail client.
function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
const WA_TOKEN = process.env.WHATSAPP_TOKEN || "";
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";

export async function sendEmail(to: string[], subject: string, html: string) {
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
        <p>Patient: <b>${esc(p.patientName)}</b> (${esc(p.patientPhone)})</p>
        <p>Doctor: <b>${esc(p.doctorName)}</b></p>
        <p>When: <b>${esc(p.whenText)}</b></p>
        <p>Join link: <a href="${esc(p.joinUrl)}">${esc(p.joinUrl)}</a></p>
      </div>`
    )
  ]);
}

export async function notifyPrescriptionReady(p: { patientPhone: string; doctorName: string; url: string }) {
  await sendSms(p.patientPhone, `Hanuone: Your e-prescription from ${p.doctorName} is ready. View: ${p.url}`);
}

// --- WhatsApp Cloud API (no-op without WHATSAPP_TOKEN + WHATSAPP_PHONE_ID) ---
export async function sendWhatsApp(toPhone: string, text: string): Promise<boolean> {
  if (!WA_TOKEN || !WA_PHONE_ID || !toPhone) return false;
  const phone = toPhone.replace(/[^\d]/g, "");
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } })
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function pushToUser(userId: string | null | undefined, title: string, body: string, url?: string) {
  if (!userId || !HAS_DB) return;
  try {
    const tokens = await db().select({ token: schema.pushTokens.token }).from(schema.pushTokens).where(eq(schema.pushTokens.userId, userId));
    if (tokens.length) await sendPush(tokens.map((t) => t.token), { title, body, url });
  } catch {
    /* non-fatal */
  }
}

export interface NotifyTarget {
  userId?: string | null;
  phone?: string | null;
  email?: string | null;
}

/** Send one message across every available channel (WhatsApp + email + push). */
export async function notify(target: NotifyTarget, msg: { title: string; body: string; url?: string }) {
  await Promise.allSettled([
    target.phone ? sendWhatsApp(target.phone, `${msg.title}\n\n${msg.body}${msg.url ? `\n${msg.url}` : ""}`) : Promise.resolve(false),
    target.email && RESEND_KEY
      ? sendEmail([target.email], msg.title, `<p>${esc(msg.body)}</p>${msg.url ? `<p><a href="${esc(msg.url)}">${esc(msg.url)}</a></p>` : ""}`)
      : Promise.resolve({ ok: false }),
    pushToUser(target.userId, msg.title, msg.body, msg.url)
  ]);
}

/** Tell ops about a new home-care visit request. */
/**
 * Page the on-call/triage team when a patient's vitals are clinically abnormal.
 * Shared by the staff-recorded visit route and the patient self-serve route so a
 * critical reading (e.g. SpO₂ 88%, BP 190) can never be recorded silently.
 */
export async function notifyVitalsEscalation(v: {
  patientName: string;
  patientPhone: string;
  flags: Record<string, string>;
}) {
  const flagList = Object.entries(v.flags).map(([k, val]) => `${k}: ${val}`).join(", ") || "abnormal readings";
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  await sendEmail(
    [NOTIFY_EMAIL],
    `⚠️ Abnormal vitals — ${v.patientName}`,
    `<div style="font-family:system-ui;max-width:560px"><h2 style="color:#b91c1c">⚠️ Vitals flagged for triage</h2>
     <p><b>${esc(v.patientName)}</b> · <a href="tel:${esc(v.patientPhone)}">${esc(v.patientPhone)}</a></p>
     <p>Flags: ${esc(flagList)}</p>
     <p>Review in the <a href="${base}/console/triage">triage queue</a> and route to an on-call doctor.</p></div>`
  ).catch(() => {});
}

export async function notifyOpsNewVisit(v: { serviceType: string; patientName: string; patientPhone: string; address: string; pincode: string | null }) {
  await sendEmail(
    [NOTIFY_EMAIL],
    `New home visit: ${v.serviceType}`,
    `<div style="font-family:system-ui;max-width:560px">
      <h2 style="color:#0F4C5C">New ${esc(v.serviceType)} request</h2>
      <p>Patient: <b>${esc(v.patientName)}</b> (${esc(v.patientPhone)})</p>
      <p>Address: ${esc(v.address)}${v.pincode ? `, ${esc(v.pincode)}` : ""}</p>
    </div>`
  );
}
