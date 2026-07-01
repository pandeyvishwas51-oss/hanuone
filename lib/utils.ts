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

/**
 * Parse a `YYYY-MM-DD` string as LOCAL midnight (not UTC). `new Date("2026-06-26")`
 * is parsed as UTC, which in IST (UTC+5:30) is already the previous evening — so
 * comparisons/labels shift a day. Use this for date-only values.
 */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Format an integer rupee amount with Indian digit grouping, e.g. 125000 → "₹1,25,000". */
export function formatINR(n: number | null | undefined): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `₹${v.toLocaleString("en-IN")}`;
}

/** Format a `YYYY-MM-DD` date string as a short India-localized label, e.g. "4 Jul". */
export function formatLocalDate(s: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  const d = parseLocalDate(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", opts);
}

/** Today's date as a local `YYYY-MM-DD` string (for date-input min / defaults). */
export function localDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
