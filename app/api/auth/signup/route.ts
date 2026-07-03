import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { HAS_DB, db, schema } from "@/lib/db";
import { sendOtp, isValidEmail } from "@/lib/email-otp";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { normalizeMobile, isValidIndianMobile } from "@/lib/msg91";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { name, email, phone, password } -> create unverified user + email OTP
export async function POST(req: Request) {
  const rl = await rateLimit(`signup:${clientIp(req)}`, 8, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; phone?: string; password?: string; channel?: "email" | "sms"; ref?: string };
  const refCode = (body.ref ?? "").trim().toUpperCase().slice(0, 20) || null;
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").trim();
  const password = body.password ?? "";

  if (!name) return NextResponse.json({ ok: false, error: "Please enter your name" }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: "Enter a valid email" }, { status: 400 });
  if (!isValidIndianMobile(phone)) return NextResponse.json({ ok: false, error: "Enter a valid 10-digit mobile" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ ok: false, error: "Password must be at least 6 characters" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const mobile = normalizeMobile(phone);
  try {
    // Find any existing account by this email OR phone.
    const matches = await db().select().from(schema.users).where(or(eq(schema.users.email, email), eq(schema.users.phone, mobile)));
    const byEmail = matches.find((u) => u.email === email);
    const byPhone = matches.find((u) => u.phone === mobile);

    // A "real" account is one already proven via email OR phone OTP. Only an
    // unproven, half-finished record may be taken over — never a real one (that
    // would let a stranger hijack a phone-login user's number).
    const isReal = (u?: typeof matches[number]) => !!(u && (u.emailVerified || u.phoneVerified));

    if (isReal(byEmail)) {
      return NextResponse.json({ ok: false, error: "This email is already registered. Please log in." }, { status: 409 });
    }
    if (isReal(byPhone) && byPhone!.email !== email) {
      return NextResponse.json({ ok: false, error: "This mobile number already has an account. Please log in or use a different number." }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    // Re-use / take over only an UNVERIFIED record so half-finished signups never lock the user out.
    const target = byEmail ?? (byPhone && !isReal(byPhone) ? byPhone : null);
    // If the phone is held by a different unverified row, remove it to avoid the unique conflict.
    if (byPhone && (!target || byPhone.id !== target.id) && !isReal(byPhone)) {
      await db().delete(schema.users).where(eq(schema.users.id, byPhone.id));
    }
    if (target) {
      await db().update(schema.users).set({ name, email, phone: mobile, passwordHash, authProvider: "email", ...(refCode ? { referredByCode: refCode } : {}) }).where(eq(schema.users.id, target.id));
    } else {
      await db().insert(schema.users).values({ name, email, phone: mobile, passwordHash, authProvider: "email", role: "patient", referredByCode: refCode });
    }

    const { devCode, channel } = await sendOtp(email, "signup", { channel: body.channel, phone: mobile });
    return NextResponse.json({ ok: true, devCode, channel });
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json({ ok: false, error: "Could not create account. Please try again." }, { status: 500 });
  }
}
