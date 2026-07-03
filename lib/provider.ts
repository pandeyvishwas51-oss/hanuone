// Server-side helpers for the provider (doctor / nurse / home-care) panel.
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import { getCurrentUser } from "./auth";
import type { SessionUser } from "./session";

/**
 * Load a home visit and confirm the CURRENT user may act on it: an admin, or
 * the professional it is actually assigned to. Stops cross-provider IDOR.
 * Returns { ok, visit }.
 */
export async function authorizeVisit(visitId: string, user: SessionUser | null) {
  const [visit] = await db().select().from(schema.serviceVisits).where(eq(schema.serviceVisits.id, visitId)).limit(1);
  if (!visit) return { ok: false as const, visit: null };
  if (!user) return { ok: false as const, visit };
  if (user.isAdmin || user.role === "admin") return { ok: true as const, visit };
  const prof = await getCurrentProfessional();
  return { ok: !!prof && visit.assignedProfessionalId === prof.id, visit };
}

export type Professional = typeof schema.professionals.$inferSelect;

/** The logged-in user's professional profile, or null if they have none. */
export async function getCurrentProfessional(): Promise<Professional | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const [prof] = await db().select().from(schema.professionals).where(eq(schema.professionals.userId, user.id)).limit(1);
  return prof ?? null;
}

/**
 * Doctor appointment requests for a provider. Patients write these to
 * `doctor_bookings` (keyed by the catalog doctor_id — see app/api/book), so we
 * resolve the provider user -> doctors row and read from THAT table. The legacy
 * `bookings` table has NO patient writer, which is why a doctor's appointment
 * list was always empty. Rows are mapped into the appointment shape the clinic
 * pages already render. Returns [] for unlinked users / non-doctor providers.
 */
export async function getProviderBookings(userId: string | null) {
  if (!userId) return [];
  const [doc] = await db().select({ id: schema.doctors.id })
    .from(schema.doctors).where(eq(schema.doctors.userId, userId)).limit(1);
  if (!doc) return [];
  const rows = await db().select().from(schema.doctorBookings)
    .where(eq(schema.doctorBookings.doctorId, doc.id))
    .orderBy(desc(schema.doctorBookings.createdAt));
  // doctor_bookings are unpaid in-clinic requests (no fee captured here), so
  // amount/paymentStatus are null — billing/analytics treat them as unbilled.
  return rows.map((b) => ({
    id: b.id,
    patientName: b.patientName,
    patientPhone: b.patientPhone,
    patientAddress: null as string | null,
    serviceType: "Consultation",
    bookingDate: b.preferredDate,
    startTime: b.preferredTime as string | null,
    endTime: null as string | null,
    status: b.status ?? "pending",
    amount: null as number | null,
    paymentStatus: "unpaid" as string | null,
    notes: b.reason ?? null,
    createdAt: b.createdAt
  }));
}

/**
 * Video/audio consultations booked with this doctor. Consults link to the
 * `doctors` catalog row (doctor_id); that row's user_id ties back to the
 * provider user — so a doctor can see and join their telemedicine consults
 * from the clinic portal. Returns [] for non-doctor providers / unlinked users.
 */
export async function getProviderConsultations(userId: string | null) {
  if (!userId) return [];
  const [doc] = await db().select({ id: schema.doctors.id })
    .from(schema.doctors).where(eq(schema.doctors.userId, userId)).limit(1);
  if (!doc) return [];
  return db().select().from(schema.consultations)
    .where(eq(schema.consultations.doctorId, doc.id))
    .orderBy(desc(schema.consultations.scheduledAt), desc(schema.consultations.createdAt))
    .limit(100);
}

/** Home-care visits assigned to this professional (the `service_visits` table). */
export async function getProviderVisits(professionalId: string) {
  return db().select().from(schema.serviceVisits)
    .where(eq(schema.serviceVisits.assignedProfessionalId, professionalId))
    .orderBy(desc(schema.serviceVisits.createdAt));
}

/**
 * Upcoming availability slots for a doctor — from `providerSlots` (the SAME table
 * patients book from), resolved via the provider user -> doctors catalog row. This
 * is what makes a doctor's published availability actually bookable by patients.
 */
export async function getProviderAvailability(userId: string | null) {
  if (!userId) return [];
  const [doc] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.userId, userId)).limit(1);
  if (!doc) return [];
  const today = new Date().toISOString().slice(0, 10);
  return db().select().from(schema.providerSlots)
    .where(and(eq(schema.providerSlots.doctorId, doc.id), gte(schema.providerSlots.date, today)))
    .orderBy(schema.providerSlots.date, schema.providerSlots.startTime);
}

/**
 * Earnings ledger + totals. Merges TWO income sources so a provider sees ALL
 * their money: the `earnings` ledger (home-care bookings) AND the `payouts`
 * table (each completed consult/visit credits the provider's net share). Without
 * the payouts merge, doctors and nurses saw ₹0 despite completed work.
 */
export async function getProviderEarnings(professionalId: string) {
  const [ledger, payoutRows] = await Promise.all([
    db().select().from(schema.earnings).where(eq(schema.earnings.professionalId, professionalId)).orderBy(desc(schema.earnings.createdAt)),
    db().select().from(schema.payouts).where(eq(schema.payouts.professionalId, professionalId)).orderBy(desc(schema.payouts.createdAt))
  ]);

  type Row = { id: string; amount: number; type: string | null; description: string | null; createdAt: Date | null };
  const ledgerRows: Row[] = ledger.map((r) => ({ id: r.id, amount: r.amount ?? 0, type: r.type, description: r.description, createdAt: r.createdAt }));
  // Each payout is the provider's net credit for one consult/visit.
  const payoutLedger: Row[] = payoutRows.map((p) => ({
    id: p.id,
    amount: p.netInr ?? 0,
    type: "credit",
    description: p.sourceType === "consultation" ? "Teleconsult" : "Home visit",
    createdAt: p.createdAt
  }));

  const rows = [...ledgerRows, ...payoutLedger].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  const credited =
    ledgerRows.filter((r) => r.type === "credit").reduce((s, r) => s + r.amount, 0) +
    payoutRows.reduce((s, p) => s + (p.netInr ?? 0), 0);
  const paidOut =
    ledgerRows.filter((r) => r.type === "payout").reduce((s, r) => s + r.amount, 0) +
    payoutRows.filter((p) => p.status === "paid").reduce((s, p) => s + (p.netInr ?? 0), 0);
  return { rows, credited, paidOut, balance: credited - paidOut };
}

/** EMR notes written by this doctor (most recent first). */
export async function getProviderNotes(professionalId: string) {
  return db().select().from(schema.emrNotes)
    .where(eq(schema.emrNotes.professionalId, professionalId))
    .orderBy(desc(schema.emrNotes.createdAt))
    .limit(200);
}

/** One EMR note + its prescription lines, scoped to this doctor. */
export async function getProviderNote(professionalId: string, noteId: string) {
  const [note] = await db().select().from(schema.emrNotes)
    .where(and(eq(schema.emrNotes.id, noteId), eq(schema.emrNotes.professionalId, professionalId))).limit(1);
  if (!note) return null;
  const rx = await db().select().from(schema.rxItems)
    .where(eq(schema.rxItems.noteId, noteId)).orderBy(schema.rxItems.position);
  return { note, rx };
}

/** True for clinical roles that see appointment-style bookings. */
export function isDoctorRole(role: string | null | undefined): boolean {
  return role === "doctor";
}

/** A verified doctor — the only one allowed to use clinical tools (scribe, DocAssist, Rx). */
export function isVerifiedDoctor(prof: Professional | null): prof is Professional {
  return !!prof && prof.role === "doctor" && prof.status === "verified";
}

/** Roles that do home visits (see the nurse-style visit workflow). */
export function isHomeCareRole(role: string | null | undefined): boolean {
  return ["nurse", "physiotherapist", "caregiver", "ward_boy"].includes(role ?? "");
}

export { inArray };
