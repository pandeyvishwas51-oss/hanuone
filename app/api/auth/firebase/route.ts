import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-verify";
import { normalizeMobile, isValidIndianMobile } from "@/lib/msg91";
import { upsertUserByPhone, createSession } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";
import { applyReferral } from "@/lib/referrals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { idToken, name?, role?, ref? } -> verify Firebase phone token -> session
export async function POST(req: Request) {
  let body: { idToken?: string; name?: string; role?: "patient" | "provider"; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.idToken) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

  let claims;
  try {
    claims = await verifyFirebaseIdToken(body.idToken);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid or expired login" }, { status: 401 });
  }

  const phone = claims.phoneNumber;
  if (!phone || !isValidIndianMobile(phone)) {
    return NextResponse.json({ ok: false, error: "No valid phone on token" }, { status: 400 });
  }

  const mobile = normalizeMobile(phone);
  const role = body.role === "provider" ? "provider" : "patient";
  try {
    const user = await upsertUserByPhone(mobile, { name: body.name?.trim() || claims.name || null, role });
    await createSession(user);
    if (body.ref) await applyReferral(body.ref, user.id);
    await audit({ actorUserId: user.id, actorRole: user.role, action: "login", entity: "users", entityId: user.id, meta: { via: "firebase" }, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (e) {
    console.error("[auth/firebase]", e);
    return NextResponse.json({ ok: false, error: "Could not complete login" }, { status: 500 });
  }
}
