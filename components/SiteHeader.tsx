import Link from "next/link";
import { Stethoscope } from "lucide-react";
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
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-primary text-white">
            <Stethoscope size={18} />
          </span>
          <div className="leading-tight min-w-0">
            <div className="truncate text-base font-bold tracking-tight text-primary">Hanuone</div>
            <div className="hidden text-[11px] text-muted sm:block">Lucknow ke Trusted Doctors</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink lg:flex">
          <Link href="/doctors" className="hover:text-primary">Find Doctors</Link>
          <Link href="/specializations/cardiologist" className="hover:text-primary">Specialties</Link>
          <Link href="/localities/gomtinagar" className="hover:text-primary">Localities</Link>
          <Link href="/join" className="hover:text-primary">Home Care Network</Link>
        </nav>

        <div className="flex items-center gap-2 min-w-0">
          <HeaderLocationChip localities={localities} />
          <Link href="/join" className="btn-outline hidden md:inline-flex">List Your Practice</Link>
        </div>
      </div>
    </header>
  );
}
