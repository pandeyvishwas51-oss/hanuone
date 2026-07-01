import crypto from "crypto";
import { NextResponse } from "next/server";
import { aiDoctorRespond, type ChatMessage } from "@/lib/ai-doctor";
import { sendWhatsApp } from "@/lib/notify";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET?.trim();

// Verify Meta's X-Hub-Signature-256 HMAC over the raw body so attackers cannot
// forge inbound messages (which trigger AI replies + outbound WhatsApp sends).
function validSignature(raw: string, header: string | null): boolean {
  if (!APP_SECRET) return process.env.NODE_ENV !== "production"; // dev: allow; prod: reject unsigned
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}

// GET: Meta webhook verification handshake.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST: incoming WhatsApp messages. We reply with Dr. Hanu (AI) inside the
// 24-hour customer-service window (free-form replies allowed there).
export async function POST(req: Request) {
  // Read the raw body for signature verification, then parse.
  const raw = await req.text().catch(() => "");
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Forbidden", { status: 403 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // always 200 so Meta doesn't retry-storm
  }

  try {
    // Navigate the standard webhook payload shape.
    const entry = (body as { entry?: unknown[] })?.entry?.[0] as
      | { changes?: { value?: { messages?: { from?: string; text?: { body?: string } }[] } }[] }
      | undefined;
    const value = entry?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    const from = msg?.from;
    const text = msg?.text?.body;

    if (from && text) {
      await track({ name: "ai_chat", props: { channel: "whatsapp" } });
      const messages: ChatMessage[] = [{ role: "user", content: text }];
      const result = await aiDoctorRespond({ messages, city: "Lucknow" });
      const reply = result.emergency
        ? `${result.reply}\n\nCall 108 now.`
        : `${result.reply}\n\nBook on HanuONE: ${process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone"}/ai-doctor`;
      await sendWhatsApp(from, reply.slice(0, 4000));
    }
  } catch {
    /* never fail the webhook */
  }
  return NextResponse.json({ ok: true });
}
