"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Return a dummy during build/prerender; pages are client-only anyway.
    return createBrowserClient("http://localhost:54321", "placeholder-key");
  }
  return createBrowserClient(url, key);
}
