import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

/**
 * POST /api/waitlist
 *
 * Accepts: { name?, email?, whatsapp?, city?, role, message? }
 *
 * Triple-fan-out so registrations never silently fail:
 *   1. Persist to Supabase `waitlist` table when env keys are set.
 *   2. Send a Resend email to NOTIFY_EMAIL when RESEND_API_KEY is set.
 *   3. Always POST a JSON copy to FormSubmit (https://formsubmit.co), which
 *      emails NOTIFY_EMAIL with no setup required.
 *
 * Even if (1) and (2) fail or aren't configured, (3) keeps the founder loop
 * intact for free.
 */

export const runtime = "nodejs";

// Hard-coded fallback recipient. Override with NOTIFY_EMAIL env var.
const DEFAULT_NOTIFY_EMAIL = "pandeyvishwas51@gmail.com";

function notifyEmail() {
  return process.env.NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_EMAIL;
}

type Payload = {
  name?: string;
  email?: string;
  whatsapp?: string;
  city?: string;
  role: string;
  message?: string;
};

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPhone(s: string) {
  return /^[+\d][\d\s\-()]{7,}$/.test(s);
}

async function persistToSupabase(p: Payload) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { ok: false, reason: "supabase env missing" };
    const client = supabaseService();
    const { error } = await client.from("waitlist").insert({
      email: p.email || null,
      whatsapp: p.whatsapp || null,
      city_of_residence: p.city || null,
      interest: [p.role, p.name && `name=${p.name}`, p.message && `note=${p.message}`]
        .filter(Boolean)
        .join(" | ")
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

async function sendResendEmail(p: Payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "no RESEND_API_KEY" };
  const subject = `Hanuone signup: ${p.role} from ${p.city || "Lucknow"}`;
  const body = renderHtmlBody(p);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Hanuone <onboarding@resend.dev>",
        to: [notifyEmail()],
        reply_to: p.email,
        subject,
        html: body
      })
    });
    if (!r.ok) return { ok: false, reason: `resend ${r.status}` };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

async function sendFormSubmit(p: Payload) {
  // FormSubmit "AJAX" endpoint: https://formsubmit.co/ajax/{email}
  // Free, no signup, instantly emails the recipient.
  // First-time use shows a confirmation email to NOTIFY_EMAIL; clicking the
  // link activates the address.
  const target = `https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail())}`;
  try {
    const r = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `Hanuone signup: ${p.role}`,
        _template: "table",
        _captcha: "false",
        Name: p.name || "(not given)",
        Email: p.email || "(not given)",
        WhatsApp: p.whatsapp || "(not given)",
        City: p.city || "(not given)",
        Role: p.role,
        Message: p.message || "(none)",
        Source: "hanuone.in / waitlist form"
      })
    });
    if (!r.ok) return { ok: false, reason: `formsubmit ${r.status}` };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: String((e as Error).message ?? e) };
  }
}

function renderHtmlBody(p: Payload) {
  const row = (k: string, v?: string) =>
    `<tr><td style="padding:6px 12px;background:#f6f8fb;font-weight:600">${k}</td><td style="padding:6px 12px">${v || "&mdash;"}</td></tr>`;
  return `
    <div style="font-family:Inter,system-ui,sans-serif;color:#03045E">
      <h2 style="color:#023E8A;margin:0 0 12px">New Hanuone signup</h2>
      <table style="border-collapse:collapse;width:100%;max-width:560px;border:1px solid #e5e7eb">
        ${row("Role", p.role)}
        ${row("Name", p.name)}
        ${row("Email", p.email)}
        ${row("WhatsApp", p.whatsapp)}
        ${row("City", p.city)}
        ${row("Message", p.message)}
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:16px">Sent from hanuone.in</p>
    </div>
  `;
}

export async function POST(req: Request) {
  let body: Partial<Payload> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const role = (body.role || "").trim();
  const email = (body.email || "").trim();
  const whatsapp = (body.whatsapp || "").trim();
  const name = (body.name || "").trim();
  const city = (body.city || "").trim();
  const message = (body.message || "").trim();

  if (!role) {
    return NextResponse.json({ ok: false, error: "Please select a role." }, { status: 400 });
  }
  if (!email && !whatsapp) {
    return NextResponse.json(
      { ok: false, error: "Please share an email or WhatsApp number." },
      { status: 400 }
    );
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "That email looks invalid." }, { status: 400 });
  }
  if (whatsapp && !isValidPhone(whatsapp)) {
    return NextResponse.json(
      { ok: false, error: "That WhatsApp number looks invalid." },
      { status: 400 }
    );
  }

  const payload: Payload = { role, email, whatsapp, name, city, message };

  // Run all three transports in parallel; success if at least one wins.
  const [supabase, resend, formSubmit] = await Promise.all([
    persistToSupabase(payload),
    sendResendEmail(payload),
    sendFormSubmit(payload)
  ]);

  const wins = [supabase, resend, formSubmit].filter((r) => r.ok);
  if (wins.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't save your details. Please try again or WhatsApp us.",
        debug: { supabase, resend, formSubmit }
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    transports: {
      supabase: supabase.ok,
      resend: resend.ok,
      formSubmit: formSubmit.ok
    }
  });
}
