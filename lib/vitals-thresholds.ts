// Vital Checkup (USP) — normal ranges + abnormal-flag + escalation engine.

export type VitalsInput = {
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  heartRate?: number | null;
  spo2?: number | null;
  temperatureC?: number | null;
  randomBloodSugar?: number | null;
  respiratoryRate?: number | null;
  painScale?: number | null;
};

export type FlagLevel = "normal" | "low" | "high" | "critical";
export type VitalsFlags = Partial<Record<keyof VitalsInput, FlagLevel>>;

export type VitalsEvaluation = {
  flags: VitalsFlags;
  abnormalCount: number;
  escalate: boolean; // any critical → urgent escalation
  summary: string;
};

function band(
  v: number | null | undefined,
  low: number,
  high: number,
  critLow: number,
  critHigh: number
): FlagLevel | undefined {
  if (v === null || v === undefined || Number.isNaN(v)) return undefined;
  if (v <= critLow || v >= critHigh) return "critical";
  if (v < low) return "low";
  if (v > high) return "high";
  return "normal";
}

export function evaluateVitals(v: VitalsInput): VitalsEvaluation {
  const flags: VitalsFlags = {};

  // Blood pressure (use the worse of systolic/diastolic).
  const sys = band(v.bpSystolic, 90, 140, 70, 180);
  const dia = band(v.bpDiastolic, 60, 90, 40, 120);
  const bp = worst(sys, dia);
  if (bp) flags.bpSystolic = bp;

  flags.heartRate = band(v.heartRate, 60, 100, 40, 130);
  flags.spo2 = spo2Band(v.spo2);
  flags.temperatureC = band(v.temperatureC, 36.1, 37.8, 35.0, 40.0);
  flags.randomBloodSugar = band(v.randomBloodSugar, 70, 140, 54, 250);
  flags.respiratoryRate = band(v.respiratoryRate, 12, 20, 8, 30);
  if (v.painScale != null) flags.painScale = v.painScale >= 8 ? "critical" : v.painScale >= 4 ? "high" : "normal";

  // Drop undefined keys.
  (Object.keys(flags) as (keyof VitalsInput)[]).forEach((k) => {
    if (!flags[k]) delete flags[k];
  });

  const levels = Object.values(flags);
  const abnormalCount = levels.filter((l) => l !== "normal").length;
  const escalate = levels.includes("critical");
  const summary = escalate
    ? "Urgent: one or more vitals are in the critical range. Immediate teleconsult or emergency care advised."
    : abnormalCount > 0
    ? `${abnormalCount} vital(s) outside normal range. A teleconsult is recommended.`
    : "All measured vitals are within normal range.";

  return { flags, abnormalCount, escalate, summary };
}

function worst(a?: FlagLevel, b?: FlagLevel): FlagLevel | undefined {
  const order: FlagLevel[] = ["normal", "low", "high", "critical"];
  if (!a) return b;
  if (!b) return a;
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function spo2Band(v?: number | null): FlagLevel | undefined {
  if (v == null || Number.isNaN(v)) return undefined;
  if (v < 90) return "critical";
  if (v < 94) return "low";
  return "normal";
}

export const VITALS_FIELDS: { key: keyof VitalsInput; label: string; unit: string }[] = [
  { key: "bpSystolic", label: "BP (systolic)", unit: "mmHg" },
  { key: "bpDiastolic", label: "BP (diastolic)", unit: "mmHg" },
  { key: "heartRate", label: "Heart rate", unit: "bpm" },
  { key: "spo2", label: "SpO₂", unit: "%" },
  { key: "temperatureC", label: "Temperature", unit: "°C" },
  { key: "randomBloodSugar", label: "Random blood sugar", unit: "mg/dL" },
  { key: "respiratoryRate", label: "Respiratory rate", unit: "/min" },
  { key: "painScale", label: "Pain scale", unit: "0–10" }
];
