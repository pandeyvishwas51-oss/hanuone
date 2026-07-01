import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { HAS_DB, db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check for the load balancer / uptime monitor.
 * Returns 200 only when the app (and DB, if configured) is responsive.
 */
export async function GET() {
  const out: Record<string, unknown> = {
    ok: true,
    service: "hanuone-web",
    db: "not_configured",
    ai: process.env.HANUONE_AI_KEY || process.env.ANTHROPIC_API_KEY ? "configured" : "fallback",
    time: new Date().toISOString()
  };

  if (HAS_DB) {
    try {
      await db().execute(sql`select 1`);
      out.db = "ok";
    } catch {
      out.db = "error";
      out.ok = false;
      return NextResponse.json(out, { status: 503 });
    }
  }
  return NextResponse.json(out);
}
