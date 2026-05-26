import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 500 });
  const { phone } = await req.json().catch(() => ({}));
  if (!phone || typeof phone !== "string") {
    return NextResponse.json({ ok: false, error: "Phone required" }, { status: 400 });
  }
  const trimmed = phone.replace(/\s+/g, "").trim();
  // Match any phone that ends with the same digits (handle leading +91 vs 0)
  const digits = trimmed.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length !== 10) {
    return NextResponse.json({ ok: false, error: "Enter a valid 10-digit phone" }, { status: 400 });
  }
  const rows = await db()
    .select()
    .from(schema.doctorBookings)
    .where(eq(schema.doctorBookings.patientPhone, trimmed))
    .orderBy(desc(schema.doctorBookings.createdAt))
    .limit(50);

  // Fallback: search by ending digits if no exact match
  let bookings = rows;
  if (rows.length === 0) {
    const all = await db()
      .select()
      .from(schema.doctorBookings)
      .orderBy(desc(schema.doctorBookings.createdAt))
      .limit(200);
    bookings = all.filter((r) => r.patientPhone.replace(/\D/g, "").endsWith(last10));
  }

  return NextResponse.json({ ok: true, bookings });
}
