"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Sparkles, Receipt, Settings, ClipboardList,
  Wallet, UserCircle, UserCheck, CalendarDays, Menu, X, LogOut, ShieldCheck,
  BarChart3, Send, FileText, CalendarRange, Home, type LucideIcon
} from "lucide-react";

type NavItem = { label: string; href: string; icon?: string };

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, patients: Users, scribe: Sparkles, billing: Receipt,
  settings: Settings, myday: ClipboardList, earnings: Wallet, profile: UserCircle,
  providers: UserCheck, bookings: CalendarDays, finance: Wallet, shield: ShieldCheck,
  analytics: BarChart3, dispatch: Send, prescriptions: FileText, appointments: CalendarRange
};

const THEMES: Record<string, { accent: string; accentBg: string; ring: string; logo: string }> = {
  clinic: { accent: "text-[#01586C]", accentBg: "bg-[#01586C]", ring: "ring-[#01586C]/20", logo: "from-[#01586C] to-[#0a7d96]" },
  care: { accent: "text-[#0a7d96]", accentBg: "bg-[#0a7d96]", ring: "ring-[#0a7d96]/20", logo: "from-[#0a7d96] to-[#13a8c4]" },
  console: { accent: "text-slate-900", accentBg: "bg-slate-900", ring: "ring-slate-900/15", logo: "from-slate-800 to-slate-900" }
};

/**
 * Next-gen portal shell: a clean white sidebar (desktop) with brand accent,
 * a mobile slide-over drawer, and a sticky top bar. Shared by Clinic / Care /
 * Console so all three feel like one premium product.
 */
export default function PortalShell({
  brand, theme, nav, userName, children
}: { brand: string; theme: keyof typeof THEMES; nav: NavItem[]; userName: string; children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const t = THEMES[theme];
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || (href !== `/${theme}` && pathname.startsWith(href));
  const current = [...nav].reverse().find((n) => isActive(n.href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const SidebarInner = (
    <>
      <Link href={`/${theme}`} className="flex items-center gap-2.5 px-5 py-5" onClick={() => setOpen(false)}>
        <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${t.logo} text-sm font-black text-white shadow-sm`}>H1</span>
        <span className="text-[15px] font-bold tracking-tight text-slate-800">{brand}</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((n) => {
          const Icon = ICONS[n.icon || "dashboard"] || LayoutDashboard;
          const active = isActive(n.href);
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? `${t.accent} bg-slate-100` : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
              <Icon size={18} className={active ? t.accent : "text-slate-400 group-hover:text-slate-600"} />
              {n.label}
              {active && <span className={`ml-auto h-1.5 w-1.5 rounded-full ${t.accentBg}`} />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${t.logo} text-xs font-bold text-white`}>
            {userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-700">{userName}</div>
            <div className="text-[11px] text-slate-400">{brand}</div>
          </div>
          <button onClick={logout} aria-label="Log out" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><LogOut size={16} /></button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex print:hidden">{SidebarInner}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            {SidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:px-6 print:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"><Menu size={20} /></button>
          <h1 className="text-base font-bold text-slate-800">{current?.label || brand}</h1>
          <Link href="/" className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <Home size={14} /> <span className="hidden sm:inline">Main site</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
