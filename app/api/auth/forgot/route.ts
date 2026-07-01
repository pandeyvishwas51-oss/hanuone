import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { sendOtp, isValidEmail } from "@/lib/email-otp";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { email } -> email a reset OTP (silent if the email is unknown)
export async function POST(req: Request) {
  const rl = await rateLimit(`forgot:${clientIp(req)}`, 5, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: "Enter a valid email" }, { status: 400 });

  let devCode: string | undefined;
  if (HAS_DB) {
    const [user] = await db().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (user) ({ devCode } = await sendOtp(email, "reset"));
  }
  // Always respond ok so we don't reveal whether an email is registered.
  return NextResponse.json({ ok: true, devCode });
}
