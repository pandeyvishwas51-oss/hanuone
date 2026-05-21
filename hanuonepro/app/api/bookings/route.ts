import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

async function getProfId(userId: string) {
  const [prof] = await db().select({ id: schema.professionals.id }).from(schema.professionals).where(eq(schema.professionals.userId, userId)).limit(1);
  return prof?.id ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const profId = await getProfId(session.user.id);
  if (!profId) return NextResponse.json({ ok: true, bookings: [] });
  const rows = await db()
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.professionalId, profId))
    .orderBy(desc(schema.bookings.bookingDate))
    .limit(50);
  return NextResponse.json({ ok: true, bookings: rows });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const profId = await getProfId(session.user.id);
  if (!profId) return NextResponse.json({ ok: false, error: "No professional profile" }, { status: 400 });
  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !status) return NextResponse.json({ ok: false, error: "id and status required" }, { status: 400 });
  await db()
    .update(schema.bookings)
    .set({ status })
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.professionalId, profId)));

  // If marked completed, log an earning row
  if (status === "completed") {
    const [b] = await db().select().from(schema.bookings).where(eq(schema.bookings.id, id)).limit(1);
    if (b && b.amount) {
      await db().insert(schema.earnings).values({
        professionalId: profId,
        bookingId: b.id,
        amount: b.amount,
        type: "credit",
        description: `Booking completed: ${b.serviceType}`
      });
    }
  }
  return NextResponse.json({ ok: true });
}
