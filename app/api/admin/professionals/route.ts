import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: true, professionals: [] });
  const rows = await db().select().from(schema.professionals).orderBy(desc(schema.professionals.createdAt)).limit(100);
  return NextResponse.json({ ok: true, professionals: rows });
}

// POST { id, action: 'verify' | 'reject' | 'suspend', reason? }
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string; reason?: string };
  const map: Record<string, string> = { verify: "verified", reject: "rejected", suspend: "suspended" };
  const status = body.action ? map[body.action] : undefined;
  if (!body.id || !status) return NextResponse.json({ ok: false, error: "id and valid action required" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  // Read the linked user first so the professional-status flip and the user-role
  // change run atomically (neon-http db.batch = one tx). Otherwise a failure
  // between them leaves a "verified" pro whose user is still a patient (locked out).
  const [profRow] = await db().select({ userId: schema.professionals.userId }).from(schema.professionals).where(eq(schema.professionals.id, body.id)).limit(1);
  if (!profRow) return NextResponse.json({ ok: false, error: "Professional not found" }, { status: 404 });

  // verify → provider, suspend/reject → patient.
  const newRole = status === "verified" ? "provider" : status === "suspended" || status === "rejected" ? "patient" : null;
  const setStatus = db().update(schema.professionals).set({ status, rejectionReason: body.reason ?? null, updatedAt: new Date() }).where(eq(schema.professionals.id, body.id));
  if (profRow.userId && newRole) {
    await db().batch([
      setStatus,
      db().update(schema.users).set({ role: newRole }).where(eq(schema.users.id, profRow.userId))
    ]);
  } else {
    await setStatus;
  }

  await audit({ actorUserId: admin.id, actorRole: "admin", action: "update", entity: "professionals", entityId: body.id, meta: { status }, ipAddress: clientIp(req) });
  // Bust cached provider/doctor listings so a newly-verified provider appears now.
  revalidateTag("doctors");
  revalidatePath("/doctors");
  return NextResponse.json({ ok: true });
}
