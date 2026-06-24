// NMC Telemedicine 2022 + DPDP compliance helpers: consent text + Rx rules.

export const TELEMEDICINE_CONSENT_TEXT =
  "I confirm that I am initiating this teleconsultation voluntarily. I understand the doctor " +
  "(Registered Medical Practitioner) will consult me via the selected mode of communication, that " +
  "this consultation is governed by the NMC Telemedicine Practice Guidelines 2022, and that my " +
  "health information will be processed as described in the Privacy Policy under the DPDP Act 2023.";

export const DATA_PROCESSING_CONSENT_TEXT =
  "I consent to Hanuone processing my personal and health data to deliver the requested services, " +
  "as described in the Privacy Policy, in accordance with the DPDP Act 2023.";

// Schedule X (narcotic/psychotropic) — STRICTLY PROHIBITED via telemedicine.
// Non-exhaustive seed; expand with the full taxonomy before live.
const SCHEDULE_X = [
  "alprazolam", "diazepam", "lorazepam", "clonazepam", "nitrazepam",
  "buprenorphine", "morphine", "fentanyl", "codeine", "tramadol",
  "methylphenidate", "amphetamine", "barbiturate", "phenobarbital",
  "ketamine", "zolpidem", "pentazocine"
];

export type RxMed = { name: string; dosage?: string; frequency?: string; duration?: string };

export type RxValidation = { ok: boolean; blocked: string[]; reason?: string };

/** Reject any prescription containing a Schedule X drug (hard block). */
export function validatePrescription(meds: RxMed[]): RxValidation {
  const blocked: string[] = [];
  for (const m of meds) {
    const name = (m.name || "").toLowerCase();
    if (SCHEDULE_X.some((s) => name.includes(s))) blocked.push(m.name);
  }
  if (blocked.length) {
    return {
      ok: false,
      blocked,
      reason: `These drugs cannot be prescribed via telemedicine (Schedule X): ${blocked.join(", ")}`
    };
  }
  return { ok: true, blocked: [] };
}

/** E-prescription validity: 2 weeks from issue (NMC). */
export function prescriptionValidUntil(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}
