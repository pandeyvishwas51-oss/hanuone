import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { notify, notifyOpsNewVisit } from "@/lib/notify";
import { autoAssignVisit } from "@/lib/assignment";
import { track } from "@/lib/analytics";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { name, phone, email?, address, pincode, plan: 'once'|'weekly'|'monthly', startDate?, paymentMode }
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  const b = (await req.json().catch(() => ({}))) as {
    name?: string; phone?: string; email?: string; address?: string; pincode?: string;
    plan?: string; startDate?: string; paymentMode?: string;
  };
  if (!b.name?.trim() || !b.phone?.trim()) return NextResponse.json({ ok: false, error: "Name and phone required" }, { status: 400 });
  if (!b.address?.trim()) return NextResponse.json({ ok: false, error: "Address is required" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const planLabel = b.plan === "monthly" ? "Daily for 30 days" : b.plan === "weekly" ? "Daily for 7 days" : "One-time";

  // Pull the customer's gender so assignment is gender-safe.
  const [u] = await db().select({ gender: schema.users.gender }).from(schema.users).where(eq(schema.users.id, user.id)).limit(1);

  const [visit] = await db()
    .insert(schema.serviceVisits)
    .values({
      patientUserId: user.id,
      patientName: b.name.trim(),
      patientPhone: b.phone.trim(),
      serviceType: "vitals",
      serviceName: `Vital Checkup (${planLabel})`,
      address: b.address.trim(),
      pincode: b.pincode ?? null,
      scheduledAt: b.startDate ? new Date(b.startDate) : null,
      customerGender: u?.gender ?? null,
      status: "requested"
    })
    .returning({ id: schema.serviceVisits.id });

  // Auto-dispatch: try to assign a verified, gender-safe nurse immediately.
  await autoAssignVisit(visit.id);
  await notifyOpsNewVisit({ serviceType: "vitals", patientName: b.name.trim(), patientPhone: b.phone.trim(), address: b.address.trim(), pincode: b.pincode ?? null });
  await notify(
    { phone: b.phone.trim(), email: b.email ?? null, userId: user.id },
    { title: "Vital Checkup booked — HanuONE", body: `Your Vital Checkup (${planLabel}) is booked. Our verified nurse will visit and record your vitals. You'll see the report and trends in your account.`, url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/account` }
  );
  await track({ name: "book_success", pincode: b.pincode ?? null, props: { service: "vitals", plan: b.plan } });
  await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "service_visits", entityId: visit.id, meta: { service: "vitals", plan: b.plan }, ipAddress: clientIp(req) });

  return NextResponse.json({ ok: true, visitId: visit.id });
}
