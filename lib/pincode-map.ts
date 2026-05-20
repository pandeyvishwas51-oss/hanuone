import pincodes from "@/data/client/pincodes.json";

/**
 * Lightweight pincode → locality lookup safe to import from client components.
 * Built from the scraped Practo dataset; merge live Supabase data later.
 */
export const PINCODE_MAP: Record<string, string> = pincodes as Record<string, string>;
