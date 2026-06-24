import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/account/export -> DPDP "right to access": full export of the user's data as JSON.
export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const [profile, consults, rxs, vitals, payments, consents] = await Promise.all([
    db().select().from(schema.users).where(eq(schema.users.id, user.id)),
    db().select().from(schema.consultations).where(eq(schema.consultations.patientUserId, user.id)),
    db().select().from(schema.prescriptions).where(eq(schema.prescriptions.patientUserId, user.id)),
    db().select().from(schema.vitalVisits).where(eq(schema.vitalVisits.patientUserId, user.id)),
    db().select().from(schema.payments).where(eq(schema.payments.userId, user.id)),
    db().select().from(schema.consents).where(eq(schema.consents.userId, user.id))
  ]);

  await audit({ actorUserId: user.id, actorRole: user.role, action: "read", entity: "account_export", entityId: user.id, ipAddress: clientIp(req) });

  const payload = { exportedAt: new Date().toISOString(), profile: profile[0], consultations: consults, prescriptions: rxs, vitalVisits: vitals, payments, consents };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="hanuone-data-${user.id}.json"`
    }
  });
}
