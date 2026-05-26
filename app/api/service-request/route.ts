import { NextResponse } from "next/server";
import { HAS_DB, db, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "teleconsult",
  "nursing",
  "physio",
  "diagnostics",
  "preventive",
  "elder",
  "medicines",
  "digital-support"
]);

const NOTIFY = process.env.NOTIFY_EMAIL || "ritiktech970@gmail.com";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const service = String(body.service || "").trim();
  const phone = String(body.phone || "").trim();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const city = String(body.city || "").trim();
  const pincode = String(body.pincode || "").trim();
  const notes = String(body.notes || "").trim();

  if (!ALLOWED.has(service)) return NextResponse.json({ ok: false, error: "Invalid service" }, { status: 400 });
  if (!phone || !/^[+\d][\d\s\-()]{7,}$/.test(phone)) {
    return NextResponse.json({ ok: false, error: "Valid phone required" }, { status: 400 });
  }

  // Persist
  let dbOk = false;
  if (HAS_DB) {
    try {
      await db().insert(schema.serviceRequests).values({
        service, name: name || null, phone, email: email || null,
        city: city || null, pincode: pincode || null, notes: notes || null
      });
      dbOk = true;
    } catch {}
  }

  // Email Hanuone
  let emailOk = false;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "Hanuone <onboarding@resend.dev>",
          to: [NOTIFY],
          subject: `Hanuone service request: ${service}`,
          html: `
            <h2 style="font-family:Inter,sans-serif;color:#0F4C5C">Service: ${service}</h2>
            <table style="border-collapse:collapse;width:100%;max-width:560px;font-family:Inter,sans-serif;border:1px solid #e5e7eb">
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Phone</td><td style="padding:8px 12px"><a href="tel:${phone}">${phone}</a></td></tr>
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Name</td><td style="padding:8px 12px">${name || "-"}</td></tr>
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Email</td><td style="padding:8px 12px">${email || "-"}</td></tr>
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">City</td><td style="padding:8px 12px">${city || "-"} ${pincode ? `(${pincode})` : ""}</td></tr>
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Notes</td><td style="padding:8px 12px">${notes || "-"}</td></tr>
            </table>
          `
        })
      });
      emailOk = r.ok;
    } catch {}
  }

  if (!dbOk && !emailOk) return NextResponse.json({ ok: false, error: "Could not save. Please WhatsApp us." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
