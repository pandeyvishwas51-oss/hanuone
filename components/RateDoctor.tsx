"use client";

import { useState } from "react";
import { Star } from "lucide-react";

/** Compact post-consult rating widget: pick 1-5 stars, optionally add a note. */
export default function RateDoctor({ doctorId, consultationId }: { doctorId: string; consultationId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(stars: number) {
    if (state === "saving") return;
    setRating(stars); setState("saving"); setErr("");
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, consultationId, rating: stars, reviewText: text })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Could not submit your rating.");
      setState("done");
    } catch (e) {
      setState("error"); setErr((e as Error).message);
    }
  }

  if (state === "done") {
    return <div className="mt-2 text-xs font-medium text-emerald-600">✓ Thanks for rating your doctor.</div>;
  }

  return (
    <div className="mt-2 w-full">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Rate your doctor:</span>
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={state === "saving"}
              onMouseEnter={() => setHover(n)}
              onClick={() => submit(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-0.5 disabled:opacity-50"
            >
              <Star size={18} className={(hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
            </button>
          ))}
        </div>
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a quick note (optional)"
        maxLength={1000}
        className="input mt-1.5 text-sm"
      />
      {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
    </div>
  );
}
