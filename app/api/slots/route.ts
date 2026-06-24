import { NextResponse } from "next/server";
import { and, asc, eq, gte } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/slots?doctorSlug=...&date=YYYY-MM-DD  -> available (unbooked) slots.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctorSlug = searchParams.get("doctorSlug")?.trim();
  const date = searchParams.get("date")?.trim();
  if (!doctorSlug) {
    return NextResponse.json({ ok: false, error: "doctorSlug required" }, { status: 400 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: true, slots: [] });

  try {
    const [doctor] = await db()
      .select({ id: schema.doctors.id, fee: schema.doctors.consultationFeeMin })
      .from(schema.doctors)
      .where(eq(schema.doctors.slug, doctorSlug))
      .limit(1);
    if (!doctor) return NextResponse.json({ ok: true, slots: [] });

    const today = new Date().toISOString().slice(0, 10);
    const conds = [eq(schema.providerSlots.doctorId, doctor.id), eq(schema.providerSlots.isBooked, false)];
    if (date) conds.push(eq(schema.providerSlots.date, date));
    else conds.push(gte(schema.providerSlots.date, today));

    const slots = await db()
      .select()
      .from(schema.providerSlots)
      .where(and(...conds))
      .orderBy(asc(schema.providerSlots.date), asc(schema.providerSlots.startTime))
      .limit(100);

    return NextResponse.json({ ok: true, slots, defaultFee: doctor.fee ?? 400 });
  } catch (e) {
    console.error("[slots]", e);
    return NextResponse.json({ ok: true, slots: [] });
  }
}
