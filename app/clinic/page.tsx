import { redirect } from "next/navigation";
import { getCurrentProfessional, getProviderMergedBookings, getProviderEarnings, getProviderNotes, isHomeCareRole } from "@/lib/provider";
import ClinicHome from "@/components/clinic/ClinicHome";
import ComingSoon from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";

const j = (v: unknown) => JSON.parse(JSON.stringify(v));

export default async function ClinicHomePage() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!prof) return <ComingSoon title="Clinic" blurb="Connect a verified doctor profile to open your command center." cta={{ label: "Set up doctor profile", href: "/providers/register?role=doctor" }} />;

  const [bookings, earnings, notes] = await Promise.all([
    getProviderMergedBookings(prof.id, prof.userId), getProviderEarnings(prof.id), getProviderNotes(prof.id)
  ]);

  return <ClinicHome prof={j(prof)} bookings={j(bookings)} earnings={j(earnings)} notes={j(notes)} />;
}
