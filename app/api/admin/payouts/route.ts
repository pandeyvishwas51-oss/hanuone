import { NextResponse } from "next/server";
import { listPayouts, releasePayout } from "@/lib/payouts";
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
  const payouts = await listPayouts();
  return NextResponse.json({ ok: true, payouts });
}

// POST { id, action: 'release' }
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  if (!body.id || body.action !== "release") return NextResponse.json({ ok: false, error: "id + action=release required" }, { status: 400 });
  const ok = await releasePayout(body.id);
  await audit({ actorUserId: admin.id, actorRole: "admin", action: "payment", entity: "payouts", entityId: body.id, meta: { released: ok }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok });
}
