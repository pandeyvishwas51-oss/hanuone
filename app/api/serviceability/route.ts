import { NextResponse } from "next/server";
import { getServiceability, recordDemand, type ServiceKey } from "@/lib/serviceability";
import { getActiveCity } from "@/lib/active-city";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/serviceability?pincode=226010  -> which services are live there
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode");
  const result = await getServiceability(pincode);
  return NextResponse.json({ ok: true, ...result });
}

// POST { pincode, service } -> record demand from a non-serviceable area
export async function POST(req: Request) {
  let body: { pincode?: string; service?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.pincode || !body.service) return NextResponse.json({ ok: false }, { status: 400 });
  await recordDemand(body.pincode, body.service as ServiceKey, getActiveCity().name);
  return NextResponse.json({ ok: true });
}
