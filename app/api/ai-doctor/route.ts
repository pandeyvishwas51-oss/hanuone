import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import {
  aiDoctorRespond,
  detectSpecialty,
  type ChatMessage,
  type Attachment,
  type DoctorCandidate,
  type PatientContext
} from "@/lib/ai-doctor";
import { searchDoctors } from "@/lib/queries";
import { getActiveCity } from "@/lib/active-city";
import { getCurrentUser } from "@/lib/auth";
import { HAS_DB, db, schema } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 24;
const MAX_LEN = 2000;
const MAX_ATTACHMENTS = 3;
const MAX_B64 = 7_000_000; // ~5 MB per file after base64 expansion
const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

function sanitizeAttachments(raw: unknown): Attachment[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Attachment[] = [];
  for (const a of raw.slice(0, MAX_ATTACHMENTS)) {
    if (!a || typeof a.data !== "string" || typeof a.mediaType !== "string") continue;
    if (!ALLOWED_MEDIA.includes(a.mediaType)) continue;
    if (a.data.length > MAX_B64) continue;
    out.push({
      kind: a.mediaType === "application/pdf" ? "pdf" : "image",
      mediaType: a.mediaType,
      data: a.data,
      name: typeof a.name === "string" ? a.name.slice(0, 120) : undefined
    });
  }
  return out.length ? out : undefined;
}

async function loadDoctors(specialty: string | null, city: string): Promise<DoctorCandidate[]> {
  if (!specialty) return [];
  try {
    const { doctors } = await searchDoctors({ specialty, city, sort: "rating", pageSize: 4, page: 1 });
    return doctors.map((d) => ({
      name: d.name.replace(/^Dr\.?\s+/i, ""),
      specialization: d.specialization,
      locality: d.locality,
      city: d.city,
      experienceYears: d.experience_years,
      feeMin: d.consultation_fee_min,
      feeMax: d.consultation_fee_max,
      rating: d.rating,
      reviewCount: d.review_count,
      slug: d.slug
    }));
  } catch {
    return [];
  }
}

async function loadPatientHistory(): Promise<PatientContext | undefined> {
  try {
    const user = await getCurrentUser();
    if (!user) return undefined;
    const ctx: PatientContext = { name: user.name, history: [] };
    if (!HAS_DB) return ctx;

    const [vitals, consults] = await Promise.all([
      db().select().from(schema.vitalVisits).where(eq(schema.vitalVisits.patientUserId, user.id)).orderBy(desc(schema.vitalVisits.visitedAt)).limit(3),
      db().select().from(schema.consultations).where(eq(schema.consultations.patientUserId, user.id)).orderBy(desc(schema.consultations.createdAt)).limit(3)
    ]);

    for (const v of vitals) {
      const parts: string[] = [];
      if (v.bpSystolic && v.bpDiastolic) parts.push(`BP ${v.bpSystolic}/${v.bpDiastolic}`);
      if (v.heartRate) parts.push(`HR ${v.heartRate}`);
      if (v.spo2) parts.push(`SpO2 ${v.spo2}%`);
      if (v.randomBloodSugar) parts.push(`sugar ${v.randomBloodSugar}`);
      if (parts.length) {
        const when = v.visitedAt ? new Date(v.visitedAt).toLocaleDateString("en-IN") : "recent";
        ctx.history!.push(`Vital Checkup (${when}): ${parts.join(", ")}`);
      }
    }
    for (const c of consults) {
      const when = c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString("en-IN") : "recent";
      ctx.history!.push(`Past consultation (${when}): ${c.mode || "consult"}, status ${c.status}`);
    }
    return ctx;
  } catch {
    return undefined;
  }
}

// POST { messages: [{ role: 'user'|'assistant', content: string }] }
export async function POST(req: Request) {
  // Protect the most expensive endpoint: 20 AI messages / minute / IP.
  const rl = await rateLimit(`ai:${clientIp(req)}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please slow down a moment." },
      { status: 429, headers: { "Retry-After": "30" } }
    );
  }

  let body: { messages?: ChatMessage[]; voice?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const voice = body.voice === true;

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const filtered = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES);
  const messages: ChatMessage[] = filtered.map((m, i) => {
    const isLast = i === filtered.length - 1;
    return {
      role: m.role,
      content: m.content.slice(0, MAX_LEN),
      // Only forward attachments on the final user turn to keep payload/cost sane.
      attachments: isLast && m.role === "user" ? sanitizeAttachments((m as { attachments?: unknown }).attachments) : undefined
    };
  });

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ ok: false, error: "Last message must be from the user." }, { status: 400 });
  }

  const convoText = messages.map((m) => m.content).join(" ");
  const city = getActiveCity().name;
  const specialty = detectSpecialty(convoText);

  const [doctors, patient] = await Promise.all([loadDoctors(specialty, city), loadPatientHistory()]);

  try {
    const result = await aiDoctorRespond({ messages, city, doctors, patient, voice });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "AI error" },
      { status: 500 }
    );
  }
}
