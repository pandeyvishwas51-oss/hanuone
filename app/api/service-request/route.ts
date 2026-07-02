import { NextResponse } from "next/server";
import { HAS_DB, db, schema } from "@/lib/db";
import { notifyOpsNewVisit } from "@/lib/notify";
import { autoAssignVisit } from "@/lib/assignment";
import { track } from "@/lib/analytics";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Escape user text before putting it in the ops HTML email (prevents email XSS).
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

// Service ids that become trackable home visits in the nurse/physio dashboard.
const HOME_VISIT_SERVICE: Record<string, string> = {
  nursing: "nursing",
  physio: "physio",
  elder: "caregiver"
};

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

const NOTIFY = process.env.NOTIFY_EMAIL || "ops@hanuone.com";

export async function POST(req: Request) {
  // Public endpoint — throttle to stop spam + email bombing.
  const rl = await rateLimit(`svcreq:${clientIp(req)}`, 6, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests. Please try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const service = String(body.service || "").trim().slice(0, 40);
  const phone = String(body.phone || "").trim().slice(0, 18);
  const name = String(body.name || "").trim().slice(0, 100);
  const email = String(body.email || "").trim().slice(0, 200);
  const city = String(body.city || "").trim().slice(0, 60);
  const pincode = String(body.pincode || "").trim().slice(0, 6);
  const notes = String(body.notes || "").trim().slice(0, 500);
  // Customer gender drives the HARD same-gender safety rule in provider matching.
  const gRaw = String(body.gender || "").trim().toLowerCase();
  const gender = ["male", "female", "other"].includes(gRaw) ? gRaw : null;

  if (!ALLOWED.has(service)) return NextResponse.json({ ok: false, error: "Invalid service" }, { status: 400 });
  if (!phone || !/^[+\d][\d\s\-()]{7,}$/.test(phone)) {
    return NextResponse.json({ ok: false, error: "Valid phone required" }, { status: 400 });
  }

  // Persist
  let dbOk = false;
  let visitId: string | null = null;
  if (HAS_DB) {
    try {
      await db().insert(schema.serviceRequests).values({
        service, name: name || null, phone, email: email || null,
        city: city || null, pincode: pincode || null, notes: notes || null
      });
      dbOk = true;
    } catch {}

    // Home-care services become a trackable visit in the provider dashboard.
    const serviceType = HOME_VISIT_SERVICE[service];
    if (serviceType) {
      try {
        // Link the patient (when logged in) so the visit shows in their bookings
        // AND the same-gender safety rule can fall back to their profile gender.
        const reqUser = await getCurrentUser().catch(() => null);
        const [visit] = await db()
          .insert(schema.serviceVisits)
          .values({
            patientUserId: reqUser?.id ?? null,
            patientName: name || "Patient",
            patientPhone: phone,
            serviceType,
            serviceName: service,
            address: notes || [city, pincode].filter(Boolean).join(", ") || "To be confirmed",
            pincode: pincode || null,
            customerGender: gender,
            status: "requested"
          })
          .returning({ id: schema.serviceVisits.id });
        visitId = visit?.id ?? null;
        if (visitId) await autoAssignVisit(visitId);
        await notifyOpsNewVisit({
          serviceType,
          patientName: name || "Patient",
          patientPhone: phone,
          address: notes || [city, pincode].filter(Boolean).join(", "),
          pincode: pincode || null
        });
      } catch {}
    }
  }
  await track({ name: "start_booking", city: city || null, pincode: pincode || null, props: { service } });

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
          subject: `Hanuone service request: ${esc(service)}`,
          html: `
            <h2 style="font-family:Inter,sans-serif;color:#0F4C5C">Service: ${esc(service)}</h2>
            <table style="border-collapse:collapse;width:100%;max-width:560px;font-family:Inter,sans-serif;border:1px solid #e5e7eb">
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Phone</td><td style="padding:8px 12px">${esc(phone)}</td></tr>
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Name</td><td style="padding:8px 12px">${esc(name || "-")}</td></tr>
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Email</td><td style="padding:8px 12px">${esc(email || "-")}</td></tr>
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">City</td><td style="padding:8px 12px">${esc(city || "-")} ${pincode ? `(${esc(pincode)})` : ""}</td></tr>
              <tr><td style="padding:8px 12px;background:#FFF8F2;font-weight:600">Notes</td><td style="padding:8px 12px">${esc(notes || "-")}</td></tr>
            </table>
          `
        })
      });
      emailOk = r.ok;
    } catch {}
  }

  if (!dbOk && !emailOk) return NextResponse.json({ ok: false, error: "Could not save. Please WhatsApp us." }, { status: 502 });
  return NextResponse.json({ ok: true, visitId });
}
