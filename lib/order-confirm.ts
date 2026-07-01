// Shared, idempotent order confirmation used by BOTH the client verify route and
// the Razorpay webhook — so a paid consultation is activated even if the patient
// closes the browser before the client-side verify call runs.
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import { notifyConsultBooked, notify } from "./notify";
import { createPayoutForSource } from "./payouts";

/**
 * Confirm a consultation after successful payment. Idempotent: if it's already
 * "booked" it does nothing (so verify + webhook can both safely fire).
 */
export async function confirmConsultation(consultationId: string): Promise<void> {
  const [existing] = await db().select().from(schema.consultations).where(eq(schema.consultations.id, consultationId)).limit(1);
  if (!existing || existing.status === "booked" || existing.status === "completed" || existing.status === "cancelled") return;

  // Flip consult→booked AND mark the slot booked atomically. neon-http has no
  // interactive transactions, but db.batch() runs both in one all-or-nothing tx —
  // so a crash can't leave a booked consult whose slot is still sellable.
  if (existing.slotId) {
    await db().batch([
      db().update(schema.consultations).set({ status: "booked", updatedAt: new Date() }).where(eq(schema.consultations.id, consultationId)),
      db().update(schema.providerSlots).set({ isBooked: true }).where(eq(schema.providerSlots.id, existing.slotId))
    ]);
  } else {
    await db().update(schema.consultations).set({ status: "booked", updatedAt: new Date() }).where(eq(schema.consultations.id, consultationId));
  }

  const [doctor] = existing.doctorId
    ? await db().select({ name: schema.doctors.name }).from(schema.doctors).where(eq(schema.doctors.id, existing.doctorId)).limit(1)
    : [{ name: "your doctor" }];

  const [patient] = existing.patientUserId
    ? await db().select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, existing.patientUserId)).limit(1)
    : [{ email: null as string | null }];

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.com";
  const whenText = existing.scheduledAt ? new Date(existing.scheduledAt).toLocaleString("en-IN") : "your scheduled time";
  await notifyConsultBooked({
    patientPhone: existing.patientPhone,
    patientName: existing.patientName,
    patientEmail: patient?.email ?? null,
    doctorName: doctor?.name ?? "your doctor",
    whenText,
    joinUrl: `${base}/consult/${existing.id}`
  }).catch(() => {});
}

/**
 * Mark a consultation completed after the doctor finishes. Idempotent: only a
 * live consult ("booked" or "in_progress") transitions to "completed", so a
 * double-tap or retried request is a safe no-op. Returns true only on the FIRST
 * transition — the single point where downstream automation (review request,
 * follow-up nudge, provider payout) should attach.
 */
export async function completeConsultation(consultationId: string): Promise<boolean> {
  // Atomic, status-guarded flip — same single-writer pattern as the payment
  // idempotency guard, so concurrent/duplicate calls update 0 rows.
  const [consult] = await db()
    .update(schema.consultations)
    .set({ status: "completed", updatedAt: new Date() })
    .where(and(eq(schema.consultations.id, consultationId), inArray(schema.consultations.status, ["booked", "in_progress"])))
    .returning();
  if (!consult) return false; // already completed/cancelled or doesn't exist

  // First-completion automation: invite the patient to view their prescription
  // and rate the doctor.
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.com";
  await notify(
    { phone: consult.patientPhone, userId: consult.patientUserId },
    { title: "Your consultation is complete — HanuONE", body: "View your prescription and notes, and rate your doctor in your account.", url: `${base}/consult/${consult.id}` }
  ).catch(() => {});

  // Revenue automation: create the consulting doctor's payout, idempotently.
  // Resolve the doctor's provider account (doctors.userId -> professionals.userId);
  // scraped catalog doctors without a provider account simply have no payout.
  try {
    if (consult.doctorId && consult.feeInr) {
      const [doctor] = await db().select({ userId: schema.doctors.userId }).from(schema.doctors).where(eq(schema.doctors.id, consult.doctorId)).limit(1);
      if (doctor?.userId) {
        const [prof] = await db().select({ id: schema.professionals.id }).from(schema.professionals).where(eq(schema.professionals.userId, doctor.userId)).limit(1);
        if (prof?.id) {
          await createPayoutForSource({ sourceType: "consultation", sourceId: consult.id, professionalId: prof.id, grossInr: consult.feeInr, kind: "teleconsult" });
        }
      }
    }
  } catch {
    /* payout is best-effort; never block completion */
  }
  return true;
}

/** Given a paid payment row, confirm whatever order it is linked to. */
export async function confirmPaidOrder(orderType: string | null, orderId: string | null): Promise<void> {
  if (!orderId) return;
  if (orderType === "consultation") await confirmConsultation(orderId);
  // Lab / medicine / vitals orders are created already-confirmed, so nothing else
  // needs activating on payment today.
}
