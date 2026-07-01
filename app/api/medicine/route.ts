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
  const orders = await db().select().from(schema.medicineOrders).where(eq(schema.medicineOrders.patientUserId, user.id)).orderBy(desc(schema.medicineOrders.createdAt));
  return NextResponse.json({ ok: true, orders });
}

type Body = {
  patientName: string;
  patientPhone: string;
  address: string;
  pincode?: string;
  city?: string;
  prescriptionUrl?: string;
  items?: { name: string; qty?: number }[];
  notes?: string;
  patientEmail?: string;
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
  if (!body.patientName?.trim() || !body.patientPhone?.trim() || !body.address?.trim()) {
    return NextResponse.json({ ok: false, error: "Name, phone and delivery address are required" }, { status: 400 });
  }
  if (!body.prescriptionUrl && !(body.items && body.items.length)) {
    return NextResponse.json({ ok: false, error: "Upload a prescription or add at least one medicine" }, { status: 400 });
  }
  // Throttle order creation per IP and per target phone (each fires an SMS).
  const [ipRl, phoneRl] = await Promise.all([
    rateLimit(`medicine:ip:${clientIp(req)}`, 6, 60),
    rateLimit(`medicine:phone:${body.patientPhone.trim()}`, 4, 300)
  ]);
  if (!ipRl.ok || !phoneRl.ok) return NextResponse.json({ ok: false, error: "Too many requests. Please wait a moment." }, { status: 429 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    // Cap free-text + the items array so a client can't push a multi-MB payload into the DB.
    const items = Array.isArray(body.items)
      ? body.items.slice(0, 50).map((it) => ({ name: String(it?.name ?? "").slice(0, 200), qty: typeof it?.qty === "number" ? Math.max(1, Math.min(99, Math.floor(it.qty))) : undefined }))
      : null;
    const [order] = await db().insert(schema.medicineOrders).values({
      patientUserId: user.id,
      patientName: body.patientName!.trim().slice(0, 120),
      patientPhone: body.patientPhone!.trim().slice(0, 20),
      address: body.address!.trim().slice(0, 500),
      pincode: body.pincode?.slice(0, 10) ?? null,
      city: body.city?.slice(0, 80) ?? null,
      prescriptionUrl: body.prescriptionUrl?.slice(0, 1000) ?? null,
      items: items ? JSON.stringify(items) : null,
      notes: body.notes?.slice(0, 2000) ?? null,
      status: "placed"
    }).returning();

    const sms = await sendSms(order.patientPhone, "HanuONE: We've received your medicine order. A pharmacy partner will confirm availability and price shortly.");
    if (!sms.ok) console.warn("[medicine] confirmation SMS failed", { orderId: order.id, reason: sms.reason });
    await notify(
      { phone: order.patientPhone, email: body.patientEmail ?? null, userId: user.id },
      { title: "Medicine order received — HanuONE", body: "We've received your order. A verified partner pharmacy will confirm availability + price, then dispatch to your address. Track it in your account.", url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/account` }
    );
    await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "medicine_orders", entityId: order.id, ipAddress: clientIp(req) });
    await track({ name: "start_booking", userId: user.id, city: order.city ?? null, pincode: order.pincode ?? null, props: { service: "medicine", orderId: order.id } });
    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error("[medicine]", e);
    return NextResponse.json({ ok: false, error: "Could not place order" }, { status: 500 });
  }
}
