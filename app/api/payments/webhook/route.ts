import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Razorpay webhook: payment.captured / payment.failed / refund.processed.
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") || "";
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: true });

  let event: { event?: string; payload?: { payment?: { entity?: { order_id?: string; id?: string } }; refund?: { entity?: { payment_id?: string; id?: string } } } } = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const type = event.event;
    if (type === "payment.captured") {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        await db().update(schema.payments).set({ status: "paid", updatedAt: new Date() }).where(eq(schema.payments.razorpayOrderId, orderId));
      }
    } else if (type === "refund.processed") {
      const refundId = event.payload?.refund?.entity?.id;
      const paymentId = event.payload?.refund?.entity?.payment_id;
      if (paymentId) {
        await db().update(schema.payments).set({ status: "refunded", refundId: refundId ?? null, updatedAt: new Date() }).where(eq(schema.payments.razorpayPaymentId, paymentId));
      }
    }
    await audit({ action: "payment", entity: "razorpay_webhook", meta: { event: type } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[razorpay webhook]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
