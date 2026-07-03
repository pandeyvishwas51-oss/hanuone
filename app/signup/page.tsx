"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { firebaseEnabled, signInWithGoogle } from "@/lib/firebase-client";

export const dynamic = "force-dynamic";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  // Open-redirect guard: only allow same-site relative paths (not "//evil.com" or absolute URLs).
  const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : "/account";

  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [attempts, setAttempts] = useState(0);

  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const exhausted = attempts >= 5;
  const channelLabel = channel === "sms" ? "mobile" : "email";
  const sentTo = channel === "sms" ? `+91 ${phone}` : email;

  function refCode() {
    return params.get("ref") || (typeof window !== "undefined" ? window.localStorage.getItem("hanuone:ref") || undefined : undefined);
  }

  async function start() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, channel, ref: refCode() })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not sign up");
      if (j.devCode) setHint(`Your code is ${j.devCode}`);
      setAttempts(0); setCode("");
      setStep("otp");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const j = await r.json();
      if (!j.ok) { setAttempts((a) => a + 1); throw new Error(j.error || "Verification failed"); }
      router.push(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setError("");
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const r = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, ref: refCode() })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Google sign-in failed");
      router.push(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-10">
      <div className="card w-full max-w-sm p-6">
        <h1 className="h3">{step === "form" ? "Create your HanuONE account" : `Verify your ${channelLabel}`}</h1>
        <p className="mt-1 text-sm text-muted">
          {step === "form" ? "One account for doctors, tests, medicines and home care." : `We sent a 6-digit code to ${sentTo}.`}
        </p>

        {step === "form" ? (
          <div className="mt-5 space-y-3">
            {firebaseEnabled && (
              <>
                <button onClick={google} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">
                  <GoogleIcon /> Continue with Google
                </button>
                <div className="flex items-center gap-3 text-[11px] text-muted"><span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" /></div>
              </>
            )}
            <input className="input w-full" placeholder="Full name" aria-label="Full name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <input className="input w-full" type="email" placeholder="Email" aria-label="Email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input className="input w-full" inputMode="numeric" placeholder="10-digit mobile" aria-label="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} autoComplete="tel" />
            {phone.length === 10 && !phoneValid && <p className="text-xs text-rose-600">Indian mobile numbers start with 6, 7, 8 or 9.</p>}
            <input className="input w-full" type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <div>
              <div className="mb-1 text-[11px] font-medium text-muted">Send verification code to</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setChannel("email")} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${channel === "email" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-muted"}`}>📧 Email</button>
                <button type="button" onClick={() => setChannel("sms")} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${channel === "sms" ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-muted"}`}>📱 Mobile (SMS)</button>
              </div>
            </div>
            <button className="btn-primary w-full" disabled={loading || !name || !email || !phoneValid || password.length < 6} onClick={start}>
              {loading ? "Sending code…" : `Sign up — code via ${channel === "email" ? "email" : "SMS"}`}
            </button>
            <p className="text-center text-xs text-muted">Already have an account? <Link href="/login" className="font-semibold text-primary">Log in</Link></p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {hint && <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{hint}</div>}
            {exhausted ? (
              <>
                <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">Too many incorrect attempts. Please request a new code.</div>
                <button className="btn-primary w-full" disabled={loading} onClick={start}>{loading ? "Sending…" : "Send a new code"}</button>
              </>
            ) : (
              <>
                <input className="input w-full text-center text-lg tracking-[0.4em]" aria-label="6-digit verification code" inputMode="numeric" placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <button className="btn-primary w-full" disabled={loading || code.length !== 6} onClick={verify}>
                  {loading ? "Verifying…" : "Verify & continue"}
                </button>
                <button className="text-center text-xs font-semibold text-primary" onClick={start} disabled={loading}>Resend code</button>
              </>
            )}
            <button className="btn-outline w-full text-sm" onClick={() => { setStep("form"); setError(""); }}>Back</button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}
