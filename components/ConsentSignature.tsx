"use client";

import { useRef, useState } from "react";

/**
 * Consent + digital signature capture. Shows the consent text, requires an
 * explicit checkbox, and captures a drawn signature on a canvas. Posts to
 * /api/consent (which stores it with IP + timestamp for the audit trail).
 *
 * Aadhaar e-Sign can later replace the canvas via a provider (Digio/Signzy).
 */
export default function ConsentSignature({
  consentText,
  type = "telemedicine",
  visitId,
  consultationId,
  onDone
}: {
  consentText: string;
  type?: string;
  visitId?: string;
  consultationId?: string;
  onDone?: (consentId: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [accepted, setAccepted] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }
  function start(e: React.PointerEvent) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#01586C";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  }
  function end() {
    drawing.current = false;
  }
  function clear() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  }

  async function submit() {
    setError("");
    if (!accepted) return setError("Please tick the consent box.");
    if (!hasInk) return setError("Please sign in the box.");
    setBusy(true);
    try {
      const signatureDataUrl = canvasRef.current!.toDataURL("image/png");
      const r = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, consentText, signatureDataUrl, visitId, consultationId })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not save consent");
      setDone(true);
      onDone?.(j.consentId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">✓ Consent recorded and signed. Thank you.</div>;
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="max-h-32 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-muted">{consentText}</div>
      <label className="mt-3 flex items-start gap-2 text-xs text-ink">
        <input type="checkbox" className="mt-0.5" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        I have read and agree to the above. I am providing my consent and signature.
      </label>
      <div className="mt-3">
        <div className="mb-1 text-[11px] font-medium text-muted">Sign below</div>
        <canvas
          ref={canvasRef}
          width={520}
          height={160}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-40 w-full touch-none rounded-lg border border-dashed border-slate-300 bg-white"
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary">{busy ? "Saving…" : "Confirm & sign"}</button>
        <button onClick={clear} className="btn-outline text-sm">Clear</button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
