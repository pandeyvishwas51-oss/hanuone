import { NextResponse } from "next/server";
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

  await db().update(schema.professionals).set({ status, rejectionReason: body.reason ?? null, updatedAt: new Date() }).where(eq(schema.professionals.id, body.id));
  await audit({ actorUserId: admin.id, actorRole: "admin", action: "update", entity: "professionals", entityId: body.id, meta: { status }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true });
}
