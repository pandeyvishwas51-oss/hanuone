import Link from "next/link";
import Image from "next/image";
import HeroVideo from "@/components/HeroVideo";
import { img } from "@/lib/images";
import SearchBar from "@/components/SearchBar";
import CategoryBar from "@/components/CategoryBar";
import SpecialtyCard from "@/components/SpecialtyCard";
import LocalityChip from "@/components/LocalityChip";
import DoctorCard from "@/components/DoctorCard";
import HeroHeadline from "@/components/HeroHeadline";
import FaqSection from "@/components/FaqSection";
import {
  getAllSpecializations,
  getAllLocalities,
  getFeaturedDoctors
} from "@/lib/queries";
import { getActiveCity } from "@/lib/active-city";
import { unstable_cache } from "next/cache";
import { ShieldCheck, Users, Sparkles, BadgeCheck as CheckBadge } from "lucide-react";
import { HOME_FAQS } from "@/lib/seo";

// The page itself is dynamic (geo city is resolved per-request from headers),
// but the homepage's three catalog reads only vary by city — so they're cached
// for 5 minutes per city instead of hitting Postgres on every visit.
export const dynamic = "force-dynamic";

const getHomeData = (city: string) =>
  unstable_cache(
    async () => {
      const [specializations, localities, featured] = await Promise.all([
        getAllSpecializations(city),
        getAllLocalities(city),
        getFeaturedDoctors(10, city)
      ]);
      return { specializations, localities, featured };
    },
    ["home-data", city],
    { revalidate: 300, tags: ["doctors"] }
  )();

export default async function HomePage() {
  const activeCity = getActiveCity();
  const { specializations, localities, featured } = await getHomeData(activeCity.name);

  const topSpecialties = specializations.slice(0, 6);
  const topLocalities = localities.slice(0, 8);
  const visitorCity = activeCity.name;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-bg to-bg">
        {/* Background story video (landscape, all screens) */}
        <HeroVideo />

        <div className="container-page relative z-10 pb-10 pt-8 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              One Platform · Complete Healthcare
            </span>
            <HeroHeadline initialCity={visitorCity} />
            <p className="mt-3 text-sm font-medium text-primary sm:text-base">
              Trusted Healthcare, Right at Home.
            </p>
            <p className="mt-2 text-sm text-muted sm:text-lg">
              Consult doctors, book lab tests, order medicines, nursing, physiotherapy and an AI health
              assistant — for your whole family in {activeCity.name}.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/ai-doctor" className="btn-secondary">
                🎙️ Talk to Dr. Hanu
              </Link>
              <Link href="/services" className="btn-primary">
                Book Now
              </Link>
              <Link href="/services" className="btn-outline">
                Explore Services
              </Link>
            </div>
            <p className="mt-2 text-xs text-muted">Speak in Hindi or English — our AI doctor listens and replies by voice.</p>
          </div>

          <div className="mx-auto mt-6 max-w-4xl sm:mt-8">
            <SearchBar specializations={specializations} localities={localities} />
          </div>

          {/* Urban-Company-style one-tap category access */}
          <CategoryBar />

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">Popular:</span>
            {["Cardiologist", "Pediatrician", "Gynecologist", "Orthopedic"].map((s) => (
              <Link
                key={s}
                href={`/doctors?specialty=${encodeURIComponent(s)}`}
                className="rounded-full bg-white px-3 py-1.5 text-primary shadow-sm hover:shadow"
              >
                {s}
              </Link>
            ))}
          </div>

          {/* Trust bar */}
          <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-primary/80">
            {[
              "Verified Doctors",
              "Trusted Healthcare Partners",
              "Affordable Pricing",
              "Home Healthcare Services",
              "AI-Powered Health Guidance",
              "Secure Health Records"
            ].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckBadge className="h-4 w-4 text-accent" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Services showcase */}
      <section className="section pt-2">
        <div className="container-page">
          <h2 className="h2">Everything your family needs</h2>
          <p className="mt-1 text-sm text-muted">One platform — consult, test, medicate, recover and monitor.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { href: "/doctors", title: "Consult a doctor", desc: "Video or clinic visit", image: img("consult") },
              { href: "/medicine", title: "Pharmacy delivery", desc: "Medicines to your door", image: img("medicine") },
              { href: "/lab", title: "Diagnostics & lab tests", desc: "Home sample, fast reports", image: img("lab") },
              { href: "/vitals", title: "Vital Checkup", desc: "Instant flagged report", image: img("vitals") },
              { href: "/home-nursing", title: "Nursing & home care", desc: "Skilled care at home", image: img("nursing") },
              { href: "/services", title: "Physiotherapy", desc: "Rehab & mobility care", image: img("physio") },
              { href: "/ai-doctor", title: "AI Health Assistant", desc: "Symptom check & guidance", image: img("ai") },
              { href: "/services", title: "Nutrition support", desc: "Personalised diet plans", image: img("nutrition") }
            ].map((s) => (
              <Link key={s.title} href={s.href} className="card group overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image src={s.image} alt={s.title} fill sizes="(max-width:1024px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  <div className="absolute bottom-0 p-3 text-white">
                    <div className="text-sm font-semibold">{s.title}</div>
                    <div className="text-[11px] text-white/85">{s.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top specialties */}
      <section className="section">
        <div className="container-page">
          <div className="mb-5 flex items-end justify-between sm:mb-6">
            <div>
              <h2 className="h2">Most searched specialties</h2>
              <p className="mt-1 hidden text-sm text-muted sm:block">
                Browse the specialties our families ask about most.
              </p>
            </div>
            <Link href="/doctors" className="text-sm text-primary hover:underline whitespace-nowrap">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            {topSpecialties.map((s) => (
              <SpecialtyCard key={s.slug} specialty={s} />
            ))}
          </div>
        </div>
      </section>

      {/* Localities */}
      <section className="section pt-0">
        <div className="container-page">
          <h2 className="h2">Popular localities in {activeCity.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Doctors near where your family lives. You can also enter a 6-digit pincode in the search bar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {topLocalities.map((l) => (
              <LocalityChip key={l.slug} locality={l} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured doctors */}
      <section className="section pt-0">
        <div className="container-page">
          <div className="mb-5 flex items-end justify-between sm:mb-6">
            <div>
              <h2 className="h2">Featured doctors</h2>
              <p className="mt-1 hidden text-sm text-muted sm:block">
                Top-rated, verified profiles in {activeCity.name}.
              </p>
            </div>
            <Link href="/doctors" className="text-sm text-primary hover:underline whitespace-nowrap">
              See all
            </Link>
          </div>
          {featured.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              No doctors in the database yet. Run the seed script or scraper.
            </div>
          ) : (
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:gap-4 sm:px-0">
              {featured.map((d, i) => (
                <div key={d.id} className="w-[78%] shrink-0 snap-start sm:w-[340px]">
                  <DoctorCard doctor={d} index={i} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Hanuone */}
      <section className="section pt-0">
        <div className="container-page grid gap-3 sm:gap-4 sm:grid-cols-3">
          {[
            {
              icon: <ShieldCheck className="text-accent" />,
              title: "Verified profiles",
              desc: "Every doctor cross-checked against public registries before listing."
            },
            {
              icon: <Users className="text-accent" />,
              title: "Local reviews",
              desc: "Real reviews from Lucknow families, not anonymous numbers."
            },
            {
              icon: <Sparkles className="text-accent" />,
              title: "Free, forever",
              desc: "No fees, no hidden ads. Our home-care network funds the directory."
            }
          ].map((card) => (
            <div key={card.title} className="card p-5 sm:p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10">
                {card.icon}
              </div>
              <h3 className="h3 mt-3">{card.title}</h3>
              <p className="mt-1 text-sm text-muted">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="section pt-0">
        <div className="container-page">
          <div className="card grid items-center gap-5 bg-primary p-6 text-white sm:grid-cols-2 sm:gap-6 sm:p-8">
            <div>
              <h3 className="text-lg font-bold sm:text-xl">Are you a doctor in Lucknow?</h3>
              <p className="mt-1 text-sm text-white/80">
                Get listed for free. Verified profiles get more visibility on Hanuone.
              </p>
              <Link href="/providers/join" className="btn-whatsapp mt-4 inline-flex">
                Get listed free
              </Link>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 sm:p-5">
              <div className="text-sm font-semibold">HanuOne Home Care Network</div>
              <p className="mt-1 text-xs text-white/80">
                Are you a nurse, ward boy, caregiver or physiotherapist? Join HanuOne to get
                home-care work near you in Lucknow.
              </p>
              <Link href="/providers/register" className="btn-whatsapp mt-4 inline-flex">
                Register as a professional
              </Link>
              <Link href="/login?next=/providers" className="mt-2 block text-xs text-white/70 hover:text-white">
                Already registered? Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FaqSection faqs={HOME_FAQS} />
    </>
  );
}
