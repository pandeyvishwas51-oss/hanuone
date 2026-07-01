"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { firebaseEnabled, signInWithGoogle } from "@/lib/firebase-client";

export const dynamic = "force-dynamic";

type Mode = "login" | "forgot" | "reset" | "verify";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  // Open-redirect guard: only allow same-site relative paths (not "//evil.com" or absolute URLs).
  const nextParam = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : null;

  // Send each role to its home unless an explicit ?next= was provided.
  function destFor(user?: { role?: string; isAdmin?: boolean }) {
    if (nextParam) return nextParam;
    if (user?.isAdmin || user?.role === "admin") return "/console";
    if (user?.role === "provider") return "/providers"; // smart-routes to /clinic or /care
    return "/account";
  }

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  function refCode() {
    return params.get("ref") || (typeof window !== "undefined" ? window.localStorage.getItem("hanuone:ref") || undefined : undefined);
  }

  async function login() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const j = await r.json();
      if (!j.ok) {
        // Unverified email: drop into an inline OTP step (a fresh code was sent).
        if (j.needsVerification) { setMode("verify"); setHint("Your email isn't verified yet. We've sent a 6-digit code to your inbox."); return; }
        throw new Error(j.error || "Login failed");
      }
      router.push(destFor(j.user));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmail() {
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Verification failed");
      router.push(destFor(j.user));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sendReset() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not send code");
      if (j.devCode) setHint(`Dev: your reset code is ${j.devCode}`);
      setMode("reset");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function doReset() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, password: newPassword }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Reset failed");
      router.push(destFor(j.user));
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
      const r = await fetch("/api/auth/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken, ref: refCode() }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Google sign-in failed");
      router.push(destFor(j.user));
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
        <h1 className="h3">{mode === "login" ? "Log in to HanuONE" : mode === "forgot" ? "Reset your password" : "Enter the code"}</h1>

        {mode === "login" && (
          <div className="mt-5 space-y-3">
            {firebaseEnabled && (
              <>
                <button onClick={google} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">
                  <GoogleIcon /> Continue with Google
                </button>
                <div className="flex items-center gap-3 text-[11px] text-muted"><span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" /></div>
              </>
            )}
            <input className="input w-full" type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input className="input w-full" type="password" aria-label="Password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && login()} />
            <button className="btn-primary w-full" disabled={loading || !email || !password} onClick={login}>{loading ? "Logging in…" : "Log in"}</button>
            <div className="flex items-center justify-between text-xs">
              <button onClick={() => { setMode("forgot"); setError(""); }} className="text-primary">Forgot password?</button>
              <Link href="/signup" className="font-semibold text-primary">Create account</Link>
            </div>
          </div>
        )}

        {mode === "forgot" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-muted">Enter your email and we&apos;ll send a 6-digit reset code.</p>
            <input className="input w-full" type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <button className="btn-primary w-full" disabled={loading || !email} onClick={sendReset}>{loading ? "Sending…" : "Send reset code"}</button>
            <button className="btn-outline w-full text-sm" onClick={() => setMode("login")}>Back to login</button>
          </div>
        )}

        {mode === "verify" && (
          <div className="mt-5 space-y-3">
            {hint && <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{hint}</div>}
            <input className="input w-full text-center tracking-[0.3em]" aria-label="6-digit verification code" inputMode="numeric" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <button className="btn-primary w-full" disabled={loading || code.length !== 6} onClick={verifyEmail}>{loading ? "Verifying…" : "Verify & log in"}</button>
            <button className="btn-outline w-full text-sm" onClick={() => setMode("login")}>Back to login</button>
          </div>
        )}

        {mode === "reset" && (
          <div className="mt-5 space-y-3">
            {hint && <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{hint}</div>}
            <input className="input w-full text-center tracking-[0.3em]" aria-label="6-digit reset code" inputMode="numeric" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <input className="input w-full" type="password" aria-label="New password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            <button className="btn-primary w-full" disabled={loading || code.length !== 6 || newPassword.length < 6} onClick={doReset}>{loading ? "Resetting…" : "Reset & log in"}</button>
            <button className="btn-outline w-full text-sm" onClick={() => setMode("login")}>Back to login</button>
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
