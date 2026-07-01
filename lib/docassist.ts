// DocAssist — agentic clinical co-pilot. Given a draft note + prescription, it
// runs drug-interaction, allergy and dose safety checks, proposes a differential
// diagnosis and suggests investigations. Claude Opus via Azure Foundry. This is
// decision SUPPORT for a licensed doctor, never autonomous prescribing.

const API_KEY = process.env.HANUONE_AI_KEY || process.env.ANTHROPIC_API_KEY || "";
const API_URL =
  process.env.HANUONE_AI_URL ||
  "https://claude-opus-workspace-resource.services.ai.azure.com/anthropic/v1/messages?api-version=2023-06-01";
const MODEL = process.env.HANUONE_AI_MODEL || "claude-opus-4-8";
export const DOCASSIST_LIVE = !!API_KEY;

export type Med = { name: string; dose?: string; frequency?: string; duration?: string };
export type DocAssistInput = {
  chiefComplaint?: string; assessment?: string; diagnosis?: string;
  medications?: Med[]; patientAge?: number | null; patientSex?: string | null; allergies?: string | null;
};
export type DocAssistResult = {
  overallRisk: "low" | "moderate" | "high";
  interactions: { drugs: string; severity: "major" | "moderate" | "minor"; note: string }[];
  allergyAlerts: { drug: string; note: string }[];
  doseFlags: { drug: string; note: string }[];
  differential: { condition: string; why: string }[];
  suggestedInvestigations: string[];
  redFlags: string[];
};

const SYSTEM = `You are "DocAssist", a clinical decision-support co-pilot for a licensed Indian physician inside an EMR. You are given a draft diagnosis and prescription. Act like a sharp, cautious clinical pharmacologist + physician. You provide SUPPORT only; the doctor decides.

Tasks:
1. Drug-drug interactions among the prescribed medicines (Indian context). Rate each major/moderate/minor with a one-line clinical note.
2. Allergy alerts: if the patient's stated allergies conflict with any prescribed drug.
3. Dose/duration flags: doses that look unsafe, duplicated, or wrong for the patient's age/sex.
4. A short differential diagnosis (2 to 4 plausible alternatives) with a one-line reason each.
5. Suggested investigations that would confirm/refine the diagnosis.
6. Red flags: symptoms/findings that need urgent escalation.

Be specific and clinically real. If there is nothing for a section, return an empty array. Never invent interactions that do not exist. Never use the em dash.

Respond with ONLY one valid JSON object, no markdown:
{
  "overallRisk": "low | moderate | high",
  "interactions": [{"drugs":"A + B","severity":"major|moderate|minor","note":""}],
  "allergyAlerts": [{"drug":"","note":""}],
  "doseFlags": [{"drug":"","note":""}],
  "differential": [{"condition":"","why":""}],
  "suggestedInvestigations": [""],
  "redFlags": [""]
}`;

function extractJson(text: string): unknown {
  const fenced = text.replace(/```json/gi, "```").split("```").find((s) => s.trim().startsWith("{"));
  const raw = fenced ?? text;
  const a = raw.indexOf("{"); const b = raw.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("No JSON in DocAssist response");
  return JSON.parse(raw.slice(a, b + 1));
}

function coerce(o: Record<string, unknown>): DocAssistResult {
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const risk = s(o.overallRisk).toLowerCase();
  return {
    overallRisk: risk === "high" || risk === "moderate" ? (risk as "high" | "moderate") : "low",
    interactions: arr(o.interactions).map((x) => x as Record<string, unknown>).map((x) => ({ drugs: s(x.drugs), severity: (["major", "moderate", "minor"].includes(s(x.severity)) ? s(x.severity) : "minor") as "major" | "moderate" | "minor", note: s(x.note) })).filter((x) => x.drugs),
    allergyAlerts: arr(o.allergyAlerts).map((x) => x as Record<string, unknown>).map((x) => ({ drug: s(x.drug), note: s(x.note) })).filter((x) => x.drug || x.note),
    doseFlags: arr(o.doseFlags).map((x) => x as Record<string, unknown>).map((x) => ({ drug: s(x.drug), note: s(x.note) })).filter((x) => x.note),
    differential: arr(o.differential).map((x) => x as Record<string, unknown>).map((x) => ({ condition: s(x.condition), why: s(x.why) })).filter((x) => x.condition),
    suggestedInvestigations: arr(o.suggestedInvestigations).map(s).filter(Boolean),
    redFlags: arr(o.redFlags).map(s).filter(Boolean)
  };
}

export async function runDocAssist(input: DocAssistInput): Promise<DocAssistResult> {
  if (!API_KEY) throw new Error("DocAssist is not configured");
  const meds = (input.medications || []).filter((m) => m && m.name)
    .map((m) => `- ${m.name}${m.dose ? " " + m.dose : ""}${m.frequency ? " " + m.frequency : ""}${m.duration ? " x " + m.duration : ""}`).join("\n") || "(none)";
  const ctx = [
    input.patientAge ? `Age: ${input.patientAge}` : null,
    input.patientSex ? `Sex: ${input.patientSex}` : null,
    input.allergies ? `Allergies: ${input.allergies}` : "Allergies: not stated",
    input.chiefComplaint ? `Chief complaint: ${input.chiefComplaint}` : null,
    input.assessment ? `Assessment: ${input.assessment}` : null,
    input.diagnosis ? `Diagnosis: ${input.diagnosis}` : null
  ].filter(Boolean).join("\n");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1500, system: SYSTEM,
      messages: [{ role: "user", content: `${ctx}\n\nPrescription:\n${meds}` }]
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DocAssist ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n").trim();
  return coerce(extractJson(text) as Record<string, unknown>);
}
