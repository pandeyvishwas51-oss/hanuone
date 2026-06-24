"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openCheckout } from "@/lib/razorpay-client";

type Slot = { id: string; date: string; startTime: string; endTime: string; mode: string; feeInr: number | null };
type Me = { id: string; name: string | null; phone: string | null } | null;

const CONSENT =
  "I confirm I am initiating this teleconsultation voluntarily and consent to it being conducted per the NMC Telemedicine Guidelines 2022, with my health data processed under the DPDP Act 2023.";

export default function ConsultBooking({
  doctorSlug,
  doctorName,
  defaultFee
}: {
  doctorSlug: string;
  doctorName: string;
  defaultFee: number;
}) {
  const router = useRouter();
  const [me, setMe] = useState<Me>(undefined as unknown as Me);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      setMe(j.user ?? null);
      if (j.user) {
        setName(j.user.name ?? "");
        setPhone(j.user.phone?.replace(/^91/, "") ?? "");
      }
    });
    fetch(`/api/slots?doctorSlug=${encodeURIComponent(doctorSlug)}`).then((r) => r.json()).then((j) => {
      if (j.slots) setSlots(j.slots);
    });
  }, [doctorSlug]);

  const fee = slots.find((s) => s.id === slotId)?.feeInr ?? defaultFee;

  async function book() {
    setError("");
    if (!consent) return setError("Please accept the telemedicine consent to continue.");
    if (!name.trim() || phone.trim().length < 10) return setError("Enter your name and a valid phone number.");
    setBusy(true);
    try {
      // 1) Create consultation (consent-gated).
      const cr = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorSlug, slotId: slotId || undefined, patientName: name, patientPhone: phone, mode: "video", context: reason, consent: true })
      });
      const cj = await cr.json();
      if (!cj.ok) throw new Error(cj.error || "Could not start booking");

      // 2) Create payment order.
      const or = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType: "consultation", orderId: cj.consultationId, amountInr: cj.feeInr })
      });
      const oj = await or.json();
      if (!oj.ok) throw new Error(oj.error || "Could not start payment");

      // 3) Checkout + 4) verify.
      const pay = await openCheckout(oj, { name, contact: phone });
      const vr = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pay)
      });
      const vj = await vr.json();
      if (!vj.ok) throw new Error(vj.error || "Payment verification failed");

      router.push(`/consult/${cj.consultationId}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (me === (undefined as unknown as Me)) {
    return <div className="card p-5 text-sm text-muted">Loading…</div>;
  }
  if (me === null) {
    return (
      <div className="card p-5">
        <p className="text-sm text-muted">Please log in to book a consultation with {doctorName}.</p>
        <a href={`/login?next=/book/${doctorSlug}`} className="btn-primary mt-3 inline-block">Log in to book</a>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="h3">Book a video consult</h2>
      <p className="mt-1 text-sm text-muted">with {doctorName} · ₹{fee}</p>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Patient name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
        </div>

        {slots.length > 0 ? (
          <select className="input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            <option value="">Select a time slot</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString("en-IN")} · {s.startTime}–{s.endTime} ({s.mode})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-muted">No published slots — we'll confirm the earliest available time after booking.</p>
        )}

        <textarea className="input" rows={2} placeholder="Reason / symptoms (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />

        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{CONSENT}</span>
        </label>

        <button className="btn-primary w-full" disabled={busy || !consent} onClick={book}>
          {busy ? "Processing…" : `Pay ₹${fee} & confirm`}
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
