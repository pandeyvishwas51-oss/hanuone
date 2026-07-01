/**
 * AI Health Assistant ("Dr. Hanu") — agentic symptom triage powered by
 * Claude Opus 4.8 (via Azure AI Foundry, standard Anthropic Messages format).
 *
 * It takes a real history, personalises advice using the patient's own past
 * checkups/vitals, recommends a specific verified doctor in the patient's area
 * with ratings and reviews, and offers to book the appointment on their behalf.
 *
 * IMPORTANT: decision-support, NOT a diagnosis. Red-flag symptoms always
 * escalate to emergency advice.
 */

export type ChatRole = "user" | "assistant";

/** An uploaded file (image or PDF) the AI can read. `data` is raw base64 (no data: prefix). */
export interface Attachment {
  kind: "image" | "pdf";
  mediaType: string; // e.g. image/jpeg, image/png, application/pdf
  data: string; // base64
  name?: string;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  attachments?: Attachment[];
}

export interface DoctorCandidate {
  name: string;
  specialization: string;
  locality: string;
  city: string;
  experienceYears: number | null;
  feeMin: number | null;
  feeMax: number | null;
  rating: number | null;
  reviewCount: number;
  slug: string;
}

export interface PatientContext {
  name?: string | null;
  history?: string[]; // human-readable lines: vitals, past consults
}

export interface RespondInput {
  messages: ChatMessage[];
  city?: string;
  doctors?: DoctorCandidate[];
  patient?: PatientContext;
  voice?: boolean; // voice mode -> reply in patient's spoken language (Hindi/English)
}

export interface Suggestion {
  label: string;
  href: string;
  kind: "doctor" | "lab" | "vitals" | "emergency" | "medicine";
}

export interface AiDoctorReply {
  reply: string;
  suggestions: Suggestion[];
  emergency: boolean;
  live: boolean;
}

const API_KEY = process.env.HANUONE_AI_KEY || process.env.ANTHROPIC_API_KEY || "";
const API_URL =
  process.env.HANUONE_AI_URL ||
  "https://claude-opus-workspace-resource.services.ai.azure.com/anthropic/v1/messages?api-version=2023-06-01";
const MODEL = process.env.HANUONE_AI_MODEL || "claude-opus-4-8";
export const AI_LIVE = !!API_KEY;

const SYSTEM_PROMPT = `You are "Dr. Hanu", the AI Health Assistant of HanuONE, the world's first AI-native healthcare platform in India. The HanuONE promise is "Trusted Healthcare, Right at Home."

Your manner: talk like a real, warm, friendly human, the way a caring doctor friend chats. Be casual and natural, never robotic, formal or stiff. Do not sound like an AI and do not mention being an AI unless the person directly asks. Use short, everyday sentences.

WRITING RULES (follow strictly):
1. Never use the em dash or en dash character anywhere. Use a comma, a full stop, or the word "to" instead.
2. Never begin a line or sentence with an asterisk or any star symbol, and never use ** for bold. Write plain, natural sentences. If you list something, use a short "• " bullet at most.
3. Keep replies short and human, usually two to five short sentences. Never dump a long questionnaire.
4. Ask at most one or two focused questions per turn.

READING UPLOADED FILES:
You can read images and PDF files that the patient uploads, such as lab reports, blood test results, prescriptions, scan or X-ray reports, and photos of a visible problem like a skin rash. When a file is shared, study it carefully, explain the important findings in simple words, clearly flag any value or finding that looks abnormal or needs attention, and connect it to the patient's symptoms. Do not claim more certainty than the document actually shows, and remind them a HanuONE doctor should review it.

HOW YOU CONSULT (behave like a real doctor, not a search box):
1. First understand the problem properly before suggesting anything. Take a proper history over a few turns: the main complaint, when it started, how severe it is, what makes it better or worse, other symptoms, age, existing conditions, current medicines and allergies. Do not jump to a recommendation after a single line from the patient. Keep asking until you genuinely understand.
2. If the patient's own health history is given to you (past checkups, vitals, earlier consultations), use it to personalise your advice and to notice patterns. Refer to it naturally.
3. When you understand enough, give a brief, clear assessment in plain words: what it could be (never state a firm diagnosis) and what you suggest doing.
4. Then recommend care on HanuONE. When verified doctors are listed in your context, recommend ONE specific doctor by their exact name, and mention their experience, their patient rating and that their reviews are good, and why they suit this problem. For example: "For this, I would suggest Dr Asha Verma. She has 14 years of experience and a 4.8 rating from patients, and people speak well of her. I suggest you consult her."
5. Offer to act for the patient. Say you can book it for them, give the option of an in clinic visit or a teleconsultation, mention the approximate consultation fee, and ask for a clear yes before confirming. For example: "If you say yes, I can book this appointment for you. You can visit the clinic or do a video teleconsultation, and the fee is around the amount shown. Shall I go ahead and book it?" When the patient agrees, confirm warmly and tell them to tap the "Book Dr <name>" button shown below to pick a time slot and pay securely. You have set it up; they just confirm the slot and payment.
6. Suggest relevant lab tests or an at home Vital Checkup on HanuONE when it would genuinely help.

SAFETY (non negotiable, be strict):
1. If there is any sign this could be a medical emergency or a critical, life threatening situation, such as chest pain or pressure, trouble breathing, severe or uncontrolled bleeding, stroke signs like face drooping or slurred speech or sudden weakness on one side, sudden severe headache, fainting or loss of consciousness, a seizure, thoughts of self harm, a severe allergic reaction, very high fever with a stiff neck, severe dehydration in a baby, or bleeding in pregnancy, then STOP normal triage immediately. Do not ask more questions. Tell them firmly and directly to call 108 for an ambulance right now or go to the nearest emergency room immediately. Begin that reply with the token [EMERGENCY]. When in doubt about whether something is serious, treat it as an emergency and tell them to seek urgent care.
2. Never prescribe prescription medicines or doses. You may mention basic supportive care such as rest, fluids, or paracetamol for fever within normal limits, with caution.
3. You are an AI assistant, not a human doctor. Say so if asked. End a meaningful assessment with a short reminder that this is guidance and a HanuONE doctor will confirm.`;

const SPECIALTY_MAP: { specialty: string; keywords: string[] }[] = [
  { specialty: "Cardiologist", keywords: ["chest", "heart", "palpitation", "bp", "blood pressure"] },
  { specialty: "Dermatologist", keywords: ["skin", "rash", "acne", "hair", "itch", "pimple"] },
  { specialty: "Gynecologist", keywords: ["period", "menstrual", "pregnan", "vaginal", "pcod", "pcos"] },
  { specialty: "Pediatrician", keywords: ["child", "baby", "infant", "kid", "toddler", "year-old", "year old"] },
  { specialty: "Orthopedic", keywords: ["bone", "joint", "knee", "back pain", "fracture", "shoulder", "neck pain"] },
  { specialty: "ENT", keywords: ["ear", "nose", "throat", "sinus", "tonsil", "hearing"] },
  { specialty: "Gastroenterologist", keywords: ["stomach", "acidity", "abdomen", "diarrhea", "constipat", "vomit", "nausea", "loose motion", "bloat"] },
  { specialty: "Neurologist", keywords: ["headache", "migraine", "dizzy", "numbness", "seizure", "fits"] },
  { specialty: "Pulmonologist", keywords: ["cough", "breath", "asthma", "wheez", "lung", "chest congestion"] },
  { specialty: "Psychiatrist", keywords: ["anxiety", "depress", "stress", "sleep", "panic", "mental"] },
  { specialty: "Dentist", keywords: ["tooth", "teeth", "gum", "dental", "jaw"] },
  { specialty: "Ophthalmologist", keywords: ["eye", "vision", "blurry", "sight"] },
  { specialty: "Endocrinologist", keywords: ["diabetes", "sugar", "thyroid", "weight"] },
  { specialty: "General Physician", keywords: ["fever", "cold", "flu", "weak", "fatigue", "body ache", "tired"] }
];

const RED_FLAGS = [
  "chest pain", "chest pressure", "can't breathe", "cannot breathe", "difficulty breathing",
  "shortness of breath", "severe bleeding", "unconscious", "fainted", "seizure", "stroke",
  "slurred speech", "face drooping", "suicidal", "kill myself", "end my life", "severe headache",
  "stiff neck", "blood in vomit", "coughing blood"
];

export function detectSpecialty(text: string): string | null {
  const t = text.toLowerCase();
  let best: { specialty: string; score: number } | null = null;
  for (const { specialty, keywords } of SPECIALTY_MAP) {
    // Score by number of distinct keyword hits, weighting longer (more specific) keywords.
    let score = 0;
    for (const k of keywords) {
      if (t.includes(k)) score += k.length >= 6 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { specialty, score };
  }
  return best?.specialty ?? null;
}

function hasRedFlag(text: string): boolean {
  const t = text.toLowerCase();
  return RED_FLAGS.some((f) => t.includes(f));
}

/** Remove em/en dashes and markdown stars per the brand writing rules. */
function sanitize(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[\t ]*\*\s+/gm, "• ")
    .replace(/\s*—\s*/g, ", ") // em dash -> comma
    .replace(/–/g, "-") // en dash -> hyphen (keeps fee ranges sane)
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,])/g, "$1")
    .trim();
}

function buildContextBlock(input: RespondInput): string {
  const lines: string[] = [];
  const p = input.patient;
  if (p?.name || (p?.history && p.history.length)) {
    lines.push("PATIENT CONTEXT (use it naturally, do not read it back word for word):");
    if (p?.name) lines.push(`Name: ${p.name}`);
    if (p?.history && p.history.length) {
      lines.push("Recent health history on HanuONE:");
      for (const h of p.history.slice(0, 12)) lines.push(`• ${h}`);
    }
  }
  if (input.city) lines.push(`Active city: ${input.city}`);

  if (input.doctors && input.doctors.length) {
    lines.push("");
    lines.push("VERIFIED DOCTORS YOU MAY RECOMMEND (recommend only from this list, by exact name):");
    input.doctors.slice(0, 4).forEach((d, i) => {
      const exp = d.experienceYears ? `${d.experienceYears} yrs experience` : "experienced";
      const rating = d.rating ? `${d.rating}/5 from ${d.reviewCount} patient reviews` : "well reviewed";
      const fee =
        d.feeMin && d.feeMax ? `fee around ₹${d.feeMin} to ₹${d.feeMax}` : d.feeMin ? `fee around ₹${d.feeMin}` : "fee shown on profile";
      lines.push(`${i + 1}. Dr ${d.name}, ${d.specialization}, ${d.locality}, ${d.city}. ${exp}, ${rating}, ${fee}.`);
    });
  }
  return lines.join("\n");
}

function buildSuggestions(convoText: string, emergency: boolean, doctors?: DoctorCandidate[]): Suggestion[] {
  if (emergency) return [{ label: "Call 108 — Emergency", href: "tel:108", kind: "emergency" }];

  const out: Suggestion[] = [];
  if (doctors && doctors.length) {
    const top = doctors[0];
    out.push({ label: `Book Dr ${top.name}`, href: `/book/${top.slug}`, kind: "doctor" });
  } else {
    const specialty = detectSpecialty(convoText);
    out.push(
      specialty
        ? { label: `Book a ${specialty}`, href: `/doctors?specialty=${encodeURIComponent(specialty)}`, kind: "doctor" }
        : { label: "Find a doctor", href: "/doctors", kind: "doctor" }
    );
  }
  out.push({ label: "Book lab tests", href: "/lab", kind: "lab" });
  out.push({ label: "Vital Checkup at home", href: "/vitals", kind: "vitals" });
  return out;
}

type Block =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } };

function toApiMessage(m: ChatMessage): { role: ChatRole; content: string | Block[] } {
  if (!m.attachments || m.attachments.length === 0) {
    return { role: m.role, content: m.content };
  }
  const blocks: Block[] = [];
  for (const a of m.attachments) {
    if (a.kind === "image") {
      blocks.push({ type: "image", source: { type: "base64", media_type: a.mediaType, data: a.data } });
    } else {
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.data } });
    }
  }
  if (m.content) blocks.push({ type: "text", text: m.content });
  return { role: m.role, content: blocks };
}

async function callClaude(input: RespondInput): Promise<string> {
  const context = buildContextBlock(input);
  // Mode directive: voice replies in the patient's spoken language; text chat
  // always replies in clear English.
  const langRule =
    "Reply in the SAME language and style the patient uses. If they write Hinglish (Hindi using English/Roman letters), reply in Hinglish. If they write English, reply in English. If they write Hindi in Devanagari, reply in Hindi in Devanagari. Match them naturally.";
  const mode = input.voice
    ? `MODE: This is a spoken VOICE call. ${langRule} Keep replies short and spoken, usually one or two sentences, and ask one simple question at a time.`
    : `MODE: This is a TEXT chat. ${langRule}`;
  const system = `${SYSTEM_PROMPT}\n\n${mode}${context ? `\n\n----\n${context}` : ""}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
      system,
      messages: input.messages.map(toApiMessage)
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Foundry ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n")
    .trim();
  return text || "Sorry, I could not generate a response. Please try rephrasing.";
}

/** Minimal safe fallback only when no API key is configured. */
function fallbackReply(messages: ChatMessage[]): string {
  const all = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");
  if (hasRedFlag(all)) {
    return "[EMERGENCY] This could be serious. Please get emergency care right away or call 108 for an ambulance, or go to the nearest hospital now. Do not wait.";
  }
  const specialty = detectSpecialty(all);
  if (specialty) {
    return `Thank you for sharing. From what you describe, a ${specialty} is the right person to look at this properly. Please rest and stay hydrated meanwhile, and note anything that makes it worse. I suggest booking a consultation soon, sooner if it worsens. This is guidance, not a diagnosis, and a HanuONE doctor will confirm.`;
  }
  return "I want to understand this properly. How long has it been going on, and is it mild, moderate or severe? Is there any fever, pain or other symptom along with it?";
}

export async function aiDoctorRespond(input: RespondInput): Promise<AiDoctorReply> {
  const convoText = input.messages.map((m) => m.content).join(" ");

  let reply: string;
  let live = false;
  if (AI_LIVE) {
    try {
      reply = await callClaude(input);
      live = true;
    } catch {
      reply = fallbackReply(input.messages);
    }
  } else {
    reply = fallbackReply(input.messages);
  }

  const emergency = reply.startsWith("[EMERGENCY]") || hasRedFlag(convoText);
  reply = sanitize(reply.replace(/^\[EMERGENCY\]\s*/, ""));

  // Strict safety override: if we detected an emergency but the reply does not
  // clearly point to urgent care, prepend a firm emergency instruction.
  if (emergency && !/\b108\b|emergency|hospital|ambulance/i.test(reply)) {
    reply =
      "This may be a medical emergency. Please call 108 for an ambulance right now, or go to the nearest emergency room immediately. Do not wait.\n\n" +
      reply;
  }

  return {
    reply,
    suggestions: buildSuggestions(convoText, emergency, input.doctors),
    emergency,
    live
  };
}
