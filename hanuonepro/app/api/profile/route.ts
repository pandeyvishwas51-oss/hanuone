import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const [prof] = await db().select().from(schema.professionals).where(eq(schema.professionals.userId, session.user.id)).limit(1);
  return NextResponse.json({ ok: true, profile: prof ?? null });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const allow = [
    "fullName", "phone", "specialization", "experienceYears", "locality",
    "hourlyRate", "dailyRate", "bio", "isAvailable", "city", "pincode",
    "qualifications", "services"
  ] as const;
  const update: Record<string, unknown> = {};
  for (const k of allow) if (k in body) update[k] = body[k];
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }
  await db()
    .update(schema.professionals)
    .set(update)
    .where(eq(schema.professionals.userId, session.user.id));
  return NextResponse.json({ ok: true });
}
