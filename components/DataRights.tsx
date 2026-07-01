"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// DPDP Act 2023 data-subject controls: export + erasure.
export default function DataRights() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function del() {
    if (!confirm("Delete your account? Personal details will be anonymized. Health records are retained de-identified for the legal minimum period.")) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/account/delete", { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "Could not delete your account. Please try again or contact support.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 border-t border-slate-100 pt-6">
      <h2 className="text-sm font-semibold text-ink">Your data (DPDP Act 2023)</h2>
      <p className="mt-1 text-xs text-muted">Download everything we hold about you, or delete your account.</p>
      <div className="mt-3 flex gap-2">
        <a href="/api/account/export" className="btn-outline text-sm">Download my data</a>
        <button onClick={del} disabled={busy} className="btn-outline text-sm text-rose-600">
          {busy ? "Processing…" : "Delete my account"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </section>
  );
}
