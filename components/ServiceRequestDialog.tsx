"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type Props = {
  service: string;
  serviceLabel: string;
  isLive?: boolean;
  trigger?: React.ReactNode;
  className?: string;
  defaultCity?: string;
};

export default function ServiceRequestDialog({ service, serviceLabel, isLive, trigger, className, defaultCity }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState(defaultCity ?? "");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      const cached = JSON.parse(window.localStorage.getItem("hanuone:patient") || "{}");
      if (cached.name) setName(cached.name);
      if (cached.phone) setPhone(cached.phone);
      if (cached.email) setEmail(cached.email);
    } catch {}
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setFeedback("");
    try {
      const r = await fetch("/api/service-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, name, phone, email, city, pincode, notes })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.error || "Could not submit. Please WhatsApp us at +91-9876543210.");
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hanuone:patient", JSON.stringify({ name, phone, email }));
      }
      setStatus("ok");
      setFeedback(isLive ? "Got it. Our team will WhatsApp you within 30 minutes." : "You're on the early access list. We'll WhatsApp you the moment this service goes live in your area.");
    } catch {
      setStatus("error");
      setFeedback("Network error. Please WhatsApp us directly.");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "btn-primary"}>
        {trigger ?? (isLive ? `Request ${serviceLabel}` : `Notify me, ${serviceLabel}`)}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-base font-bold text-ink">{isLive ? "Request" : "Early access"}: {serviceLabel}</div>
                <div className="text-xs text-muted">{isLive ? "We respond within 30 minutes during 8 AM to 10 PM." : "Be the first to use this service when we launch in your city."}</div>
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
                <div className="mt-3 text-base font-semibold text-ink">{isLive ? "Request received" : "You're on the list"}</div>
                <p className="mt-1 text-sm text-muted">{feedback}</p>
                <button onClick={() => setOpen(false)} className="btn-primary mt-5 w-full">Done</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Your name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" />
                  </div>
                  <div>
                    <label className="label">Phone (WhatsApp)</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" autoComplete="tel" inputMode="tel" required />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">City</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input" autoComplete="address-level2" />
                  </div>
                  <div>
                    <label className="label">Pincode</label>
                    <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className="input" inputMode="numeric" maxLength={6} />
                  </div>
                </div>
                <div>
                  <label className="label">What do you need?</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input" placeholder="Any details, e.g. medicine names, lab tests, dates" />
                </div>
                <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
                  {status === "loading" ? "Sending..." : (isLive ? "Send request" : "Notify me")}
                </button>
                {status === "error" && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{feedback}</div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
