import Link from "next/link";
import Image from "next/image";
import HeaderLocationChip from "./HeaderLocationChip";
import { getAllLocalities } from "@/lib/queries";

export default async function SiteHeader() {
  const localities = await getAllLocalities();

  return (
    <header
      className="sticky top-0 z-40 border-b border-primary/10 bg-white/90 backdrop-blur"
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
          <Link href="/doctors" className="hover:text-primary">Find Doctors</Link>
          <Link href="/specializations/cardiologist" className="hover:text-primary">Specialties</Link>
          <Link href="/localities/gomtinagar" className="hover:text-primary">Localities</Link>
          <Link href="https://hanuonepro.vercel.app/register" className="hover:text-primary">Home Care Network</Link>
        </nav>

        <div className="flex items-center gap-2 min-w-0">
          <HeaderLocationChip localities={localities} />
          <Link href="https://hanuonepro.vercel.app/register" className="btn-outline hidden md:inline-flex">List Your Practice</Link>
        </div>
      </div>
    </header>
  );
}
