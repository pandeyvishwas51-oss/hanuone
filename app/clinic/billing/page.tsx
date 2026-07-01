import { redirect } from "next/navigation";
import { IndianRupee, Clock, FileText } from "lucide-react";
import { getCurrentProfessional, getProviderBookings, isHomeCareRole } from "@/lib/provider";
import { PageHeader, StatCard, SectionCard, Pill, statusTone, EmptyState } from "@/components/portal/ui";
import ComingSoon from "@/components/portal/ComingSoon";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClinicBilling() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!prof) return <ComingSoon title="Billing" blurb="Connect a verified doctor profile to see invoices." cta={{ label: "Set up doctor profile", href: "/providers/register?role=doctor" }} />;

  const bookings = (await getProviderBookings(prof.id)).filter((b) => b.amount);
  const collected = bookings.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + (b.amount ?? 0), 0);
  const pending = bookings.filter((b) => b.paymentStatus !== "paid").reduce((s, b) => s + (b.amount ?? 0), 0);

  return (
    <div>
      <PageHeader title="Billing" subtitle="Invoices generated from your appointments." />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Collected" value={formatINR(collected)} icon={<IndianRupee size={16} />} accent="#16a34a" />
        <StatCard label="Pending" value={formatINR(pending)} icon={<Clock size={16} />} accent="#FE7D15" />
        <StatCard label="Invoices" value={String(bookings.length)} icon={<FileText size={16} />} accent="#01586C" />
      </div>
      <div className="mt-4">
        <SectionCard className="!p-0">
          {bookings.length === 0 ? <div className="p-5"><EmptyState icon={<FileText size={22} />} title="No billable appointments yet" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Invoice</th><th>Patient</th><th>Service</th><th>Date</th><th>Amount</th><th className="pr-3">Status</th></tr></thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-slate-50">
                      <td className="p-3 font-mono text-xs text-slate-400">#{b.id.slice(0, 8)}</td>
                      <td className="font-medium text-slate-800">{b.patientName}</td>
                      <td className="text-slate-600">{b.serviceType}</td>
                      <td className="text-slate-500">{b.bookingDate}</td>
                      <td className="font-semibold text-slate-800">{formatINR(b.amount)}</td>
                      <td className="pr-3"><Pill tone={statusTone(b.paymentStatus)}>{b.paymentStatus || "unpaid"}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
