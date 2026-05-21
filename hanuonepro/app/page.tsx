import Link from "next/link";
import { Stethoscope, Shield, Calendar, Wallet } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-primary/10 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <Stethoscope size={18} />
            </div>
            <span className="text-lg font-bold text-primary">HanuonePro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-outline">Login</Link>
            <Link href="/register" className="btn-primary">Register</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container-page py-16 text-center sm:py-24">
          <h1 className="text-3xl font-bold text-ink sm:text-5xl">
            Your healthcare career,<br />
            <span className="text-primary">managed in one place</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted sm:text-lg">
            HanuonePro is the professional dashboard for doctors, nurses, ward boys and caregivers
            in Lucknow. Register, get verified, mark your availability, and track your gig earnings.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary text-base px-6 py-3">Get started free</Link>
            <Link href="/login" className="btn-outline text-base px-6 py-3">I already have an account</Link>
          </div>
        </section>

        <section className="container-page pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: "Get verified", desc: "Upload your Aadhaar and certificates. We verify within 24 hours." },
              { icon: Calendar, title: "Mark availability", desc: "Set your working hours and days. Families see when you're free." },
              { icon: Wallet, title: "Track earnings", desc: "Every completed gig is logged. See your income at a glance." },
              { icon: Stethoscope, title: "Grow your practice", desc: "Verified profiles get priority on Hanuone's patient-facing directory." }
            ].map((c) => (
              <div key={c.title} className="card p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <c.icon size={20} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-primary/10 bg-white py-6">
        <div className="container-page text-center text-xs text-muted">
          HanuonePro by Hanuone. Built by doctors, for the wellwishers of their loved ones.
        </div>
      </footer>
    </div>
  );
}
