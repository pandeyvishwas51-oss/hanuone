import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = process.env.HANUONE_REALTIME_ENDPOINT || "";
const KEY = process.env.HANUONE_REALTIME_KEY || "";
const DEPLOYMENT = process.env.HANUONE_REALTIME_DEPLOYMENT || "gpt-realtime";
const API_VERSION = process.env.HANUONE_REALTIME_APIVERSION || "2025-04-01-preview";
// Region for the WebRTC SDP endpoint (confirmed: eastus2 realtimertc responds).
const REGION = process.env.HANUONE_REALTIME_REGION || "eastus2";

// Voice-agent brain: same powers as Dr. Hanu, plus tools to actually act.
const INSTRUCTIONS = `You are Dr. Hanu, the AI health assistant of HanuONE, India's AI-native healthcare platform. You are speaking with a patient by VOICE.

Talk like a real, warm, friendly human doctor on a phone call. Be natural and casual, never robotic. Reply in the SAME language the patient speaks: Hindi, English or Hinglish. Keep replies short and spoken, one or two sentences, ask one simple question at a time.

Do careful symptom triage like a good doctor: ask about the main complaint, when it started, how severe, other symptoms. After you understand enough, suggest what it could be (never a firm diagnosis) and what to do.

YOU BOOK EVERYTHING YOURSELF BY VOICE. You are a full booking agent, not a guide. Never tell the patient to open a page, select a slot, or do anything themselves. You ask the questions, you make the booking.

How to book a doctor:
1. Call find_doctors with the right specialty. Tell the patient the doctor's name, experience and fee.
2. To actually book, you MUST collect, by asking one at a time: (a) the patient's full name, (b) their 10-digit mobile number, (c) which day they want (today, tomorrow, or a weekday), (d) what time of day suits them.
3. Read the mobile number back to confirm it. Then call book_consult with the doctor's slug and name and all the collected details.
4. When book_consult returns ok, confirm warmly: say the booking is done, the doctor's name and the day and time, and that they'll get a confirmation message on their phone. Do NOT mention payment or slots.

Booking a Vital Checkup (home nurse records vitals): collect name, mobile, the home address, the patient's gender (so we send a same-gender caregiver for their comfort and safety), and preferred day, then call book_vitals.
Booking a lab test: collect name, mobile, the test name, address and preferred day, then call book_lab.

If a booking tool returns an error asking for a missing detail, simply ask the patient for that one detail and call the tool again. NEVER say you cannot book or that they must do it manually. You always complete the booking on the call.

SAFETY: For any emergency sign (chest pain, trouble breathing, severe bleeding, stroke signs, fainting, suicidal thoughts), immediately and firmly tell them to call 108 for an ambulance or go to the nearest hospital now. Never prescribe prescription medicines. You are an AI assistant; say so if asked. Never use the em dash.`;

const TOOLS = [
  {
    type: "function",
    name: "find_doctors",
    description: "Find real verified doctors on HanuONE for a given medical specialty in the patient's city. Returns names, experience, fees and a booking link.",
    parameters: {
      type: "object",
      properties: {
        specialty: { type: "string", description: "Medical specialty, e.g. Cardiologist, Dermatologist, General Physician, Pediatrician, Neurologist, Gynecologist, Orthopedic." },
        city: { type: "string", description: "City, default Lucknow." }
      },
      required: ["specialty"]
    }
  },
  {
    type: "function",
    name: "book_consult",
    description: "Actually create a doctor consultation booking for the patient. Only call this once you have collected the patient's name, mobile number, preferred day and time. This completes the booking; the patient does NOT need to do anything else.",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The doctor's slug returned by find_doctors." },
        doctorName: { type: "string", description: "The doctor's full name returned by find_doctors." },
        patientName: { type: "string", description: "The patient's full name, asked by voice." },
        patientPhone: { type: "string", description: "The patient's 10-digit Indian mobile number, asked and confirmed by voice." },
        whenDay: { type: "string", description: "Preferred day in plain words: today, tomorrow, day after tomorrow, or a weekday like Monday." },
        whenTime: { type: "string", description: "Preferred time in plain words, e.g. 5pm, morning, evening." },
        reason: { type: "string", description: "Short reason or symptoms, optional." },
        city: { type: "string", description: "City, optional." }
      },
      required: ["slug", "doctorName", "patientName", "patientPhone", "whenDay", "whenTime"]
    }
  },
  {
    type: "function",
    name: "book_vitals",
    description: "Actually book a Vital Checkup (a verified nurse visits the patient's home to record their vitals). Collect name, mobile, home address, the patient's gender and preferred day first.",
    parameters: {
      type: "object",
      properties: {
        patientName: { type: "string", description: "The patient's full name." },
        patientPhone: { type: "string", description: "The patient's 10-digit mobile number." },
        address: { type: "string", description: "The patient's home address for the nurse visit." },
        gender: { type: "string", enum: ["female", "male", "other"], description: "The patient's gender — REQUIRED so we send a same-gender caregiver for their comfort and safety." },
        whenDay: { type: "string", description: "Preferred day in plain words." },
        whenTime: { type: "string", description: "Preferred time in plain words." },
        city: { type: "string", description: "City, optional." }
      },
      required: ["patientName", "patientPhone", "address", "gender", "whenDay"]
    }
  },
  {
    type: "function",
    name: "book_lab",
    description: "Actually book a lab test with home sample collection. Collect name, mobile, the test name, address and preferred day first.",
    parameters: {
      type: "object",
      properties: {
        testName: { type: "string", description: "The lab test name, e.g. CBC, Thyroid profile, Vitamin D." },
        patientName: { type: "string", description: "The patient's full name." },
        patientPhone: { type: "string", description: "The patient's 10-digit mobile number." },
        address: { type: "string", description: "The patient's address for home sample collection." },
        whenDay: { type: "string", description: "Preferred day in plain words." },
        whenTime: { type: "string", description: "Preferred time in plain words." },
        city: { type: "string", description: "City, optional." }
      },
      required: ["testName", "patientName", "patientPhone", "whenDay"]
    }
  }
];

// POST -> mint an ephemeral realtime session (client connects via WebRTC).
export async function POST(req: Request) {
  const rl = await rateLimit(`rt:${clientIp(req)}`, 10, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  if (!ENDPOINT || !KEY) return NextResponse.json({ ok: false, error: "Realtime not configured" }, { status: 503 });

  try {
    const res = await fetch(`${ENDPOINT}/openai/realtimeapi/sessions?api-version=${API_VERSION}`, {
      method: "POST",
      headers: { "api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DEPLOYMENT,
        voice: "marin",
        modalities: ["audio", "text"],
        instructions: INSTRUCTIONS,
        tools: TOOLS,
        tool_choice: "auto",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: { type: "server_vad", threshold: 0.5, silence_duration_ms: 700 }
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Session failed ${res.status}`, detail: t.slice(0, 200) }, { status: 502 });
    }
    const data = (await res.json()) as { client_secret?: { value: string; expires_at: number }; id: string };
    return NextResponse.json({
      ok: true,
      clientSecret: data.client_secret?.value,
      expiresAt: data.client_secret?.expires_at,
      sessionId: data.id,
      // WebRTC SDP endpoint for the browser to connect to (regional realtimertc).
      webrtcUrl: `https://${REGION}.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=${DEPLOYMENT}`,
      deployment: DEPLOYMENT
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Realtime error" }, { status: 500 });
  }
}
