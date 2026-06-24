// Razorpay server helpers: order creation + payment signature verification.
// Test mode now; flip to live by swapping RAZORPAY_KEY_ID/SECRET env values.
import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

export const RAZORPAY_LIVE = !!(KEY_ID && KEY_SECRET);
export const RAZORPAY_KEY_ID_PUBLIC = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || KEY_ID || "";

export type RzpOrder = { id: string; amount: number; currency: string };

/**
 * Create a Razorpay order. `amountInr` is in rupees; Razorpay wants paise.
 * In dev (no keys) returns a fake order so the booking flow is testable.
 */
export async function createOrder(amountInr: number, receipt: string): Promise<RzpOrder> {
  const amount = Math.round(amountInr * 100);
  if (!RAZORPAY_LIVE) {
    return { id: `order_dev_${receipt}`, amount, currency: "INR" };
  }
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency: "INR", receipt, payment_capture: 1 })
  });
  if (!r.ok) throw new Error(`razorpay order failed: ${r.status}`);
  const json = (await r.json()) as RzpOrder;
  return json;
}

/** Verify the checkout signature returned by Razorpay's client handler. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!RAZORPAY_LIVE) {
    // Dev: accept the fake signature produced by the test checkout shim.
    return signature === `dev_sig_${orderId}`;
  }
  const expected = crypto
    .createHmac("sha256", KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Verify a Razorpay webhook payload signature. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
