import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET -> current profile
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: true, profile: null });
  const [row] = await db().select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
  return NextResponse.json({
    ok: true,
    profile: row
      ? {
          name: row.name, email: row.email, phone: row.phone, address: row.address, altPhone: row.altPhone,
          city: row.city, pincode: row.pincode, gender: row.gender, dob: row.dob, bloodGroup: row.bloodGroup,
          emergencyName: row.emergencyName, emergencyPhone: row.emergencyPhone, marketingOptIn: row.marketingOptIn
        }
      : null
  });
}

// POST { ...profile fields } -> update
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  await db()
    .update(schema.users)
    .set({
      name: str(b.name) ?? undefined,
      address: str(b.address),
      altPhone: str(b.altPhone),
      city: str(b.city),
      pincode: str(b.pincode),
      gender: str(b.gender),
      dob: str(b.dob),
      bloodGroup: str(b.bloodGroup),
      emergencyName: str(b.emergencyName),
      emergencyPhone: str(b.emergencyPhone),
      marketingOptIn: typeof b.marketingOptIn === "boolean" ? b.marketingOptIn : undefined
    })
    .where(eq(schema.users.id, user.id));

  return NextResponse.json({ ok: true });
}
