import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authorizeVisit } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS = ["assigned", "on_the_way", "arrived", "in_progress", "completed", "cancelled"];

// GET -> current tracking state for a visit. Access requires EITHER a logged-in
// owner/assigned-provider/admin, OR the correct per-visit tracking token (the
// secret in the patient's SMS link) — so the public /track page works without a
// login but a guessed visit id alone no longer leaks live staff GPS.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!HAS_DB) return NextResponse.json({ ok: true, status: "requested", staffLat: null, staffLng: null });
  const token = new URL(req.url).searchParams.get("token");
  const user = await getCurrentUser();

  const { ok: owns, visit } = await authorizeVisit(params.id, user);
  if (!visit) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const authed = !!user && (owns || visit.patientUserId === user.id);
  const tokenOk = !!token && !!visit.trackingToken && token === visit.trackingToken;
  if (!authed && !tokenOk) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    status: visit.status,
    staffLat: visit.staffLat,
    staffLng: visit.staffLng,
    etaMinutes: visit.etaMinutes,
    trackingUpdatedAt: visit.trackingUpdatedAt
  });
}

// POST { lat, lng, status?, etaMinutes? } -> staff pushes live location/status
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  // Only the assigned professional (or an admin) may push this visit's tracking.
  const { ok: owns, visit } = await authorizeVisit(params.id, user);
  if (!visit) return NextResponse.json({ ok: false, error: "Visit not found" }, { status: 404 });
  if (!owns) return NextResponse.json({ ok: false, error: "This visit is not assigned to you" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    lat?: number;
    lng?: number;
    status?: string;
    etaMinutes?: number;
  };

  const patch: Record<string, unknown> = { trackingUpdatedAt: new Date(), updatedAt: new Date() };
  if (typeof body.lat === "number") patch.staffLat = String(body.lat);
  if (typeof body.lng === "number") patch.staffLng = String(body.lng);
  if (typeof body.etaMinutes === "number") patch.etaMinutes = body.etaMinutes;
  if (body.status && VALID_STATUS.includes(body.status)) patch.status = body.status;

  await db().update(schema.serviceVisits).set(patch).where(eq(schema.serviceVisits.id, params.id));
  return NextResponse.json({ ok: true });
}
