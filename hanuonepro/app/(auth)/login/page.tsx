"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Mail, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function loginPassword() {
    setLoading(true);
    setError("");
    setInfo("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Wrong email or password.");
      return;
    }
    router.push("/dashboard");
  }

  async function loginMagic() {
    setLoading(true);
    setError("");
    setInfo("");
    const res = await signIn("resend", { email, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Could not send magic link. Check the email and try again.");
      return;
    }
    setInfo("Check your email for the login link.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">HanuonePro</h1>
          <p className="mt-1 text-sm text-muted">Login to your professional dashboard</p>
        </div>

        <div className="mt-6 flex rounded-lg border border-slate-200 p-1">
          <button onClick={() => setMode("password")} className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === "password" ? "bg-primary text-white" : "text-muted"}`}>
            <KeyRound size={14} className="inline mr-1" /> Password
          </button>
          <button onClick={() => setMode("magic")} className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === "magic" ? "bg-primary text-white" : "text-muted"}`}>
            <Mail size={14} className="inline mr-1" /> Magic link
          </button>
        </div>

        {mode === "password" ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <button onClick={loginPassword} disabled={loading} className="btn-primary w-full">
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-muted">We'll email you a one-click login link.</p>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
            </div>
            <button onClick={loginMagic} disabled={loading} className="btn-primary w-full">
              {loading ? "Sending..." : "Email me a login link"}
            </button>
          </div>
        )}

        {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        {info && <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{info}</div>}

        <p className="mt-6 text-center text-sm text-muted">
          New here? <Link href="/register" className="font-semibold text-primary hover:underline">Register as a professional</Link>
        </p>
      </div>
    </div>
  );
}
