"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Live chat: paste your Tawk.to embed src here to connect real agents, e.g.
//   "https://embed.tawk.to/<propertyId>/<widgetId>"
// While empty, "Talk to a real agent" falls back to WhatsApp.
const TAWK_SRC = "";
const WHATSAPP_URL = "https://wa.me/919000012345";

type Msg = { from: "bot" | "user"; text: string; href?: string; cta?: string };

const ENQUIRIES = [
  { icon: "stethoscope", label: "Book a doctor consultation", reply: "You can browse verified doctors and book online or in-clinic.", href: "/doctors" },
  { icon: "home", label: "Book a home nursing visit", reply: "Pick a nursing service and we'll assign a verified nurse to your home.", href: "/home-nursing" },
  { icon: "syringe", label: "Vitals / injection at home", reply: "We offer vitals checks and doctor-prescribed injections at home.", href: "/home-nursing" },
  { icon: "rupee", label: "Pricing & charges", reply: "Service prices are shown on each doctor and nursing service.", href: "/home-nursing" },
];

declare global {
  interface Window {
    Tawk_API?: { maximize?: () => void };
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi 👋 Welcome to HanuONE. How can we help you today?" },
  ]);
  const [input, setInput] = useState("");

  // Auto-pop the teaser ~3s after load (once per browser session)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("hanuone_chat_seen")) return;
    const t = setTimeout(() => setTeaser(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Load Tawk.to live chat if configured
  useEffect(() => {
    if (!TAWK_SRC || document.getElementById("tawk-script")) return;
    const s = document.createElement("script");
    s.id = "tawk-script";
    s.async = true;
    s.src = TAWK_SRC;
    s.charset = "UTF-8";
    s.setAttribute("crossorigin", "*");
    document.body.appendChild(s);
  }, []);

  const dismissTeaser = () => {
    setTeaser(false);
    sessionStorage.setItem("hanuone_chat_seen", "1");
  };

  const openBox = () => {
    setOpen(true);
    dismissTeaser();
  };

  const pickEnquiry = (e: (typeof ENQUIRIES)[number]) => {
    setMessages((m) => [
      ...m,
      { from: "user", text: e.label },
      { from: "bot", text: e.reply, href: e.href, cta: "Open" },
    ]);
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { from: "user", text },
      { from: "bot", text: "Thanks! Tap “Talk to a real agent” and our team will help you right away." },
    ]);
    setInput("");
  };

  const talkToAgent = () => {
    if (typeof window !== "undefined" && window.Tawk_API?.maximize) {
      window.Tawk_API.maximize();
    } else {
      window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat box */}
      {open && (
        <div className="w-[90vw] max-w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 bg-trust-600 px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white font-bold text-trust-600">H</span>
            <div className="flex-1">
              <div className="text-sm font-semibold leading-tight">HanuONE Care</div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online · replies in a few minutes
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/80 hover:text-white">
              <XIcon />
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-[44vh] space-y-2 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.from === "user"
                      ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-trust-600 px-3 py-2 text-[13px] text-white"
                      : "max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700"
                  }
                >
                  {m.text}
                  {m.href && (
                    <Link href={m.href} onClick={() => setOpen(false)} className="mt-1 block text-[12px] font-semibold text-trust-600 hover:underline">
                      {m.cta} →
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {/* Quick enquiries */}
            <div className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Choose an enquiry</div>
            <div className="flex flex-col gap-2">
              {ENQUIRIES.map((e) => (
                <button
                  key={e.label}
                  onClick={() => pickEnquiry(e)}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] text-trust-700 hover:border-trust-600"
                >
                  <EnquiryIcon name={e.icon} /> {e.label}
                </button>
              ))}
              <button
                onClick={talkToAgent}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                <HeadsetIcon /> Talk to a real agent
              </button>
            </div>
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type your message…"
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-[13px] outline-none focus:border-trust-600"
            />
            <button onClick={send} aria-label="Send" className="grid h-9 w-9 place-items-center rounded-full bg-trust-600 text-white hover:bg-trust-700">
              <SendIcon />
            </button>
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 pb-3 text-[12px] font-medium text-[#25D366]"
          >
            <WhatsAppGlyph /> or chat with us on WhatsApp
          </a>
        </div>
      )}

      {/* Teaser bubble */}
      {teaser && !open && (
        <div className="flex items-center gap-2">
          <button onClick={openBox} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-700 shadow-lg">
            Need help? Talk to a real agent 👋
          </button>
          <button onClick={dismissTeaser} aria-label="Dismiss" className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-slate-600">
            <XIcon small />
          </button>
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => (open ? setOpen(false) : openBox())}
        aria-label="Open chat"
        className="grid h-14 w-14 place-items-center rounded-full bg-trust-600 text-white shadow-xl transition hover:bg-trust-700"
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
function HeadsetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="2" y="13" width="4" height="6" rx="1" />
      <rect x="18" y="13" width="4" height="6" rx="1" />
      <path d="M20 19a4 4 0 0 1-4 4h-2" />
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
function EnquiryIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    stethoscope: (
      <>
        <path d="M5 3v5a4 4 0 0 0 8 0V3" />
        <path d="M9 12v3a5 5 0 0 0 5 5" />
        <circle cx="17.5" cy="18.5" r="2" />
      </>
    ),
    home: (
      <>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </>
    ),
    syringe: (
      <>
        <path d="M16 4l4 4" />
        <path d="M14 6l-9 9-1.5 4.5 4.5-1.5 9-9z" />
        <path d="M13 7l4 4" />
      </>
    ),
    rupee: (
      <>
        <path d="M7 5h10M7 9h10M16 5c0 5-4 5-7 5l6 9" />
      </>
    ),
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-trust-600" aria-hidden>
      {paths[name]}
    </svg>
  );
}
