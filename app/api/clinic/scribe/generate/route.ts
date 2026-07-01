import { NextResponse } from "next/server";
import { getCurrentProfessional, isVerifiedDoctor } from "@/lib/provider";
import { generateScribeNote } from "@/lib/scribe";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { transcript, patientName?, patientAge?, patientSex? } -> structured SOAP + Rx draft (not saved).
export async function POST(req: Request) {
  const rl = await rateLimit(`scribe:${clientIp(req)}`, 20, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });

  const prof = await getCurrentProfessional();
  if (!isVerifiedDoctor(prof)) {
    return NextResponse.json({ ok: false, error: "Verified doctors only" }, { status: 403 });
  }

  const b = (await req.json().catch(() => ({}))) as { transcript?: string; patientName?: string; patientAge?: number; patientSex?: string };
  const transcript = (b.transcript || "").trim();
  if (transcript.length < 15) {
    return NextResponse.json({ ok: false, error: "Please record a bit more of the consultation first." }, { status: 400 });
  }

  try {
    const note = await generateScribeNote(transcript, { patientName: b.patientName, patientAge: b.patientAge ?? null, patientSex: b.patientSex ?? null });
    return NextResponse.json({ ok: true, note });
  } catch (e) {
    console.error("[scribe/generate]", e);
    return NextResponse.json({ ok: false, error: "Could not generate the note. Please try again." }, { status: 502 });
  }
}
