/**
 * Pincode-based serviceability.
 *
 * Physical services (medicine, lab, nursing, physio, vitals) are only offered
 * in serviceable pincodes. Teleconsult + AI are available everywhere.
 *
 * Without a DB (or before ops fills serviceable_areas), we fall back to a
 * seed list of launch pincodes so the gating works locally. A non-serviceable
 * pincode is captured as expansion demand.
 */
import { and, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";

export type ServiceKey =
  | "teleconsult"
  | "clinic"
  | "medicine"
  | "lab"
  | "nursing"
  | "physio"
  | "vitals"
  | "ai";

// Available everywhere (not pincode-gated).
export const GLOBAL_SERVICES: ServiceKey[] = ["teleconsult", "ai"];

// Physical services that require a serviceable pincode.
export const PHYSICAL_SERVICES: ServiceKey[] = ["medicine", "lab", "nursing", "physio", "vitals", "clinic"];

// Seed launch pincodes used when DB has no serviceable_areas rows yet.
// Lucknow core + a couple of Delhi pilot pincodes.
const SEED_LIVE: Record<string, ServiceKey[]> = {
  // Lucknow
  "226010": ["medicine", "lab", "nursing", "physio", "vitals", "clinic"], // Gomtinagar
  "226001": ["medicine", "lab", "nursing", "physio", "vitals", "clinic"], // Hazratganj
  "226016": ["medicine", "lab", "nursing", "vitals", "clinic"], // Aliganj
  "226020": ["medicine", "lab", "vitals", "clinic"], // Indira Nagar
  "226024": ["medicine", "lab", "vitals"], // Alambagh
  // Delhi pilot
  "110001": ["medicine", "lab", "nursing", "vitals", "clinic"],
  "110019": ["medicine", "lab", "vitals", "clinic"]
};

export interface Serviceability {
  pincode: string | null;
  live: ServiceKey[]; // services live here (incl. global)
  comingSoon: ServiceKey[]; // physical services not yet live here
}

function isPincode(p: string | null | undefined): p is string {
  return !!p && /^\d{6}$/.test(p);
}

/** Resolve which services are live for a pincode. */
export async function getServiceability(pincode: string | null | undefined): Promise<Serviceability> {
  const pin = isPincode(pincode) ? pincode : null;

  // Teleconsult + AI always available.
  const live = new Set<ServiceKey>(GLOBAL_SERVICES);

  if (!pin) {
    // Unknown location: show everything as available (don't block discovery),
    // gating kicks in once the user provides a pincode.
    return { pincode: null, live: [...GLOBAL_SERVICES, ...PHYSICAL_SERVICES], comingSoon: [] };
  }

  let livePhysical: ServiceKey[] = [];
  if (HAS_DB) {
    try {
      const rows = await db()
        .select({ service: schema.serviceableAreas.service, status: schema.serviceableAreas.status })
        .from(schema.serviceableAreas)
        .where(and(eq(schema.serviceableAreas.pincode, pin), eq(schema.serviceableAreas.status, "live")));
      livePhysical = rows.map((r) => r.service as ServiceKey);
    } catch {
      livePhysical = SEED_LIVE[pin] ?? [];
    }
  } else {
    livePhysical = SEED_LIVE[pin] ?? [];
  }

  livePhysical.forEach((s) => live.add(s));
  const comingSoon = PHYSICAL_SERVICES.filter((s) => !live.has(s));

  return { pincode: pin, live: [...live], comingSoon };
}

export async function isServiceLive(service: ServiceKey, pincode: string | null | undefined): Promise<boolean> {
  if (GLOBAL_SERVICES.includes(service)) return true;
  const s = await getServiceability(pincode);
  return s.live.includes(service);
}

/** Record demand from a non-serviceable pincode (expansion signal). */
export async function recordDemand(pincode: string, service: ServiceKey, city?: string, userId?: string) {
  if (!HAS_DB || !isPincode(pincode)) return;
  try {
    await db().insert(schema.serviceRequestsByPincode).values({ pincode, service, city: city ?? null, userId: userId ?? null });
  } catch {
    /* non-fatal */
  }
}
