// Lab test catalog with a local fallback so /lab works without a database.
import { HAS_DB, db, schema } from "./db";
import { eq, asc } from "drizzle-orm";

export type LabTest = {
  name: string;
  slug: string;
  category: string;
  description: string;
  sampleType: string;
  tatHours: number;
  priceInr: number;
};

export const LAB_CATALOG: LabTest[] = [
  { name: "Complete Blood Count (CBC)", slug: "cbc", category: "Routine", description: "Measures red cells, white cells, haemoglobin and platelets.", sampleType: "Blood", tatHours: 24, priceInr: 350 },
  { name: "Lipid Profile", slug: "lipid-profile", category: "Routine", description: "Cholesterol, triglycerides, HDL and LDL.", sampleType: "Blood", tatHours: 24, priceInr: 600 },
  { name: "HbA1c (Diabetes)", slug: "hba1c", category: "Routine", description: "3-month average blood sugar.", sampleType: "Blood", tatHours: 24, priceInr: 500 },
  { name: "Thyroid Profile (T3 T4 TSH)", slug: "thyroid-profile", category: "Routine", description: "Thyroid function panel.", sampleType: "Blood", tatHours: 24, priceInr: 550 },
  { name: "Liver Function Test (LFT)", slug: "lft", category: "Routine", description: "Assesses liver health.", sampleType: "Blood", tatHours: 24, priceInr: 700 },
  { name: "Kidney Function Test (KFT)", slug: "kft", category: "Routine", description: "Assesses kidney health.", sampleType: "Blood", tatHours: 24, priceInr: 700 },
  { name: "Vitamin D", slug: "vitamin-d", category: "Routine", description: "25-OH Vitamin D level.", sampleType: "Blood", tatHours: 48, priceInr: 1200 },
  { name: "Full Body Checkup", slug: "full-body-checkup", category: "Package", description: "60+ parameters covering vitals, organs and metabolism.", sampleType: "Blood + Urine", tatHours: 48, priceInr: 1499 }
];

export async function getLabTests(): Promise<LabTest[]> {
  if (!HAS_DB) return LAB_CATALOG;
  try {
    const rows = await db().select().from(schema.labTests).where(eq(schema.labTests.isActive, true)).orderBy(asc(schema.labTests.priceInr));
    if (!rows.length) return LAB_CATALOG;
    return rows.map((r) => ({
      name: r.name,
      slug: r.slug,
      category: r.category ?? "Routine",
      description: r.description ?? "",
      sampleType: r.sampleType ?? "Blood",
      tatHours: r.tatHours ?? 24,
      priceInr: r.priceInr ?? 0
    }));
  } catch {
    return LAB_CATALOG;
  }
}
