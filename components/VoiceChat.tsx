"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Direct, premium voice conversation with Dr. Hanu. No toggles — speak any
 * language (Hindi, English or Hinglish) and it replies in the same language and
 * voice. Pipeline: browser Speech-to-Text -> /api/ai-doctor (Claude) -> TTS.
 */

type Suggestion = { label: string; href: string; kind: string };

interface SRResult { 0: { transcript: string }; isFinal: boolean }
interface SREvent { resultIndex: number; results: ArrayLike<SRResult> }
interface SpeechRec {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: SREvent) => void) | null; onend: (() => void) | null; onerror: ((e: unknown) => void) | null;
}

export default function VoiceChat() {
  const [supported, setSupported] = useState(true);
  const [state, setState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [caption, setCaption] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const recRef = useRef<SpeechRec | null>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const activeRef = useRef(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor || typeof window.speechSynthesis === "undefined") { setSupported(false); return; }
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    // hi-IN handles Hindi, Hinglish and English well in the Indian context.
    rec.lang = "hi-IN";
    recRef.current = rec;
    return () => { try { rec.abort(); } catch { /* ignore */ } window.speechSynthesis?.cancel(); };
  }, []);

  const pickVoice = useCallback((hindi: boolean) => {
    const voices = window.speechSynthesis.getVoices();
    const want = hindi
      ? [/hi-IN/i, /हिन्दी|Hindi/i]
      : [/en-IN/i, /India/i, /Google UK English Female/i, /Samantha|Rishi|Veena/i, /en-GB/i];
    for (const re of want) { const v = voices.find((x) => re.test(`${x.lang} ${x.name}`)); if (v) return v; }
    return voices.find((v) => v.lang.startsWith(hindi ? "hi" : "en")) || null;
  }, []);

  const speak = useCallback((text: string, onEnd: () => void) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const hindi = /[ऀ-ॿ]/.test(text);
    const u = new SpeechSynthesisUtterance(text.replace(/[•*#]/g, ""));
    u.lang = hindi ? "hi-IN" : "en-IN";
    const v = pickVoice(hindi);
    if (v) u.voice = v;
    u.rate = hindi ? 0.97 : 1.0;
    u.onstart = () => setState("speaking");
    u.onend = () => onEnd();
    u.onerror = () => onEnd();
    synth.speak(u);
  }, [pickVoice]);

  const listen = useCallback(() => {
    const rec = recRef.current;
    if (!rec || !activeRef.current) return;
    let finalText = "";
    rec.onresult = (e: SREvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      setCaption(finalText || interim);
    };
    rec.onend = () => {
      const said = finalText.trim();
      if (said) ask(said);
      else if (activeRef.current) listen();
    };
    rec.onerror = () => { if (activeRef.current) setTimeout(() => listen(), 400); };
    try { rec.start(); setState("listening"); } catch { /* already running */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = useCallback(async (text: string) => {
    setState("thinking");
    setCaption("");
    historyRef.current = [...historyRef.current, { role: "user", content: text }].slice(-20);
    try {
      const r = await fetch("/api/ai-doctor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historyRef.current, voice: true }) });
      const j = await r.json();
      if (j.ok) {
        historyRef.current = [...historyRef.current, { role: "assistant", content: j.reply }].slice(-20);
        setSuggestions(j.suggestions || []);
        speak(j.reply, () => { if (activeRef.current) listen(); });
      } else setState("idle");
    } catch { setState("idle"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]);

  function start() {
    activeRef.current = true;
    const greet = "Hello, I am Dr Hanu. Aap mujhe kisi bhi bhasha mein bata sakte hain, what is troubling you?";
    historyRef.current = [{ role: "assistant", content: greet }];
    speak(greet, () => { if (activeRef.current) listen(); });
  }

  function stop() {
    activeRef.current = false;
    try { recRef.current?.abort(); } catch { /* ignore */ }
    window.speechSynthesis?.cancel();
    setState("idle");
    setCaption("");
  }

  if (!supported) {
    return <div className="card p-6 text-center text-sm text-muted">Voice needs Chrome. Please open this in Chrome to talk to Dr. Hanu, or use the Chat tab.</div>;
  }

  const status = { idle: "Tap to talk", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…" }[state];
  const active = state !== "idle";
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
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="w-1.5 rounded-full bg-white" style={{ height: 12, animation: "voicebar 0.9s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
                ))}
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
        {caption ? (
          <div className="mt-1 text-sm italic text-muted">&ldquo;{caption}&rdquo;</div>
        ) : (
          !active && <p className="mt-1 text-xs text-muted">Speak in Hindi, English or Hinglish — Dr. Hanu replies the same way</p>
        )}
      </div>

      {active && (
        <div className="mt-5 text-center">
          <button onClick={stop} className="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Stop</button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <Link key={s.href + s.label} href={s.href} className={`rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition hover:shadow ${s.kind === "emergency" ? "bg-rose-600 text-white" : "bg-accent/10 text-accent hover:bg-accent/20"}`}>
              {s.label} →
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes voicebar {
          0%, 100% { height: 10px; opacity: 0.7; }
          50% { height: 40px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
