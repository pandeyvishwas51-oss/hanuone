import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { assignBestProvider } from "@/lib/assignment";
import { notify } from "@/lib/notify";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { visitId, professionalId? } -> auto-assign (gender-safe) or assign a specific provider
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }
  const body = (await req.json().catch(() => ({}))) as { visitId?: string; professionalId?: string };
  if (!body.visitId) return NextResponse.json({ ok: false, error: "visitId required" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  let result;
  if (body.professionalId) {
    const [p] = await db().select().from(schema.professionals).where(eq(schema.professionals.id, body.professionalId)).limit(1);
    if (!p) return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
    // Only an open visit (requested / already-assigned) can be (re)assigned — never
    // one that's en route, completed or cancelled.
    const [updated] = await db()
      .update(schema.serviceVisits)
      .set({ assignedProfessionalId: body.professionalId, status: "assigned", assignmentReason: `Manually assigned ${p.fullName}`, updatedAt: new Date() })
      .where(and(eq(schema.serviceVisits.id, body.visitId), inArray(schema.serviceVisits.status, ["requested", "assigned"])))
      .returning({ id: schema.serviceVisits.id });
    if (!updated) return NextResponse.json({ ok: false, error: "This visit can no longer be assigned (in progress or closed)." }, { status: 409 });
    result = { professionalId: body.professionalId, professionalName: p.fullName, reason: "Manually assigned" };
  } else {
    result = await assignBestProvider(body.visitId);
  }

  if (result.professionalId) {
    // Notify the assigned provider.
    const [pro] = await db().select().from(schema.professionals).where(eq(schema.professionals.id, result.professionalId)).limit(1);
    if (pro) await notify({ phone: pro.phone, email: pro.email, userId: pro.userId }, { title: "New home visit assigned — HanuONE", body: "A new visit has been assigned to you. Open your Care dashboard to accept and navigate.", url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/care` });
  }

  await audit({ actorUserId: admin.id, actorRole: "admin", action: "update", entity: "service_visits", entityId: body.visitId, meta: { assigned: result.professionalId }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: !!result.professionalId, ...result });
}
