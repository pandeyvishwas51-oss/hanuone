import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { and, eq, gte, asc } from "drizzle-orm";
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
  if (!profId) return NextResponse.json({ ok: true, slots: [] });

  const today = new Date().toISOString().split("T")[0];
  const slots = await db()
    .select()
    .from(schema.availability)
    .where(and(eq(schema.availability.professionalId, profId), gte(schema.availability.date, today)))
    .orderBy(asc(schema.availability.date), asc(schema.availability.startTime))
    .limit(100);
  return NextResponse.json({ ok: true, slots });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const profId = await getProfId(session.user.id);
  if (!profId) return NextResponse.json({ ok: false, error: "No professional profile" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { date, startTime, endTime } = body;
  if (!date || !startTime || !endTime) {
    return NextResponse.json({ ok: false, error: "date, startTime, endTime required" }, { status: 400 });
  }
  const [slot] = await db().insert(schema.availability).values({ professionalId: profId, date, startTime, endTime }).returning();
  return NextResponse.json({ ok: true, slot });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const profId = await getProfId(session.user.id);
  if (!profId) return NextResponse.json({ ok: false, error: "No professional profile" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  await db().delete(schema.availability).where(and(eq(schema.availability.id, id), eq(schema.availability.professionalId, profId)));
  return NextResponse.json({ ok: true });
}
