import { desc } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/portal/ui";
import { TestTube } from "lucide-react";
import PharmacyOrders, { type Order } from "@/components/PharmacyOrders";
import LabOrders, { type LabOrder } from "@/components/LabOrders";

export const dynamic = "force-dynamic";

const j = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function ConsoleOrders() {
  let meds: Order[] = [];
  let labs: LabOrder[] = [];
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
    labs = j(l).map((o: typeof schema.labOrders.$inferSelect) => ({
      id: o.id, testName: o.testName, patientName: o.patientName, patientPhone: o.patientPhone,
      collectionType: o.collectionType, slotDate: o.slotDate, slotTime: o.slotTime,
      status: o.status, reportUrl: o.reportUrl, createdAt: o.createdAt as unknown as string | null
    }));
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
        {labs.length === 0 ? <EmptyState icon={<TestTube size={22} />} title="No lab orders yet" /> : <LabOrders initial={labs} />}
      </div>
    </div>
  );
}
