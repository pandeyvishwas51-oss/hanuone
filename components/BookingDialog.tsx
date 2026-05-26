"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, X, CheckCircle2 } from "lucide-react";

type Props = {
  doctorSlug: string;
  doctorName: string;
  doctorCity?: string;
  trigger?: React.ReactNode;
  className?: string;
};

const TIME_SLOTS = [
  "Morning (9 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
  "First available"
];

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function BookingDialog({ doctorSlug, doctorName, doctorCity, trigger, className }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(todayPlus(1));
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  // Restore last patient details so repeat bookings are quick
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      const cached = JSON.parse(window.localStorage.getItem("hanuone:patient") || "{}");
      if (cached.name) setName(cached.name);
      if (cached.phone) setPhone(cached.phone);
      if (cached.email) setEmail(cached.email);
    } catch {}
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setStatus("error");
      setFeedback("Please share your name and phone.");
      return;
    }
    setStatus("loading");
    setFeedback("");
    try {
      const r = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorSlug,
          doctorName,
          patientName: name,
          patientPhone: phone,
          patientEmail: email || undefined,
          preferredDate: date,
          preferredTime: time,
          reason,
          city: doctorCity
        })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.error || "Could not book. Please try again.");
        return;
      }
      // Cache the patient details for next time
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hanuone:patient", JSON.stringify({ name, phone, email }));
      }
      setStatus("ok");
      setFeedback("Booking received. We'll WhatsApp you shortly to confirm the slot.");
    } catch {
      setStatus("error");
      setFeedback("Network error. Please WhatsApp us directly.");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "btn-primary"}>
        {trigger ?? "Book consultation"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-base font-bold text-ink">Book with {doctorName}</div>
                <div className="text-xs text-muted">No charge to book. Free cancellation any time.</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {status === "ok" ? (
              <div className="p-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={26} />
                </div>
                <div className="mt-3 text-base font-semibold text-ink">Request received</div>
                <p className="mt-1 text-sm text-muted">{feedback}</p>
                <button onClick={() => setOpen(false)} className="btn-primary mt-5 w-full">Done</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3 p-5">
                <div>
                  <label className="label">Your full name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Phone (WhatsApp)</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+91 98765 43210" autoComplete="tel" inputMode="tel" required />
                  </div>
                  <div>
                    <label className="label">Email (optional)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Preferred date</label>
                    <div className="relative">
                      <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayPlus(0)} className="input pl-9" required />
                    </div>
                  </div>
                  <div>
                    <label className="label">Preferred time</label>
                    <div className="relative">
                      <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <select value={time} onChange={(e) => setTime(e.target.value)} className="input pl-9">
                        {TIME_SLOTS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">Reason for visit (optional)</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="input" placeholder="e.g. Annual check-up, BP review..." />
                </div>
                <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
                  {status === "loading" ? "Sending..." : "Request consultation"}
                </button>
                {status === "error" && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{feedback}</div>
                )}
                <p className="text-[11px] text-muted">By booking you agree to be contacted on WhatsApp / phone for confirmation. We never share your details.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
