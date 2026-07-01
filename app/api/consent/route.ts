import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { uploadDataUrl } from "@/lib/storage";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIG = 600_000; // ~450KB base64 signature

// POST { type, consentText, signatureDataUrl, mode?, consultationId?, visitId? }
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required" }, { status });
  }
  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    consentText?: string;
    signatureDataUrl?: string;
    mode?: string;
    consultationId?: string;
    visitId?: string;
  };
  if (!body.consentText) return NextResponse.json({ ok: false, error: "consentText required" }, { status: 400 });
  if (body.signatureDataUrl && body.signatureDataUrl.length > MAX_SIG) {
    return NextResponse.json({ ok: false, error: "Signature too large" }, { status: 413 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  let signatureUrl: string | null = null;
  if (body.signatureDataUrl) {
    signatureUrl = await uploadDataUrl("uploads", `signatures/${user.id}-${Date.now()}.png`, body.signatureDataUrl);
  }

  const [row] = await db()
    .insert(schema.consents)
    .values({
      userId: user.id,
      consultationId: body.consultationId ?? null,
      type: body.type ?? "telemedicine",
      granted: true,
      consentText: body.consentText.slice(0, 4000),
      signatureUrl,
      mode: body.mode ?? null,
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null
    })
    .returning({ id: schema.consents.id });

  // Attach the signature to the home visit ONLY if it belongs to this user (or
  // they are the assigned provider/admin) — not an arbitrary visit id.
  if (body.visitId && signatureUrl) {
    const [visit] = await db().select({ patientUserId: schema.serviceVisits.patientUserId }).from(schema.serviceVisits).where(eq(schema.serviceVisits.id, body.visitId)).limit(1);
    const isAdmin = user.isAdmin || user.role === "admin";
    if (visit && (visit.patientUserId === user.id || isAdmin)) {
      await db().update(schema.serviceVisits).set({ consentSignatureUrl: signatureUrl, consentAcceptedAt: new Date() }).where(eq(schema.serviceVisits.id, body.visitId));
    }
  }

  await audit({ actorUserId: user.id, actorRole: user.role, action: "consent", entity: "consents", entityId: row.id, meta: { type: body.type }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true, consentId: row.id });
}
