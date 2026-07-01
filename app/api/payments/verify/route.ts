import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { confirmConsultation } from "@/lib/order-confirm";
import { audit, clientIp } from "@/lib/audit";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

// POST /api/payments/verify -> verify signature, mark paid, confirm the order.
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ ok: false, error: "Missing payment fields" }, { status: 400 });
  }

  const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Payment verification failed" }, { status: 400 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    const [payment] = await db()
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.razorpayOrderId, razorpay_order_id))
      .limit(1);
    if (!payment) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    if (payment.userId && payment.userId !== user.id) {
      return NextResponse.json({ ok: false, error: "This payment is not yours" }, { status: 403 });
    }

    // Idempotent flip: only the first writer (verify OR webhook) flips →paid and
    // runs confirm/audit. A concurrent/duplicate call updates 0 rows and skips.
    const flipped = await db()
      .update(schema.payments)
      .set({ razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: "paid", updatedAt: new Date() })
      .where(and(eq(schema.payments.id, payment.id), ne(schema.payments.status, "paid")))
      .returning({ id: schema.payments.id });

    if (flipped.length > 0) {
      // Confirm the linked order.
      if (payment.orderType === "consultation" && payment.orderId) {
        await confirmConsultation(payment.orderId);
      }
      await audit({ actorUserId: user.id, actorRole: user.role, action: "payment", entity: "payments", entityId: payment.id, meta: { status: "paid" }, ipAddress: clientIp(req) });
      // Conversion event — fires exactly once per paid order (inside the idempotent flip).
      await track({ name: "book_success", userId: user.id, props: { service: payment.orderType, orderId: payment.orderId, amountInr: payment.amountInr } });
    }
    return NextResponse.json({ ok: true, orderType: payment.orderType, orderId: payment.orderId });
  } catch (e) {
    console.error("[payments/verify]", e);
    return NextResponse.json({ ok: false, error: "Could not confirm payment" }, { status: 500 });
  }
}

