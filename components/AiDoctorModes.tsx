"use client";

import { useState } from "react";
import AiDoctorChat from "@/components/AiDoctorChat";
import RealtimeVoice from "@/components/RealtimeVoice";

export default function AiDoctorModes() {
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  return (
    <div>
      <div className="mx-auto mb-4 flex w-fit gap-1 rounded-full bg-slate-100 p-1">
        <button
          onClick={() => setMode("chat")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${mode === "chat" ? "bg-white text-primary shadow" : "text-muted"}`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setMode("voice")}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${mode === "voice" ? "bg-white text-primary shadow" : "text-muted"}`}
        >
          🎙️ Talk by voice
        </button>
      </div>
      {mode === "chat" ? <AiDoctorChat /> : <RealtimeVoice />}
    </div>
  );
}
