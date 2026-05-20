import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(name: string, specialty?: string, locality?: string) {
  const parts = [name, specialty, locality].filter(Boolean).join(" ");
  return parts
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatFeeRange(min: number | null, max: number | null) {
  if (min == null && max == null) return "Fee on request";
  if (min != null && max != null && min !== max) return `₹${min} - ₹${max}`;
  return `₹${min ?? max}`;
}

export function buildWhatsAppLink(rawNumber: string | null | undefined, message?: string) {
  if (!rawNumber) return null;
  const digits = rawNumber.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Default to India country code if not present
  const e164 = digits.length === 10 ? `91${digits}` : digits;
  const params = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${e164}${params}`;
}

export function buildTelLink(rawNumber: string | null | undefined) {
  if (!rawNumber) return null;
  const digits = rawNumber.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `tel:+${digits.length === 10 ? "91" : ""}${digits}`;
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

export function titleCase(s: string) {
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function truncate(s: string, n = 160) {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trimEnd()}…`;
}

export function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}
