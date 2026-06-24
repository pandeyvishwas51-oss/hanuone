"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [dev, setDev] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendOtp() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not send OTP");
      setDev(!!j.dev);
      setStep("otp");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, name })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Verification failed");
      router.push(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-10">
      <div className="card w-full max-w-sm p-6">
        <h1 className="h3">{step === "phone" ? "Log in to Hanuone" : "Enter the OTP"}</h1>
        <p className="mt-1 text-sm text-muted">
          {step === "phone"
            ? "We'll send a one-time code to your mobile."
            : `Sent to +91 ${phone}.`}
        </p>

        {step === "phone" ? (
          <div className="mt-5 space-y-3">
            <input
              className="input w-full"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
            <input
              className="input w-full"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn-primary w-full" disabled={loading || phone.length !== 10} onClick={sendOtp}>
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {dev && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Dev mode: use OTP <b>000000</b> (no SMS sent).
              </div>
            )}
            <input
              className="input w-full text-center text-lg tracking-[0.4em]"
              inputMode="numeric"
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button className="btn-primary w-full" disabled={loading || otp.length < 4} onClick={verifyOtp}>
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
            <button className="btn-outline w-full text-sm" onClick={() => setStep("phone")}>
              Change number
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
