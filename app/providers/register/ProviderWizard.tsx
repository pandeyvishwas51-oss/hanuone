"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SPECIALTIES, NURSE_TIERS } from "@/lib/data";

type Role = "doctor" | "nurse";

const STEPS = [
  "Verify mobile",
  "Identity",
  "Professional details",
  "Practice & service",
  "Documents",
  "Payout & tax",
  "Review & submit",
];

const COUNCILS = [
  "National Medical Commission (NMC)",
  "Madhya Pradesh Medical Council",
  "Indian Nursing Council (INC)",
  "MP Nurses Registration Council",
];

type Data = { modes?: string[] } & Record<string, any>; // salvaged demo wizard; loose by design

const STORAGE_KEY = "hanuone_provider_draft";

export default function ProviderWizard() {
  const params = useSearchParams();
  const initialRole = (params.get("role") === "nurse" ? "nurse" : "doctor") as Role;

  const [role, setRole] = useState<Role>(initialRole);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [data, setData] = useState<Data>({ modes: [] });
  const [otpSent, setOtpSent] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Restore draft
  useEffect(() => {
    const raw = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        setData(d.data ?? { modes: [] });
        setRole(d.role ?? initialRole);
        setStep(d.step ?? 0);
        setMaxStep(d.maxStep ?? 0);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, role, step, maxStep }));
    }
  }, [data, role, step, maxStep]);

  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const toggleMode = (m: string) =>
    setData((d) => {
      const modes = d.modes ?? [];
      return { ...d, modes: modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m] };
    });

  const mobileValid = /^[6-9]\d{9}$/.test(data.mobile ?? "");
  const otpValid = /^\d{6}$/.test(data.otp ?? "");

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return mobileValid && otpValid;
      case 1:
        return Boolean(data.name?.trim());
      case 2:
        return role === "doctor"
          ? Boolean(data.specialty && data.regNumber?.trim())
          : Boolean(data.tier && data.regNumber?.trim());
      case 3:
        return Boolean(data.address?.trim());
      case 4:
        return Boolean(data.docRegistration && data.docId);
      case 5:
        return Boolean(data.pan?.trim());
      case 6:
        return Boolean(data.cTerms && data.cTele && data.cData && data.cAuthentic);
      default:
        return true;
    }
  }

  async function submitApplication() {
    if (submitting) return; // guard the race before `disabled` re-renders → no duplicate applications/ops-emails
    setSubmitError(""); setSubmitting(true);
    try {
      const r = await fetch("/api/providers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.name,
          phone: data.mobile,
          role,
          email: data.email,
          gender: data.gender,
          specialization: role === "doctor" ? data.specialty : data.tier,
          experienceYears: data.experienceYears,
          locality: data.address,
          pincode: data.pincode,
          city: data.city || "Lucknow"
        })
      });
      const j = await r.json();
      if (!j.ok) {
        if (r.status === 401) { setSubmitError("Please log in or create your HanuONE account first, then submit your application."); return; }
        throw new Error(j.error || "Could not submit application");
      }
      setSubmitted(true);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const next = () => {
    if (step < STEPS.length - 1) {
      const n = step + 1;
      setStep(n);
      setMaxStep((m) => Math.max(m, n));
    } else {
      submitApplication();
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  const saveDraft = () => setSavedAt(new Date().toLocaleTimeString());

  const pct = Math.round(((maxStep + 1) / STEPS.length) * 100);

  if (submitted) return <Submitted role={role} name={data.name ?? "there"} />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Role toggle */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-trust-900">Join HanuONE as a provider</h1>
        <div className="flex rounded-full border border-slate-300 p-1 text-sm">
          {(["doctor", "nurse"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-full px-4 py-1.5 font-medium capitalize ${
                role === r ? "bg-trust-600 text-white" : "text-slate-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[230px_1fr]">
        {/* Sidebar / progress */}
        <aside>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Step {step + 1} of {STEPS.length} · {pct}% complete</p>
            <ol className="mt-3 space-y-1">
              {STEPS.map((label, i) => {
                const done = i < maxStep || (i <= maxStep && i < step);
                const active = i === step;
                const reachable = i <= maxStep;
                return (
                  <li key={label}>
                    <button
                      disabled={!reachable}
                      onClick={() => reachable && setStep(i)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] ${
                        active ? "bg-trust-50 font-medium text-trust-900" : reachable ? "text-slate-600 hover:bg-slate-50" : "text-slate-400"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                          done ? "bg-trust-600 text-white" : active ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {done ? "✓" : i + 1}
                      </span>
                      {label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* Step content */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          {step === 0 && <StepMobile data={data} set={set} otpSent={otpSent} setOtpSent={setOtpSent} mobileValid={mobileValid} />}
          {step === 1 && <StepIdentity data={data} set={set} />}
          {step === 2 && <StepProfessional role={role} data={data} set={set} />}
          {step === 3 && <StepPractice data={data} set={set} toggleMode={toggleMode} role={role} />}
          {step === 4 && <StepDocuments role={role} data={data} set={set} />}
          {step === 5 && <StepPayout data={data} set={set} />}
          {step === 6 && <StepReview role={role} data={data} set={set} />}

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button onClick={saveDraft} className="text-sm font-medium text-trust-600 hover:text-trust-700">
              {savedAt ? `Saved at ${savedAt}` : "Save & continue later"}
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button onClick={back} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700">
                  Back
                </button>
              )}
              <button
                onClick={next}
                disabled={!canProceed() || submitting}
                className="rounded-full bg-brand-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {step === STEPS.length - 1 ? (submitting ? "Submitting…" : "Submit application") : "Next"}
              </button>
            </div>
          </div>
          {submitError && (
            <p className="mt-3 text-right text-sm text-rose-600">
              {submitError}{" "}
              {submitError.includes("log in") && <Link href="/login?next=/providers/register" className="font-semibold underline">Log in</Link>}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- Step components ---------- */

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-trust-600";

function StepHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-serif text-xl font-semibold text-trust-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
    </div>
  );
}

function StepMobile({ data, set, otpSent, setOtpSent, mobileValid }: any) {
  return (
    <div>
      <StepHead title="Verify your mobile" sub="We'll send a one-time code to create your provider account." />
      <div className="max-w-sm space-y-4">
        <Field label="Mobile number">
          <div className="flex items-center rounded-xl border border-slate-300 focus-within:border-trust-600">
            <span className="px-3 text-sm text-slate-500">+91</span>
            <input
              value={data.mobile ?? ""}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label="Mobile number"
              placeholder="10-digit mobile"
              className="w-full rounded-r-xl px-2 py-2.5 text-sm outline-none"
            />
          </div>
        </Field>
        {!otpSent ? (
          <button
            disabled={!mobileValid}
            onClick={() => setOtpSent(true)}
            className="rounded-full bg-trust-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            Send OTP
          </button>
        ) : (
          <Field label="Enter OTP" hint="Demo: enter any 6 digits.">
            <input
              value={data.otp ?? ""}
              onChange={(e) => set("otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit verification code"
              placeholder="6-digit code"
              className={inputCls + " text-center text-lg tracking-[0.4em]"}
            />
          </Field>
        )}
      </div>
    </div>
  );
}

function StepIdentity({ data, set }: any) {
  return (
    <div>
      <StepHead title="Your details" sub="Basic information for your profile." />
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <Field label="Full name"><input value={data.name ?? ""} onChange={(e) => set("name", e.target.value)} autoComplete="name" placeholder="Dr. / Nurse name" className={inputCls} /></Field>
        <Field label="Gender">
          <select value={data.gender ?? ""} onChange={(e) => set("gender", e.target.value)} className={inputCls}>
            <option value="">Select</option><option>Female</option><option>Male</option><option>Other</option>
          </select>
        </Field>
        <Field label="Date of birth"><input type="date" value={data.dob ?? ""} onChange={(e) => set("dob", e.target.value)} className={inputCls} /></Field>
        <Field label="Email"><input type="email" value={data.email ?? ""} onChange={(e) => set("email", e.target.value)} autoComplete="email" placeholder="you@example.com" className={inputCls} /></Field>
        <Field label="Languages spoken"><input value={data.languages ?? ""} onChange={(e) => set("languages", e.target.value)} placeholder="Hindi, English" className={inputCls} /></Field>
      </div>
    </div>
  );
}

function StepProfessional({ role, data, set }: any) {
  return (
    <div>
      <StepHead title="Professional details" sub="Your registration and qualifications. We verify these before you go live." />
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        {role === "doctor" ? (
          <>
            <Field label="Specialty">
              <select value={data.specialty ?? ""} onChange={(e) => set("specialty", e.target.value)} className={inputCls}>
                <option value="">Select</option>
                {SPECIALTIES.map((s) => <option key={s.slug} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Qualifications"><input value={data.qualifications ?? ""} onChange={(e) => set("qualifications", e.target.value)} placeholder="MBBS, MD (Cardiology)" className={inputCls} /></Field>
          </>
        ) : (
          <>
            <Field label="Qualification tier">
              <select value={data.tier ?? ""} onChange={(e) => set("tier", e.target.value)} className={inputCls}>
                <option value="">Select</option>
                {NURSE_TIERS.map((t) => <option key={t.tier} value={t.tier}>{t.tier}</option>)}
              </select>
            </Field>
            <Field label="Qualifications"><input value={data.qualifications ?? ""} onChange={(e) => set("qualifications", e.target.value)} placeholder="GNM / B.Sc Nursing" className={inputCls} /></Field>
          </>
        )}
        <Field label={role === "doctor" ? "Medical council" : "Nursing council"}>
          <select value={data.council ?? ""} onChange={(e) => set("council", e.target.value)} className={inputCls}>
            <option value="">Select council</option>
            {COUNCILS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Registration / license number" hint="🔒 Verified against council records — never shown publicly.">
          <input value={data.regNumber ?? ""} onChange={(e) => set("regNumber", e.target.value)} placeholder="Council reg. no." className={inputCls} />
        </Field>
        <Field label="Year of registration"><input value={data.regYear ?? ""} onChange={(e) => set("regYear", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="e.g. 2014" className={inputCls} /></Field>
        <Field label="Years of experience"><input value={data.experience ?? ""} onChange={(e) => set("experience", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="e.g. 12" className={inputCls} /></Field>
      </div>
    </div>
  );
}

function StepPractice({ data, set, toggleMode, role }: any) {
  const modes = data.modes ?? [];
  const options = role === "doctor" ? ["Online consultation", "In-clinic", "Home visit"] : ["Home visit", "Nursing-assisted consult"];
  return (
    <div>
      <StepHead title="Practice & service area" sub="Where and how you provide care." />
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <Field label={role === "doctor" ? "Clinic / hospital name" : "Organisation (optional)"}><input value={data.clinicName ?? ""} onChange={(e) => set("clinicName", e.target.value)} placeholder={role === "doctor" ? "Heart Care Clinic" : "Independent"} className={inputCls} /></Field>
        <Field label="City / area"><input value={data.area ?? ""} onChange={(e) => set("area", e.target.value)} placeholder="Vijay Nagar, Indore" className={inputCls} /></Field>
        <div className="sm:col-span-2"><Field label="Full address"><input value={data.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Address with landmark" className={inputCls} /></Field></div>
        <Field label="Consultation / visit fee (₹)"><input value={data.fee ?? ""} onChange={(e) => set("fee", e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="e.g. 500" className={inputCls} /></Field>
        <Field label="Available timings"><input value={data.timings ?? ""} onChange={(e) => set("timings", e.target.value)} placeholder="Mon–Sat, 10am–7pm" className={inputCls} /></Field>
        <div className="sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Service modes</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((m) => (
              <button key={m} onClick={() => toggleMode(m)} className={`rounded-full border px-4 py-2 text-sm ${modes.includes(m) ? "border-trust-600 bg-trust-50 text-trust-700" : "border-slate-300 text-slate-600"}`}>
                {modes.includes(m) ? "✓ " : ""}{m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Upload({ label, k, data, set, hint }: any) {
  return (
    <Field label={label} hint={hint}>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 px-3.5 py-2.5 text-sm hover:border-trust-600">
        <span className={data[k] ? "text-slate-700" : "text-slate-400"}>{data[k] || "Choose file (PDF/JPG)"}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{data[k] ? "✓ Added" : "Upload"}</span>
        <input type="file" className="hidden" onChange={(e) => set(k, e.target.files?.[0]?.name ?? "")} />
      </label>
    </Field>
  );
}

function StepDocuments({ role, data, set }: any) {
  return (
    <div>
      <StepHead title="Documents" sub="Upload clear photos or PDFs. These are verified by our team and kept private." />
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <Upload label={role === "doctor" ? "Medical council registration" : "Nursing council registration"} k="docRegistration" data={data} set={set} />
        <Upload label="Qualification / degree certificate" k="docDegree" data={data} set={set} />
        <Upload label="Government photo ID" k="docId" data={data} set={set} hint="Aadhaar / PAN / Passport" />
        <Upload label={role === "doctor" ? "Clinic proof (optional)" : "Background-check consent"} k="docClinic" data={data} set={set} />
      </div>
    </div>
  );
}

function StepPayout({ data, set }: any) {
  return (
    <div>
      <StepHead title="Payout & tax" sub="So we can pay out your earnings. Encrypted and never shown publicly." />
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <Field label="Bank account number"><input value={data.bank ?? ""} onChange={(e) => set("bank", e.target.value.replace(/\D/g, ""))} placeholder="Account number" className={inputCls} /></Field>
        <Field label="UPI ID (optional)"><input value={data.upi ?? ""} onChange={(e) => set("upi", e.target.value)} placeholder="name@upi" className={inputCls} /></Field>
        <Field label="PAN"><input value={data.pan ?? ""} onChange={(e) => set("pan", e.target.value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" className={inputCls} /></Field>
        <Field label="GSTIN (optional)"><input value={data.gst ?? ""} onChange={(e) => set("gst", e.target.value.toUpperCase())} placeholder="If applicable" className={inputCls} /></Field>
      </div>
    </div>
  );
}

function Consent({ k, data, set, children }: any) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-600">
      <input type="checkbox" checked={Boolean(data[k])} onChange={(e) => set(k, e.target.checked ? "1" : "")} className="mt-0.5 h-4 w-4" />
      <span>{children}</span>
    </label>
  );
}

function StepReview({ role, data, set }: any) {
  const rows: [string, string][] = [
    ["Role", role],
    ["Name", data.name ?? "—"],
    ["Mobile", data.mobile ? `+91 ${data.mobile}` : "—"],
    [role === "doctor" ? "Specialty" : "Tier", (role === "doctor" ? data.specialty : data.tier) ?? "—"],
    ["Registration no.", data.regNumber ?? "—"],
    ["City / area", data.area ?? "—"],
  ];
  return (
    <div>
      <StepHead title="Review & submit" sub="Check your details and accept the agreements." />
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-slate-100 py-1.5 last:border-0">
            <span className="text-slate-500">{k}</span><span className="font-medium capitalize text-slate-800">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        <Consent k="cTerms" data={data} set={set}>I agree to HanuONE&apos;s Terms of Service and Provider Code of Conduct.</Consent>
        <Consent k="cTele" data={data} set={set}>I will follow the Telemedicine Practice Guidelines 2020 for any online consultation.</Consent>
        <Consent k="cData" data={data} set={set}>I consent to processing of my data per the DPDP Act 2023.</Consent>
        <Consent k="cAuthentic" data={data} set={set}>I declare that all information and documents provided are authentic.</Consent>
      </div>
    </div>
  );
}

function Submitted({ role, name }: { role: Role; name: string }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-3xl">✓</div>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-trust-900">Application submitted</h1>
      <p className="mt-2 text-slate-600">
        Thank you, {name}. Our team will verify your {role} registration and documents. You&apos;ll be
        notified and go live within <strong>48 hours</strong>.
      </p>
      <div className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
        <div className="flex items-center gap-2 text-trust-900"><span className="text-emerald-600">●</span> Submitted</div>
        <div className="flex items-center gap-2 text-trust-900"><span className="text-brand-600">●</span> Under review · license &amp; documents</div>
        <div className="flex items-center gap-2 text-slate-400"><span>○</span> Verified &amp; live</div>
      </div>
      <Link href="/" className="mt-7 inline-block rounded-full bg-trust-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-trust-700">
        Back to home
      </Link>
    </div>
  );
}
