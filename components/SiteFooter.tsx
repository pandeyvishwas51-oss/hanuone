import Link from "next/link";
import { Quote } from "lucide-react";
import WaitlistForm from "./WaitlistForm";

export default function SiteFooter() {
  return (
    <footer className="border-t border-primary/10 bg-white">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-3">
        <div>
          <div className="text-lg font-bold text-primary">Hanuone</div>
          <p className="mt-2 text-sm text-muted">
            Lucknow ke Trusted Doctors, Ek Jagah. A free, verified directory of doctors in Lucknow,
            built for families looking after their parents from afar.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Explore</div>
            <ul className="space-y-1.5 text-ink">
              <li><Link href="/doctors" className="hover:text-primary">All Doctors</Link></li>
              <li><Link href="/specializations/cardiologist" className="hover:text-primary">Cardiologists</Link></li>
              <li><Link href="/specializations/gynecologist" className="hover:text-primary">Gynecologists</Link></li>
              <li><Link href="/specializations/pediatrician" className="hover:text-primary">Pediatricians</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Localities</div>
            <ul className="space-y-1.5 text-ink">
              <li><Link href="/localities/gomtinagar" className="hover:text-primary">Gomtinagar</Link></li>
              <li><Link href="/localities/hazratganj" className="hover:text-primary">Hazratganj</Link></li>
              <li><Link href="/localities/aliganj" className="hover:text-primary">Aliganj</Link></li>
              <li><Link href="/localities/indira-nagar" className="hover:text-primary">Indira Nagar</Link></li>
            </ul>
          </div>
        </div>
        <div className="rounded-2xl bg-primary p-6 text-white">
          <div className="text-base font-semibold">Hanuone Home Care Network</div>
          <p className="mt-1 text-sm text-white/80">
            Are you a doctor, nurse or caregiver? Register to offer home visits and elder care to Lucknow families.
          </p>
          <div className="mt-4">
            <WaitlistForm compact />
          </div>
        </div>
      </div>

      {/* Doctor-led quote */}
      <div className="border-t border-primary/10 bg-bg/60">
        <div className="container-page flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-primary/10 text-primary">
            <Quote size={18} />
          </span>
          <p className="text-sm text-ink sm:text-base">
            <span className="font-semibold">Built by doctors,</span>{" "}
            <span className="text-muted">
              for the wellwishers of their loved ones, so the right care is never more than a search away.
            </span>
          </p>
        </div>
      </div>

      <div className="border-t border-primary/10">
        <div className="container-page flex flex-col items-start gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>(c) {new Date().getFullYear()} Hanuone. Made for Lucknow with care.</span>
          <span>Lucknow, India</span>
        </div>
      </div>
    </footer>
  );
}
