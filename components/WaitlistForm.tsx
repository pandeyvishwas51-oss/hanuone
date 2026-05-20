"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = { compact?: boolean };

const ROLES = [
  { value: "doctor", label: "Doctor — home consultations" },
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
  const [interest, setInterest] = useState("doctor");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email && !whatsapp) {
      setStatus("error");
      setMessage("Email or WhatsApp number is required.");
      return;
    }
    setStatus("loading");
    const { error } = await supabase.from("waitlist").insert({
      email: email || null,
      whatsapp: whatsapp || null,
      city_of_residence: city || null,
      interest: name ? `${interest} | ${name}` : interest
    });
    if (error) {
      setStatus("error");
      setMessage("Could not save. Please try again.");
      return;
    }
    setStatus("ok");
    setMessage("You're registered. We'll be in touch on WhatsApp shortly.");
    setName("");
    setEmail("");
    setWhatsapp("");
    setCity("");
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
        />
      )}
      <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input bg-white text-ink"
        />
        <input
          type="tel"
          placeholder="WhatsApp number"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="input bg-white text-ink"
        />
      </div>
      <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
        <select
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
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
      <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
        {status === "loading" ? "Saving..." : compact ? "Register" : "Register with Home Care Network"}
      </button>
      {status === "ok" && <div className="text-xs text-emerald-300">{message}</div>}
      {status === "error" && <div className="text-xs text-red-300">{message}</div>}
    </form>
  );
}
