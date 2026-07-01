"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, LayoutGrid, Sparkles, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/doctors", label: "Doctors", icon: Search, match: (p: string) => p.startsWith("/doctors") },
  { href: "/services", label: "Services", icon: LayoutGrid, match: (p: string) => p.startsWith("/services") || p.startsWith("/lab") || p.startsWith("/medicine") || p.startsWith("/vitals") },
  { href: "/ai-doctor", label: "AI Doctor", icon: Sparkles, match: (p: string) => p.startsWith("/ai-doctor") },
  { href: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") || p.startsWith("/login") }
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      data-mobile-nav
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
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition active:scale-95 ${
                  active ? "text-primary" : "text-muted hover:text-ink"
                }`}
              >
                <Icon size={20} className={`transition ${active ? "scale-110 text-primary" : "text-slate-500"}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
