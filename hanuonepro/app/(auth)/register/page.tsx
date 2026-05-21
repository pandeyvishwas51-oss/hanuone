"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
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
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Account
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Profile
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("nurse");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [locality, setLocality] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  // Step 3: Documents
  const [aadhaar, setAadhaar] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);

  async function createAccount() {
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { phone } } });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data.user) setStep(2);
  }

  async function saveProfile() {
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setLoading(false); return; }

    const { error: err } = await supabase.from("professionals").insert({
      user_id: user.id,
      full_name: fullName,
      phone,
      email,
      role,
      specialization: specialization || null,
      experience_years: experience ? parseInt(experience) : null,
      locality: locality || null,
      hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
      status: "pending"
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep(3);
  }

  async function uploadDocs() {
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setLoading(false); return; }

    const uploads: string[] = [];

    if (aadhaar) {
      const path = `${user.id}/aadhaar-${Date.now()}.${aadhaar.name.split(".").pop()}`;
      const { error: ue } = await supabase.storage.from("documents").upload(path, aadhaar);
      if (!ue) {
        const { data: url } = supabase.storage.from("documents").getPublicUrl(path);
        await supabase.from("professionals").update({ aadhaar_url: url.publicUrl }).eq("user_id", user.id);
      }
    }

    for (const cert of certificates) {
      const path = `${user.id}/cert-${Date.now()}-${cert.name}`;
      const { error: ue } = await supabase.storage.from("documents").upload(path, cert);
      if (!ue) {
        const { data: url } = supabase.storage.from("documents").getPublicUrl(path);
        uploads.push(url.publicUrl);
      }
    }

    if (uploads.length) {
      await supabase.from("professionals").update({ certificate_urls: uploads }).eq("user_id", user.id);
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <div className="card w-full max-w-lg p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Join HanuonePro</h1>
          <p className="mt-1 text-sm text-muted">Register as a healthcare professional</p>
        </div>

        {/* Progress */}
        <div className="mt-5 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-slate-200"}`} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>Account</span><span>Profile</span><span>Documents</span>
        </div>

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Phone (WhatsApp)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="input" />
            </div>
            <div>
              <label className="label">Create password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="input" />
            </div>
            <button onClick={createAccount} disabled={loading} className="btn-primary w-full">
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Full name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Rajesh Sharma" className="input" />
            </div>
            <div>
              <label className="label">I am a</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {(role === "doctor" || role === "physiotherapist") && (
              <div>
                <label className="label">Specialization</label>
                <input type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. Cardiologist" className="input" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Experience (years)</label>
                <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="5" className="input" />
              </div>
              <div>
                <label className="label">Hourly rate (INR)</label>
                <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="500" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Locality in Lucknow</label>
              <input type="text" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Gomtinagar" className="input" />
            </div>
            <button onClick={saveProfile} disabled={loading} className="btn-primary w-full">
              {loading ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Aadhaar card (front)</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-4 hover:border-primary/40">
                <Upload size={18} className="text-muted" />
                <span className="text-sm text-muted">{aadhaar ? aadhaar.name : "Upload Aadhaar"}</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setAadhaar(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <div>
              <label className="label">Certificates (degree, registration, etc.)</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-4 hover:border-primary/40">
                <Upload size={18} className="text-muted" />
                <span className="text-sm text-muted">{certificates.length ? `${certificates.length} file(s)` : "Upload certificates"}</span>
                <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => setCertificates(Array.from(e.target.files ?? []))} />
              </label>
            </div>
            <button onClick={uploadDocs} disabled={loading} className="btn-primary w-full">
              {loading ? "Uploading..." : "Submit & Go to Dashboard"}
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
