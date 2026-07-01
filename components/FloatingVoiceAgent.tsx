"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// The realtime voice panel pulls in WebRTC + audio-worklet code. It only renders
// after the user opens the panel, so load it on demand (ssr:false) to keep it
// out of every page's initial JS bundle.
const RealtimeVoice = dynamic(() => import("@/components/RealtimeVoice"), {
  ssr: false,
  loading: () => <div className="py-6 text-center text-sm text-muted">Loading voice…</div>
});

/**
 * Global floating voice button (Gemini-style). Lives in the root layout, so the
 * voice agent PERSISTS across page navigation and only closes when the user
 * taps close. A small premium sparkle button opens the realtime voice panel.
 */
export default function FloatingVoiceAgent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating launcher (left side, so it doesn't clash with the chat bubble) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Talk to Dr. Hanu by voice"
          data-floating
          className="group fixed bottom-20 left-4 z-50 grid h-14 w-14 place-items-center rounded-full shadow-xl transition-transform hover:scale-105 md:bottom-5 md:left-5"
          style={{ background: "conic-gradient(from 140deg, #01586C, #0a7d96, #FE7D15, #0a7d96, #01586C)" }}
        >
          <span className="absolute inset-[3px] rounded-full bg-gradient-to-br from-[#024a5a] to-[#012b35]" />
          {/* sparkle icon */}
          <svg className="relative" width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
            <circle cx="18.5" cy="17.5" r="1.6" />
            <circle cx="6" cy="16" r="1.1" />
          </svg>
        </button>
      )}

      {/* Voice panel */}
      {open && (
        <div data-floating className="fixed bottom-20 left-4 z-50 w-[92vw] max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-scale-in origin-bottom-left md:bottom-5 md:left-5">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs font-bold">Dr</span>
              <span className="text-sm font-semibold">Dr. Hanu · Voice</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/80 hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="px-3 py-5">
            <RealtimeVoice />
          </div>
        </div>
      )}
    </>
  );
}
