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
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    const [order] = await db().insert(schema.medicineOrders).values({
      patientUserId: user.id,
      patientName: body.patientName!.trim(),
      patientPhone: body.patientPhone!.trim(),
      address: body.address!.trim(),
      pincode: body.pincode ?? null,
      city: body.city ?? null,
      prescriptionUrl: body.prescriptionUrl ?? null,
      items: body.items ? JSON.stringify(body.items) : null,
      notes: body.notes ?? null,
      status: "placed"
    }).returning();

    await sendSms(order.patientPhone, "Hanuone: We've received your medicine order. A pharmacy partner will confirm availability and price shortly.");
    await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "medicine_orders", entityId: order.id, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error("[medicine]", e);
    return NextResponse.json({ ok: false, error: "Could not place order" }, { status: 500 });
  }
}
