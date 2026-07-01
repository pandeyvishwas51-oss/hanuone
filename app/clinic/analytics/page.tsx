import { redirect } from "next/navigation";
import { TrendingUp, Users, IndianRupee, Repeat } from "lucide-react";
import { getCurrentProfessional, getProviderBookings, getProviderEarnings, isHomeCareRole } from "@/lib/provider";
import { PageHeader, StatCard } from "@/components/portal/ui";
import ClinicAnalytics from "@/components/clinic/ClinicAnalytics";
import ComingSoon from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";

export default async function ClinicAnalyticsPage() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!prof) return <ComingSoon title="Analytics" blurb="Connect a verified doctor profile to see practice analytics." cta={{ label: "Set up doctor profile", href: "/providers/register?role=doctor" }} />;

  const [bookings, earnings] = await Promise.all([getProviderBookings(prof.id), getProviderEarnings(prof.id)]);

  // 14-day appointment + revenue series.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5);
    const key = d.toISOString().slice(0, 10);
    const dayBookings = bookings.filter((b) => b.bookingDate === key);
    const revenue = dayBookings.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + (b.amount ?? 0), 0);
    return { day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), appts: dayBookings.length, revenue };
  });

  // Status mix.
  const statusMix = ["completed", "confirmed", "pending", "in_progress", "cancelled"].map((name) => ({
    name, value: bookings.filter((b) => (b.status || "pending") === name).length
  }));

  // Top services + KPIs.
  const svcMap = new Map<string, number>();
  bookings.forEach((b) => svcMap.set(b.serviceType, (svcMap.get(b.serviceType) ?? 0) + 1));
  const topServices = [...svcMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const uniquePatients = new Set(bookings.map((b) => b.patientPhone)).size;
  const repeatRate = uniquePatients ? Math.round(((bookings.length - uniquePatients) / bookings.length) * 100) : 0;
  const noShow = bookings.filter((b) => b.status === "cancelled").length;
  const noShowRate = bookings.length ? Math.round((noShow / bookings.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="Practice analytics" subtitle="Your last two weeks at a glance." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total earnings" value={`₹${earnings.credited}`} icon={<IndianRupee size={16} />} accent="#16a34a" />
        <StatCard label="Unique patients" value={String(uniquePatients)} icon={<Users size={16} />} accent="#01586C" />
        <StatCard label="Repeat rate" value={`${repeatRate}%`} icon={<Repeat size={16} />} accent="#0a7d96" />
        <StatCard label="Cancellation rate" value={`${noShowRate}%`} icon={<TrendingUp size={16} />} accent="#FE7D15" />
      </div>
      <ClinicAnalytics days={days} statusMix={statusMix} topServices={topServices} />
    </div>
  );
}
