"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, FileText, Video, CalendarClock } from "lucide-react";
import { openCheckout } from "@/lib/razorpay-client";
import { parseLocalDate } from "@/lib/utils";

type Slot = { id: string; date: string; startTime: string; endTime: string; mode: string; feeInr: number | null };
type Me = { id: string; name: string | null; phone: string | null } | null;

const CONSENT =
  "I confirm I am initiating this teleconsultation voluntarily and consent to it being conducted per the NMC Telemedicine Guidelines 2022, with my health data processed under the DPDP Act 2023.";

export default function ConsultBooking({ doctorSlug, doctorName, defaultFee }: { doctorSlug: string; doctorName: string; defaultFee: number }) {
  const router = useRouter();
  const [me, setMe] = useState<Me>(undefined as unknown as Me);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotId, setSlotId] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // `ignore` prevents setState after unmount and discards a stale slots
    // response if doctorSlug changes before the previous fetch resolves.
    let ignore = false;
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (ignore) return;
      setMe(j.user ?? null);
      if (j.user) { setName(j.user.name ?? ""); setPhone(j.user.phone?.replace(/^91/, "") ?? ""); }
    }).catch(() => { if (!ignore) setMe(null); }); // never strand the user on an infinite skeleton
    fetch(`/api/slots?doctorSlug=${encodeURIComponent(doctorSlug)}`).then((r) => r.json()).then((j) => {
      if (!ignore && j.slots) setSlots(j.slots);
    }).finally(() => { if (!ignore) setSlotsLoading(false); });
    return () => { ignore = true; };
  }, [doctorSlug]);

  const fee = slots.find((s) => s.id === slotId)?.feeInr ?? defaultFee;

  // Group slots by date for a clean picker.
  const byDate = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  async function book() {
    if (busy) return;
    setError("");
    if (!name.trim() || phone.trim().length < 10) return setError("Enter your name and a valid 10-digit phone number.");
    if (slots.length > 0 && !slotId) return setError("Please select a time slot.");
    if (!consent) return setError("Please accept the telemedicine consent to continue.");
    setBusy(true);
    try {
      const cr = await fetch("/api/consult", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctorSlug, slotId: slotId || undefined, patientName: name, patientPhone: phone, mode: "video", context: reason, consent: true }) });
      const cj = await cr.json();
      if (!cj.ok) throw new Error(cj.error || "Could not start booking");

      const or = await fetch("/api/payments/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderType: "consultation", orderId: cj.consultationId }) });
      const oj = await or.json();
      if (!oj.ok) throw new Error(oj.error || "Could not start payment");

      const pay = await openCheckout(oj, { name, contact: phone });
      const vr = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pay) });
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
    return <div className="card animate-pulse p-5"><div className="h-5 w-40 skeleton rounded" /><div className="mt-4 h-24 skeleton rounded-xl" /></div>;
  }
  if (me === null) {
    return (
      <div className="card animate-fade-in-up p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Video size={22} /></span>
        <p className="mt-3 text-sm text-muted">Log in to book a video consultation with {doctorName}.</p>
        <a href={`/login?next=/book/${doctorSlug}`} className="btn-primary mt-4 inline-block">Log in to book</a>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in-up overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-primary/5 bg-primary/[0.03] px-5 py-3.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Video size={18} /></span>
        <div><div className="text-sm font-bold text-ink">Book a video consult</div><div className="text-xs text-muted">with {doctorName}</div></div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cb-name">Patient name</label>
            <input id="cb-name" className="input" autoComplete="name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <label className="label" htmlFor="cb-phone">Phone</label>
            <input id="cb-phone" className="input" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
          </div>
        </div>

        {/* Slot picker */}
        <div>
          <label className="label flex items-center gap-1.5"><CalendarClock size={13} /> Choose a time</label>
          {slotsLoading ? (
            <div className="mt-1 flex flex-wrap gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-8 w-24 skeleton rounded-lg" />)}</div>
          ) : slots.length === 0 ? (
            <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">No published slots — we'll confirm the earliest available time right after you book.</p>
          ) : (
            <div className="mt-1 space-y-2.5">
              {Object.entries(byDate).map(([date, ss]) => (
                <div key={date}>
                  <div className="mb-1 text-xs font-semibold text-muted">{parseLocalDate(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</div>
                  <div className="flex flex-wrap gap-2">
                    {ss.map((s) => (
                      <button key={s.id} type="button" onClick={() => setSlotId(s.id)} aria-pressed={slotId === s.id}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${slotId === s.id ? "border-primary bg-primary text-white" : "border-slate-200 text-ink hover:border-primary/40 hover:bg-primary/5"}`}>
                        {s.startTime}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="cb-reason">Reason / symptoms <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="cb-reason" className="input" rows={2} maxLength={500} placeholder="e.g. fever for 3 days, BP review…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-muted">
          <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{CONSENT}</span>
        </label>

        {/* Fee + pay */}
        <div className="rounded-xl border border-primary/10 bg-primary/[0.03] p-3">
          <div className="flex items-center justify-between text-sm"><span className="text-muted">Consultation fee</span><span className="text-lg font-bold text-ink">₹{fee}</span></div>
          <button className="btn-primary mt-3 w-full" disabled={busy || !consent} onClick={book}>
            {busy ? "Processing…" : `Pay ₹${fee} & confirm`}
          </button>
          {error && <p role="alert" className="mt-2 animate-fade-in-up text-sm text-rose-600">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-600" /> NMC-compliant</span>
          <span className="inline-flex items-center gap-1"><Lock size={12} className="text-emerald-600" /> Secure payment</span>
          <span className="inline-flex items-center gap-1"><FileText size={12} className="text-emerald-600" /> e-Prescription</span>
        </div>
      </div>
    </div>
  );
}
