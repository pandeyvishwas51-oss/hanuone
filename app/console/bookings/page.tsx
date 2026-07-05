import { desc } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { PageHeader, SectionCard, Pill, statusTone, EmptyState } from "@/components/portal/ui";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

type Row = { type: string; patient: string; detail: string; status: string; date: Date | null };
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> { try { return await p; } catch { return fallback; } }

const TYPE_TONE: Record<string, "blue" | "slate" | "green" | "amber"> = { Consult: "blue", Lab: "slate", "Home visit": "green", "Appt request": "amber" };

export default async function ConsoleBookings() {
  let rows: Row[] = [];
  if (HAS_DB) {
    const [consults, labs, visits, docBookings] = await Promise.all([
      safe(db().select().from(schema.consultations).orderBy(desc(schema.consultations.createdAt)).limit(40), []),
      safe(db().select().from(schema.labOrders).orderBy(desc(schema.labOrders.createdAt)).limit(40), []),
      safe(db().select().from(schema.serviceVisits).orderBy(desc(schema.serviceVisits.createdAt)).limit(40), []),
      safe(db().select().from(schema.doctorBookings).orderBy(desc(schema.doctorBookings.createdAt)).limit(40), [])
    ]);
    rows = [
      ...consults.map((c) => ({ type: "Consult", patient: c.patientName, detail: c.mode || "video", status: c.status, date: c.createdAt })),
      ...labs.map((l) => ({ type: "Lab", patient: l.patientName, detail: l.testName, status: l.status, date: l.createdAt })),
      ...visits.map((v) => ({ type: "Home visit", patient: v.patientName, detail: v.serviceName || v.serviceType, status: v.status, date: v.createdAt })),
      ...docBookings.map((d) => ({ type: "Appt request", patient: d.patientName, detail: d.doctorName, status: d.status || "pending", date: d.createdAt }))
    ].sort((a, b) => (new Date(b.date || 0).getTime()) - (new Date(a.date || 0).getTime())).slice(0, 80);
  }

  return (
    <div>
      <PageHeader title="Bookings & orders" subtitle="Every consult, lab, home visit and appointment request — newest first." />
      {rows.length === 0 ? <EmptyState icon={<CalendarDays size={22} />} title="No bookings yet" /> : (
        <SectionCard className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Type</th><th>Patient</th><th>Detail</th><th>Status</th><th className="pr-3">When</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="p-3"><Pill tone={TYPE_TONE[r.type] || "slate"}>{r.type}</Pill></td>
                    <td className="font-medium text-slate-800">{r.patient}</td>
                    <td className="text-slate-600">{r.detail}</td>
                    <td><Pill tone={statusTone(r.status)}>{(r.status || "").replace(/_/g, " ")}</Pill></td>
                    <td className="pr-3 text-slate-500">{r.date ? new Date(r.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
