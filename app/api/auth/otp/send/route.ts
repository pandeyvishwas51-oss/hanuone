import { NextResponse } from "next/server";
import { isValidIndianMobile, sendOtp, MSG91_LIVE } from "@/lib/msg91";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ipRl = await rateLimit(`otp-send-ip:${clientIp(req)}`, 8, 600);
  if (!ipRl.ok) return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });

  let body: { phone?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const phone = (body.phone ?? "").trim();
  if (!isValidIndianMobile(phone)) {
    return NextResponse.json({ ok: false, error: "Enter a valid 10-digit mobile number" }, { status: 400 });
  }
  // Per-number throttle to stop SMS-bombing a victim's phone.
  const phoneRl = await rateLimit(`otp-send-phone:${phone.replace(/\D/g, "").slice(-10)}`, 3, 600);
  if (!phoneRl.ok) return NextResponse.json({ ok: false, error: "Please wait before requesting another code." }, { status: 429 });

  const res = await sendOtp(phone);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "Could not send OTP. Try again." }, { status: 502 });
  }
  // `dev:true` tells the client we're in local mode (OTP is 000000).
  return NextResponse.json({ ok: true, dev: !MSG91_LIVE });
}
