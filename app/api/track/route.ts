import { NextResponse } from "next/server";
import { track } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bound how much a single anonymous caller can write to the analytics table.
const MAX_NAME = 80;
const MAX_PROPS_CHARS = 2000;

// POST { name, anonId?, city?, pincode?, path?, props? }
export async function POST(req: Request) {
  // This endpoint is public + unauthenticated, so throttle per-IP to stop a
  // single client from flooding the analytics table.
  const rl = await rateLimit(`track:${clientIp(req)}`, 60, 60);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof body.name !== "string" || !body.name || body.name.length > MAX_NAME) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Cap arbitrary props payload size before it reaches the DB.
  const props =
    typeof body.props === "object" && body.props && JSON.stringify(body.props).length <= MAX_PROPS_CHARS
      ? (body.props as Record<string, unknown>)
      : undefined;

  let userId: string | null = null;
  try {
    const u = await getCurrentUser();
    userId = u?.id ?? null;
  } catch {
    /* anonymous */
  }

  await track({
    name: body.name,
    userId,
    anonId: typeof body.anonId === "string" ? body.anonId : null,
    city: typeof body.city === "string" ? body.city : null,
    pincode: typeof body.pincode === "string" ? body.pincode : null,
    path: typeof body.path === "string" ? body.path : null,
    props
  });

  return NextResponse.json({ ok: true });
}
