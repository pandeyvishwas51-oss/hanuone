"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fileToAttachment, ACCEPT, type ChatAttachment } from "@/lib/chat-upload";

// "Talk to a real agent" opens WhatsApp. Set your business number here.
const WHATSAPP_URL = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210"}`;

type Suggestion = { label: string; href: string; kind: string };
type Msg = { from: "bot" | "user"; text: string; suggestions?: Suggestion[]; emergency?: boolean; files?: string[] };

const STARTERS = [
  "I've had a fever and body ache since yesterday",
  "I'm getting frequent headaches",
  "My child has a cough and cold",
  "I have acidity and stomach pain"
];

const GREETING =
  "Namaste 🙏 I'm Dr. Hanu, your HanuONE AI health assistant. Tell me what's bothering you and I'll help you figure out the right next step. (I'm an AI, not a doctor — this is guidance, not a diagnosis.)";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("hanuone_chat_seen")) return;
    const t = setTimeout(() => setTeaser(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const dismissTeaser = () => {
    setTeaser(false);
    sessionStorage.setItem("hanuone_chat_seen", "1");
  };
  const openBox = () => {
    setOpen(true);
    dismissTeaser();
  };

  async function onFiles(list: FileList | null) {
    if (!list) return;
    for (const f of Array.from(list).slice(0, 3)) {
      try {
        const a = await fileToAttachment(f);
        setPending((p) => [...p, a].slice(0, 3));
      } catch {
        /* ignore invalid file */
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function ask(text: string) {
    const clean = text.trim();
    if ((!clean && pending.length === 0) || loading) return;
    const files = pending.map((p) => p.name);
    const next: Msg[] = [...messages, { from: "user", text: clean || "(shared a file)", files }];
    setMessages(next);
    setInput("");
    const sending = pending;
    setPending([]);
    setLoading(true);

    // Build API history from the visible conversation (skip the static greeting).
    const history = next
      .filter((m, i) => !(i === 0 && m.from === "bot"))
      .map((m, i, arr) => {
        const base = { role: m.from === "user" ? "user" : "assistant", content: m.text };
        if (i === arr.length - 1 && m.from === "user" && sending.length) {
          return { ...base, attachments: sending };
        }
        return base;
      });

    try {
      const r = await fetch("/api/ai-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });
      const j = await r.json();
      if (j.ok) {
        setMessages((m) => [
          ...m,
          { from: "bot", text: j.reply, suggestions: j.suggestions, emergency: j.emergency }
        ]);
      } else {
        setMessages((m) => [...m, { from: "bot", text: "Sorry, I had trouble responding. Please try again, or tap “Talk to a real agent”." }]);
      }
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Network issue — please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-chat-widget className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 md:bottom-5 md:right-5">
      {open && (
        <div className="flex h-[70dvh] max-h-[560px] w-[92vw] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in origin-bottom-right">
          {/* Header */}
          <div className="flex items-center gap-3 bg-primary px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-bold text-white">Dr</span>
            <div className="flex-1">
              <div className="text-sm font-semibold leading-tight">Dr. Hanu · AI Health Assistant</div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online · symptom checker
              </div>
            </div>
            <Link href="/ai-doctor" onClick={() => setOpen(false)} className="text-[11px] text-white/80 underline hover:text-white">Full screen</Link>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/80 hover:text-white">
              <XIcon />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} role="log" aria-live="polite" aria-label="Chat with Dr. Hanu" className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.from === "user"
                        ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-[13px] text-white"
                        : `max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border px-3 py-2 text-[13px] ${m.emergency ? "border-rose-300 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-700"}`
                    }
                  >
                    {m.files && m.files.length > 0 && (
                      <div className="mb-1 flex flex-wrap gap-1">
                        {m.files.map((f, fi) => (
                          <span key={fi} className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">📎 {f}</span>
                        ))}
                      </div>
                    )}
                    {m.text}
                  </div>
                </div>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <Link
                        key={s.href + s.label}
                        href={s.href}
                        onClick={() => setOpen(false)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${s.kind === "emergency" ? "bg-rose-600 text-white" : "bg-accent/10 text-accent hover:bg-accent/20"}`}
                      >
                        {s.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-400">
                  Dr. Hanu is thinking…
                </div>
              </div>
            )}

            {/* Starters (only before first user message) */}
            {messages.length === 1 && (
              <div className="space-y-1.5 pt-1">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[12.5px] text-primary hover:border-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 pt-2">
              {pending.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  📎 {p.name}
                  <button onClick={() => setPending((arr) => arr.filter((_, j) => j !== i))} aria-label="Remove file" className="text-primary/60 hover:text-primary">✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5">
            <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => onFiles(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} disabled={loading} aria-label="Attach report or photo" title="Attach a lab report, prescription or photo" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-300 text-slate-500 hover:border-primary hover:text-primary disabled:opacity-50">
              <PaperclipIcon />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) ask(input); }}
              placeholder="Describe symptoms or attach a report…"
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-[13px] outline-none focus:border-primary"
            />
            <button onClick={() => ask(input)} disabled={loading} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-white hover:bg-primary-600 disabled:opacity-50">
              <SendIcon />
            </button>
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 pb-2.5 text-[12px] font-medium text-[#25D366]"
          >
            <WhatsAppGlyph /> or talk to a real agent on WhatsApp
          </a>
        </div>
      )}

      {teaser && !open && (
        <div className="flex items-center gap-2">
          <button onClick={openBox} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-700 shadow-lg">
            Not feeling well? Ask Dr. Hanu 🩺
          </button>
          <button onClick={dismissTeaser} aria-label="Dismiss" className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-slate-600">
            <XIcon small />
          </button>
        </div>
      )}

      <button
        onClick={() => (open ? setOpen(false) : openBox())}
        aria-label="Open AI health assistant"
        className="grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-xl transition hover:bg-primary-600"
      >
        {open ? <XIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}

function XIcon({ small }: { small?: boolean }) {
  const s = small ? 14 : 20;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12l16-7-7 16-2-7-7-2z" />
    </svg>
  );
}
function PaperclipIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
    </svg>
  );
}
function WhatsAppGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.03 8.03 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.06 8.06 0 0 1-4.12-1.13l-.3-.18-3.06.8.82-2.99-.19-.31a8.05 8.05 0 0 1-1.24-4.29c0-4.46 3.63-8.09 8.1-8.09z" />
    </svg>
  );
}
