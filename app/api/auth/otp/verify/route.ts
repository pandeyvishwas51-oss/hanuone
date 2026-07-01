import { NextResponse } from "next/server";
import { isValidIndianMobile, normalizeMobile, verifyOtp } from "@/lib/msg91";
import { upsertUserByPhone, createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { phone?: string; otp?: string; name?: string; role?: "patient" | "provider" };

export async function POST(req: Request) {
  const rl = await rateLimit(`otp-verify:${clientIp(req)}`, 8, 600);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const phone = (body.phone ?? "").trim();
  const otp = (body.otp ?? "").trim();
  if (!isValidIndianMobile(phone)) {
    return NextResponse.json({ ok: false, error: "Invalid mobile number" }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(otp)) {
    return NextResponse.json({ ok: false, error: "Enter the OTP" }, { status: 400 });
  }

  const v = await verifyOtp(phone, otp);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: "Incorrect or expired OTP" }, { status: 401 });
  }

  const mobile = normalizeMobile(phone);
  const role = body.role === "provider" ? "provider" : "patient";
  try {
    const user = await upsertUserByPhone(mobile, { name: body.name?.trim() || null, role });
    await createSession(user);
    await audit({ actorUserId: user.id, actorRole: user.role, action: "login", entity: "users", entityId: user.id, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (e) {
    console.error("[otp/verify]", e);
    return NextResponse.json({ ok: false, error: "Could not complete login" }, { status: 500 });
  }
}
