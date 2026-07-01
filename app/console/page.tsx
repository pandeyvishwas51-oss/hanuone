import { desc, eq, gte, sql } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import ConsoleHome from "@/components/console/ConsoleHome";

export const dynamic = "force-dynamic";

// eslint-disable-next-line
async function count(table: any, where?: any): Promise<number> {
  try { const q = db().select({ n: sql<number>`count(*)::int` }).from(table); const [r] = await (where ? q.where(where) : q); return r?.n ?? 0; } catch { return 0; }
}

export default async function ConsoleHomePage() {
  let stats = { consults: 0, lab: 0, medicine: 0, vitals: 0, visits: 0, providers: 0, leads: 0, payments: 0 };
  let alerts = { pendingApprovals: 0, flaggedVitals: 0, unassigned: 0 };
  let recent: { id: string; patientName: string; mode: string | null; status: string; createdAt: string | null }[] = [];
  let volume: number[] = [];

  if (HAS_DB) {
    const [c, l, m, v, vis, pr, ld, pay, pa, fv, un, rec, bookings] = await Promise.all([
      count(schema.consultations), count(schema.labOrders), count(schema.medicineOrders), count(schema.vitalVisits),
      count(schema.serviceVisits), count(schema.professionals), count(schema.onboardingLeads), count(schema.payments),
      count(schema.professionals, eq(schema.professionals.status, "pending")),
      count(schema.vitalVisits, eq(schema.vitalVisits.escalated, true)),
      count(schema.serviceVisits, eq(schema.serviceVisits.status, "requested")),
      db().select({ id: schema.consultations.id, patientName: schema.consultations.patientName, mode: schema.consultations.mode, status: schema.consultations.status, createdAt: schema.consultations.createdAt }).from(schema.consultations).orderBy(desc(schema.consultations.createdAt)).limit(8).catch(() => []),
      db().select({ createdAt: schema.consultations.createdAt }).from(schema.consultations).where(gte(schema.consultations.createdAt, new Date(Date.now() - 14 * 864e5))).catch(() => [])
    ]);
    stats = { consults: c, lab: l, medicine: m, vitals: v, visits: vis, providers: pr, leads: ld, payments: pay };
    alerts = { pendingApprovals: pa, flaggedVitals: fv, unassigned: un };
    recent = JSON.parse(JSON.stringify(rec));
    volume = Array.from({ length: 14 }, (_, i) => {
      const key = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10);
      return bookings.filter((b) => b.createdAt && new Date(b.createdAt).toISOString().slice(0, 10) === key).length;
    });
  }

  return <ConsoleHome stats={stats} alerts={alerts} recent={recent} volume={volume} />;
}
