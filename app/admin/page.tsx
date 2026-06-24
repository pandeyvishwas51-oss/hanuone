import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { HAS_DB, db, schema } from "@/lib/db";
import ProfessionalApprovals from "@/components/ProfessionalApprovals";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

// eslint-disable-next-line
async function count(table: any): Promise<number> {
  try {
    const [r] = await db().select({ n: sql<number>`count(*)::int` }).from(table);
    return r?.n ?? 0;
  } catch {
    return 0;
  }
}

export default async function AdminHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin && user.role !== "admin") redirect("/account");

  let stats = { consults: 0, payments: 0, lab: 0, medicine: 0, providers: 0, vitals: 0 };
  let recent: typeof schema.consultations.$inferSelect[] = [];
  if (HAS_DB) {
    const [c, p, l, m, pr, v] = await Promise.all([
      count(schema.consultations), count(schema.payments), count(schema.labOrders),
      count(schema.medicineOrders), count(schema.professionals), count(schema.vitalVisits)
    ]);
    stats = { consults: c, payments: p, lab: l, medicine: m, providers: pr, vitals: v };
    recent = await db().select().from(schema.consultations).orderBy(desc(schema.consultations.createdAt)).limit(8);
  }

  const cards = [
    { label: "Consultations", value: stats.consults },
    { label: "Payments", value: stats.payments },
    { label: "Lab orders", value: stats.lab },
    { label: "Medicine orders", value: stats.medicine },
    { label: "Vital checkups", value: stats.vitals },
    { label: "Providers", value: stats.providers }
  ];

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">Admin console</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-white">Overview</Link>
          <Link href="/admin/seo" className="rounded-lg border border-primary/20 px-3 py-1.5 text-primary hover:bg-primary/5">SEO/AEO/GEO</Link>
        </nav>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-2xl font-bold text-primary">{c.value}</div>
            <div className="mt-1 text-xs text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="h3">Provider approvals</h2>
        <div className="mt-3"><ProfessionalApprovals /></div>
      </section>

      <section className="mt-8">
        <h2 className="h3">Recent consultations</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No consultations yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr><th className="py-2">Patient</th><th>Mode</th><th>Status</th><th>When</th></tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="py-2">{c.patientName}</td>
                    <td>{c.mode}</td>
                    <td><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{c.status.replace(/_/g, " ")}</span></td>
                    <td className="text-muted">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString("en-IN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
