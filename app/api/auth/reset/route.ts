import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { HAS_DB, db, schema } from "@/lib/db";
import { verifyOtp } from "@/lib/email-otp";
import { createSession } from "@/lib/session";
import { audit, clientIp } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { email, code, password } -> verify reset OTP, set new password, log in
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  const password = body.password ?? "";
  if (!email || !code) return NextResponse.json({ ok: false, error: "Email and code required" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ ok: false, error: "Password must be at least 6 characters" }, { status: 400 });

  // Throttle reset-OTP guessing. Per-IP gate up front (stops a single host hammering).
  const ip = clientIp(req);
  const ipRl = await rateLimit(`reset:ip:${ip}`, 8, 600);
  if (!ipRl.ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const ok = await verifyOtp(email, code, "reset");
  if (!ok) {
    // Count only FAILED attempts per-email so a correct first try never throttles
    // a legit user, while distributed-IP guessing against one email stays bounded.
    const failRl = await rateLimit(`reset:email-fail:${email}`, 12, 600);
    if (!failRl.ok) {
      return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: "Incorrect or expired code" }, { status: 401 });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const [user] = await db().update(schema.users).set({ passwordHash, emailVerified: new Date() }).where(eq(schema.users.email, email)).returning();
  if (!user) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });

  await createSession({ id: user.id, phone: user.phone, name: user.name, role: user.role as "patient" | "provider" | "admin", isAdmin: !!user.isAdmin });
  await audit({ actorUserId: user.id, actorRole: user.role, action: "update", entity: "users", entityId: user.id, meta: { via: "password_reset" }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, isAdmin: !!user.isAdmin } });
}
