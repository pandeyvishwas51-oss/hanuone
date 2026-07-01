"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openCheckout } from "@/lib/razorpay-client";

/**
 * "Complete payment" for a consultation stuck in pending_payment (the patient
 * abandoned the original checkout). Re-uses the existing consult + its
 * server-derived price, so no duplicate consultation is created.
 */
export default function ResumePayment({ consultationId, feeInr, name, contact }: { consultationId: string; feeInr: number; name: string; contact: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const or = await fetch("/api/payments/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType: "consultation", orderId: consultationId })
      });
      const oj = await or.json();
      if (!oj.ok) throw new Error(oj.error || "Could not start payment");

      const pay = await openCheckout(oj, { name, contact });
      const vr = await fetch("/api/payments/verify", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pay)
      });
      const vj = await vr.json();
      if (!vj.ok) throw new Error(vj.error || "Payment verification failed");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 text-center">
      <button onClick={pay} disabled={busy} className="btn-primary">{busy ? "Processing…" : `Complete payment · ₹${feeInr}`}</button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
