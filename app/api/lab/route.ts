import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { sendSms } from "@/lib/msg91";
import { audit, clientIp } from "@/lib/audit";

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
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    let testId: string | null = null;
    if (body.testSlug) {
      const [t] = await db().select({ id: schema.labTests.id }).from(schema.labTests).where(eq(schema.labTests.slug, body.testSlug)).limit(1);
      testId = t?.id ?? null;
    }
    const [order] = await db().insert(schema.labOrders).values({
      patientUserId: user.id,
      testId,
      testName: body.testName!.trim(),
      patientName: body.patientName!.trim(),
      patientPhone: body.patientPhone!.trim(),
      address: body.address ?? null,
      pincode: body.pincode ?? null,
      city: body.city ?? null,
      collectionType: body.collectionType ?? "home",
      slotDate: body.slotDate ?? null,
      slotTime: body.slotTime ?? null,
      amountInr: body.priceInr ?? null,
      status: "booked"
    }).returning();

    await sendSms(order.patientPhone, `Hanuone: Your ${order.testName} is booked. Our phlebotomist will confirm the collection slot shortly.`);
    await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "lab_orders", entityId: order.id, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error("[lab]", e);
    return NextResponse.json({ ok: false, error: "Could not book test" }, { status: 500 });
  }
}
