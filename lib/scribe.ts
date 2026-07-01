// Ambient AI Scribe — turns a raw doctor/patient consultation transcript into a
// structured SOAP note + draft prescription, using Claude Opus via Azure Foundry.
// Multilingual: understands Hindi, Hinglish and English; writes the patient
// summary back in the language the consultation happened in.

const API_KEY = process.env.HANUONE_AI_KEY || process.env.ANTHROPIC_API_KEY || "";
const API_URL =
  process.env.HANUONE_AI_URL ||
  "https://claude-opus-workspace-resource.services.ai.azure.com/anthropic/v1/messages?api-version=2023-06-01";
const MODEL = process.env.HANUONE_AI_MODEL || "claude-opus-4-8";
export const SCRIBE_LIVE = !!API_KEY;

export type ScribeMedication = { name: string; dose?: string; frequency?: string; duration?: string; instructions?: string };
export type ScribeNote = {
  chiefComplaint: string;
  hpi: string;
  examination: string;
  assessment: string;
  diagnosis: string;
  investigations: string;
  medications: ScribeMedication[];
  advice: string;
  followUp: string;
  redFlags: string;
  patientSummary: string;
  language: string;
};

export type ScribeContext = { patientName?: string; patientAge?: number | null; patientSex?: string | null };

const SYSTEM = `You are an expert Indian clinical documentation assistant (an "AI medical scribe") working inside a doctor's EMR. You are given the raw transcript of a real consultation between a doctor and a patient. The transcript may be in English, Hindi, Hinglish (Hindi in Roman letters) or a mix, and may have speech-to-text errors.

Your job: read the conversation like an experienced physician and produce a clean, structured clinical note plus a draft prescription that the doctor will review, edit and sign. You are an assistant, not the prescriber: be accurate, conservative and never invent findings that were not discussed.

Rules:
- Use standard Indian clinical practice and commonly used Indian drug names (generic, with a common brand in brackets only if obviously relevant). Give realistic adult doses, frequency (e.g. "1-0-1", "BD", "TDS", "OD", "SOS") and duration.
- Only include medications that fit what was actually discussed. If the doctor clearly stated a medicine, include it. If unsure, leave medications empty rather than guessing dangerous drugs. Never include controlled/narcotic drugs unless the doctor explicitly dictated them.
- Flag any red-flag or emergency symptoms and clear "return immediately if" advice in redFlags.
- "patientSummary" must be written in the SAME language/style the patient used (Hindi in Devanagari, Hinglish in Roman, or English) — warm, simple, 2 to 4 short sentences a layperson understands. Never use the em dash.
- Keep each clinical field concise. Leave a field as an empty string if nothing relevant was discussed.

Respond with ONLY a single valid JSON object, no markdown, no commentary, exactly this shape:
{
  "chiefComplaint": "",
  "hpi": "",
  "examination": "",
  "assessment": "",
  "diagnosis": "",
  "investigations": "",
  "medications": [{"name":"","dose":"","frequency":"","duration":"","instructions":""}],
  "advice": "",
  "followUp": "",
  "redFlags": "",
  "patientSummary": "",
  "language": "en | hi | hinglish"
}`;

function extractJson(text: string): unknown {
  const fenced = text.replace(/```json/gi, "```").split("```").find((s) => s.trim().startsWith("{"));
  const raw = fenced ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in scribe response");
  return JSON.parse(raw.slice(start, end + 1));
}

function coerce(o: Record<string, unknown>): ScribeNote {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const meds = Array.isArray(o.medications) ? o.medications : [];
  return {
    chiefComplaint: s(o.chiefComplaint),
    hpi: s(o.hpi),
    examination: s(o.examination),
    assessment: s(o.assessment),
    diagnosis: s(o.diagnosis),
    investigations: s(o.investigations),
    medications: meds
      .map((m) => (m && typeof m === "object" ? m as Record<string, unknown> : {}))
      .map((m) => ({ name: s(m.name), dose: s(m.dose), frequency: s(m.frequency), duration: s(m.duration), instructions: s(m.instructions) }))
      .filter((m) => m.name),
    advice: s(o.advice),
    followUp: s(o.followUp),
    redFlags: s(o.redFlags),
    patientSummary: s(o.patientSummary),
    language: s(o.language) || "en"
  };
}

/** Generate a structured SOAP note + draft Rx from a consultation transcript. */
export async function generateScribeNote(transcript: string, ctx: ScribeContext = {}): Promise<ScribeNote> {
  if (!API_KEY) throw new Error("Scribe AI is not configured");
  const header = [
    ctx.patientName ? `Patient: ${ctx.patientName}` : null,
    ctx.patientAge ? `Age: ${ctx.patientAge}` : null,
    ctx.patientSex ? `Sex: ${ctx.patientSex}` : null
  ].filter(Boolean).join(" · ");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: `${header ? header + "\n\n" : ""}CONSULTATION TRANSCRIPT:\n${transcript}` }]
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Scribe ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n").trim();
  return coerce(extractJson(text) as Record<string, unknown>);
}
