import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { img } from "@/lib/images";
import {
  Video,
  HeartHandshake,
  Dumbbell,
  TestTube2,
  ShieldCheck,
  Users,
  Pill,
  Headphones,
  ArrowRight
} from "lucide-react";
import ServiceRequestDialog from "@/components/ServiceRequestDialog";
import { getActiveCity } from "@/lib/active-city";

export const metadata: Metadata = {
  title: "Services, Hanuone Trusted Healthcare",
  description: "Teleconsultation, home nursing, physiotherapy, diagnostics, preventive health, elder care, medicines, and digital support, all on Hanuone."
};

const SERVICES = [
  {
    id: "teleconsult", label: "Teleconsultation",
    icon: Video, live: true,
    desc: "Talk to a verified doctor on video or call. Same-day slots, prescription delivered to your inbox.",
    cta: "Talk to a doctor"
  },
  {
    id: "nursing", label: "Home Nursing",
    icon: HeartHandshake, live: true,
    desc: "GNM and BSc nurses for daily, overnight, and post-surgery care at home.",
    cta: "Request a nurse"
  },
  {
    id: "physio", label: "Physiotherapy",
    icon: Dumbbell, live: true,
    desc: "Physios who visit you, ideal for stroke, joint, and post-op recovery.",
    cta: "Book a physio"
  },
  {
    id: "diagnostics", label: "Diagnostics & Lab",
    icon: TestTube2, live: false,
    desc: "Home sample collection for blood tests, urine, and full body panels. Coming soon.",
    cta: "Notify me, diagnostics"
  },
  {
    id: "preventive", label: "Preventive Health Programs",
    icon: ShieldCheck, live: true,
    desc: "Quarterly health check-ups for elderly parents. Curated by GP and a specialist.",
    cta: "Plan a check-up"
  },
  {
    id: "elder", label: "Elder Care Assistance",
    icon: Users, live: true,
    desc: "Trained attendants for senior citizens, post-discharge support, and day-care companions.",
    cta: "Get an attendant"
  },
  {
    id: "medicines", label: "Medicines @ Home",
    icon: Pill, live: false,
    desc: "30-minute medicine delivery in select pincodes. Launching soon.",
    cta: "Notify me, medicines"
  },
  {
    id: "digital-support", label: "Digital Healthcare Support",
    icon: Headphones, live: true,
    desc: "Help your parents use telemedicine, upload reports, and book online. We do it for them.",
    cta: "Get digital help"
  }
] as const;

export default function ServicesPage() {
  const city = getActiveCity().name;
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          One platform. Complete healthcare.
        </span>
        <h1 className="h1 mt-3">Connected care, complete support</h1>
        <p className="mt-3 text-sm text-muted sm:text-lg">
          Hanuone is your trusted healthcare partner. Doctors, nurses, physios, diagnostics, medicines and elder care, all in one app.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full bg-primary/5 px-3 py-1.5 text-primary">Active in {city}</span>
          <Link href="/doctors" className="rounded-full bg-primary text-white px-3 py-1.5 hover:bg-primary-600">Find a doctor</Link>
        </div>
      </div>

      <div className="relative mx-auto mt-8 aspect-[16/7] w-full max-w-5xl overflow-hidden rounded-2xl">
        <Image
          src={img("heroHome")}
          alt="Trusted healthcare at home with Hanuone"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
      </div>

      <section className="mt-10 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((s) => (
          <article key={s.id} className="card p-5 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <s.icon size={20} />
              </div>
              {s.live ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">LIVE</span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">SOON</span>
              )}
            </div>
            <h2 className="mt-3 text-base font-semibold text-ink">{s.label}</h2>
            <p className="mt-1 text-sm text-muted flex-1">{s.desc}</p>
            <ServiceRequestDialog
              service={s.id}
              serviceLabel={s.label}
              isLive={s.live}
              defaultCity={city}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              trigger={<>{s.cta} <ArrowRight size={14} /></>}
            />
          </article>
        ))}
      </section>

      <section className="mt-12 card overflow-hidden bg-primary text-white">
        <div className="grid items-center gap-6 p-6 sm:grid-cols-2 sm:gap-8 sm:p-10">
          <div>
            <h2 className="h2 text-white">Trusted by families across {city}</h2>
            <p className="mt-2 text-white/80">
              Compassionate, accessible, affordable healthcare for every family. From doctor consultations to home care, we make sure the right care is never more than a search away.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/doctors" className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600">Find doctors</Link>
              <Link href="/my-bookings" className="rounded-lg border border-white/30 bg-transparent px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5">My bookings</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">2,500+</div><div className="text-white/75">Verified doctors</div></div>
            <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">2</div><div className="text-white/75">Cities live</div></div>
            <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">24/7</div><div className="text-white/75">WhatsApp support</div></div>
          </div>
        </div>
      </section>
    </div>
  );
}
