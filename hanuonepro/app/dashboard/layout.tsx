export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { LayoutDashboard, Calendar, ClipboardList, Wallet, User } from "lucide-react";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/availability", label: "Availability", icon: Calendar },
  { href: "/dashboard/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/dashboard/earnings", label: "Earnings", icon: Wallet },
  { href: "/dashboard/profile", label: "Profile", icon: User }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile] = await db()
    .select({
      fullName: schema.professionals.fullName,
      role: schema.professionals.role,
      status: schema.professionals.status,
      profilePhotoUrl: schema.professionals.profilePhotoUrl,
      rejectionReason: schema.professionals.rejectionReason
    })
    .from(schema.professionals)
    .where(eq(schema.professionals.userId, session.user.id))
    .limit(1);

  if (!profile) redirect("/register");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 flex-none border-r border-slate-100 bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white text-xs font-bold">H</div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-primary">HanuonePro</div>
            <div className="text-[11px] text-muted">Professional Dashboard</div>
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
              {profile.fullName?.charAt(0) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">{profile.fullName}</div>
              <div className="text-[11px] text-muted capitalize">{profile.role.replace("_", " ")}</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4 md:hidden">
          <div className="text-sm font-bold text-primary">HanuonePro</div>
          <div className="flex items-center gap-2">
            <span className={`badge ${profile.status === "verified" ? "badge-verified" : profile.status === "rejected" ? "badge-rejected" : "badge-pending"}`}>
              {profile.status}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {profile.status === "pending" && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Your profile is under review. You'll be notified once verified.
            </div>
          )}
          {profile.status === "rejected" && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              Your profile was not approved. {profile.rejectionReason ? `Reason: ${profile.rejectionReason}.` : ""} Please update your documents and resubmit.
            </div>
          )}
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <ul className="grid grid-cols-5">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted hover:text-primary">
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
