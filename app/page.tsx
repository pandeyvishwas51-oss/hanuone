import Link from "next/link";
import Image from "next/image";
import { img } from "@/lib/images";
import SearchBar from "@/components/SearchBar";
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
import { ShieldCheck, Users, Sparkles } from "lucide-react";
import { HOME_FAQS } from "@/lib/seo";

// Re-render every 5 minutes; geo headers are read per-request anyway because
// `headers()` opts the page into dynamic rendering.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const activeCity = getActiveCity();
  const [specializations, localities, featured] = await Promise.all([
    getAllSpecializations(activeCity.name),
    getAllLocalities(activeCity.name),
    getFeaturedDoctors(10, activeCity.name)
  ]);

  const topSpecialties = specializations.slice(0, 6);
  const topLocalities = localities.slice(0, 8);
  const visitorCity = activeCity.name;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-bg to-bg">
        <div className="container-page pb-10 pt-8 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              Trusted Healthcare, At Home
            </span>
            <HeroHeadline initialCity={visitorCity} />
            <p className="mt-3 text-sm text-muted sm:text-lg">
              Find verified doctors in {activeCity.name} for your family. Search by specialty, locality or
              pincode. Free, simple, built for parents.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-4xl sm:mt-8">
            <SearchBar specializations={specializations} localities={localities} />
          </div>

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
        </div>
      </section>

      {/* Services showcase */}
      <section className="section pt-2">
        <div className="container-page">
          <h2 className="h2">Everything your family needs</h2>
          <p className="mt-1 text-sm text-muted">One platform — consult, test, medicate and monitor.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { href: "/doctors", title: "Consult a doctor", desc: "Video or clinic visit", image: img("consult") },
              { href: "/lab", title: "Lab tests at home", desc: "Reports in 24–48h", image: img("lab") },
              { href: "/medicine", title: "Medicines at home", desc: "Prescription delivery", image: img("medicine") },
              { href: "/vitals", title: "Vital Checkup", desc: "Instant flagged report", image: img("vitals") }
            ].map((s) => (
              <Link key={s.href} href={s.href} className="card group overflow-hidden p-0 transition hover:shadow-lg">
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
              {featured.map((d) => (
                <div key={d.id} className="w-[78%] shrink-0 snap-start sm:w-[340px]">
                  <DoctorCard doctor={d} />
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
              <div className="text-sm font-semibold">Hanuone Home Care Network</div>
              <p className="mt-1 text-xs text-white/80">
                Are you a nurse, ward boy, caregiver or physiotherapist? Register on HanuonePro to get
                home-care gigs in Lucknow.
              </p>
              <Link href="/providers/register" className="btn-whatsapp mt-4 inline-flex">
                Register as a professional
              </Link>
              <Link href="/login" className="mt-2 block text-xs text-white/70 hover:text-white">
                Already registered? Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FaqSection faqs={HOME_FAQS} />
    </>
  );
}
