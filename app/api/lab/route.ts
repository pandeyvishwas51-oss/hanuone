import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { sendSms } from "@/lib/msg91";
import { notify } from "@/lib/notify";
import { audit, clientIp } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: true, orders: [] });
  const orders = await db().select().from(schema.labOrders).where(eq(schema.labOrders.patientUserId, user.id)).orderBy(desc(schema.labOrders.createdAt));
  return NextResponse.json({ ok: true, orders });
}

type Body = {
  testSlug?: string;
  testName: string;
  priceInr?: number;
  patientName: string;
  patientPhone: string;
  address?: string;
  pincode?: string;
  city?: string;
  collectionType?: "home" | "walkin";
  slotDate?: string;
  slotTime?: string;
  patientEmail?: string;
  paymentMode?: "online" | "cod";
};

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  let body: Partial<Body> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.testName?.trim() || !body.patientName?.trim() || !body.patientPhone?.trim()) {
    return NextResponse.json({ ok: false, error: "Test, name and phone are required" }, { status: 400 });
  }
  if ((body.collectionType ?? "home") === "home" && !body.address?.trim()) {
    return NextResponse.json({ ok: false, error: "Address is required for home collection" }, { status: 400 });
  }
  // Throttle order creation per IP and per target phone (each fires SMS + WhatsApp).
  const [ipRl, phoneRl] = await Promise.all([
    rateLimit(`lab:ip:${clientIp(req)}`, 6, 60),
    rateLimit(`lab:phone:${body.patientPhone.trim()}`, 4, 300)
  ]);
  if (!ipRl.ok || !phoneRl.ok) return NextResponse.json({ ok: false, error: "Too many requests. Please wait a moment." }, { status: 429 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    let testId: string | null = null;
    // SECURITY: the payable amount comes ONLY from the catalog — never from the
    // client. An ad-hoc/unknown test has no catalog price, so amountInr stays null
    // (price-on-confirmation); it can't be charged online at a client-chosen price.
    let amountInr: number | null = null;
    if (body.testSlug) {
      const [t] = await db().select({ id: schema.labTests.id, priceInr: schema.labTests.priceInr }).from(schema.labTests).where(eq(schema.labTests.slug, body.testSlug)).limit(1);
      testId = t?.id ?? null;
      if (t?.priceInr != null) amountInr = t.priceInr;
    }
    const [order] = await db().insert(schema.labOrders).values({
      patientUserId: user.id,
      testId,
      testName: body.testName!.trim().slice(0, 200),
      patientName: body.patientName!.trim().slice(0, 120),
      patientPhone: body.patientPhone!.trim().slice(0, 20),
      address: body.address?.slice(0, 500) ?? null,
      pincode: body.pincode?.slice(0, 10) ?? null,
      city: body.city?.slice(0, 80) ?? null,
      collectionType: body.collectionType ?? "home",
      // Empty strings must become null for the date column.
      slotDate: body.slotDate?.trim() ? body.slotDate.trim() : null,
      slotTime: body.slotTime?.trim() ? body.slotTime.trim() : null,
      amountInr,
      status: "booked"
    }).returning();

    // Confirmation across SMS + WhatsApp + email. SMS is best-effort but its
    // failure must be observable (the patient relies on it for a booked order).
    const sms = await sendSms(order.patientPhone, `HanuONE: Your ${order.testName} is booked. We'll confirm the collection slot shortly.`);
    if (!sms.ok) console.warn("[lab] confirmation SMS failed", { orderId: order.id, reason: sms.reason });
    await notify(
      { phone: order.patientPhone, email: body.patientEmail ?? null, userId: user.id },
      {
        title: "Lab test booked — HanuONE",
        body: `Your ${order.testName} (₹${order.amountInr ?? body.priceInr ?? ""}) is confirmed. ${order.collectionType === "home" ? "Our phlebotomist will reach your address" : "Visit the lab"} for collection. Reports appear in your account.`,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/account`
      }
    );
    await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "lab_orders", entityId: order.id, ipAddress: clientIp(req) });
    await track({ name: "start_booking", userId: user.id, city: order.city ?? null, pincode: order.pincode ?? null, props: { service: "lab", orderId: order.id, testName: order.testName, amountInr: order.amountInr } });
    return NextResponse.json({ ok: true, orderId: order.id, amountInr: order.amountInr ?? body.priceInr ?? 0 });
  } catch (e) {
    console.error("[lab]", e);
    return NextResponse.json({ ok: false, error: "Could not book test" }, { status: 500 });
  }
}
