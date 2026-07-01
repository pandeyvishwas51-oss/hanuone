import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getCurrentProfessional, getProviderNotes, isHomeCareRole } from "@/lib/provider";
import { PageHeader, SectionCard, EmptyState } from "@/components/portal/ui";
import ComingSoon from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";

export default async function ClinicPrescriptions() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!prof) return <ComingSoon title="Prescriptions" blurb="Connect a verified doctor profile to see prescriptions." cta={{ label: "Set up doctor profile", href: "/providers/register?role=doctor" }} />;

  const notes = (await getProviderNotes(prof.id)).filter((n) => n.diagnosis || n.patientSummary);

  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="Every e-prescription you've signed, newest first." />
      {notes.length === 0 ? (
        <EmptyState icon={<FileText size={22} />} title="No prescriptions yet" hint="Sign a note in the AI Scribe and it appears here." cta={{ label: "Open AI Scribe", href: "/clinic/scribe" }} />
      ) : (
        <SectionCard className="!p-0">
          <div className="divide-y divide-slate-50">
            {notes.map((n) => (
              <Link key={n.id} href={`/clinic/patients/${n.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600"><FileText size={16} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800">{n.patientName}</div>
                  <div className="truncate text-xs text-slate-400">{n.diagnosis || "Consultation note"}</div>
                </div>
                <div className="text-xs text-slate-400">{n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
