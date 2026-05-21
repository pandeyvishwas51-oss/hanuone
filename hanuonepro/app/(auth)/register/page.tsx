"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Upload } from "lucide-react";

const ROLES = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse (BSc / GNM / ANM)" },
  { value: "ward_boy", label: "Ward Boy / Attendant" },
  { value: "caregiver", label: "Caregiver" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "agency", label: "Home-care Agency" }
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Account + base profile (combined to reduce friction)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("nurse");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [locality, setLocality] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  // Step 2: Documents
  const [aadhaar, setAadhaar] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);

  async function createAccount() {
    setLoading(true);
    setError("");
    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        phone,
        password,
        role,
        specialization,
        experienceYears: experience ? parseInt(experience) : null,
        locality,
        hourlyRate: hourlyRate ? parseInt(hourlyRate) : null
      })
    });
    const data = await r.json();
    if (!r.ok || !data.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }
    // Auto-login
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Account created but auto-login failed. Please login manually.");
      router.push("/login");
      return;
    }
    setStep(2);
  }

  async function uploadDocs() {
    setLoading(true);
    setError("");
    try {
      if (aadhaar) {
        const fd = new FormData();
        fd.append("kind", "aadhaar");
        fd.append("file", aadhaar);
        await fetch("/api/upload", { method: "POST", body: fd });
      }
      for (const cert of certificates) {
        const fd = new FormData();
        fd.append("kind", "certificate");
        fd.append("file", cert);
        await fetch("/api/upload", { method: "POST", body: fd });
      }
      router.push("/dashboard");
    } catch (e: unknown) {
      setError("Upload failed. You can try again from your profile page.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <div className="card w-full max-w-lg p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Join HanuonePro</h1>
          <p className="mt-1 text-sm text-muted">Register as a healthcare professional</p>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-slate-200"}`} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>Account & profile</span>
          <span>Documents</span>
        </div>

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Rajesh Sharma" autoComplete="name" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
              </div>
              <div>
                <label className="label">WhatsApp / phone</label>
                <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
              </div>
            </div>
            <div>
              <label className="label">Password (min 6 chars)</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <label className="label">I am a</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {(role === "doctor" || role === "physiotherapist") && (
              <div>
                <label className="label">Specialization</label>
                <input className="input" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. Cardiologist" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Experience (years)</label>
                <input type="number" className="input" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="5" />
              </div>
              <div>
                <label className="label">Hourly rate (INR)</label>
                <input type="number" className="input" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="500" />
              </div>
            </div>
            <div>
              <label className="label">Locality in Lucknow</label>
              <input className="input" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Gomtinagar" />
            </div>
            <button onClick={createAccount} disabled={loading} className="btn-primary w-full">
              {loading ? "Creating..." : "Create account & continue"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Upload your Aadhaar and any certificates (degree, registration, etc.). Files up to 5MB each. JPG/PNG/PDF.
            </p>
            <div>
              <label className="label">Aadhaar card</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-4 hover:border-primary/40">
                <Upload size={18} className="text-muted" />
                <span className="text-sm text-muted">{aadhaar ? aadhaar.name : "Upload Aadhaar"}</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setAadhaar(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div>
              <label className="label">Certificates</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-4 hover:border-primary/40">
                <Upload size={18} className="text-muted" />
                <span className="text-sm text-muted">{certificates.length ? `${certificates.length} file(s)` : "Upload certificates"}</span>
                <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => setCertificates(Array.from(e.target.files ?? []))} />
              </label>
            </div>
            <button onClick={uploadDocs} disabled={loading} className="btn-primary w-full">
              {loading ? "Uploading..." : "Submit & go to dashboard"}
            </button>
            <button onClick={() => router.push("/dashboard")} className="btn-ghost w-full">Skip for now</button>
          </div>
        )}

        {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        <p className="mt-6 text-center text-sm text-muted">
          Already registered? <Link href="/login" className="font-semibold text-primary hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
