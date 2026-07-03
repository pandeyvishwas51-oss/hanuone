import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { SITE } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  doctorSlug: string;
  doctorName: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  preferredDate: string;
  preferredTime: string;
  reason?: string;
  city?: string;
};

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL?.trim() || "ops@hanuone.com";

// Escape user-supplied strings before putting them into an HTML email body so a
// malicious patientName like `<img onerror=...>` cannot run script in webmail.
function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

async function sendBookingEmails(p: Payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "RESEND_API_KEY missing" };
  const subject = `Hanuone booking: ${p.patientName} -> ${p.doctorName}`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;color:#0E2A33;max-width:560px">
      <h2 style="color:#0F4C5C;margin:0 0 12px">New consultation booking</h2>
      <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb">
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Doctor</td><td style="padding:8px 12px">${esc(p.doctorName)}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Patient</td><td style="padding:8px 12px">${esc(p.patientName)}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Phone</td><td style="padding:8px 12px">${esc(p.patientPhone)}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Email</td><td style="padding:8px 12px">${esc(p.patientEmail || "-")}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Preferred</td><td style="padding:8px 12px">${esc(p.preferredDate)} ${esc(p.preferredTime)}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">City</td><td style="padding:8px 12px">${esc(p.city || "-")}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Reason</td><td style="padding:8px 12px">${esc(p.reason || "-")}</td></tr>
      </table>
      <p style="color:#5C6B73;font-size:12px;margin-top:16px">Sent from HanuOne</p>
    </div>
  `;
  const recipients = new Set([NOTIFY_EMAIL]);
  if (p.patientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.patientEmail)) recipients.add(p.patientEmail);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Hanuone <onboarding@resend.dev>",
        to: Array.from(recipients),
        subject,
        html
      })
    });
    if (!r.ok) return { ok: false, reason: `resend ${r.status}` };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

export async function POST(req: Request) {
  // Public endpoint — throttle by IP to stop booking-spam + email bombing.
  const rl = await rateLimit(`book:${clientIp(req)}`, 6, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests. Please try again shortly." }, { status: 429 });

  let body: Partial<Payload> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const required: (keyof Payload)[] = ["doctorSlug", "doctorName", "patientName", "patientPhone", "preferredDate", "preferredTime"];
  for (const k of required) {
    if (!body[k] || !String(body[k]).trim()) {
      return NextResponse.json({ ok: false, error: `Missing field: ${k}` }, { status: 400 });
    }
  }
  if (!/^[+\d][\d\s\-()]{7,}$/.test(body.patientPhone!)) {
    return NextResponse.json({ ok: false, error: "Invalid phone" }, { status: 400 });
  }

  // Cap lengths server-side so a giant pasted value can't bloat the DB/email.
  const cap = (v: string | undefined, n: number) => (v ? v.trim().slice(0, n) : v);
  const payload: Payload = {
    doctorSlug: body.doctorSlug!.slice(0, 120),
    doctorName: body.doctorName!.slice(0, 120),
    patientName: cap(body.patientName, 100)!,
    patientPhone: body.patientPhone!.trim().slice(0, 18),
    patientEmail: cap(body.patientEmail, 200) || undefined,
    preferredDate: body.preferredDate!,
    preferredTime: String(body.preferredTime).slice(0, 40),
    reason: cap(body.reason, 500) || undefined,
    city: cap(body.city, 60) || undefined
  };

  const persistResult = await persistBooking(payload);
  const emailResult = await sendBookingEmails(payload);

  if (!persistResult.ok && !emailResult.ok) {
    return NextResponse.json({ ok: false, error: `Could not save booking. Please WhatsApp ${SITE.phoneE164}.` }, { status: 502 });
  }
  // Conversion event — highest-volume free booking path (doctor-card "Book").
  await track({ name: "start_booking", city: payload.city ?? null, props: { service: "appointment", doctorSlug: payload.doctorSlug } });
  return NextResponse.json({ ok: true, transports: { db: persistResult.ok, email: emailResult.ok } });
}

async function persistBooking(p: Payload) {
  if (!HAS_DB) return { ok: false, reason: "no DATABASE_URL" };
  try {
    // Lookup doctor row to attach the FK if possible.
    const [doctor] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.slug, p.doctorSlug)).limit(1);
    // Link to the logged-in patient (if any) so it shows in their My bookings.
    const bookUser = await getCurrentUser().catch(() => null);
    // Insert the booking AND upsert the patient-history row atomically (neon-http
    // db.batch = one tx), so we never persist a booking without its history row.
    await db().batch([
      db().insert(schema.doctorBookings).values({
        patientUserId: bookUser?.id ?? null,
        doctorId: doctor?.id ?? null,
        doctorSlug: p.doctorSlug,
        doctorName: p.doctorName,
        patientName: p.patientName,
        patientPhone: p.patientPhone,
        patientEmail: p.patientEmail ?? null,
        preferredDate: p.preferredDate,
        preferredTime: p.preferredTime,
        reason: p.reason ?? null,
        city: p.city ?? null
      }),
      db().insert(schema.patients).values({
        phone: p.patientPhone,
        name: p.patientName,
        email: p.patientEmail ?? null,
        city: p.city ?? null
      }).onConflictDoUpdate({
        target: schema.patients.phone,
        set: {
          name: p.patientName,
          email: p.patientEmail ?? null,
          city: p.city ?? null
        }
      })
    ]);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}
