import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { sendEmail, notifyOpsNewVisit } from "@/lib/notify";
import { autoAssignVisit } from "@/lib/assignment";
import { rewardReferralOnFirstBooking } from "@/lib/referrals";
import { sendSms } from "@/lib/msg91";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Voice-agent booking endpoint. The realtime voice agent collects the details
 * by speaking with the patient and calls this to ACTUALLY create the booking
 * (no login, no payment screen) so the call ends with a real, confirmed
 * request that ops will fulfil. Handles doctor consults, Vital Checkups and
 * lab tests.
 */

type Kind = "consult" | "vitals" | "lab";

type Body = {
  kind?: Kind;
  doctorSlug?: string;
  doctorName?: string;
  testName?: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  whenDay?: string; // free text: "tomorrow", "monday", "2026-06-28"
  whenTime?: string; // free text: "5pm", "evening", "morning"
  address?: string;
  city?: string;
  reason?: string;
  gender?: string; // patient gender — drives same-gender safety matching for home visits
};

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL?.trim() || "ops@hanuone.com";
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Turn natural-language day text into a YYYY-MM-DD date (server knows today). */
function resolveDate(text?: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const t = (text || "").toLowerCase().trim();

  // Explicit ISO date.
  const iso = t.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];

  // Format from LOCAL date parts (toISOString would shift the day on any server
  // whose timezone is behind UTC, causing an off-by-one date).
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const add = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return fmt(d);
  };

  if (/\btoday\b|\baaj\b/.test(t)) return add(0);
  if (/day after tomorrow|parso/.test(t)) return add(2);
  if (/\btomorrow\b|\bkal\b/.test(t)) return add(1);

  // Weekday name -> next occurrence.
  const wd = WEEKDAYS.findIndex((d) => t.includes(d));
  if (wd >= 0) {
    let delta = (wd - today.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    return add(delta);
  }

  // Default: tomorrow.
  return add(1);
}

function validPhone(p: string): boolean {
  return /^[+\d][\d\s\-()]{7,}$/.test(p);
}

export async function POST(req: Request) {
  const rl = await rateLimit(`rtbook:${clientIp(req)}`, 6, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as Body;
  const kind = b.kind;
  // Link the booking to the logged-in patient so it always shows in their
  // "My bookings" (even if the spoken phone differs from their account phone),
  // AND reuse their saved profile so the AI never re-asks a returning, logged-in
  // user for their name/phone — providing details once is enough.
  const reqUser = await getCurrentUser().catch(() => null);
  const patientName = (b.patientName || reqUser?.name || "").trim();
  const rawPhone = (b.patientPhone || reqUser?.phone || "").replace(/\D/g, "");
  const patientPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
  const whenTime = (b.whenTime || "").trim() || "Any time";
  const preferredDate = resolveDate(b.whenDay);
  // Parse as local midnight (bare YYYY-MM-DD parses as UTC and can show the wrong day).
  const whenLabel = `${new Date(preferredDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} · ${whenTime}`;

  if (!patientName) return NextResponse.json({ ok: false, error: "I need the patient's name to book." }, { status: 400 });
  if (!validPhone(patientPhone)) return NextResponse.json({ ok: false, error: "I need a valid 10-digit mobile number to book." }, { status: 400 });
  // Per-phone throttle so the public voice endpoint cannot be used to SMS-bomb a number.
  const phoneRl = await rateLimit(`rtbook-phone:${patientPhone.replace(/\D/g, "").slice(-10)}`, 4, 3600);
  if (!phoneRl.ok) return NextResponse.json({ ok: false, error: "This number has reached the booking limit for now. Please try later." }, { status: 429 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    if (kind === "consult") {
      if (!b.doctorSlug || !b.doctorName) return NextResponse.json({ ok: false, error: "Which doctor should I book?" }, { status: 400 });
      const [doctor] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.slug, b.doctorSlug)).limit(1);

      const [row] = await db().insert(schema.doctorBookings).values({
        patientUserId: reqUser?.id ?? null,
        doctorId: doctor?.id ?? null,
        doctorSlug: b.doctorSlug,
        doctorName: b.doctorName,
        patientName,
        patientPhone,
        patientEmail: b.patientEmail?.trim() || null,
        preferredDate,
        preferredTime: whenTime,
        reason: b.reason?.trim() || null,
        city: b.city?.trim() || null,
        status: "pending"
      }).returning({ id: schema.doctorBookings.id });

      await db().insert(schema.patients).values({ phone: patientPhone, name: patientName, email: b.patientEmail?.trim() || null, city: b.city?.trim() || null })
        .onConflictDoUpdate({ target: schema.patients.phone, set: { name: patientName, city: b.city?.trim() || null } });

      // Refer & earn: a referred patient's first consult request also earns the
      // reward (idempotent; no-ops for anonymous or already-rewarded referrals).
      await rewardReferralOnFirstBooking(reqUser?.id ?? null).catch(() => {});

      const recipients = new Set([NOTIFY_EMAIL]);
      if (b.patientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.patientEmail)) recipients.add(b.patientEmail.trim());
      await sendEmail(Array.from(recipients), `Voice booking: ${patientName} → ${b.doctorName}`,
        `<div style="font-family:system-ui;max-width:560px"><h2 style="color:#0F4C5C">Consultation request (voice)</h2>
         <p>Patient: <b>${patientName}</b> (${patientPhone})</p><p>Doctor: <b>${b.doctorName}</b></p>
         <p>Preferred: <b>${whenLabel}</b></p>${b.reason ? `<p>Reason: ${b.reason}</p>` : ""}</div>`);
      await sendSms(patientPhone, `HanuONE: Your consult request with ${b.doctorName} for ${whenLabel} is received. We'll confirm your slot shortly.`).catch(() => {});

      return NextResponse.json({ ok: true, kind, id: row.id, doctorName: b.doctorName, when: whenLabel });
    }

    if (kind === "vitals") {
      const address = (b.address || "").trim();
      if (!address) return NextResponse.json({ ok: false, error: "I need the patient's home address for the nurse visit." }, { status: 400 });
      const vGender = ["male", "female", "other"].includes(String(b.gender || "").trim().toLowerCase()) ? String(b.gender).trim().toLowerCase() : null;
      const [visit] = await db().insert(schema.serviceVisits).values({
        patientUserId: reqUser?.id ?? null,
        patientName,
        patientPhone,
        serviceType: "vitals",
        serviceName: "Vital Checkup (home nurse)",
        address,
        pincode: null,
        customerGender: vGender,
        scheduledAt: new Date(`${preferredDate}T00:00:00`),
        status: "requested"
      }).returning({ id: schema.serviceVisits.id });
      await rewardReferralOnFirstBooking(reqUser?.id ?? null).catch(() => {});
      await autoAssignVisit(visit.id);
      await notifyOpsNewVisit({ serviceType: "vitals", patientName, patientPhone, address, pincode: null }).catch(() => {});
      await sendSms(patientPhone, `HanuONE: Your Vital Checkup for ${whenLabel} is booked. Our verified nurse will visit to record your vitals.`).catch(() => {});
      return NextResponse.json({ ok: true, kind, id: visit.id, when: whenLabel });
    }

    if (kind === "lab") {
      const testName = (b.testName || "").trim();
      if (!testName) return NextResponse.json({ ok: false, error: "Which lab test should I book?" }, { status: 400 });
      const [order] = await db().insert(schema.labOrders).values({
        patientUserId: reqUser?.id ?? null,
        testName,
        patientName,
        patientPhone,
        address: b.address?.trim() || null,
        city: b.city?.trim() || null,
        collectionType: "home",
        slotDate: preferredDate,
        slotTime: whenTime,
        status: "booked"
      }).returning({ id: schema.labOrders.id });
      await sendSms(patientPhone, `HanuONE: Your ${testName} (home collection) for ${whenLabel} is booked. We'll confirm the slot shortly.`).catch(() => {});
      return NextResponse.json({ ok: true, kind, id: order.id, when: whenLabel });
    }

    return NextResponse.json({ ok: false, error: "Unknown booking type" }, { status: 400 });
  } catch (e) {
    console.error("[realtime/book]", e);
    return NextResponse.json({ ok: false, error: "Could not complete the booking. Please try again." }, { status: 500 });
  }
}
