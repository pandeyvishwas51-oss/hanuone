/**
 * AI clinical summary ("AI scribe"). Turns a consultation transcript into a
 * clear, patient-friendly summary using Claude (Azure Foundry).
 *
 * Note on capture: live in-call audio transcription is best done with Azure
 * Whisper on a recording (the mic is held by the video iframe during the call).
 * The browser Web Speech API works for dictation / notes capture. Either way,
 * this function takes the resulting transcript text and summarizes it.
 */
const API_KEY = process.env.HANUONE_AI_KEY || process.env.ANTHROPIC_API_KEY || "";
const API_URL =
  process.env.HANUONE_AI_URL ||
  "https://claude-opus-workspace-resource.services.ai.azure.com/anthropic/v1/messages?api-version=2023-06-01";
const MODEL = process.env.HANUONE_AI_MODEL || "claude-opus-4-8";

const PROMPT = `You are a medical scribe for HanuONE. Summarize the following doctor-patient consultation transcript into a clear, patient-friendly summary. Use simple English. Do not invent anything not in the transcript. Structure it exactly as:

What we discussed: (1-2 lines)
Doctor's assessment: (what the doctor thinks, in plain words; never a firm diagnosis the doctor didn't state)
Advice and plan: (medicines mentioned, tests, lifestyle, what to do)
Follow-up: (when to return or seek help)
Red flags: (when to seek urgent care, if relevant)

Keep it under 200 words. Do not use the em dash. End with: "This summary is for your records. Please follow your doctor's advice and contact them with any questions."`;

export async function summarizeTranscript(transcript: string): Promise<string> {
  if (!API_KEY || !transcript.trim()) {
    return "Summary unavailable. Your full transcript is saved in your account.";
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: PROMPT,
        messages: [{ role: "user", content: transcript.slice(0, 12000) }]
      })
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n").trim();
    return text.replace(/—/g, ", ") || "Summary could not be generated.";
  } catch {
    return "Summary could not be generated right now. Your full transcript is saved in your account.";
  }
}
