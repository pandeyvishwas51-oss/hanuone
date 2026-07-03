import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { createOrder, RAZORPAY_KEY_ID_PUBLIC, RAZORPAY_LIVE } from "@/lib/razorpay";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderType = "consultation" | "medicine" | "lab" | "nursing" | "vitals";
type Body = { orderType: OrderType; orderId: string };

// Resolve the AUTHORITATIVE price + owner from the server-side record. Never
// trust a client-supplied amount.
async function resolveOrder(orderType: OrderType, orderId: string): Promise<{ amount: number; ownerId: string | null } | null> {
  switch (orderType) {
    case "consultation": {
      const [r] = await db().select({ amount: schema.consultations.feeInr, ownerId: schema.consultations.patientUserId }).from(schema.consultations).where(eq(schema.consultations.id, orderId)).limit(1);
      return r ? { amount: r.amount ?? 0, ownerId: r.ownerId } : null;
    }
    case "lab": {
      const [r] = await db().select({ amount: schema.labOrders.amountInr, ownerId: schema.labOrders.patientUserId }).from(schema.labOrders).where(eq(schema.labOrders.id, orderId)).limit(1);
      return r ? { amount: r.amount ?? 0, ownerId: r.ownerId } : null;
    }
    case "medicine": {
      const [r] = await db().select({ amount: schema.medicineOrders.amountInr, ownerId: schema.medicineOrders.patientUserId }).from(schema.medicineOrders).where(eq(schema.medicineOrders.id, orderId)).limit(1);
      return r ? { amount: r.amount ?? 0, ownerId: r.ownerId } : null;
    }
    case "nursing":
    case "vitals": {
      const [r] = await db().select({ amount: schema.serviceVisits.feeInr, ownerId: schema.serviceVisits.patientUserId }).from(schema.serviceVisits).where(eq(schema.serviceVisits.id, orderId)).limit(1);
      return r ? { amount: r.amount ?? 0, ownerId: r.ownerId } : null;
    }
    default:
      return null;
  }
}

// POST /api/payments/order -> create a Razorpay order + payments row.
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
  if (!body.orderType || !body.orderId) {
    return NextResponse.json({ ok: false, error: "orderType and orderId required" }, { status: 400 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  // Authoritative amount + ownership come from the server record, never the client.
  const resolved = await resolveOrder(body.orderType, body.orderId);
  if (!resolved) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  if (resolved.ownerId && resolved.ownerId !== user.id) {
    return NextResponse.json({ ok: false, error: "This order is not yours" }, { status: 403 });
  }
  const amountInr = resolved.amount;
  if (!amountInr || amountInr <= 0) {
    return NextResponse.json({ ok: false, error: "This order has no payable amount" }, { status: 400 });
  }

  try {
    // Re-use an existing unpaid Razorpay order so a retry/double-click doesn't
    // mint duplicate payment rows for the same consultation.
    const [existingPay] = await db().select().from(schema.payments).where(and(
      eq(schema.payments.orderType, body.orderType),
      eq(schema.payments.orderId, body.orderId),
      eq(schema.payments.userId, user.id),
      eq(schema.payments.status, "created")
    )).orderBy(desc(schema.payments.createdAt)).limit(1);
    if (existingPay) {
      return NextResponse.json({
        ok: true,
        razorpayOrderId: existingPay.razorpayOrderId,
        amount: existingPay.amountInr * 100,
        currency: existingPay.currency || "INR",
        keyId: RAZORPAY_KEY_ID_PUBLIC,
        live: RAZORPAY_LIVE,
        reused: true
      });
    }

    const receipt = `${body.orderType}_${body.orderId}`.slice(0, 40);
    const order = await createOrder(amountInr, receipt);

    await db().insert(schema.payments).values({
      userId: user.id,
      orderType: body.orderType,
      orderId: body.orderId,
      razorpayOrderId: order.id,
      amountInr,
      status: "created"
    });
    await audit({ actorUserId: user.id, actorRole: user.role, action: "payment", entity: "payments", entityId: order.id, meta: { orderType: body.orderType, amountInr }, ipAddress: clientIp(req) });

    return NextResponse.json({
      ok: true,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID_PUBLIC,
      live: RAZORPAY_LIVE
    });
  } catch (e) {
    console.error("[payments/order]", e);
    return NextResponse.json({ ok: false, error: "Could not create payment order" }, { status: 500 });
  }
}
