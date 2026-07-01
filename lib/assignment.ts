/**
 * Safe provider assignment for home visits.
 *
 * Safety-first rules:
 *  - FEMALE customers are assigned ONLY female providers (hard constraint).
 *  - Other customers prefer a same-gender provider (soft, ranked).
 *  - Provider must be verified + available, role-appropriate, and ideally in
 *    the same pincode/locality. Ranked by gender match, locality, then rating.
 */
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";

// Visit statuses that mean a provider is currently occupied and shouldn't be
// auto-assigned another visit.
const ACTIVE_VISIT_STATUSES = ["assigned", "on_the_way", "arrived", "in_progress"];

const ROLE_FOR_SERVICE: Record<string, string[]> = {
  nursing: ["nurse"],
  vitals: ["nurse"],
  lab: ["nurse"],
  physio: ["physiotherapist"],
  caregiver: ["caregiver", "ward_boy"]
};

export interface AssignResult {
  professionalId: string | null;
  professionalName: string | null;
  reason: string;
}

export async function assignBestProvider(visitId: string): Promise<AssignResult> {
  if (!HAS_DB) return { professionalId: null, professionalName: null, reason: "No database" };

  const [visit] = await db().select().from(schema.serviceVisits).where(eq(schema.serviceVisits.id, visitId)).limit(1);
  if (!visit) return { professionalId: null, professionalName: null, reason: "Visit not found" };

  // Resolve the customer's gender (from the visit, else the user profile).
  let customerGender = visit.customerGender ?? null;
  if (!customerGender && visit.patientUserId) {
    const [u] = await db().select({ gender: schema.users.gender }).from(schema.users).where(eq(schema.users.id, visit.patientUserId)).limit(1);
    customerGender = u?.gender ?? null;
  }

  const roles = ROLE_FOR_SERVICE[visit.serviceType] ?? ["nurse"];

  // Candidate pool: verified + available, role-appropriate.
  const all = await db()
    .select()
    .from(schema.professionals)
    .where(and(eq(schema.professionals.status, "verified"), eq(schema.professionals.isAvailable, true)));

  let pool = all.filter((p) => roles.includes(p.role));

  // HARD safety rule: female customers get only female providers.
  if (customerGender === "female") {
    pool = pool.filter((p) => p.gender === "female");
  }

  // Don't double-book a provider who already has an in-flight visit. (This
  // narrows the double-assign window; the fully race-proof guarantee would be a
  // partial unique index on serviceVisits.assignedProfessionalId for active rows.)
  const busy = await db()
    .select({ id: schema.serviceVisits.assignedProfessionalId })
    .from(schema.serviceVisits)
    .where(and(isNotNull(schema.serviceVisits.assignedProfessionalId), inArray(schema.serviceVisits.status, ACTIVE_VISIT_STATUSES)));
  const busyIds = new Set(busy.map((b) => b.id));
  pool = pool.filter((p) => !busyIds.has(p.id));

  if (pool.length === 0) {
    return {
      professionalId: null,
      professionalName: null,
      reason: customerGender === "female" ? "No verified female provider available for this service/area yet" : "No verified provider available yet"
    };
  }

  // Score: same gender (+100), same pincode (+50), same locality (+20), rating.
  const scored = pool
    .map((p) => {
      let score = 0;
      if (customerGender && p.gender === customerGender) score += 100;
      if (visit.pincode && p.pincode === visit.pincode) score += 50;
      score += Number(p.experienceYears ?? 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0].p;
  const genderNote = customerGender ? (best.gender === customerGender ? `same-gender (${customerGender})` : "gender not matched") : "gender unknown";
  const reason = `Matched ${best.fullName}: verified ${best.role}, ${genderNote}${visit.pincode && best.pincode === visit.pincode ? ", same pincode" : ""}.`;

  await db()
    .update(schema.serviceVisits)
    .set({ assignedProfessionalId: best.id, customerGender, status: "assigned", assignmentReason: reason, updatedAt: new Date() })
    .where(eq(schema.serviceVisits.id, visitId));

  return { professionalId: best.id, professionalName: best.fullName, reason };
}

/**
 * Fire-and-forget auto-dispatch: try to assign the best provider to a freshly
 * created home visit and notify them. Non-fatal — if no provider is found the
 * visit simply stays "requested" for manual dispatch in the console.
 */
export async function autoAssignVisit(visitId: string): Promise<AssignResult> {
  try {
    if (!HAS_DB) return { professionalId: null, professionalName: null, reason: "No database" };

    // Idempotency: a retried service-request must not re-assign / re-notify a
    // visit that already has a provider. (Manual admin reassignment uses
    // assignBestProvider directly and is intentionally not guarded here.)
    const [existing] = await db()
      .select({ assignedProfessionalId: schema.serviceVisits.assignedProfessionalId, status: schema.serviceVisits.status })
      .from(schema.serviceVisits)
      .where(eq(schema.serviceVisits.id, visitId))
      .limit(1);
    if (existing?.assignedProfessionalId || (existing && existing.status !== "requested")) {
      return { professionalId: existing.assignedProfessionalId ?? null, professionalName: null, reason: "Already assigned" };
    }

    const result = await assignBestProvider(visitId);
    if (result.professionalId) {
      const [pro] = await db().select().from(schema.professionals).where(eq(schema.professionals.id, result.professionalId)).limit(1);
      const { notify } = await import("./notify"); // lazy to avoid a server/edge import cycle
      if (pro) {
        await notify(
          { phone: pro.phone, email: pro.email, userId: pro.userId },
          { title: "New home visit assigned — HanuONE", body: "A new visit has been auto-assigned to you. Open your Care dashboard to accept and navigate.", url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/care` }
        ).catch((e) => console.warn("[assign] provider dispatch notify failed", visitId, e));
      }
      // Reassure the PATIENT that a verified professional was matched.
      const [visit] = await db().select().from(schema.serviceVisits).where(eq(schema.serviceVisits.id, visitId)).limit(1);
      if (visit) {
        await notify(
          { phone: visit.patientPhone, userId: visit.patientUserId },
          { title: "A verified professional is assigned — HanuONE", body: `${result.professionalName ?? "A verified professional"} will attend your visit. You'll get a live-tracking link when they're on the way.`, url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/track/${visitId}` }
        ).catch((e) => console.warn("[assign] patient notify failed", visitId, e));
      }
    }
    return result;
  } catch {
    return { professionalId: null, professionalName: null, reason: "auto-assign error" };
  }
}
