/**
 * Email OTP for signup verification, login and password reset.
 * Codes are 6 digits, hashed (HMAC-SHA256 with AUTH_SECRET), 10-min expiry,
 * max 5 attempts, single-use. Delivered via Resend (lib/notify sendEmail).
 */
import { createHmac, randomInt } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { sendSms } from "@/lib/msg91";
import { otpEmail } from "@/lib/email-templates";

export type OtpPurpose = "signup" | "reset" | "login";
export type OtpChannel = "email" | "sms";

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PEPPER = process.env.AUTH_SECRET || "dev-secret";
// When set, the OTP is returned to the client so it can be tested without a
// deliverable inbox/number. Use only on staging/test, never real production.
const TEST_MODE = process.env.OTP_TEST_MODE === "1";

function hashCode(email: string, code: string): string {
  return createHmac("sha256", PEPPER).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Generate, store and deliver a fresh OTP via the chosen channel (email or SMS).
 * The code is always stored against the email (the account key) so verification
 * is identical regardless of channel. Returns ok even if delivery fails.
 */
export async function sendOtp(
  email: string,
  purpose: OtpPurpose,
  opts: { channel?: OtpChannel; phone?: string | null } = {}
): Promise<{ ok: boolean; devCode?: string; channel: OtpChannel }> {
  const channel: OtpChannel = opts.channel === "sms" ? "sms" : "email";
  if (!isValidEmail(email) || !HAS_DB) return { ok: false, channel };
  const code = String(randomInt(100000, 1000000));
  const codeHash = hashCode(email, code);
  const expiresAt = new Date(Date.now() + TTL_MS);

  // Invalidate previous unconsumed codes for this email+purpose.
  await db()
    .update(schema.emailOtps)
    .set({ consumedAt: new Date() })
    .where(and(eq(schema.emailOtps.email, email.toLowerCase()), eq(schema.emailOtps.purpose, purpose), isNull(schema.emailOtps.consumedAt)));

  await db().insert(schema.emailOtps).values({ email: email.toLowerCase(), codeHash, purpose, expiresAt });

  let sent = false;
  if (channel === "sms" && opts.phone) {
    sent = await sendSms(opts.phone, `HanuONE: Your verification code is ${code}. Valid 10 minutes.`).then(() => true).catch(() => false);
  } else {
    const tpl = otpEmail(code, purpose);
    sent = (await sendEmail([email], tpl.subject, tpl.html)).ok;
  }

  // Surface the code only OFF production (delivery not configured or test mode).
  // Never return an OTP to the client in production, even if delivery failed.
  const devCode = process.env.NODE_ENV !== "production" && (!sent || TEST_MODE) ? code : undefined;
  return { ok: true, devCode, channel };
}

/** Verify a code. Marks it consumed on success. */
export async function verifyOtp(email: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  if (!HAS_DB || !isValidEmail(email) || !/^\d{6}$/.test(code)) return false;
  const [row] = await db()
    .select()
    .from(schema.emailOtps)
    .where(and(eq(schema.emailOtps.email, email.toLowerCase()), eq(schema.emailOtps.purpose, purpose), isNull(schema.emailOtps.consumedAt)))
    .orderBy(desc(schema.emailOtps.createdAt))
    .limit(1);

  if (!row) return false;
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) return false;
  if ((row.attempts ?? 0) >= MAX_ATTEMPTS) return false;

  const ok = hashCode(email, code) === row.codeHash;
  await db()
    .update(schema.emailOtps)
    .set(ok ? { consumedAt: new Date() } : { attempts: (row.attempts ?? 0) + 1 })
    .where(eq(schema.emailOtps.id, row.id));
  return ok;
}
