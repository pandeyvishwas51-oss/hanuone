import { NextResponse } from "next/server";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { createOrder, RAZORPAY_KEY_ID_PUBLIC, RAZORPAY_LIVE } from "@/lib/razorpay";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  orderType: "consultation" | "medicine" | "lab" | "nursing" | "vitals";
  orderId: string;
  amountInr: number;
};

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
  if (!body.orderType || !body.orderId || !body.amountInr || body.amountInr <= 0) {
    return NextResponse.json({ ok: false, error: "orderType, orderId, amountInr required" }, { status: 400 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    const receipt = `${body.orderType}_${body.orderId}`.slice(0, 40);
    const order = await createOrder(body.amountInr, receipt);

    await db().insert(schema.payments).values({
      userId: user.id,
      orderType: body.orderType,
      orderId: body.orderId,
      razorpayOrderId: order.id,
      amountInr: body.amountInr,
      status: "created"
    });
    await audit({ actorUserId: user.id, actorRole: user.role, action: "payment", entity: "payments", entityId: order.id, meta: { orderType: body.orderType, amountInr: body.amountInr }, ipAddress: clientIp(req) });

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
