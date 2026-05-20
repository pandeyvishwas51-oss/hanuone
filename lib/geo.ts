import { headers } from "next/headers";

/**
 * Reads the visitor city from Vercel-supplied request headers.
 * Returns null in local dev / non-Vercel runtimes.
 */
export function getVisitorCity(): string | null {
  try {
    const h = headers();
    const raw = h.get("x-vercel-ip-city");
    if (!raw) return null;
    // Vercel URL-encodes city names with spaces (e.g. "New%20Delhi")
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}
