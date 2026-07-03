"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Clock, X, CheckCircle2 } from "lucide-react";
import { SITE } from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/utils";
import { useDialogA11y } from "@/lib/useDialogA11y";

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
  // Date is set client-side in the open effect (never from new Date() during
  // render) to avoid an SSR/client hydration mismatch across a day boundary.
  const [date, setDate] = useState("");
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string | null>(null);
  const waLink = buildWhatsAppLink(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210",
    `Hi, I need help booking a consultation with ${doctorName} on HanuOne.`
  );
  useDialogA11y(open, () => setOpen(false), panelRef);

  // On open: restore last patient details, seed a fresh default date, and clear
  // any stale status/feedback so a reopened dialog is never stuck on an old
  // error or the previous success confirmation.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    setStatus("idle");
    setFeedback("");
    setReason("");
    setDate(todayPlus(1));
    let ignore = false;
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (ignore) return;
      const id = j.user?.id ?? null;
      userIdRef.current = id;
      if (j.user?.name) setName(j.user.name);
      if (j.user?.phone) setPhone(j.user.phone.replace(/^\+?91/, ""));
      try {
        const storage = id ? window.localStorage : window.sessionStorage;
        const key = id ? `hanuone:patient:${id}` : "hanuone:patient";
        const cached = JSON.parse(storage.getItem(key) || "{}");
        if (cached.name) setName(cached.name);
        if (cached.phone) setPhone(cached.phone);
        if (cached.email) setEmail(cached.email);
      } catch {}
    }).catch(() => {
      if (ignore) return;
      userIdRef.current = null;
      try {
        const cached = JSON.parse(window.sessionStorage.getItem("hanuone:patient") || "{}");
        if (cached.name) setName(cached.name);
        if (cached.phone) setPhone(cached.phone);
        if (cached.email) setEmail(cached.email);
      } catch {}
    });
    return () => { ignore = true; };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return; // guard against double-submit
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
        setFeedback(data.error || `Could not book. Please WhatsApp us at ${SITE.phoneE164}.`);
        return;
      }
      // Cache patient details per authenticated user; anonymous users: tab session only.
      if (typeof window !== "undefined") {
        const payload = JSON.stringify({ name, phone, email });
        const id = userIdRef.current;
        if (id) {
          window.localStorage.setItem(`hanuone:patient:${id}`, payload);
        } else {
          window.sessionStorage.setItem("hanuone:patient", payload);
        }
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
          <div aria-hidden="true" className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="bd-title" tabIndex={-1} className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl animate-scale-in sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <div id="bd-title" className="text-base font-bold text-ink">Book with {doctorName}</div>
                <div className="text-xs text-muted">No charge to book. Free cancellation any time.</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {status === "ok" ? (
              <div className="p-6 text-center" role="status">
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
                  <label className="label" htmlFor="bd-name">Your full name</label>
                  <input id="bd-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" maxLength={100} required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="bd-phone">Phone (WhatsApp)</label>
                    <input id="bd-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+91 98765 43210" autoComplete="tel" inputMode="tel" maxLength={18} required />
                  </div>
                  <div>
                    <label className="label" htmlFor="bd-email">Email (optional)</label>
                    <input id="bd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" maxLength={200} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="bd-date">Preferred date</label>
                    <div className="relative">
                      <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input id="bd-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayPlus(0)} className="input pl-9" required />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="bd-time">Preferred time</label>
                    <div className="relative">
                      <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <select id="bd-time" value={time} onChange={(e) => setTime(e.target.value)} className="input pl-9">
                        {TIME_SLOTS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="bd-reason">Reason for visit (optional)</label>
                  <textarea id="bd-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="input" maxLength={500} placeholder="e.g. Annual check-up, BP review..." />
                </div>
                <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
                  {status === "loading" ? "Sending..." : "Request consultation"}
                </button>
                {status === "error" && (
                  <div role="alert" className="animate-fade-in-up rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                    <p>{feedback}</p>
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex font-semibold text-primary underline">
                        Chat on WhatsApp →
                      </a>
                    )}
                  </div>
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
