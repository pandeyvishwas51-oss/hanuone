import Link from "next/link";
import Image from "next/image";
import {
  Stethoscope,
  Shield,
  Calendar,
  Wallet,
  HeartHandshake,
  ClipboardCheck,
  Smartphone,
  Quote
} from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuonepro.vercel.app";

const FAQS = [
  {
    q: "Who can register on HanuonePro?",
    a: "Any verified doctor, BSc/GNM/ANM nurse, ward boy, attendant, caregiver, physiotherapist or home-care agency working in Lucknow and nearby areas can register. Verification needs Aadhaar plus relevant certificates."
  },
  {
    q: "Is HanuonePro free for professionals?",
    a: "Yes. Registering, getting verified and using the dashboard is free. We only deduct a small platform fee from completed home-care gigs once you start earning."
  },
  {
    q: "How long does verification take?",
    a: "Most profiles are verified within 24 hours of submitting Aadhaar and certificates. You can use the dashboard while verification is pending; once verified you start receiving gigs."
  },
  {
    q: "How do I get bookings?",
    a: "Once verified, families on hanuone.in (our patient-facing directory) can request you for home visits. Bookings appear in the Bookings tab where you can accept, start, and complete each visit."
  },
  {
    q: "How are earnings tracked?",
    a: "Every completed gig automatically logs an earnings entry. The Earnings tab shows your net balance, history, and payout schedule."
  },
  {
    q: "Can I work part-time / set my own hours?",
    a: "Absolutely. The Availability tab lets you mark exactly which dates and time windows you're open for. Bookings are only matched to your free slots."
  }
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a }
  }))
};

const HERO_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "HanuonePro Home Care Network",
  serviceType: "Healthcare gig platform",
  provider: { "@type": "Organization", name: "Hanuone" },
  areaServed: { "@type": "City", name: "Lucknow", addressCountry: "IN" },
  audience: {
    "@type": "Audience",
    audienceType: "Healthcare professionals (doctors, nurses, caregivers, physiotherapists, ward boys)"
  },
  url: SITE_URL
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HERO_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />

      {/* Header */}
      <header className="border-b border-primary/10 bg-white">
        <div className="container-page flex h-14 items-center justify-between sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="HanuonePro" width={36} height={36} priority className="h-8 w-8 sm:h-9 sm:w-9" />
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight text-primary">HanuonePro</div>
              <div className="hidden text-[11px] text-muted sm:block">For doctors & gig professionals</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-outline px-3 py-2 text-sm">Login</Link>
            <Link href="/register" className="btn-primary px-3 py-2 text-sm">Register</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container-page py-12 text-center sm:py-20">
          <span className="inline-block rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Hanuone Home Care Network
          </span>
          <h1 className="mt-3 text-3xl font-bold text-ink sm:text-5xl">
            Your healthcare career,<br className="hidden sm:block" />
            <span className="text-primary">managed in one place</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:mt-4 sm:text-lg">
            HanuonePro is the professional dashboard for doctors, nurses, ward boys, caregivers and
            physiotherapists in Lucknow. Register, get verified, mark your availability, and track
            your gig earnings. Free for verified professionals.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
            <Link href="/register" className="btn-primary text-base px-5 py-3 sm:px-6">Get started, free</Link>
            <Link href="/login" className="btn-outline text-base px-5 py-3 sm:px-6">I already have an account</Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><ClipboardCheck size={14} className="text-primary" /> Verified in 24 hrs</span>
            <span className="inline-flex items-center gap-1"><Smartphone size={14} className="text-primary" /> Works on any phone</span>
            <span className="inline-flex items-center gap-1"><HeartHandshake size={14} className="text-primary" /> No upfront fees</span>
          </div>
        </section>

        {/* Feature cards */}
        <section className="container-page pb-12">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[
              { icon: Shield, title: "Get verified", desc: "Upload Aadhaar and certificates. We verify within 24 hours." },
              { icon: Calendar, title: "Mark availability", desc: "Set exactly when you're free. Families see your open slots." },
              { icon: Wallet, title: "Track earnings", desc: "Every completed gig shows up. See your income at a glance." },
              { icon: Stethoscope, title: "Grow your practice", desc: "Verified profiles get priority on Hanuone's patient directory." }
            ].map((c) => (
              <div key={c.title} className="card p-5 sm:p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <c.icon size={20} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who's it for */}
        <section className="container-page pb-12">
          <h2 className="text-xl font-bold text-ink sm:text-2xl">Who is HanuonePro for?</h2>
          <p className="mt-1 text-sm text-muted">Built for every professional who delivers care at a clinic or at home in Lucknow.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Doctors", d: "GPs and specialists who do home visits and tele-consults." },
              { t: "Nurses", d: "BSc, GNM and ANM nurses for daily and overnight elder care." },
              { t: "Ward boys & attendants", d: "Daily attendants, post-surgery support, hospital escorts." },
              { t: "Caregivers", d: "Trained caregivers for senior citizens and bedridden patients." },
              { t: "Physiotherapists", d: "Home-visit physios for stroke, joint and post-op recovery." },
              { t: "Home-care agencies", d: "Multi-staff agencies managing teams of nurses and caregivers." }
            ].map((p) => (
              <div key={p.t} className="card p-5">
                <div className="text-sm font-semibold text-ink">{p.t}</div>
                <div className="mt-1 text-xs text-muted">{p.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="container-page pb-12">
          <h2 className="text-xl font-bold text-ink sm:text-2xl">How it works</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: 1, t: "Register", d: "Email + password and your basic profile in under 2 minutes." },
              { n: 2, t: "Upload documents", d: "Aadhaar and any certificates. PDFs and photos welcome." },
              { n: 3, t: "Get verified", d: "Our team verifies within 24 hours and turns on bookings." },
              { n: 4, t: "Earn", d: "Accept bookings, deliver care, and watch your earnings grow." }
            ].map((s) => (
              <li key={s.n} className="card p-5">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white text-sm font-bold">{s.n}</div>
                <div className="mt-3 text-sm font-semibold text-ink">{s.t}</div>
                <div className="mt-1 text-xs text-muted">{s.d}</div>
              </li>
            ))}
          </ol>
        </section>

        {/* Quote */}
        <section className="container-page pb-12">
          <div className="card flex items-start gap-4 bg-bg/60 p-6 sm:p-8">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-primary/10 text-primary">
              <Quote size={18} />
            </span>
            <p className="text-base text-ink sm:text-lg">
              <span className="font-semibold">Built by doctors,</span>{" "}
              <span className="text-muted">for the wellwishers of their loved ones, so the right care is never more than a search away.</span>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="container-page pb-16">
          <h2 className="text-xl font-bold text-ink sm:text-2xl">Frequently asked questions</h2>
          <div className="mt-5 grid gap-3">
            {FAQS.map((f, i) => (
              <details key={i} className="card group p-5 open:shadow">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
                  <span>{f.q}</span>
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary/10 text-primary transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-primary/10 bg-white py-6">
        <div className="container-page flex flex-col items-center gap-2 text-center text-xs text-muted sm:flex-row sm:justify-between sm:text-left">
          <span>HanuonePro by Hanuone. Built by doctors, for the wellwishers of their loved ones.</span>
          <a href="https://hanuone.vercel.app" className="text-primary hover:underline">Patients: visit Hanuone</a>
        </div>
      </footer>
    </div>
  );
}
