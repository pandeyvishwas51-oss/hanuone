"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";

type Med = { name: string; dose?: string; frequency?: string; duration?: string; instructions?: string };
type Note = {
  chiefComplaint: string; hpi: string; examination: string; assessment: string; diagnosis: string;
  investigations: string; medications: Med[]; advice: string; followUp: string; redFlags: string;
  patientSummary: string; language: string;
};
type Patient = { name: string; phone: string; age: string; sex: string };

// Browser SpeechRecognition (Chrome/Edge). Falls back to manual typing elsewhere.
type SR = typeof window extends { webkitSpeechRecognition: infer T } ? T : unknown;

export default function ScribeWorkspace() {
  const [patient, setPatient] = useState<Patient>({ name: "", phone: "", age: "", sex: "" });
  const [phase, setPhase] = useState<"capture" | "review" | "done">("capture");
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sendToPatient, setSendToPatient] = useState(true);
  const [sentOk, setSentOk] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [sttSupported, setSttSupported] = useState(true);
  // eslint-disable-next-line
  const [assist, setAssist] = useState<any>(null);
  const [assistBusy, setAssistBusy] = useState(false);
  // eslint-disable-next-line
  const recRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line
    const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRClass) { setSttSupported(false); return; }
    const rec = new SRClass();
    rec.lang = "hi-IN"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e: { resultIndex: number; results: { [k: number]: { 0: { transcript: string }; isFinal: boolean }; length: number } }) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript + " "; else int += r[0].transcript;
      }
      if (fin) setTranscript((t) => (t + fin));
      setInterim(int);
    };
    rec.onend = () => { if (recRef.current?._wanted) { try { rec.start(); } catch { /* ignore */ } } };
    recRef.current = rec;
    return () => { try { rec.stop(); } catch { /* ignore */ } };
  }, []);

  function toggleRecord() {
    const rec = recRef.current;
    if (!rec) return;
    if (recording) { rec._wanted = false; try { rec.stop(); } catch { /* ignore */ } setRecording(false); setInterim(""); }
    else { rec._wanted = true; try { rec.start(); setRecording(true); } catch { /* already started */ } }
  }

  async function generate() {
    setError(""); setBusy(true);
    if (recording) toggleRecord();
    try {
      const r = await fetch("/api/clinic/scribe/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, patientName: patient.name, patientAge: patient.age ? Number(patient.age) : undefined, patientSex: patient.sex || undefined })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not generate");
      setNote(j.note); setPhase("review");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function sign() {
    if (!note) return;
    setError(""); setBusy(true);
    try {
      const r = await fetch("/api/clinic/scribe/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient.name, patientPhone: patient.phone || undefined, patientAge: patient.age ? Number(patient.age) : undefined,
          patientSex: patient.sex || undefined, note, transcript, sendToPatient
        })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not save");
      setSentOk(!!j.sent); setSavedNoteId(j.noteId || null); setPhase("done");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function runAssist() {
    if (!note) return;
    setAssistBusy(true); setError("");
    try {
      const r = await fetch("/api/clinic/docassist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chiefComplaint: note.chiefComplaint, assessment: note.assessment, diagnosis: note.diagnosis, medications: note.medications, patientAge: patient.age ? Number(patient.age) : undefined, patientSex: patient.sex || undefined })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "DocAssist failed");
      setAssist(j.result);
    } catch (e) { setError((e as Error).message); } finally { setAssistBusy(false); }
  }

  function reset() {
    setPatient({ name: "", phone: "", age: "", sex: "" }); setTranscript(""); setInterim(""); setNote(null);
    setPhase("capture"); setSentOk(false); setError(""); setAssist(null);
  }

  function applyInvestigation(text: string) {
    setNote((n) => n ? { ...n, investigations: n.investigations ? `${n.investigations}, ${text}` : text } : n);
  }

  const upd = (k: keyof Note, v: string) => setNote((n) => (n ? { ...n, [k]: v } : n));
  const updMed = (i: number, k: keyof Med, v: string) => setNote((n) => n ? { ...n, medications: n.medications.map((m, j) => j === i ? { ...m, [k]: v } : m) } : n);
  const addMed = () => setNote((n) => n ? { ...n, medications: [...n.medications, { name: "" }] } : n);
  const delMed = (i: number) => setNote((n) => n ? { ...n, medications: n.medications.filter((_, j) => j !== i) } : n);

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ambient AI Scribe</h1>
          <p className="text-sm text-slate-500">Just talk to your patient. The scribe writes the note and prescription.</p>
        </div>
        <Steps phase={phase} />
      </div>

      {/* Patient bar */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-4">
        <input aria-label="Patient name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Patient name" value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} disabled={phase === "done"} />
        <input aria-label="Patient phone number" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Phone" inputMode="numeric" value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} disabled={phase === "done"} />
        <input aria-label="Patient age" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Age" inputMode="numeric" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value.replace(/\D/g, "").slice(0, 3) })} disabled={phase === "done"} />
        <select aria-label="Patient sex" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={patient.sex} onChange={(e) => setPatient({ ...patient, sex: e.target.value })} disabled={phase === "done"}>
          <option value="">Sex</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
        </select>
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {/* CAPTURE */}
      {phase === "capture" && (
        <div className="mt-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Live transcript {recording && <span className="ml-2 inline-flex items-center gap-1 text-rose-600"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" /> recording</span>}</span>
              <button onClick={toggleRecord} disabled={!sttSupported} className={`rounded-full px-5 py-2 text-sm font-semibold text-white ${recording ? "bg-rose-600 hover:bg-rose-700" : "bg-[#01586C] hover:bg-[#024a5a]"} disabled:bg-slate-300`}>
                {recording ? "Stop" : "● Start recording"}
              </button>
            </div>
            {!sttSupported && <p className="mt-2 text-xs text-amber-600">Live speech-to-text needs Chrome or Edge. You can still type or paste the conversation below.</p>}
            <textarea
              className="mt-3 h-56 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm leading-relaxed"
              placeholder="Speak naturally in Hindi, Hinglish or English. The conversation appears here. You can also type or edit it."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            {recording && interim && <p className="mt-1 text-xs italic text-slate-400">{interim}…</p>}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">{transcript.trim().split(/\s+/).filter(Boolean).length} words</span>
              <button onClick={generate} disabled={busy || transcript.trim().length < 15} className="rounded-lg bg-[#FE7D15] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e06b08] disabled:bg-slate-300">
                {busy ? "Writing the note…" : "✨ Generate note & prescription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW */}
      {phase === "review" && note && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Chief complaint" value={note.chiefComplaint} onChange={(v) => upd("chiefComplaint", v)} />
            <Field label="History (Subjective)" value={note.hpi} onChange={(v) => upd("hpi", v)} rows={3} />
            <Field label="Examination (Objective)" value={note.examination} onChange={(v) => upd("examination", v)} rows={2} />
            <Field label="Assessment / impression" value={note.assessment} onChange={(v) => upd("assessment", v)} rows={2} />
            <Field label="Diagnosis" value={note.diagnosis} onChange={(v) => upd("diagnosis", v)} />
          </div>
          <div className="space-y-3">
            {/* Prescription */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prescription</span><button onClick={addMed} className="text-xs font-semibold text-[#01586C]">+ Add medicine</button></div>
              <div className="space-y-2">
                {note.medications.length === 0 && <p className="text-xs text-slate-400">No medicines. Add one if needed.</p>}
                {note.medications.map((m, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <div className="flex gap-2">
                      <input className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm font-semibold" placeholder="Medicine" value={m.name} onChange={(e) => updMed(i, "name", e.target.value)} />
                      <button onClick={() => delMed(i)} className="px-1 text-rose-500" aria-label="Remove">✕</button>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      <input className="rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Dose" value={m.dose || ""} onChange={(e) => updMed(i, "dose", e.target.value)} />
                      <input className="rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Freq (1-0-1)" value={m.frequency || ""} onChange={(e) => updMed(i, "frequency", e.target.value)} />
                      <input className="rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Duration" value={m.duration || ""} onChange={(e) => updMed(i, "duration", e.target.value)} />
                    </div>
                    <input className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Instructions (after food…)" value={m.instructions || ""} onChange={(e) => updMed(i, "instructions", e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <Field label="Investigations advised" value={note.investigations} onChange={(v) => upd("investigations", v)} rows={2} />
            <Field label="Advice" value={note.advice} onChange={(v) => upd("advice", v)} rows={2} />
            <Field label="Follow-up" value={note.followUp} onChange={(v) => upd("followUp", v)} />
            {note.redFlags && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-rose-600">Red flags</div><textarea className="mt-1 w-full resize-y rounded border border-rose-200 bg-white p-2 text-sm" rows={2} value={note.redFlags} onChange={(e) => upd("redFlags", e.target.value)} /></div>}
            <Field label="Patient summary (sent to patient)" value={note.patientSummary} onChange={(v) => upd("patientSummary", v)} rows={3} />
          </div>

          {/* DocAssist — agentic safety co-pilot */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-xs font-bold text-white">AI</span>
                  <span className="text-sm font-bold text-primary">DocAssist safety check</span>
                  {assist && <RiskBadge risk={assist.overallRisk} />}
                </div>
                <button onClick={runAssist} disabled={assistBusy} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 disabled:bg-slate-300">
                  {assistBusy ? "Analysing…" : assist ? "Re-run" : "🛡️ Run interaction + differential check"}
                </button>
              </div>

              {assist && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    {assist.interactions?.length > 0 && (
                      <Block title="Drug interactions">
                        {assist.interactions.map((it: { drugs: string; severity: string; note: string }, i: number) => (
                          <div key={i} className="text-xs"><span className={`mr-1 rounded px-1.5 py-0.5 font-semibold ${it.severity === "major" ? "bg-rose-100 text-rose-700" : it.severity === "moderate" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{it.severity}</span><b>{it.drugs}</b> — {it.note}</div>
                        ))}
                      </Block>
                    )}
                    {assist.allergyAlerts?.length > 0 && (
                      <Block title="Allergy alerts"><ul className="list-disc pl-4 text-xs text-rose-700">{assist.allergyAlerts.map((a: { drug: string; note: string }, i: number) => <li key={i}><b>{a.drug}</b> {a.note}</li>)}</ul></Block>
                    )}
                    {assist.doseFlags?.length > 0 && (
                      <Block title="Dose flags"><ul className="list-disc pl-4 text-xs text-amber-700">{assist.doseFlags.map((d: { drug: string; note: string }, i: number) => <li key={i}><b>{d.drug}</b> {d.note}</li>)}</ul></Block>
                    )}
                    {assist.interactions?.length === 0 && assist.allergyAlerts?.length === 0 && assist.doseFlags?.length === 0 && (
                      <Block title="Prescription safety"><p className="text-xs text-emerald-700">No interactions, allergy conflicts or dose issues detected.</p></Block>
                    )}
                  </div>
                  <div className="space-y-2">
                    {assist.differential?.length > 0 && (
                      <Block title="Differential to consider"><ul className="list-disc pl-4 text-xs text-slate-700">{assist.differential.map((d: { condition: string; why: string }, i: number) => <li key={i}><b>{d.condition}</b> — {d.why}</li>)}</ul></Block>
                    )}
                    {assist.suggestedInvestigations?.length > 0 && (
                      <Block title="Suggested investigations">
                        <div className="flex flex-wrap gap-1.5">{assist.suggestedInvestigations.map((s: string, i: number) => (
                          <button key={i} onClick={() => applyInvestigation(s)} className="rounded-full border border-primary/30 bg-white px-2 py-0.5 text-xs text-primary hover:bg-primary/10">+ {s}</button>
                        ))}</div>
                      </Block>
                    )}
                    {assist.redFlags?.length > 0 && (
                      <Block title="Red flags"><ul className="list-disc pl-4 text-xs text-rose-700">{assist.redFlags.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></Block>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={sendToPatient} onChange={(e) => setSendToPatient(e.target.checked)} /> Send the e-prescription to the patient (SMS{patient.phone ? "" : " — add phone above"})</label>
            <div className="flex gap-2">
              <button onClick={() => setPhase("capture")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Back</button>
              <button onClick={sign} disabled={busy} className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300">{busy ? "Signing…" : "✓ Sign & save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === "done" && note && (
        <div className="mt-5">
          <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center print:hidden">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h2 className="text-lg font-bold text-emerald-800">Note signed & saved</h2>
            <p className="text-sm text-emerald-700">{sentOk ? "The e-prescription was sent to the patient." : "Saved to the patient record."}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button onClick={reset} className="rounded-lg bg-[#01586C] px-5 py-2 text-sm font-semibold text-white">New consultation</button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700"><Printer size={15} /> Print prescription</button>
              {savedNoteId && <a href={`/clinic/patients/${savedNoteId}`} className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700">View record</a>}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-800">{patient.name}{patient.age ? `, ${patient.age}` : ""}{patient.sex ? ` · ${patient.sex}` : ""}</h3>
            {note.diagnosis && <p className="mt-1 text-sm"><b>Diagnosis:</b> {note.diagnosis}</p>}
            {note.medications.length > 0 && (
              <div className="mt-2"><div className="text-xs font-semibold uppercase text-slate-500">Rx</div>
                <ol className="mt-1 list-decimal pl-5 text-sm text-slate-700">{note.medications.map((m, i) => <li key={i}>{m.name} {m.dose} {m.frequency && `· ${m.frequency}`} {m.duration && `· ${m.duration}`} {m.instructions && `(${m.instructions})`}</li>)}</ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ phase }: { phase: string }) {
  const steps = ["capture", "review", "done"];
  const i = steps.indexOf(phase);
  const labels = ["Record", "Review", "Signed"];
  return (
    <div className="hidden items-center gap-2 sm:flex">
      {labels.map((l, j) => (
        <div key={l} className="flex items-center gap-2">
          <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${j <= i ? "bg-[#01586C] text-white" : "bg-slate-200 text-slate-500"}`}>{j + 1}</span>
          <span className={`text-xs font-semibold ${j <= i ? "text-slate-700" : "text-slate-400"}`}>{l}</span>
          {j < 2 && <span className="h-px w-5 bg-slate-200" />}
        </div>
      ))}
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const c = risk === "high" ? "bg-rose-100 text-rose-700" : risk === "moderate" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${c}`}>{risk} risk</span>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/10 bg-white p-2.5">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/70">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, rows = 1 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      {rows > 1
        ? <textarea className="mt-1 w-full resize-y rounded border border-slate-200 p-2 text-sm" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
        : <input className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}
