import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

const ALLOWED_ORIGINS = new Set([
  "https://hanuone.vercel.app",
  "https://hanuonepro.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002"
]);

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

/**
 * Tiny first-party pageview tracker. Both Hanuone and HanuonePro POST
 * `{ site, path, referrer }` here. We enrich with Vercel-supplied geo headers
 * and a stable visitor_id cookie set client-side.
 *
 * Inserts one row per pageview into Neon for the admin analytics view.
 */
export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ ok: true, skipped: "no DATABASE_URL" }, { headers: cors });

  let body: { site?: string; path?: string; referrer?: string; visitorId?: string; isFirstVisit?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: cors });
  }

  const site = String(body.site || "").slice(0, 32) || "unknown";
  const path = String(body.path || "").slice(0, 1024) || "/";
  const referrer = String(body.referrer || "").slice(0, 1024) || null;
  const visitorId = String(body.visitorId || "").slice(0, 64) || null;
  const isFirst = !!body.isFirstVisit;

  const ua = req.headers.get("user-agent")?.slice(0, 512) || null;
  const country = req.headers.get("x-vercel-ip-country") || null;
  const region = req.headers.get("x-vercel-ip-country-region") || null;
  const cityRaw = req.headers.get("x-vercel-ip-city") || null;
  const city = cityRaw ? decodeURIComponent(cityRaw) : null;

  // Lightweight device classification
  const device = ua && /mobile|iphone|ipod|android|blackberry|webos/i.test(ua)
    ? "mobile"
    : ua && /tablet|ipad/i.test(ua)
    ? "tablet"
    : "desktop";

  try {
    const sql = neon(url);
    await sql`
      INSERT INTO pageviews (site, path, referrer, country, region, city, ua, device, visitor_id, is_first_visit)
      VALUES (${site}, ${path}, ${referrer}, ${country}, ${region}, ${city}, ${ua}, ${device}, ${visitorId}, ${isFirst})
    `;
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors });
  }

  return NextResponse.json({ ok: true }, { headers: cors });
}
