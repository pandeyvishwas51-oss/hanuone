"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Phone, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendOtp() {
    setLoading(true); setError("");
    const digits = phone.replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+91${digits}` : `+${digits}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep("otp");
  }

  async function verifyOtp() {
    setLoading(true); setError("");
    const digits = phone.replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+91${digits}` : `+${digits}`;
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: "sms" });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
  }

  async function loginEmail() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">HanuonePro</h1>
          <p className="mt-1 text-sm text-muted">Login to your professional dashboard</p>
        </div>

        <div className="mt-6 flex rounded-lg border border-slate-200 p-1">
          <button onClick={() => setMode("phone")} className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === "phone" ? "bg-primary text-white" : "text-muted"}`}>
            <Phone size={14} className="inline mr-1" /> Phone OTP
          </button>
          <button onClick={() => setMode("email")} className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === "email" ? "bg-primary text-white" : "text-muted"}`}>
            <Mail size={14} className="inline mr-1" /> Email
          </button>
        </div>

        {mode === "phone" ? (
          <div className="mt-5 space-y-4">
            {step === "input" ? (
              <>
                <div>
                  <label className="label">Phone number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input" />
                </div>
                <button onClick={sendOtp} disabled={loading} className="btn-primary w-full">
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Enter OTP sent to {phone}</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="input text-center text-lg tracking-widest" />
                </div>
                <button onClick={verifyOtp} disabled={loading} className="btn-primary w-full">
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
                <button onClick={() => setStep("input")} className="btn-ghost w-full">Change number</button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="input" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="input" />
            </div>
            <button onClick={loginEmail} disabled={loading} className="btn-primary w-full">
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        )}

        {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        <p className="mt-6 text-center text-sm text-muted">
          New here? <Link href="/register" className="font-semibold text-primary hover:underline">Register as a professional</Link>
        </p>
      </div>
    </div>
  );
}
