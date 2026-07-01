"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VoiceChat from "@/components/VoiceChat";

/**
 * Real-time voice agent (gpt-realtime via Azure) — speech to speech, human
 * voice, any language, interruptible, with doctor-search + booking tools. This
 * is the ChatGPT/Gemini-style voice. Falls back to a clear message if the
 * browser or connection cannot start.
 */

type Doc = { name: string; specialization: string; feeMin: number | null; rating: number | null; slug: string; bookUrl: string };

export default function RealtimeVoice() {
  const [state, setState] = useState<"idle" | "connecting" | "listening" | "thinking" | "speaking" | "error">("idle");
  const [caption, setCaption] = useState("");
  const [doctors, setDoctors] = useState<Doc[]>([]);
  const [booked, setBooked] = useState<{ kind: string; when?: string; doctorName?: string } | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [fallback, setFallback] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Release the mic + peer connection if the component unmounts mid-call (e.g. the
  // user navigates away without pressing stop) — otherwise the mic stays live and
  // the WebRTC session keeps streaming. Hardware-only teardown (no setState on unmount).
  useEffect(() => () => {
    try { dcRef.current?.close(); } catch { /* ignore */ }
    try { pcRef.current?.close(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
  }, []);

  function send(obj: unknown) {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") dc.send(JSON.stringify(obj));
  }

  async function handleEvent(raw: string) {
    let ev: { type?: string; name?: string; arguments?: string; call_id?: string; delta?: string; transcript?: string };
    try { ev = JSON.parse(raw); } catch { return; }
    switch (ev.type) {
      case "input_audio_buffer.speech_started":
        setState("listening"); setCaption("");
        break;
      case "response.created":
        setState("thinking");
        break;
      case "response.audio.delta":
      case "output_audio_buffer.started":
        setState("speaking");
        break;
      case "response.audio_transcript.delta":
        setCaption((c) => (c + (ev.delta || "")).slice(-160));
        break;
      case "response.done":
        setState("listening");
        break;
      case "response.function_call_arguments.done": {
        const args = (() => { try { return JSON.parse(ev.arguments || "{}"); } catch { return {}; } })();
        if (ev.name === "find_doctors") {
          const r = await fetch("/api/realtime/find-doctors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
          const j = await r.json();
          setDoctors(j.doctors || []);
          send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: ev.call_id, output: JSON.stringify(j.doctors || []) } });
          send({ type: "response.create" });
        } else if (ev.name === "book_consult" || ev.name === "book_vitals" || ev.name === "book_lab") {
          // Actually create the booking server-side, then hand the result back to
          // the agent so it confirms by voice. No page, no manual slot, no payment.
          const kind = ev.name === "book_vitals" ? "vitals" : ev.name === "book_lab" ? "lab" : "consult";
          const payload = { kind, doctorSlug: args.slug, doctorName: args.doctorName, ...args };
          let out: unknown;
          try {
            const r = await fetch("/api/realtime/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            out = await r.json();
          } catch {
            out = { ok: false, error: "Network error while booking. Please try again." };
          }
          if ((out as { ok?: boolean }).ok) {
            setBooked(out as { kind: string; when?: string; doctorName?: string });
          }
          send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: ev.call_id, output: JSON.stringify(out) } });
          send({ type: "response.create" });
        }
        break;
      }
      default:
        break;
    }
  }

  async function start() {
    setState("connecting"); setErrMsg("");
    try {
      const sres = await fetch("/api/realtime/session", { method: "POST" });
      const s = await sres.json();
      if (!s.ok || !s.clientSecret) throw new Error(s.error || "Could not start the voice session");

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote audio (Dr. Hanu's voice).
      if (!audioRef.current) { const a = document.createElement("audio"); a.autoplay = true; audioRef.current = a; }
      pc.ontrack = (e) => { if (audioRef.current) audioRef.current.srcObject = e.streams[0]; };

      // Mic.
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms;
      pc.addTrack(ms.getAudioTracks()[0], ms);

      // Events channel.
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => handleEvent(e.data);
      dc.onopen = () => { setState("listening"); send({ type: "response.create" }); };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(s.webrtcUrl, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${s.clientSecret}`, "Content-Type": "application/sdp" }
      });
      if (!sdpRes.ok) throw new Error("Voice connection failed (" + sdpRes.status + ")");
      const answer = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (e) {
      // Realtime could not connect (CORS / endpoint / network). Fall back to the
      // reliable browser voice so the user is never stuck.
      setErrMsg((e as Error).message || "Could not start voice");
      setFallback(true);
    }
  }

  function stop() {
    try { dcRef.current?.close(); } catch { /* ignore */ }
    try { pcRef.current?.close(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    setState("idle"); setCaption("");
  }

  // If realtime failed to connect, use the reliable browser voice instead.
  if (fallback) return <VoiceChat />;

  const active = state !== "idle" && state !== "error";
  const status = {
    idle: "Tap to talk", connecting: "Connecting…", listening: "Listening…",
    thinking: "Thinking…", speaking: "Speaking…", error: "Could not connect"
  }[state];
  const glow =
    state === "speaking" ? "radial-gradient(circle, rgba(254,125,21,0.55), transparent 70%)"
    : state === "listening" ? "radial-gradient(circle, rgba(1,88,108,0.55), transparent 70%)"
    : "radial-gradient(circle, rgba(10,125,150,0.4), transparent 70%)";

  return (
    <div className="mx-auto max-w-md px-2">
      <div className="relative mx-auto flex h-80 items-center justify-center">
        <div className="absolute h-64 w-64 rounded-full blur-3xl transition-all duration-700" style={{ background: glow, opacity: active ? 0.95 : 0.45 }} />
        {active && (
          <>
            <span className="absolute h-52 w-52 animate-ping rounded-full border border-accent/40" />
            <span className="absolute h-64 w-64 animate-ping rounded-full border border-primary/20" style={{ animationDelay: "0.6s" }} />
          </>
        )}
        <button
          onClick={active ? stop : start}
          aria-label="Talk to Dr. Hanu"
          className="relative grid h-48 w-48 place-items-center rounded-full shadow-[0_24px_70px_-18px_rgba(1,88,108,0.7)] transition-transform duration-200 active:scale-95"
          style={{ background: "conic-gradient(from 140deg, #01586C, #0a7d96, #FE7D15, #0a7d96, #01586C)" }}
        >
          <div className="absolute inset-[7px] rounded-full bg-gradient-to-br from-[#024a5a] to-[#012b35]" />
          <div className="relative text-white">
            {state === "speaking" ? (
              <div className="flex items-end gap-1.5" style={{ height: 42 }}>
                {[0, 1, 2, 3, 4].map((i) => <span key={i} className="w-1.5 rounded-full bg-white" style={{ height: 12, animation: "voicebar 0.9s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />)}
              </div>
            ) : (
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
              </svg>
            )}
          </div>
        </button>
      </div>

      <div className="text-center">
        <div className="text-lg font-semibold text-primary">{status}</div>
        {caption ? <div className="mt-1 text-sm italic text-muted">&ldquo;{caption}&rdquo;</div>
          : !active && <p className="mt-1 text-xs text-muted">Speak in Hindi, English or Hinglish — a real human voice replies</p>}
        {state === "error" && <p className="mt-1 text-xs text-rose-600">{errMsg}</p>}
      </div>

      {active && <div className="mt-5 text-center"><button onClick={stop} className="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Stop</button></div>}

      {booked && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <div className="mx-auto mb-1 grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div className="text-sm font-semibold text-emerald-800">
            {booked.kind === "consult" ? `Booked with ${booked.doctorName || "your doctor"}` : booked.kind === "vitals" ? "Vital Checkup booked" : "Lab test booked"}
          </div>
          {booked.when && <div className="text-xs text-emerald-700">{booked.when}</div>}
          <button onClick={() => router.push("/my-bookings")} className="mt-2 text-xs font-semibold text-emerald-700 underline">View my bookings</button>
        </div>
      )}

      {doctors.length > 0 && (
        <div className="mt-6 space-y-2">
          {doctors.map((d) => (
            <Link key={d.slug} href={d.bookUrl} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-primary">
              <div>
                <div className="text-sm font-semibold text-ink">{d.name}</div>
                <div className="text-xs text-muted">{d.specialization}{d.rating ? ` · ${d.rating}★` : ""}{d.feeMin ? ` · ₹${d.feeMin}` : ""}</div>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">Book →</span>
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes voicebar { 0%,100%{height:10px;opacity:.7} 50%{height:40px;opacity:1} }
      `}</style>
    </div>
  );
}
