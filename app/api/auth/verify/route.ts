import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { verifyOtp } from "@/lib/email-otp";
import { createSession } from "@/lib/session";
import { sendEmail } from "@/lib/notify";
import { welcomeEmail } from "@/lib/email-templates";
import { audit, clientIp } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { email, code } -> verify signup OTP, mark verified, create session, welcome email
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  if (!email || !code) return NextResponse.json({ ok: false, error: "Email and code required" }, { status: 400 });

  // Throttle OTP guessing. Per-IP gate up front (stops a single host hammering).
  const ip = clientIp(req);
  const ipRl = await rateLimit(`verify:ip:${ip}`, 8, 600);
  if (!ipRl.ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const ok = await verifyOtp(email, code, "signup");
  if (!ok) {
    // Count only FAILED attempts per-email so a correct first try never throttles
    // a legit user, while distributed-IP guessing against one email stays bounded.
    const failRl = await rateLimit(`verify:email-fail:${email}`, 12, 600);
    if (!failRl.ok) {
      return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: "Incorrect or expired code" }, { status: 401 });
  }

  const [user] = await db().update(schema.users).set({ emailVerified: new Date() }).where(eq(schema.users.email, email)).returning();
  if (!user) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });

  await createSession({ id: user.id, phone: user.phone, name: user.name, role: user.role as "patient" | "provider" | "admin", isAdmin: !!user.isAdmin });
  await sendEmail([email], welcomeEmail(user.name).subject, welcomeEmail(user.name).html);
  await audit({ actorUserId: user.id, actorRole: user.role, action: "login", entity: "users", entityId: user.id, meta: { via: "email_signup" }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true });
}
