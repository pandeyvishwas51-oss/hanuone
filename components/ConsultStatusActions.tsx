"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

/**
 * Provider-only control to advance a consultation's lifecycle. Marking it
 * complete is what unblocks downstream automation (patient review request,
 * follow-up, payout). Shown in the consult room for the consulting doctor.
 */
export default function ConsultStatusActions({ consultationId, status }: { consultationId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (status === "completed") {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
        <CheckCircle2 size={16} /> Consultation completed
      </p>
    );
  }

  async function complete() {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/consult/${consultationId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setErr(j.error || "Couldn't update — try again."); return; }
      router.refresh();
    } catch {
      setErr("You appear to be offline — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button onClick={complete} disabled={busy} className="btn-primary inline-flex items-center gap-2">
        <CheckCircle2 size={16} /> {busy ? "Completing…" : "Mark consultation complete"}
      </button>
      {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
    </div>
  );
}
