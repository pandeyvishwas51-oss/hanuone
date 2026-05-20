import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const HAS_ENV = !!url && !!anonKey;

if (!HAS_ENV && process.env.NODE_ENV !== "production") {
  // Quiet during build; only log once in dev so the developer knows about it.
  if (!(globalThis as any).__hanuoneEnvWarned) {
    (globalThis as any).__hanuoneEnvWarned = true;
    console.warn(
      "[hanuone] Supabase env vars missing — using local Practo dataset fallback. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable Supabase."
    );
  }
}

// Browser/server-safe anon client. For RSCs we only read public data.
export const supabase = createClient(url ?? "http://localhost", anonKey ?? "anon-key", {
  auth: { persistSession: false }
});

export function supabaseService() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Service role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
