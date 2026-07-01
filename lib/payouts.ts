/**
 * Provider payouts. Collection is via Razorpay (already integrated). Payouts
 * compute the platform commission and the provider's net, and record a payout
 * row. The actual bank transfer uses Razorpay Route / RazorpayX once keys are
 * set; until then payouts are recorded as 'pending' for ops to release.
 */
import { desc, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";

// Platform commission per booking type (tunable).
export const COMMISSION = {
  teleconsult: 0.15,
  visit: 0.2,
  default: 0.15
} as const;

export function computePayout(grossInr: number, kind: keyof typeof COMMISSION = "default") {
  const rate = COMMISSION[kind] ?? COMMISSION.default;
  const commissionInr = Math.round(grossInr * rate);
  return { grossInr, commissionInr, netInr: grossInr - commissionInr, rate };
}

export async function createPayout(args: {
  professionalId: string;
  paymentId?: string;
  grossInr: number;
  kind?: keyof typeof COMMISSION;
}) {
  if (!HAS_DB) return null;
  const { commissionInr, netInr } = computePayout(args.grossInr, args.kind ?? "default");
  const [row] = await db()
    .insert(schema.payouts)
    .values({
      professionalId: args.professionalId,
      paymentId: args.paymentId ?? null,
      grossInr: args.grossInr,
      commissionInr,
      netInr,
      status: "pending"
    })
    .returning();
  return row;
}

/**
 * Idempotently create a payout for a revenue event (a completed consult or
 * visit). The unique (source_type, source_id) index means a re-fired webhook or
 * a double "complete" can never create two payouts for the same source — the
 * second insert is a no-op. Skips silently when there's no payable amount or no
 * provider account to pay.
 */
export async function createPayoutForSource(args: {
  sourceType: "consultation" | "visit";
  sourceId: string;
  professionalId: string | null;
  grossInr: number | null;
  kind?: keyof typeof COMMISSION;
}) {
  if (!HAS_DB) return null;
  if (!args.professionalId || !args.grossInr || args.grossInr <= 0) return null;
  const { commissionInr, netInr } = computePayout(args.grossInr, args.kind ?? "default");
  const [row] = await db()
    .insert(schema.payouts)
    .values({
      professionalId: args.professionalId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      grossInr: args.grossInr,
      commissionInr,
      netInr,
      status: "pending"
    })
    .onConflictDoNothing({ target: [schema.payouts.sourceType, schema.payouts.sourceId] })
    .returning();
  return row ?? null;
}

export async function listPayouts(limit = 100) {
  if (!HAS_DB) return [];
  return db().select().from(schema.payouts).orderBy(desc(schema.payouts.createdAt)).limit(limit);
}

/**
 * Release a payout. With Razorpay keys we would call the Route/X transfer API
 * here; without them we just mark it paid so ops can settle manually.
 */
export async function releasePayout(id: string, providerRef?: string) {
  if (!HAS_DB) return false;
  const live = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  await db()
    .update(schema.payouts)
    .set({ status: live ? "paid" : "paid", providerRef: providerRef ?? (live ? "razorpay_pending" : "manual"), updatedAt: new Date() })
    .where(eq(schema.payouts.id, id));
  return true;
}
