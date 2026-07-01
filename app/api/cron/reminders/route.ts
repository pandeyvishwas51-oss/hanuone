import { NextResponse } from "next/server";
import { and, eq, gte, isNull, lt, lte } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET?.trim();

function authorized(req: Request, user: { isAdmin?: boolean; role?: string } | null): boolean {
  if (user && (user.isAdmin || user.role === "admin")) return true;
  if (!CRON_SECRET) return false;
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${CRON_SECRET}`;
}

// GET/POST -> send one-time reminders for appointments in the next ~24h.
// Trigger from a scheduler (Vercel Cron / GitHub Action) with
//   Authorization: Bearer $CRON_SECRET, or call it as an admin.
async function run(req: Request) {
  const user = await getCurrentUser();
  if (!authorized(req, user)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!HAS_DB) return NextResponse.json({ ok: true, sent: 0 });

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000);
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.com";
  let sent = 0;

  // 1) Teleconsultations scheduled in the next 24h.
  const consults = await db().select().from(schema.consultations).where(and(
    eq(schema.consultations.status, "booked"),
    isNull(schema.consultations.reminderSentAt),
    gte(schema.consultations.scheduledAt, now),
    lte(schema.consultations.scheduledAt, in24h)
  )).limit(200);
  for (const c of consults) {
    const whenText = c.scheduledAt ? new Date(c.scheduledAt).toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "soon";
    await notify(
      { phone: c.patientPhone, userId: c.patientUserId },
      { title: "Reminder: your HanuONE consult", body: `Your video consultation is coming up at ${whenText}. Join from your account when it's time.`, url: `${base}/consult/${c.id}` }
    ).catch(() => {});
    await db().update(schema.consultations).set({ reminderSentAt: new Date() }).where(eq(schema.consultations.id, c.id));
    sent++;
  }

  // 2) Doctor appointments (bookings) due today/tomorrow. bookingDate is an IST
  // calendar date, so derive "today/tomorrow" in IST (en-CA → YYYY-MM-DD) — using
  // toISOString() here is UTC and mislabels the day for evening-IST cron runs.
  const istDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const today = istDate(now);
  const tomorrow = istDate(in24h);
  const appts = await db().select().from(schema.bookings).where(and(
    eq(schema.bookings.status, "confirmed"),
    isNull(schema.bookings.reminderSentAt),
    gte(schema.bookings.bookingDate, today),
    lte(schema.bookings.bookingDate, tomorrow)
  )).limit(200);
  for (const a of appts) {
    await notify(
      { phone: a.patientPhone },
      { title: "Reminder: your HanuONE appointment", body: `You have a ${a.serviceType} appointment on ${a.bookingDate}${a.startTime ? ` at ${a.startTime}` : ""}. See you then.` }
    ).catch(() => {});
    await db().update(schema.bookings).set({ reminderSentAt: new Date() }).where(eq(schema.bookings.id, a.id));
    sent++;
  }

  // 3) Abandoned-consult recovery. Reuses reminderSentAt as the "nudged once"
  // flag (a consult that pays through to "booked" after a nudge simply skips the
  // 24h reminder — an acceptable trade for recovering the booking).
  const halfHourAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);

  // 3a) Nudge unpaid consults created 30min–24h ago (give the live checkout time
  // to finish before we chase it).
  const abandoned = await db().select().from(schema.consultations).where(and(
    eq(schema.consultations.status, "pending_payment"),
    isNull(schema.consultations.reminderSentAt),
    gte(schema.consultations.createdAt, dayAgo),
    lte(schema.consultations.createdAt, halfHourAgo)
  )).limit(200);
  let nudged = 0;
  for (const c of abandoned) {
    await notify(
      { phone: c.patientPhone, userId: c.patientUserId },
      { title: "Finish booking your HanuONE consult", body: "Your consultation is held but not yet confirmed. Complete payment to lock your slot.", url: `${base}/consult/${c.id}` }
    ).catch(() => {});
    await db().update(schema.consultations).set({ reminderSentAt: new Date() }).where(eq(schema.consultations.id, c.id));
    nudged++; sent++;
  }

  // 3b) Expire consults still unpaid after 24h: cancel + free any held slot so the
  // funnel and the doctor's calendar don't leak.
  const stale = await db().select().from(schema.consultations).where(and(
    eq(schema.consultations.status, "pending_payment"),
    lt(schema.consultations.createdAt, dayAgo)
  )).limit(200);
  let expired = 0;
  for (const c of stale) {
    await db().update(schema.consultations).set({ status: "cancelled", updatedAt: new Date() }).where(eq(schema.consultations.id, c.id));
    if (c.slotId) await db().update(schema.providerSlots).set({ isBooked: false }).where(eq(schema.providerSlots.id, c.slotId));
    expired++;
  }

  return NextResponse.json({ ok: true, sent, consults: consults.length, appointments: appts.length, nudged, expired });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
