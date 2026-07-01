"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fileToAttachment, ACCEPT, type ChatAttachment } from "@/lib/chat-upload";

type Suggestion = { label: string; href: string; kind: string };
type Msg = { from: "bot" | "user"; text: string; suggestions?: Suggestion[]; emergency?: boolean; files?: string[] };

const STARTERS = [
  "I've had a fever and body ache since yesterday",
  "I'm getting frequent headaches and feeling dizzy",
  "My 4-year-old has a cough and runny nose",
  "I have acidity, bloating and stomach pain",
  "My knee hurts when I climb stairs",
  "I've been feeling very anxious and can't sleep"
];

const GREETING =
  "Namaste 🙏 I'm Dr. Hanu, your HanuONE AI health assistant. Describe your symptoms in your own words — when they started and how severe they feel — and I'll help you understand what it could be and which doctor to see.";

export default function AiDoctorChat() {
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setError("");
    for (const f of Array.from(list).slice(0, 3)) {
      try {
        const a = await fileToAttachment(f);
        setPending((p) => [...p, a].slice(0, 3));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add file.");
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

    const history = next
      .filter((m, i) => !(i === 0 && m.from === "bot"))
      .map((m, i, arr) => {
        const base = { role: m.from === "user" ? "user" : "assistant", content: m.text };
        // attach files only to the final (current) user message
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
        setMessages((m) => [...m, { from: "bot", text: j.reply, suggestions: j.suggestions, emergency: j.emergency }]);
      } else {
        setMessages((m) => [...m, { from: "bot", text: "Sorry, I had trouble responding. Please try again." }]);
      }
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Network issue, please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[72vh] max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation with Dr. Hanu" className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.from === "user"
                    ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-white"
                    : `max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border px-4 py-2.5 text-sm ${m.emergency ? "border-rose-300 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-700"}`
                }
              >
                {m.files && m.files.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {m.files.map((f, fi) => (
                      <span key={fi} className="rounded bg-white/20 px-1.5 py-0.5 text-[11px]">📎 {f}</span>
                    ))}
                  </div>
                )}
                {m.text}
              </div>
            </div>
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.suggestions.map((s) => (
                  <Link
                    key={s.href + s.label}
                    href={s.href}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold ${s.kind === "emergency" ? "bg-rose-600 text-white" : "bg-accent/10 text-accent hover:bg-accent/20"}`}
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
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400">
              Dr. Hanu is thinking…
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="grid gap-2 pt-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-[13px] text-primary hover:border-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-3 py-3 sm:px-4">
        {pending.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pending.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] text-primary">
                📎 {p.name}
                <button onClick={() => setPending((arr) => arr.filter((_, j) => j !== i))} className="ml-0.5 text-primary/60 hover:text-primary" aria-label="Remove file">✕</button>
              </span>
            ))}
          </div>
        )}
        {error && <p className="mb-2 text-[12px] text-rose-600">{error}</p>}
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            aria-label="Attach a report or photo"
            title="Attach a lab report, prescription or photo"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-300 text-slate-500 hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <PaperclipIcon />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) ask(input); }}
            placeholder="Describe your symptoms, or attach a report…"
            className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => ask(input)}
            disabled={loading}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
    </svg>
  );
}
