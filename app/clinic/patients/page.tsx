import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentProfessional, getProviderNotes, isHomeCareRole } from "@/lib/provider";
import { PageHeader, SectionCard, EmptyState } from "@/components/portal/ui";
import ComingSoon from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";

function initials(name: string) { return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }

export default async function ClinicPatients() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!prof) return <ComingSoon title="Patients" blurb="Connect a verified doctor profile to see your patient records." cta={{ label: "Set up doctor profile", href: "/providers/register?role=doctor" }} />;

  const notes = await getProviderNotes(prof.id);

  return (
    <div>
      <PageHeader title="Patient records" subtitle="Every signed consultation note, newest first." />
      {notes.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="No records yet" hint="Use the AI Scribe during a consultation and notes appear here." cta={{ label: "Open AI Scribe", href: "/clinic/scribe" }} />
      ) : (
        <SectionCard className="!p-0">
          <div className="divide-y divide-slate-50">
            {notes.map((n) => (
              <Link key={n.id} href={`/clinic/patients/${n.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#01586C] to-[#0a7d96] text-xs font-bold text-white">{initials(n.patientName)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800">{n.patientName}</div>
                  <div className="truncate text-xs text-slate-400">{n.diagnosis || "No diagnosis"}{n.patientAge ? ` · ${n.patientAge}y` : ""}{n.patientSex ? ` · ${n.patientSex}` : ""}</div>
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
