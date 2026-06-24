import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/account/delete -> DPDP "right to erasure": anonymize personal
// identifiers. Health records are retained (de-identified) for the legal
// minimum (7 years) per NMC/DPDP, but are no longer linked to a real identity.
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  try {
    const anonPhone = `deleted-${user.id.slice(0, 8)}`;
    await db().update(schema.users).set({ phone: anonPhone, name: "Deleted user", email: null, role: "patient" }).where(eq(schema.users.id, user.id));
    // De-identify linked health rows (keep clinical data, drop the name/phone).
    await db().update(schema.consultations).set({ patientName: "Redacted", patientPhone: anonPhone }).where(eq(schema.consultations.patientUserId, user.id));
    await db().update(schema.vitalVisits).set({ patientName: "Redacted", patientPhone: anonPhone }).where(eq(schema.vitalVisits.patientUserId, user.id));

    await audit({ actorUserId: user.id, actorRole: user.role, action: "delete", entity: "users", entityId: user.id, meta: { anonymized: true }, ipAddress: clientIp(req) });
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[account/delete]", e);
    return NextResponse.json({ ok: false, error: "Could not process request" }, { status: 500 });
  }
}
