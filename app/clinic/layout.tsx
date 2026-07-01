import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentProfessional, isDoctorRole } from "@/lib/provider";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "HanuOne Clinic", robots: { index: false } };

const NAV = [
  { label: "Home", href: "/clinic", icon: "dashboard" },
  { label: "Appointments", href: "/clinic/appointments", icon: "appointments" },
  { label: "Patients", href: "/clinic/patients", icon: "patients" },
  { label: "AI Scribe", href: "/clinic/scribe", icon: "scribe" },
  { label: "Prescriptions", href: "/clinic/prescriptions", icon: "prescriptions" },
  { label: "Billing", href: "/clinic/billing", icon: "billing" },
  { label: "Analytics", href: "/clinic/analytics", icon: "analytics" },
  { label: "Settings", href: "/clinic/settings", icon: "settings" }
];

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/clinic");

  // Admins may preview; otherwise must be a verified doctor.
  if (!user.isAdmin && user.role !== "admin") {
    const prof = await getCurrentProfessional();
    if (!prof) redirect("/providers");
    if (!isDoctorRole(prof.role)) redirect("/care");
    if (prof.status !== "verified") redirect("/providers");
  }

  return <PortalShell brand="HanuOne Clinic" theme="clinic" nav={NAV} userName={user.name || "Doctor"}>{children}</PortalShell>;
}
