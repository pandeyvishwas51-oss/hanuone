import { redirect } from "next/navigation";
import { getCurrentProfessional, getProviderBookings, getProviderAvailability, getProviderEarnings, getProviderConsultations, isHomeCareRole } from "@/lib/provider";
import DoctorDashboard from "@/components/provider/DoctorDashboard";
import ComingSoon from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";
const j = (v: unknown) => JSON.parse(JSON.stringify(v));

export default async function ClinicAppointments() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!prof) return <ComingSoon title="Appointments" blurb="Connect a verified doctor profile to manage appointments." cta={{ label: "Set up doctor profile", href: "/providers/register?role=doctor" }} />;

  const [bookings, availability, earnings, consults] = await Promise.all([
    getProviderBookings(prof.id), getProviderAvailability(prof.id), getProviderEarnings(prof.id), getProviderConsultations(prof.userId)
  ]);
  const consultations = consults.map((c) => ({
    id: c.id, patientName: c.patientName, patientPhone: c.patientPhone,
    status: c.status ?? "pending_payment", mode: c.mode, scheduledAt: c.scheduledAt as unknown as string | null, feeInr: c.feeInr
  }));
  return <DoctorDashboard prof={j(prof)} bookings={j(bookings)} availability={j(availability)} earnings={j(earnings)} consultations={j(consultations)} />;
}
