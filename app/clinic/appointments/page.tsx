import { redirect } from "next/navigation";
import { getCurrentProfessional, getProviderBookings, getProviderDoctorBookings, getProviderAvailability, getProviderEarnings, getProviderConsultations, isHomeCareRole } from "@/lib/provider";
import DoctorDashboard from "@/components/provider/DoctorDashboard";
import ComingSoon from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";
const j = (v: unknown) => JSON.parse(JSON.stringify(v));

export default async function ClinicAppointments() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!prof) return <ComingSoon title="Appointments" blurb="Connect a verified doctor profile to manage appointments." cta={{ label: "Set up doctor profile", href: "/providers/register?role=doctor" }} />;

  const [legacyBookings, doctorRequests, availability, earnings, consults] = await Promise.all([
    getProviderBookings(prof.id),
    getProviderDoctorBookings(prof.userId),
    getProviderAvailability(prof.userId),
    getProviderEarnings(prof.id),
    getProviderConsultations(prof.userId)
  ]);
  // Merge home-care `bookings` rows with patient consult REQUESTS from `doctor_bookings`
  // so the clinic dashboard shows everything patients actually booked.
  const bookings = [
    ...legacyBookings,
    ...doctorRequests.map((b) => ({
      id: b.id,
      professionalId: prof.id,
      patientName: b.patientName,
      patientPhone: b.patientPhone,
      patientAddress: null as string | null,
      serviceType: "Consultation request",
      bookingDate: b.preferredDate,
      startTime: b.preferredTime,
      endTime: null as string | null,
      status: b.status,
      notes: b.reason,
      amount: null as number | null,
      paymentStatus: null as string | null,
      reminderSentAt: null,
      createdAt: b.createdAt,
      updatedAt: b.createdAt
    }))
  ].sort((a, b) => String(b.bookingDate).localeCompare(String(a.bookingDate)));
  const consultations = consults.map((c) => ({
    id: c.id, patientName: c.patientName, patientPhone: c.patientPhone,
    status: c.status ?? "pending_payment", mode: c.mode, scheduledAt: c.scheduledAt as unknown as string | null, feeInr: c.feeInr
  }));
  return <DoctorDashboard prof={j(prof)} bookings={j(bookings)} availability={j(availability)} earnings={j(earnings)} consultations={j(consultations)} />;
}
