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

/** Doctor-style appointments (the `bookings` table) for a professional. */
export async function getProviderBookings(professionalId: string) {
  return db().select().from(schema.bookings)
    .where(eq(schema.bookings.professionalId, professionalId))
    .orderBy(desc(schema.bookings.bookingDate));
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

/** Upcoming availability slots for a doctor. */
export async function getProviderAvailability(professionalId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return db().select().from(schema.availability)
    .where(and(eq(schema.availability.professionalId, professionalId), gte(schema.availability.date, today)))
    .orderBy(schema.availability.date, schema.availability.startTime);
}

/** Earnings ledger + simple totals. */
export async function getProviderEarnings(professionalId: string) {
  const rows = await db().select().from(schema.earnings)
    .where(eq(schema.earnings.professionalId, professionalId))
    .orderBy(desc(schema.earnings.createdAt));
  const credited = rows.filter((r) => r.type === "credit").reduce((s, r) => s + (r.amount ?? 0), 0);
  const paidOut = rows.filter((r) => r.type === "payout").reduce((s, r) => s + (r.amount ?? 0), 0);
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
