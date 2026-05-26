import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";

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

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL?.trim() || "ritiktech970@gmail.com";

async function sendBookingEmails(p: Payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "RESEND_API_KEY missing" };
  const subject = `Hanuone booking: ${p.patientName} -> ${p.doctorName}`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;color:#0E2A33;max-width:560px">
      <h2 style="color:#0F4C5C;margin:0 0 12px">New consultation booking</h2>
      <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb">
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Doctor</td><td style="padding:8px 12px">${p.doctorName}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Patient</td><td style="padding:8px 12px">${p.patientName}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Phone</td><td style="padding:8px 12px"><a href="tel:${p.patientPhone}">${p.patientPhone}</a></td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Email</td><td style="padding:8px 12px">${p.patientEmail || "-"}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Preferred</td><td style="padding:8px 12px">${p.preferredDate} ${p.preferredTime}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">City</td><td style="padding:8px 12px">${p.city || "-"}</td></tr>
        <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Reason</td><td style="padding:8px 12px">${p.reason || "-"}</td></tr>
      </table>
      <p style="color:#5C6B73;font-size:12px;margin-top:16px">Sent from hanuone.in</p>
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

  const payload: Payload = {
    doctorSlug: body.doctorSlug!,
    doctorName: body.doctorName!,
    patientName: body.patientName!.trim(),
    patientPhone: body.patientPhone!.trim(),
    patientEmail: body.patientEmail?.trim() || undefined,
    preferredDate: body.preferredDate!,
    preferredTime: body.preferredTime!,
    reason: body.reason?.trim() || undefined,
    city: body.city?.trim() || undefined
  };

  const persistResult = await persistBooking(payload);
  const emailResult = await sendBookingEmails(payload);

  if (!persistResult.ok && !emailResult.ok) {
    return NextResponse.json({ ok: false, error: "Could not save booking. Please WhatsApp +91-9876543210." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, transports: { db: persistResult.ok, email: emailResult.ok } });
}

async function persistBooking(p: Payload) {
  if (!HAS_DB) return { ok: false, reason: "no DATABASE_URL" };
  try {
    // Lookup doctor row to attach the FK if possible.
    const [doctor] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.slug, p.doctorSlug)).limit(1);
    await db().insert(schema.doctorBookings).values({
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
    });

    // Upsert into patients table for the booking history view.
    await db().insert(schema.patients).values({
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
    });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}
