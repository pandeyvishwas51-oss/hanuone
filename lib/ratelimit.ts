/**
 * Lightweight rate limiter.
 *
 * Uses an in-process fixed-window counter by default (good for a single
 * instance / dev). When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are
 * set, it switches to Upstash so limits hold ACROSS instances (required once we
 * autoscale to multiple app servers for 10k DAU).
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

type Bucket = { count: number; resetAt: number };
const mem = new Map<string, Bucket>();

// Periodic cleanup so the map cannot grow unbounded.
function sweep(now: number) {
  if (mem.size < 5000) return;
  for (const [k, b] of mem) if (b.resetAt < now) mem.delete(k);
}

async function upstashIncr(key: string, windowSec: number): Promise<number | null> {
  try {
    // INCR then EXPIRE (NX) via Upstash REST pipeline.
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec), "NX"]
      ])
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: unknown }[];
    const n = Number((data?.[0] as { result?: unknown })?.result);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key   unique caller identity (e.g. `ai:${ip}`)
 * @param limit max requests per window
 * @param windowSec window length in seconds
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateResult> {
  const now = Date.now();

  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const count = await upstashIncr(key, windowSec);
    if (count != null) {
      const resetAt = now + windowSec * 1000;
      return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt };
    }
    // fall through to in-memory on Upstash error
  }

  sweep(now);
  const b = mem.get(key);
  if (!b || b.resetAt < now) {
    mem.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, resetAt: now + windowSec * 1000 };
  }
  b.count += 1;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown"
  );
}
