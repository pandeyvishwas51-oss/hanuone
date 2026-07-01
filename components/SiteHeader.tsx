import Link from "next/link";
import Image from "next/image";
import HeaderLocationChip from "./HeaderLocationChip";
import CitySelector from "./CitySelector";
import AccountNavLink from "./AccountNavLink";
import { getAllLocalities } from "@/lib/queries";
import { getActiveCity } from "@/lib/active-city";

export default async function SiteHeader() {
  const activeCity = getActiveCity();
  const localities = await getAllLocalities(activeCity.name);

  return (
    <header
      data-site-header
      className="sticky top-0 z-40 border-b border-primary/10 bg-white/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container-page flex h-14 items-center justify-between gap-2 sm:h-16">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image
            src="/logo.png"
            alt="HanuONE — Trusted Healthcare, Right at Home"
            width={304}
            height={80}
            priority
            className="h-9 w-auto sm:h-11"
          />
        </Link>

        <nav className="hidden items-center gap-5 whitespace-nowrap text-sm font-medium text-ink lg:flex">
          <Link href="/doctors" className="hover:text-accent">Find Doctors</Link>
          <Link href="/services" className="hover:text-accent">Services</Link>
          <Link href="/lab" className="hover:text-accent">Lab Tests</Link>
          <Link href="/medicine" className="hover:text-accent">Medicines</Link>
          <Link href="/vitals" className="hover:text-accent">Vital Checkup</Link>
          <Link href="/ai-doctor" className="font-semibold text-accent hover:text-accent-600">AI Doctor</Link>
          <Link href="/providers/join" className="hover:text-accent">For Doctors</Link>
          <AccountNavLink />
        </nav>

        <div className="flex items-center gap-2 min-w-0">
          <CitySelector initialCityName={activeCity.name} />
          {/* Locality picker is redundant on small screens (it's in the search
              bar + bottom nav). Hide it on mobile to keep the header clean. */}
          <div className="hidden sm:block">
            <HeaderLocationChip localities={localities} />
          </div>
        </div>
      </div>
    </header>
  );
}
