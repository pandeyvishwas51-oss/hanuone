// Client-side Razorpay checkout launcher.
// In dev (fake order id from the server), it skips the real SDK and returns a
// synthetic signature the server's dev-mode verifier accepts — so the whole
// pay → verify → confirm flow is testable without real keys.

type OrderResp = {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  live: boolean;
};

type CheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export async function openCheckout(
  order: OrderResp,
  prefill: { name?: string; contact?: string; email?: string }
): Promise<CheckoutSuccess> {
  // Dev / no-keys path: synthesize a signature the server accepts.
  if (!order.live || order.razorpayOrderId.startsWith("order_dev_")) {
    return {
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: `pay_dev_${Date.now()}`,
      razorpay_signature: `dev_sig_${order.razorpayOrderId}`
    };
  }

  const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!ok || !window.Razorpay) throw new Error("Could not load payment gateway");

  return new Promise<CheckoutSuccess>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Hanuone",
      description: "Consultation",
      order_id: order.razorpayOrderId,
      prefill: { name: prefill.name, contact: prefill.contact, email: prefill.email },
      theme: { color: "#0F4C5C" },
      handler: (resp: CheckoutSuccess) => resolve(resp),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) }
    });
    rzp.open();
  });
}
