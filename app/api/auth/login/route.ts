import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { HAS_DB, db, schema } from "@/lib/db";
import { createSession } from "@/lib/session";
import { sendOtp } from "@/lib/email-otp";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { email, password } -> verify password -> session
export async function POST(req: Request) {
  const rl = await rateLimit(`login:${clientIp(req)}`, 10, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const [user] = await db().select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }
  if (!user.emailVerified) {
    // Not verified yet — resend a code so they can finish signup.
    await sendOtp(email, "signup");
    return NextResponse.json({ ok: false, error: "Please verify your email. We've sent you a new code.", needsVerification: true }, { status: 403 });
  }

  await createSession({ id: user.id, phone: user.phone, name: user.name, role: user.role as "patient" | "provider" | "admin", isAdmin: !!user.isAdmin });
  await audit({ actorUserId: user.id, actorRole: user.role, action: "login", entity: "users", entityId: user.id, meta: { via: "password" } });
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, isAdmin: !!user.isAdmin } });
}
