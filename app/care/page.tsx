import { redirect } from "next/navigation";
import { getCurrentProfessional, getProviderVisits, getProviderEarnings, isDoctorRole } from "@/lib/provider";
import NurseDashboard from "@/components/provider/NurseDashboard";
import ComingSoon from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";

export default async function CareHome() {
  const prof = await getCurrentProfessional();
  if (!prof) {
    return <ComingSoon title="Care preview" blurb="Connect a verified nurse profile to see assigned visits here." cta={{ label: "Set up provider profile", href: "/providers/register?role=nurse" }} />;
  }
  // Doctors belong in the Clinic app.
  if (isDoctorRole(prof.role)) redirect("/clinic");
  const [visits, earnings] = await Promise.all([getProviderVisits(prof.id), getProviderEarnings(prof.id)]);
  return <NurseDashboard prof={JSON.parse(JSON.stringify(prof))} visits={JSON.parse(JSON.stringify(visits))} earnings={JSON.parse(JSON.stringify(earnings))} />;
}
