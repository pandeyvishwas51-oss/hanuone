import { NextResponse } from "next/server";
import { isValidIndianMobile, sendOtp, MSG91_LIVE } from "@/lib/msg91";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  const res = await sendOtp(phone);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "Could not send OTP. Try again." }, { status: 502 });
  }
  // `dev:true` tells the client we're in local mode (OTP is 000000).
  return NextResponse.json({ ok: true, dev: !MSG91_LIVE });
}
