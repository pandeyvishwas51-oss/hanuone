import { NextResponse } from "next/server";
import { searchDoctors } from "@/lib/queries";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { specialty, city? } -> real verified doctors for the voice agent's tool.
export async function POST(req: Request) {
  const rl = await rateLimit(`finddocs:${clientIp(req)}`, 30, 60);
  if (!rl.ok) return NextResponse.json({ ok: true, doctors: [] });
  const body = (await req.json().catch(() => ({}))) as { specialty?: string; city?: string };
  const specialty = (body.specialty || "General Physician").trim();
  const city = (body.city || "Lucknow").trim();
  try {
    const { doctors } = await searchDoctors({ specialty, city, sort: "rating", pageSize: 3, page: 1 });
    const list = doctors.map((d) => ({
      name: d.name,
      specialization: d.specialization,
      experienceYears: d.experience_years,
      rating: d.rating,
      feeMin: d.consultation_fee_min,
      feeMax: d.consultation_fee_max,
      locality: d.locality,
      slug: d.slug,
      bookUrl: `/book/${d.slug}`
    }));
    return NextResponse.json({ ok: true, doctors: list });
  } catch {
    return NextResponse.json({ ok: true, doctors: [] });
  }
}
