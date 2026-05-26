import Link from "next/link";
import Image from "next/image";
import HeaderLocationChip from "./HeaderLocationChip";
import CitySelector from "./CitySelector";
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
            src="/logo.svg"
            alt="Hanuone"
            width={200}
            height={56}
            priority
            className="h-9 w-auto sm:h-11"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink lg:flex">
          <Link href="/doctors" className="hover:text-accent">Find Doctors</Link>
          <Link href="/services" className="hover:text-accent">Services</Link>
          <Link href="/specializations/cardiologist" className="hover:text-accent">Specialties</Link>
          <Link href="https://hanuonepro.vercel.app/register" className="hover:text-accent">For Doctors</Link>
        </nav>

        <div className="flex items-center gap-2 min-w-0">
          <CitySelector initialCityName={activeCity.name} />
          <HeaderLocationChip localities={localities} />
        </div>
      </div>
    </header>
  );
}
