import type { Metadata } from "next";
import Link from "next/link";
import ProvidersHero from "@/components/ProvidersHero";

export const metadata: Metadata = {
  title: "Join HanuONE as a doctor or nurse",
  description: "Grow your practice with HanuONE. Reach verified patients online and at home. Free to join — register with mobile OTP and get verified in 48 hours.",
};

const BENEFITS = [
  { t: "Reach more patients", d: "Verified patients find you through search, home nursing and online consultations." },
  { t: "Online + home + clinic", d: "Offer consultations and visits the way that suits you and your patients." },
  { t: "Verified badge & trust", d: "Council-verified profiles build patient confidence and bookings." },
  { t: "Simple, fast onboarding", d: "Register with mobile OTP and go live within 48 hours of verification." },
];

const STEPS = [
  "Verify your mobile with OTP",
  "Add your qualifications & registration",
  "Upload documents for verification",
  "Get verified and go live in 48 hours",
];

export default function ProviderJoinPage() {
  return (
    <div>
      <ProvidersHero />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="font-serif text-3xl font-semibold text-trust-900">Why join HanuONE</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.t} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-trust-900">{b.t}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-serif text-3xl font-semibold text-trust-900">How onboarding works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-trust-600 font-semibold text-white">{i + 1}</div>
                <p className="mt-3 text-sm text-slate-700">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link href="/providers/register?role=doctor" className="rounded-full bg-brand-600 px-7 py-3 font-semibold text-white transition hover:bg-brand-700">
              Start registration
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
