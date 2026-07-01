import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Wallet, IndianRupee, Clock, RotateCcw } from "lucide-react";
import { HAS_DB, db, schema } from "@/lib/db";
import { PageHeader, StatCard, SectionCard, Pill, statusTone, EmptyState } from "@/components/portal/ui";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> { try { return await p; } catch { return fallback; } }

const SERVICE_LABEL: Record<string, string> = {
  consultation: "Consultations", lab: "Lab tests", medicine: "Medicine", nursing: "Home nursing", vitals: "Vitals"
};

export default async function ConsoleFinance() {
  // DB-side aggregation so totals are accurate at any volume (not capped). The
  // recent-payments list is fetched separately and capped for display.
  const [agg, recent] = HAS_DB
    ? await Promise.all([
        safe(
          db()
            .select({
              status: schema.payments.status,
              orderType: schema.payments.orderType,
              total: sql<string>`coalesce(sum(${schema.payments.amountInr}), 0)`,
              count: sql<string>`count(*)`
            })
            .from(schema.payments)
            .groupBy(schema.payments.status, schema.payments.orderType),
          [] as { status: string; orderType: string; total: string; count: string }[]
        ),
        safe(db().select().from(schema.payments).orderBy(desc(schema.payments.createdAt)).limit(25), [])
      ])
    : [[], []];

  const sumBy = (s: string) => agg.filter((r) => r.status === s).reduce((a, r) => a + Number(r.total || 0), 0);
  const collected = sumBy("paid");
  const pending = sumBy("created");
  const refunded = sumBy("refunded");
  const paidCount = agg.filter((r) => r.status === "paid").reduce((a, r) => a + Number(r.count || 0), 0);

  // Collected revenue grouped by service line (paid only).
  const byService = new Map<string, number>();
  agg.filter((r) => r.status === "paid").forEach((r) => byService.set(r.orderType, (byService.get(r.orderType) || 0) + Number(r.total || 0)));
  const services = [...byService.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <PageHeader title="Finance & reconciliation" subtitle="Platform payments, collected revenue, pending and refunds." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Collected" value={formatINR(collected)} icon={<IndianRupee size={16} />} accent="#16a34a" />
        <StatCard label="Pending" value={formatINR(pending)} icon={<Clock size={16} />} accent="#FE7D15" />
        <StatCard label="Refunded" value={formatINR(refunded)} icon={<RotateCcw size={16} />} accent="#e11d48" />
        <StatCard label="Paid orders" value={String(paidCount)} icon={<Wallet size={16} />} accent="#01586C" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px,1fr]">
        <SectionCard title="Collected by service">
          {services.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No paid orders yet.</p>
          ) : (
            <div className="space-y-2">
              {services.map(([svc, amt]) => (
                <div key={svc} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">{SERVICE_LABEL[svc] || svc}</span>
                  <span className="font-semibold text-slate-800">{formatINR(amt)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-slate-500">
            Provider payouts: <Link href="/admin/payouts" className="font-semibold text-[#01586C] underline">open payouts</Link>
          </p>
        </SectionCard>

        <SectionCard title="Recent payments">
          {recent.length === 0 ? (
            <EmptyState icon={<Wallet size={22} />} title="No payments yet" hint="Paid consults, lab and medicine orders will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2">Service</th><th>Amount</th><th>Status</th><th className="text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50">
                      <td className="py-2 text-slate-700">{SERVICE_LABEL[p.orderType] || p.orderType}</td>
                      <td className="font-semibold text-slate-800">{formatINR(p.amountInr)}</td>
                      <td><Pill tone={statusTone(p.status)}>{p.status}</Pill></td>
                      <td className="text-right text-xs text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</td>
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
