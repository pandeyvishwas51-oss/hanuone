import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { verifyFirebaseIdToken } from "@/lib/firebase-verify";
import { createSession } from "@/lib/session";
import { sendEmail } from "@/lib/notify";
import { welcomeEmail } from "@/lib/email-templates";
import { applyReferral } from "@/lib/referrals";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { idToken, ref? } -> verify Firebase Google token -> upsert by email -> session
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { idToken?: string; ref?: string };
  if (!body.idToken) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

  let claims;
  try {
    claims = await verifyFirebaseIdToken(body.idToken);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid Google login" }, { status: 401 });
  }
  const email = claims.email?.toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "No email on Google account" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  let [user] = await db().select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  let isNew = false;
  if (!user) {
    [user] = await db()
      .insert(schema.users)
      .values({ email, name: claims.name, image: claims.picture, emailVerified: new Date(), authProvider: "google", role: "patient" })
      .returning();
    isNew = true;
  } else if (!user.emailVerified) {
    await db().update(schema.users).set({ emailVerified: new Date(), authProvider: "google" }).where(eq(schema.users.id, user.id));
  }

  await createSession({ id: user.id, phone: user.phone, name: user.name, role: user.role as "patient" | "provider" | "admin", isAdmin: !!user.isAdmin });
  if (isNew) {
    if (body.ref) await applyReferral(body.ref, user.id);
    await sendEmail([email], welcomeEmail(user.name).subject, welcomeEmail(user.name).html);
  }
  await audit({ actorUserId: user.id, actorRole: user.role, action: "login", entity: "users", entityId: user.id, meta: { via: "google" }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, isAdmin: !!user.isAdmin } });
}
