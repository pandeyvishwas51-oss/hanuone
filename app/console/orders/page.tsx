import { desc } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { PageHeader, SectionCard, Pill, statusTone, EmptyState } from "@/components/portal/ui";
import { TestTube } from "lucide-react";
import PharmacyOrders, { type Order } from "@/components/PharmacyOrders";

export const dynamic = "force-dynamic";

const j = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function ConsoleOrders() {
  let meds: Order[] = [];
  let labs: (typeof schema.labOrders.$inferSelect)[] = [];
  if (HAS_DB) {
    const [m, l] = await Promise.all([
      db().select().from(schema.medicineOrders).orderBy(desc(schema.medicineOrders.createdAt)).limit(60),
      db().select().from(schema.labOrders).orderBy(desc(schema.labOrders.createdAt)).limit(60)
    ]);
    meds = j(m).map((o: typeof schema.medicineOrders.$inferSelect) => ({
      id: o.id, patientName: o.patientName, patientPhone: o.patientPhone, address: o.address,
      pincode: o.pincode, prescriptionUrl: o.prescriptionUrl, items: o.items, status: o.status,
      amountInr: o.amountInr, createdAt: o.createdAt as unknown as string | null
    }));
    labs = j(l);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Orders" subtitle="Manage medicine deliveries and lab tests." />

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Medicine orders · {meds.length}</h2>
        {meds.length === 0 ? <EmptyState icon={<TestTube size={22} />} title="No medicine orders yet" /> : <PharmacyOrders initial={meds} />}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Lab tests · {labs.length}</h2>
        {labs.length === 0 ? (
          <EmptyState icon={<TestTube size={22} />} title="No lab orders yet" />
        ) : (
          <SectionCard className="!p-0">
            <div className="divide-y divide-slate-100">
              {labs.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{l.testName}</div>
                    <div className="text-xs text-slate-500">{l.patientName} · {l.patientPhone} · {l.collectionType === "walkin" ? "Walk-in" : "Home"}{l.slotDate ? ` · ${l.slotDate}` : ""}</div>
                  </div>
                  <Pill tone={statusTone(l.status)}>{(l.status || "").replace(/_/g, " ")}</Pill>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
