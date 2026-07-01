import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentProfessional, isHomeCareRole } from "@/lib/provider";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "HanuOne Care", robots: { index: false } };

const NAV = [
  { label: "My Day", href: "/care", icon: "myday" },
  { label: "Earnings", href: "/care/earnings", icon: "earnings" },
  { label: "Profile", href: "/care/profile", icon: "profile" }
];

export default async function CareLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/care");

  if (!user.isAdmin && user.role !== "admin") {
    const prof = await getCurrentProfessional();
    if (!prof) redirect("/providers");
    if (!isHomeCareRole(prof.role)) redirect("/clinic");
    if (prof.status !== "verified") redirect("/providers");
  }

  return <PortalShell brand="HanuOne Care" theme="care" nav={NAV} userName={user.name || "Nurse"}>{children}</PortalShell>;
}
