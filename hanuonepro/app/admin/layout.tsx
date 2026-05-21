import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Stethoscope,
  Mail,
  Activity
} from "lucide-react";
import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/professionals", label: "Professionals", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/doctors", label: "Doctors directory", icon: Stethoscope },
  { href: "/admin/waitlist", label: "Waitlist", icon: Mail },
  { href: "/admin/traffic", label: "Live traffic", icon: Activity }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin");
  if (!session.user.isAdmin) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-none border-r border-slate-100 bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white text-xs font-bold">A</div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-primary">Hanuone Admin</div>
            <div className="text-[11px] text-muted">Founders & team</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-primary/5 hover:text-primary">
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {(session.user.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">{session.user.email}</div>
              <div className="text-[11px] text-emerald-600">Admin</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4 md:hidden">
          <div className="text-sm font-bold text-primary">Hanuone Admin</div>
          <span className="badge badge-verified">Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <ul className="grid grid-cols-6">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] text-muted hover:text-primary">
                  <Icon size={16} />
                  <span>{label.split(" ")[0]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
