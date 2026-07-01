import { NextResponse } from "next/server";
import { getOrCreateReferral, applyReferral } from "@/lib/referrals";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  const summary = await getOrCreateReferral(user.id);
  return NextResponse.json({ ok: true, ...summary });
}

// POST { code } -> apply a referral code for the current (new) user
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  if (!body.code) return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
  const applied = await applyReferral(body.code, user.id);
  return NextResponse.json({ ok: applied });
}
