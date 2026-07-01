/**
 * Provider license verification.
 *
 * Step 1 (automated): Claude vision OCRs an uploaded certificate (medical
 * registration, nursing registration, drug license, degree) and extracts the
 * name, registration number and council.
 * Step 2 (assisted): we point ops at the correct PUBLIC registry to confirm
 * the number. No official free API exists, so the final tick is an ops action.
 *
 *   Doctors -> NMC National Medical Register / Indian Medical Register
 *              https://www.nmc.org.in/information-desk/indian-medical-register/
 *   Nurses  -> U.P. Nurses & Midwives Council
 *              https://www.upnursescouncil.org/
 */

const API_KEY = process.env.HANUONE_AI_KEY || process.env.ANTHROPIC_API_KEY || "";
const API_URL =
  process.env.HANUONE_AI_URL ||
  "https://claude-opus-workspace-resource.services.ai.azure.com/anthropic/v1/messages?api-version=2023-06-01";
const MODEL = process.env.HANUONE_AI_MODEL || "claude-opus-4-8";

export type DocType =
  | "medical_registration"
  | "nursing_registration"
  | "degree"
  | "gov_id"
  | "drug_license";

export interface LicenseExtract {
  name: string | null;
  registrationNumber: string | null;
  council: string | null;
  qualifications: string | null;
  issueYear: string | null;
  rawText: string;
  registryUrl: string;
}

export function registryFor(docType: DocType): { name: string; url: string } {
  switch (docType) {
    case "nursing_registration":
      return { name: "U.P. Nurses & Midwives Council", url: "https://www.upnursescouncil.org/" };
    case "drug_license":
      return { name: "State Drug Controller", url: "https://cdscoonline.gov.in/" };
    default:
      return {
        name: "NMC National Medical Register",
        url: "https://www.nmc.org.in/information-desk/indian-medical-register/"
      };
  }
}

const EXTRACT_PROMPT = `You are a document verification assistant for a healthcare platform in India. Read the attached certificate image or PDF and extract the following as STRICT JSON only, no prose:
{
  "name": string|null,                // full name of the registered person
  "registrationNumber": string|null,  // medical / nursing / license registration number
  "council": string|null,             // issuing council or authority
  "qualifications": string|null,      // degrees / qualifications shown
  "issueYear": string|null            // year of registration if visible
}
If a field is not clearly visible, use null. Return ONLY the JSON object.`;

interface Attachment {
  kind: "image" | "pdf";
  mediaType: string;
  data: string; // base64
}

export async function extractLicense(att: Attachment, docType: DocType): Promise<LicenseExtract> {
  const registry = registryFor(docType);
  if (!API_KEY) {
    return {
      name: null,
      registrationNumber: null,
      council: null,
      qualifications: null,
      issueYear: null,
      rawText: "AI key not configured; manual entry required.",
      registryUrl: registry.url
    };
  }

  const block =
    att.kind === "image"
      ? { type: "image", source: { type: "base64", media_type: att.mediaType, data: att.data } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: att.data } };

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
      max_tokens: 500,
      messages: [{ role: "user", content: [block, { type: "text", text: EXTRACT_PROMPT }] }]
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OCR failed ${res.status}: ${t.slice(0, 150)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n").trim();

  let parsed: Partial<LicenseExtract> = {};
  try {
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    parsed = JSON.parse(json);
  } catch {
    /* leave empty; ops fills manually */
  }

  return {
    name: parsed.name ?? null,
    registrationNumber: parsed.registrationNumber ?? null,
    council: parsed.council ?? null,
    qualifications: parsed.qualifications ?? null,
    issueYear: parsed.issueYear ?? null,
    rawText: raw,
    registryUrl: registry.url
  };
}
