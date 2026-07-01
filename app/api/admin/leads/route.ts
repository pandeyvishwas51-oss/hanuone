import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: true, leads: [] });
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const base = db().select().from(schema.onboardingLeads);
  const rows = kind
    ? await base.where(eq(schema.onboardingLeads.kind, kind)).orderBy(desc(schema.onboardingLeads.createdAt)).limit(200)
    : await base.orderBy(desc(schema.onboardingLeads.createdAt)).limit(200);
  return NextResponse.json({ ok: true, leads: rows });
}

// POST { id, status?, callNotes?, assignedToUserId? }
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    callNotes?: string;
  };
  if (!body.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) patch.status = body.status;
  if (typeof body.callNotes === "string") patch.callNotes = body.callNotes;

  await db().update(schema.onboardingLeads).set(patch).where(eq(schema.onboardingLeads.id, body.id));
  await audit({
    actorUserId: admin.id,
    actorRole: "admin",
    action: "update",
    entity: "onboarding_leads",
    entityId: body.id,
    meta: { status: body.status },
    ipAddress: clientIp(req)
  });
  return NextResponse.json({ ok: true });
}
