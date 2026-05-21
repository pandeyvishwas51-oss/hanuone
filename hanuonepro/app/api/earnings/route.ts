import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const [prof] = await db().select({ id: schema.professionals.id }).from(schema.professionals).where(eq(schema.professionals.userId, session.user.id)).limit(1);
  if (!prof) return NextResponse.json({ ok: true, earnings: [], total: 0 });
  const rows = await db()
    .select()
    .from(schema.earnings)
    .where(eq(schema.earnings.professionalId, prof.id))
    .orderBy(desc(schema.earnings.createdAt))
    .limit(100);
  const total = rows.reduce((s, e) => s + (e.type === "credit" ? e.amount : -e.amount), 0);
  return NextResponse.json({ ok: true, earnings: rows, total });
}
