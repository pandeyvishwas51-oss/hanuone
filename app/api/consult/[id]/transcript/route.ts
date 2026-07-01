import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { summarizeTranscript } from "@/lib/ai-summary";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 40_000;

// GET -> the saved transcript + summary for this consult (patient/provider/admin)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  if (!HAS_DB) return NextResponse.json({ ok: true, transcript: null, summary: null });
  const [c] = await db().select().from(schema.consultations).where(eq(schema.consultations.id, params.id)).limit(1);
  if (!c) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  // Only the consult's own patient or an admin. A blanket "any provider" check
  // leaked every consult's PHI across all providers; there is no consult->provider
  // link yet to scope a specific doctor, so do not grant providers blanket access.
  const allowed = user.isAdmin || user.role === "admin" || c.patientUserId === user.id;
  if (!allowed) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, transcript: c.transcriptText, summary: c.transcriptSummary });
}

// POST { transcript } -> save transcript, generate AI summary, return it
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const [c] = await db().select().from(schema.consultations).where(eq(schema.consultations.id, params.id)).limit(1);
  if (!c) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  // Only the consult's own patient or an admin. A blanket "any provider" check
  // leaked every consult's PHI across all providers; there is no consult->provider
  // link yet to scope a specific doctor, so do not grant providers blanket access.
  const allowed = user.isAdmin || user.role === "admin" || c.patientUserId === user.id;
  if (!allowed) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { transcript?: string };
  const transcript = (body.transcript ?? "").slice(0, MAX).trim();
  if (!transcript) return NextResponse.json({ ok: false, error: "Transcript required" }, { status: 400 });

  const summary = await summarizeTranscript(transcript);
  await db().update(schema.consultations).set({ transcriptText: transcript, transcriptSummary: summary, updatedAt: new Date() }).where(eq(schema.consultations.id, params.id));
  await audit({ actorUserId: user.id, actorRole: user.role, action: "create", entity: "consultations", entityId: params.id, meta: { transcript: true }, ipAddress: clientIp(req) });

  return NextResponse.json({ ok: true, summary });
}
