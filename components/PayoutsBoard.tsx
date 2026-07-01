"use client";

import { useEffect, useState } from "react";

type Payout = {
  id: string;
  professionalId: string | null;
  grossInr: number;
  commissionInr: number;
  netInr: number;
  status: string;
  providerRef: string | null;
  createdAt: string | null;
};

const COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  paid: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-600"
};

export default function PayoutsBoard() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/admin/payouts");
      if (!r.ok) throw new Error();
      const j = await r.json();
      setPayouts(j.payouts ?? []);
    } catch {
      setError("Couldn't load payouts. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function release(id: string) {
    setBusy(id); setError("");
    try {
      const r = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "release" })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) { setError(j.error || "Release failed — the payout was not changed."); return; }
      // Only reflect 'paid' once the server confirms it.
      setPayouts((ps) => ps.map((p) => (p.id === id ? { ...p, status: "paid" } : p)));
    } catch {
      setError("Release failed — check your connection and retry.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error && payouts.length === 0)
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-rose-600" role="alert">{error}</p>
        <button onClick={load} className="btn-outline mt-3">Retry</button>
      </div>
    );
  if (payouts.length === 0)
    return <div className="card p-6 text-sm text-muted">No payouts yet. They appear here as providers complete paid services.</div>;

  const totalNet = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.netInr, 0);

  return (
    <div>
      <div className="mb-3 text-sm text-muted">Pending to release: <span className="font-semibold text-ink">₹{totalNet}</span></div>
      {error && <div role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase text-muted">
            <tr><th className="py-2">Provider</th><th>Gross</th><th>Commission</th><th>Net</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="py-2 font-mono text-xs text-muted">{p.professionalId?.slice(0, 8) ?? "—"}</td>
                <td>₹{p.grossInr}</td>
                <td className="text-muted">₹{p.commissionInr}</td>
                <td className="font-semibold text-ink">₹{p.netInr}</td>
                <td><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLOR[p.status] ?? "bg-slate-100"}`}>{p.status}</span></td>
                <td>
                  {p.status === "pending" && (
                    <button disabled={busy === p.id} onClick={() => release(p.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                      Release
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
