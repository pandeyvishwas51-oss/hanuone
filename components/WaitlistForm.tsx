"use client";

import { useState } from "react";

type Props = { compact?: boolean };

const ROLES = [
  { value: "doctor", label: "Doctor, home consultations" },
  { value: "nurse", label: "Nurse (BSc / GNM / ANM)" },
  { value: "caregiver", label: "Caregiver / attendant" },
  { value: "physiotherapist", label: "Physiotherapist (home visits)" },
  { value: "agency", label: "Home-care agency" },
  { value: "family", label: "Family looking for home care" }
];

export default function WaitlistForm({ compact }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState("doctor");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [mailtoUrl, setMailtoUrl] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setWhatsapp("");
    setCity("");
    setMessage("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email && !whatsapp) {
      setStatus("error");
      setFeedback("Please share an email or WhatsApp number so we can reach you.");
      return;
    }

    setStatus("loading");
    setFeedback("");
    setMailtoUrl(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, whatsapp, city, role, message })
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        mailto?: string;
      };

      if (!res.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.error || "We could not save your details. Please try again.");
        if (data.mailto) setMailtoUrl(data.mailto);
        return;
      }

      setStatus("ok");
      setFeedback(
        compact
          ? "Registered. We'll WhatsApp you shortly."
          : "Registered. We'll reach out on WhatsApp shortly to verify and onboard you."
      );
      reset();
    } catch (err: unknown) {
      setStatus("error");
      setFeedback(
        "Network error. Please try again, or WhatsApp us directly at +91-9876543210."
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input bg-white text-ink"
          autoComplete="name"
        />
      )}
      <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input bg-white text-ink"
          autoComplete="email"
        />
        <input
          type="tel"
          placeholder="WhatsApp number"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="input bg-white text-ink"
          autoComplete="tel"
          inputMode="tel"
        />
      </div>
      <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input bg-white text-ink"
          aria-label="I am registering as"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {!compact && (
          <input
            type="text"
            placeholder="City / area you serve"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input bg-white text-ink"
          />
        )}
      </div>
      {!compact && (
        <textarea
          placeholder="Anything we should know? (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input min-h-[88px] bg-white text-ink"
          rows={3}
        />
      )}
      <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
        {status === "loading"
          ? "Saving..."
          : compact
          ? "Register"
          : "Register with Home Care Network"}
      </button>
      {status === "ok" && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {feedback}
        </div>
      )}
      {status === "error" && (
        <div className="space-y-2 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <div>{feedback}</div>
          {mailtoUrl && (
            <a
              href={mailtoUrl}
              className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
            >
              Open email to send us your details
            </a>
          )}
        </div>
      )}
    </form>
  );
}
