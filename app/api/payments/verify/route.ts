import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { notifyConsultBooked } from "@/lib/notify";
import { audit, clientIp } from "@/lib/audit";

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

    await db()
      .update(schema.payments)
      .set({ razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: "paid", updatedAt: new Date() })
      .where(eq(schema.payments.id, payment.id));

    // Confirm the linked order.
    if (payment.orderType === "consultation" && payment.orderId) {
      await confirmConsultation(payment.orderId);
    }

    await audit({ actorUserId: user.id, actorRole: user.role, action: "payment", entity: "payments", entityId: payment.id, meta: { status: "paid" }, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true, orderType: payment.orderType, orderId: payment.orderId });
  } catch (e) {
    console.error("[payments/verify]", e);
    return NextResponse.json({ ok: false, error: "Could not confirm payment" }, { status: 500 });
  }
}

async function confirmConsultation(consultationId: string) {
  const [consult] = await db()
    .update(schema.consultations)
    .set({ status: "booked", updatedAt: new Date() })
    .where(eq(schema.consultations.id, consultationId))
    .returning();
  if (!consult) return;

  if (consult.slotId) {
    await db().update(schema.providerSlots).set({ isBooked: true }).where(eq(schema.providerSlots.id, consult.slotId));
  }

  const [doctor] = consult.doctorId
    ? await db().select({ name: schema.doctors.name }).from(schema.doctors).where(eq(schema.doctors.id, consult.doctorId)).limit(1)
    : [{ name: "your doctor" }];

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.in";
  const whenText = consult.scheduledAt ? new Date(consult.scheduledAt).toLocaleString("en-IN") : "your scheduled time";
  await notifyConsultBooked({
    patientPhone: consult.patientPhone,
    patientName: consult.patientName,
    doctorName: doctor?.name ?? "your doctor",
    whenText,
    joinUrl: `${base}/consult/${consult.id}`
  });
}
