/**
 * Referral program. A user gets a stable code + shareable link. When a new
 * user signs up with that code and completes their first booking, the referrer
 * is rewarded. Works fully with a DB; degrades to a code-only view without one.
 */
import { and, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";

const REWARD_INR = 100;

export function codeForUser(userId: string): string {
  return "HANU" + userId.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export interface ReferralSummary {
  code: string;
  rewardInr: number;
  signedUp: number;
  rewarded: number;
}

/** Get (or lazily create) the caller's referral code + stats. */
export async function getOrCreateReferral(userId: string): Promise<ReferralSummary> {
  const code = codeForUser(userId);
  if (!HAS_DB) return { code, rewardInr: REWARD_INR, signedUp: 0, rewarded: 0 };

  try {
    const rows = await db().select().from(schema.referrals).where(eq(schema.referrals.referrerUserId, userId));
    if (rows.length === 0) {
      await db().insert(schema.referrals).values({ referrerUserId: userId, code, status: "pending", rewardInr: 0 });
    }
    const all = await db().select().from(schema.referrals).where(eq(schema.referrals.referrerUserId, userId));
    return {
      code,
      rewardInr: REWARD_INR,
      signedUp: all.filter((r) => r.referredUserId).length,
      rewarded: all.filter((r) => r.status === "rewarded").length
    };
  } catch {
    return { code, rewardInr: REWARD_INR, signedUp: 0, rewarded: 0 };
  }
}

/** Record that `newUserId` signed up using `code`. */
export async function applyReferral(code: string, newUserId: string): Promise<boolean> {
  if (!HAS_DB || !code) return false;
  try {
    const [ref] = await db().select().from(schema.referrals).where(eq(schema.referrals.code, code.toUpperCase())).limit(1);
    if (!ref || ref.referrerUserId === newUserId) return false;
    // Avoid double-applying for the same referred user.
    const existing = await db()
      .select({ id: schema.referrals.id })
      .from(schema.referrals)
      .where(and(eq(schema.referrals.code, code.toUpperCase()), eq(schema.referrals.referredUserId, newUserId)))
      .limit(1);
    if (existing.length) return false;
    await db().insert(schema.referrals).values({
      referrerUserId: ref.referrerUserId,
      code: code.toUpperCase(),
      referredUserId: newUserId,
      status: "signed_up",
      rewardInr: 0
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a "signed_up" referral to "rewarded" (granting the reward) the first
 * time the referred user completes a booking. Idempotent: only a still-"signed_up"
 * referral flips, so later bookings are a no-op. Returns true only on the reward.
 */
export async function rewardReferralOnFirstBooking(referredUserId: string | null): Promise<boolean> {
  if (!HAS_DB || !referredUserId) return false;
  try {
    const [updated] = await db()
      .update(schema.referrals)
      .set({ status: "rewarded", rewardInr: REWARD_INR })
      .where(and(eq(schema.referrals.referredUserId, referredUserId), eq(schema.referrals.status, "signed_up")))
      .returning({ id: schema.referrals.id });
    return !!updated;
  } catch {
    return false;
  }
}
