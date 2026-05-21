"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Stethoscope, MapPin, HeartHandshake } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/doctors", label: "Search", icon: Search, match: (p: string) => p.startsWith("/doctors") },
  {
    href: "/specializations/cardiologist",
    label: "Specialties",
    icon: Stethoscope,
    match: (p: string) => p.startsWith("/specializations")
  },
  {
    href: "/localities/gomtinagar",
    label: "Localities",
    icon: MapPin,
    match: (p: string) => p.startsWith("/localities")
  },
  {
    href: "https://hanuonepro.vercel.app/register",
    label: "Home Care",
    icon: HeartHandshake,
    match: (p: string) => p.startsWith("/join")
  }
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/10 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                  active ? "text-primary" : "text-muted hover:text-ink"
                }`}
              >
                <Icon size={20} className={active ? "text-primary" : "text-slate-500"} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
