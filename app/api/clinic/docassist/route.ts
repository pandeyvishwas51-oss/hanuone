import { NextResponse } from "next/server";
import { getCurrentProfessional, isVerifiedDoctor } from "@/lib/provider";
import { runDocAssist } from "@/lib/docassist";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { chiefComplaint, assessment, diagnosis, medications[], patientAge, patientSex, allergies }
// -> drug-interaction / allergy / dose checks + differential + suggested investigations.
export async function POST(req: Request) {
  const rl = await rateLimit(`docassist:${clientIp(req)}`, 20, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  const prof = await getCurrentProfessional();
  if (!isVerifiedDoctor(prof)) {
    return NextResponse.json({ ok: false, error: "Verified doctors only" }, { status: 403 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await runDocAssist({
      chiefComplaint: b.chiefComplaint as string,
      assessment: b.assessment as string,
      diagnosis: b.diagnosis as string,
      medications: Array.isArray(b.medications) ? (b.medications as { name: string }[]) : [],
      patientAge: typeof b.patientAge === "number" ? b.patientAge : null,
      patientSex: (b.patientSex as string) || null,
      allergies: (b.allergies as string) || null
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[docassist]", e);
    return NextResponse.json({ ok: false, error: "DocAssist could not run. Please try again." }, { status: 502 });
  }
}
