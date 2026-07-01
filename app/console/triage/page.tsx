import { desc, eq } from "drizzle-orm";
import { AlertTriangle, Activity } from "lucide-react";
import { HAS_DB, db, schema } from "@/lib/db";
import { PageHeader, SectionCard, Pill, EmptyState } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

function flagList(raw: string | null): string[] {
  if (!raw) return [];
  try { const o = JSON.parse(raw); return Object.entries(o).map(([k, v]) => `${k}: ${String(v)}`); } catch { return [raw]; }
}

export default async function ConsoleTriage() {
  let escalated: typeof schema.vitalVisits.$inferSelect[] = [];
  if (HAS_DB) {
    escalated = await db().select().from(schema.vitalVisits).where(eq(schema.vitalVisits.escalated, true)).orderBy(desc(schema.vitalVisits.visitedAt)).limit(50);
  }

  return (
    <div>
      <PageHeader title="Triage queue" subtitle="Home-visit vitals flagged abnormal — review and escalate to a doctor." />
      {escalated.length === 0 ? (
        <EmptyState icon={<Activity size={22} />} title="No flagged vitals" hint="Abnormal readings recorded by nurses surface here for clinical review." />
      ) : (
        <div className="space-y-2">
          {escalated.map((v) => (
            <SectionCard key={v.id} className="!p-0">
              <div className="flex flex-wrap items-start gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{v.patientName}</span>
                    <Pill tone="rose">escalated</Pill>
                    <span className="text-xs text-slate-400">{v.visitedAt ? new Date(v.visitedAt).toLocaleString("en-IN") : ""}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                    {v.bpSystolic != null && <span>BP {v.bpSystolic}/{v.bpDiastolic ?? "—"}</span>}
                    {v.heartRate != null && <span>HR {v.heartRate}</span>}
                    {v.spo2 != null && <span>SpO₂ {v.spo2}%</span>}
                    {v.temperatureC != null && <span>Temp {String(v.temperatureC)}°C</span>}
                    {v.randomBloodSugar != null && <span>RBS {v.randomBloodSugar}</span>}
                  </div>
                  {flagList(v.flags).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">{flagList(v.flags).map((f, i) => <Pill key={i} tone="amber">{f}</Pill>)}</div>
                  )}
                </div>
                <a href={`tel:${v.patientPhone}`} className="rounded-lg bg-[#01586C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#024a5a]">Call patient</a>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
