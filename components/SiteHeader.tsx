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
      className="sticky top-0 z-40 border-b border-primary/10 bg-white/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container-page flex h-14 items-center justify-between gap-2 sm:h-16">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image
            src="/logo.png"
            alt="Hanuone"
            width={120}
            height={120}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink lg:flex">
          <Link href="/doctors" className="hover:text-accent">Find Doctors</Link>
          <Link href="/services" className="hover:text-accent">Services</Link>
          <Link href="/lab" className="hover:text-accent">Lab Tests</Link>
          <Link href="/medicine" className="hover:text-accent">Medicines</Link>
          <Link href="/vitals" className="hover:text-accent">Vital Checkup</Link>
          <Link href="/providers/join" className="hover:text-accent">For Doctors</Link>
          <AccountNavLink />
        </nav>

        <div className="flex items-center gap-2 min-w-0">
          <CitySelector initialCityName={activeCity.name} />
          <HeaderLocationChip localities={localities} />
        </div>
      </div>
    </header>
  );
}
