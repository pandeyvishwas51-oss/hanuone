"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SRResult { 0: { transcript: string }; isFinal: boolean }
interface SREvent { resultIndex: number; results: ArrayLike<SRResult> }
interface SpeechRec {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: SREvent) => void) | null; onend: (() => void) | null; onerror: ((e: unknown) => void) | null;
}

export default function ConsultTranscript({ consultId }: { consultId: string }) {
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voiceOk, setVoiceOk] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const wantRef = useRef(true); // keep recording (auto-restart on end)
  const transcriptRef = useRef("");
  transcriptRef.current = transcript;

  // Load any previously-saved transcript/summary. Surfaces a retry on failure
  // instead of silently swallowing (the live recording still works regardless).
  const loadPrior = useCallback(async () => {
    setLoadFailed(false);
    try {
      const r = await fetch(`/api/consult/${consultId}/transcript`);
      const j = await r.json();
      if (j.ok) { if (j.transcript) setTranscript(j.transcript); if (j.summary) setSummary(j.summary); }
    } catch {
      setLoadFailed(true);
    }
  }, [consultId]);

  useEffect(() => {
    loadPrior();

    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setVoiceOk(false); return; }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: SREvent) => {
      let add = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) add += e.results[i][0].transcript + " ";
      if (add) setTranscript((t) => (t + add).slice(0, 40000));
    };
    // Continuous: restart automatically if it stops (silence / time limit).
    rec.onend = () => {
      if (wantRef.current) { try { rec.start(); } catch { /* ignore */ } }
      else setRecording(false);
    };
    rec.onerror = () => { /* keep wanting; onend will retry */ };
    recRef.current = rec;

    // Auto-start. The browser shows its one-time mic permission prompt; after
    // the patient allows it, recording continues automatically.
    try { rec.start(); setRecording(true); } catch { /* will start on first gesture */ }

    return () => { wantRef.current = false; try { rec.abort(); } catch { /* ignore */ } };
  }, [consultId, loadPrior]);

  // Auto-save the transcript every 20s while recording (so nothing is lost).
  useEffect(() => {
    const t = setInterval(() => {
      if (transcriptRef.current.trim().length > 20) {
        fetch(`/api/consult/${consultId}/transcript`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: transcriptRef.current }) }).catch(() => {});
      }
    }, 20000);
    return () => clearInterval(t);
  }, [consultId]);

  function pauseResume() {
    const rec = recRef.current;
    if (!rec) return;
    if (recording) { wantRef.current = false; rec.stop(); setRecording(false); }
    else { wantRef.current = true; try { rec.start(); setRecording(true); } catch { /* ignore */ } }
  }

  async function finishSummarize() {
    if (!transcript.trim()) return setError("Nothing recorded yet.");
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/consult/${consultId}/transcript`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not save");
      setSummary(j.summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function download(name: string, text: string) {
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="h3">Consultation recording &amp; summary</h3>
        {voiceOk && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${recording ? "text-rose-600" : "text-muted"}`}>
            <span className={`h-2 w-2 rounded-full ${recording ? "animate-pulse bg-rose-500" : "bg-slate-300"}`} />
            {recording ? "Recording for your records" : "Paused"}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {voiceOk ? "This consultation is being transcribed automatically and auto-saved. You'll get an AI summary you can keep." : "Voice transcription needs Chrome. You can type notes below and generate a summary."}
      </p>

      {loadFailed && (
        <p role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-700">
          Couldn&apos;t load earlier notes.
          <button onClick={loadPrior} className="rounded border border-amber-200 px-2 py-0.5 font-semibold hover:bg-amber-50">Retry</button>
        </p>
      )}

      {voiceOk && (
        <button onClick={pauseResume} className={`mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold ${recording ? "border border-slate-200 text-slate-600" : "bg-primary text-white"}`}>
          {recording ? "Pause recording" : "Resume recording"}
        </button>
      )}

      <textarea className="input mt-3" rows={5} placeholder="Transcript appears here automatically…" value={transcript} onChange={(e) => setTranscript(e.target.value)} />

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={finishSummarize} disabled={busy} className="btn-primary">{busy ? "Summarizing…" : "Finish & generate summary"}</button>
        {transcript && <button onClick={() => download(`consult-${consultId}-transcript.txt`, transcript)} className="btn-outline text-sm">Download transcript</button>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}

      {summary && (
        <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-primary">AI summary</div>
            <button onClick={() => download(`consult-${consultId}-summary.txt`, summary)} className="text-xs font-semibold text-primary">Download</button>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{summary}</p>
        </div>
      )}
    </div>
  );
}
