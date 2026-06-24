// MSG91 OTP + SMS + WhatsApp client.
// Docs: https://docs.msg91.com/otp
// All calls are best-effort and never throw to the caller; they return {ok, ...}.
//
// Env:
//   MSG91_AUTH_KEY      - account auth key (server-only)
//   MSG91_OTP_TEMPLATE  - approved OTP template id
//   MSG91_SENDER_ID     - 6-char DLT sender id for transactional SMS
//   MSG91_DLT_TEMPLATE  - (optional) transactional SMS template id
//
// Dev fallback: when MSG91_AUTH_KEY is unset we DO NOT call the network.
// sendOtp succeeds and verifyOtp accepts the fixed code "000000" so the full
// flow is testable locally before credentials exist. NEVER enable in prod.

const BASE = "https://control.msg91.com/api/v5";

const AUTH_KEY = process.env.MSG91_AUTH_KEY?.trim();
const OTP_TEMPLATE = process.env.MSG91_OTP_TEMPLATE?.trim();
const SENDER_ID = process.env.MSG91_SENDER_ID?.trim();

export const MSG91_LIVE = !!AUTH_KEY;
const DEV_OTP = "000000";

/** Normalize an Indian mobile to MSG91's `91XXXXXXXXXX` form. */
export function normalizeMobile(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function isValidIndianMobile(phone: string): boolean {
  return /^91[6-9]\d{9}$/.test(normalizeMobile(phone));
}

type Result<T = unknown> = { ok: boolean; reason?: string } & T;

async function call(path: string, params: Record<string, string>): Promise<Result> {
  if (!AUTH_KEY) return { ok: false, reason: "MSG91_AUTH_KEY missing" };
  const url = `${BASE}${path}?${new URLSearchParams(params).toString()}`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { authkey: AUTH_KEY, "Content-Type": "application/json" }
    });
    const json = (await r.json().catch(() => ({}))) as { type?: string; message?: string; request_id?: string };
    const ok = r.ok && json.type !== "error";
    return { ok, reason: ok ? undefined : json.message || `http ${r.status}`, ...json };
  } catch (e) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

/** Send a login OTP to the given mobile. */
export async function sendOtp(phone: string): Promise<Result<{ requestId?: string; dev?: boolean }>> {
  const mobile = normalizeMobile(phone);
  if (!MSG91_LIVE) {
    // Local dev: pretend success; verify will accept DEV_OTP.
    return { ok: true, dev: true, requestId: "dev" };
  }
  const params: Record<string, string> = { mobile, otp_length: "6" };
  if (OTP_TEMPLATE) params.template_id = OTP_TEMPLATE;
  const res = await call("/otp", params);
  return { ...res, requestId: (res as { request_id?: string }).request_id };
}

/** Verify an OTP for the given mobile. */
export async function verifyOtp(phone: string, otp: string): Promise<Result> {
  const mobile = normalizeMobile(phone);
  if (!MSG91_LIVE) {
    return { ok: otp.trim() === DEV_OTP, reason: otp.trim() === DEV_OTP ? undefined : "invalid otp (dev expects 000000)" };
  }
  return call("/otp/verify", { mobile, otp: otp.trim() });
}

/** Resend OTP (text channel). */
export async function resendOtp(phone: string): Promise<Result> {
  const mobile = normalizeMobile(phone);
  if (!MSG91_LIVE) return { ok: true };
  return call("/otp/retry", { mobile, retrytype: "text" });
}

/** Fire a transactional SMS (best-effort). */
export async function sendSms(phone: string, message: string): Promise<Result> {
  const mobile = normalizeMobile(phone);
  if (!MSG91_LIVE) {
    console.info(`[msg91:dev] SMS -> ${mobile}: ${message}`);
    return { ok: true };
  }
  const params: Record<string, string> = { mobile, message };
  if (SENDER_ID) params.sender = SENDER_ID;
  return call("/flow", params);
}
