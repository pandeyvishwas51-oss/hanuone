import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authorizeVisit } from "@/lib/provider";
import { uploadDataUrl } from "@/lib/storage";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 6_000_000; // ~4.5MB base64

// POST { photoDataUrl } -> nurse uploads the patient's photo (eyes already
// blurred client-side). Stored privately on the visit. Provider/admin only.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "provider" && user.role !== "admin" && !user.isAdmin)) {
    return NextResponse.json({ ok: false, error: "Provider only" }, { status: 403 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const { ok: owns, visit } = await authorizeVisit(params.id, user);
  if (!visit) return NextResponse.json({ ok: false, error: "Visit not found" }, { status: 404 });
  if (!owns) return NextResponse.json({ ok: false, error: "This visit is not assigned to you" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { photoDataUrl?: string };
  if (!body.photoDataUrl || !body.photoDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ ok: false, error: "Image required" }, { status: 400 });
  }
  if (body.photoDataUrl.length > MAX) return NextResponse.json({ ok: false, error: "Image too large" }, { status: 413 });

  const url = await uploadDataUrl("uploads", `patient-photos/${params.id}-${Date.now()}.png`, body.photoDataUrl);
  await db().update(schema.serviceVisits).set({ patientPhotoUrl: url, patientPhotoAt: new Date(), updatedAt: new Date() }).where(eq(schema.serviceVisits.id, params.id));
  await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "service_visits", entityId: params.id, meta: { patientPhoto: true }, ipAddress: clientIp(req) });

  return NextResponse.json({ ok: true });
}
