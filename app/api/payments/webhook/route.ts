import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { confirmPaidOrder } from "@/lib/order-confirm";
import { audit } from "@/lib/audit";
import { track } from "@/lib/analytics";

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
        // Idempotent flip: only the FIRST writer (client verify OR this webhook)
        // flips →paid. On webhook retries — or when client verify already ran —
        // this updates 0 rows, so we don't re-confirm or double-count.
        const [pmt] = await db().update(schema.payments)
          .set({ status: "paid", razorpayPaymentId: event.payload?.payment?.entity?.id ?? null, updatedAt: new Date() })
          .where(and(eq(schema.payments.razorpayOrderId, orderId), ne(schema.payments.status, "paid")))
          .returning();
        // Confirm the linked order server-to-server, so a paid consult is
        // activated even if the browser closed before client verify.
        if (pmt) {
          await confirmPaidOrder(pmt.orderType, pmt.orderId);
          // Fire the conversion event once via whichever path won the flip.
          await track({ name: "book_success", userId: pmt.userId, props: { service: pmt.orderType, orderId: pmt.orderId, amountInr: pmt.amountInr, via: "webhook" } });
        }
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
