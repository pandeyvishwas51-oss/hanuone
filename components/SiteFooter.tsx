import Link from "next/link";
import Image from "next/image";
import { Quote, Instagram, Facebook, Twitter, ArrowRight } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="border-t border-primary/10 bg-white">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Hanuone" width={180} height={50} className="h-9 w-auto" />
          </div>
          <p className="mt-3 text-sm text-muted">
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
            Are you a doctor, nurse, ward boy, caregiver or physiotherapist? Register on HanuonePro
            to manage your availability and receive home-care gigs.
          </p>
          <Link
            href="https://hanuonepro.vercel.app/register"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-white/90"
          >
            Register on HanuonePro <ArrowRight size={14} />
          </Link>
          <Link
            href="https://hanuonepro.vercel.app/login"
            className="mt-2 block text-xs text-white/70 hover:text-white"
          >
            Already registered? Login
          </Link>
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
        <div className="container-page flex flex-col items-start gap-3 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>(c) {new Date().getFullYear()} Hanuone. Made for Lucknow with care.</span>
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/Hanuone_0"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanuone on Instagram"
              className="grid h-9 w-9 place-items-center rounded-full border border-primary/15 text-primary transition hover:border-primary hover:text-primary-600"
            >
              <Instagram size={16} />
            </a>
            <a
              href="https://www.facebook.com/share/1CZnNMGXk5/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanuone on Facebook"
              className="grid h-9 w-9 place-items-center rounded-full border border-primary/15 text-primary transition hover:border-primary hover:text-primary-600"
            >
              <Facebook size={16} />
            </a>
            <a
              href="https://x.com/Hanuone_0"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanuone on X"
              className="grid h-9 w-9 place-items-center rounded-full border border-primary/15 text-primary transition hover:border-primary hover:text-primary-600"
            >
              <Twitter size={16} />
            </a>
            <span className="hidden sm:inline">Lucknow, India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
