import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "HanuOne Console", robots: { index: false } };

const NAV = [
  { label: "Overview", href: "/console", icon: "dashboard" },
  { label: "Providers", href: "/console/providers", icon: "providers" },
  { label: "Bookings", href: "/console/bookings", icon: "bookings" },
  { label: "Orders", href: "/console/orders", icon: "prescriptions" },
  { label: "Dispatch", href: "/console/dispatch", icon: "dispatch" },
  { label: "Triage", href: "/console/triage", icon: "shield" },
  { label: "Finance", href: "/console/finance", icon: "finance" }
];

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/console");
  if (!user.isAdmin && user.role !== "admin") redirect("/account");

  return <PortalShell brand="HanuOne Console" theme="console" nav={NAV} userName={user.name || "Admin"}>{children}</PortalShell>;
}
