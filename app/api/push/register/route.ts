import { NextResponse } from "next/server";
import { registerPushToken } from "@/lib/push";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { token, platform? } -> store an FCM token for the current user
export async function POST(req: Request) {
  let body: { token?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });

  let userId: string | null = null;
  try {
    userId = (await getCurrentUser())?.id ?? null;
  } catch {
    /* anonymous push allowed */
  }
  await registerPushToken(body.token, userId, body.platform || "web");
  return NextResponse.json({ ok: true });
}
