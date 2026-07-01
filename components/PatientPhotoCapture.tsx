"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Nurse uploads a photo of the PATIENT on arrival. The PATIENT's eyes are
 * blurred (irreversible pixelation) before anything is uploaded, for the
 * patient's privacy. Auto-places the blur over detected eyes when the browser
 * supports FaceDetector; the nurse can always drag it to cover the eyes.
 * Only the blurred image is ever sent to the server.
 */

interface DetectedFace { boundingBox: { x: number; y: number; width: number; height: number } }
interface FaceDetectorLike { detect: (img: CanvasImageSource) => Promise<DetectedFace[]> }

export default function PatientPhotoCapture({ visitId, onDone }: { visitId: string; onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [blur, setBlur] = useState({ x: 60, y: 50, w: 160, h: 44 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const draw = (region = blur, outline = true) => {
    const c = canvasRef.current, img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    // Pixelate the eye region (irreversible blur).
    const { x, y, w, h } = region;
    const small = document.createElement("canvas");
    const sf = 0.08;
    small.width = Math.max(1, Math.floor(w * sf));
    small.height = Math.max(1, Math.floor(h * sf));
    small.getContext("2d")!.drawImage(c, x, y, w, h, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, small.width, small.height, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
    if (outline) {
      ctx.strokeStyle = "#FE7D15";
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  };

  useEffect(() => { if (hasImage) draw(); /* eslint-disable-next-line */ }, [blur, hasImage]);

  async function loadFile(file: File) {
    setError("");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const c = canvasRef.current!;
      const maxW = 480;
      const scale = Math.min(1, maxW / img.width);
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      imgRef.current = img;
      setHasImage(true);
      // Default eye strip across the upper-third centre.
      let region = { x: Math.round(c.width * 0.2), y: Math.round(c.height * 0.28), w: Math.round(c.width * 0.6), h: Math.round(c.height * 0.14) };
      // Try auto-detection.
      try {
        const w = window as unknown as { FaceDetector?: new (o?: unknown) => FaceDetectorLike };
        if (w.FaceDetector) {
          const fd = new w.FaceDetector({ fastMode: true });
          const faces = await fd.detect(c);
          if (faces[0]) {
            const b = faces[0].boundingBox;
            region = { x: Math.round(b.x), y: Math.round(b.y + b.height * 0.22), w: Math.round(b.width), h: Math.round(b.height * 0.22) };
          }
        }
      } catch { /* manual placement */ }
      setBlur(region);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function pointer(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }
  function down(e: React.PointerEvent) {
    const p = pointer(e);
    dragRef.current = { dx: p.x - blur.x, dy: p.y - blur.y };
  }
  function move(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const p = pointer(e);
    const c = canvasRef.current!;
    setBlur((b) => ({ ...b, x: Math.max(0, Math.min(c.width - b.w, p.x - dragRef.current!.dx)), y: Math.max(0, Math.min(c.height - b.h, p.y - dragRef.current!.dy)) }));
  }
  function up() { dragRef.current = null; }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      draw(blur, false); // final without outline
      const photoDataUrl = canvasRef.current!.toDataURL("image/png");
      draw(blur, true); // restore outline view
      const r = await fetch(`/api/visits/${visitId}/photo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photoDataUrl }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Upload failed");
      setDone(true);
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="text-xs text-emerald-600">✓ Patient photo uploaded (eyes blurred).</p>;

  return (
    <div>
      {!hasImage ? (
        <label className="inline-block cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-primary">
          📷 Take / upload patient photo
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
        </label>
      ) : (
        <div>
          <p className="mb-1 text-[11px] text-muted">Drag the orange box to cover the patient&apos;s eyes, then upload. Only the blurred photo is saved.</p>
          <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} className="w-full max-w-[320px] touch-none rounded-lg border border-slate-200" />
          <div className="mt-2 flex gap-2">
            <button onClick={submit} disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Uploading…" : "Upload blurred photo"}</button>
            <button onClick={() => { setHasImage(false); imgRef.current = null; }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500">Retake</button>
          </div>
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
