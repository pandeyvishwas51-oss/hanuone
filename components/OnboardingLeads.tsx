"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: string;
  kind: string;
  fullName: string;
  specialization: string | null;
  city: string | null;
  locality: string | null;
  phone: string | null;
  email: string | null;
  registrationNo: string | null;
  source: string | null;
  status: string;
  callNotes: string | null;
};

const STATUSES = ["new", "contacted", "interested", "docs_pending", "onboarded", "rejected", "duplicate"];
const COLOR: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-50 text-blue-700",
  interested: "bg-sky-50 text-sky-700",
  docs_pending: "bg-amber-50 text-amber-700",
  onboarded: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-600",
  duplicate: "bg-slate-100 text-slate-500"
};

export default function OnboardingLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<"all" | "doctor" | "nurse">("all");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const url = kind === "all" ? "/api/admin/leads" : `/api/admin/leads?kind=${kind}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setLeads(j.leads ?? []);
    } catch {
      setError("Couldn't load leads. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  async function update(id: string, patch: { status?: string; callNotes?: string }) {
    setError("");
    // Optimistic, but revert if the server rejects so the board never lies.
    // Capture the prior values of ONLY this lead so a concurrent update to a
    // different lead is never clobbered on revert.
    const prevLead = leads.find((l) => l.id === id);
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const revert = () => { if (prevLead) setLeads((ls) => ls.map((l) => (l.id === id ? prevLead : l))); };
    try {
      const r = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) { revert(); setError(j.error || "Update failed — reverted."); }
    } catch {
      revert();
      setError("Network error — update reverted.");
    }
  }

  return (
    <div>
      <div className="mb-3 flex gap-2 text-sm">
        {(["all", "doctor", "nurse"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg px-3 py-1.5 font-medium ${kind === k ? "bg-primary text-white" : "border border-primary/20 text-primary"}`}
          >
            {k === "all" ? "All" : k === "doctor" ? "Doctors" : "Nurses"}
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600">Refresh</button>
      </div>

      {error && (
        <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{error}</span>
          <button onClick={load} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">Retry</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="card p-6 text-sm text-muted">
          No leads yet. Run the scraper: <code className="rounded bg-slate-100 px-1.5 py-0.5">python scraper/collect_leads.py --kind doctor --locality all</code> (then it upserts here once Supabase is connected).
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Name</th><th>Specialty</th><th>Area</th><th>Phone</th><th>Email</th><th>Source</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 align-top">
                  <td className="py-2 font-medium text-ink">{l.fullName}<div className="text-[11px] text-muted">{l.kind}</div></td>
                  <td className="text-muted">{l.specialization ?? "—"}</td>
                  <td className="text-muted">{[l.locality, l.city].filter(Boolean).join(", ") || "—"}</td>
                  <td>{l.phone ? <a href={`tel:${l.phone}`} className="text-primary">{l.phone}</a> : <span className="text-muted">—</span>}</td>
                  <td className="text-muted">{l.email ?? "—"}</td>
                  <td className="text-muted">{l.source ?? "—"}</td>
                  <td>
                    <select
                      value={l.status}
                      aria-label="Lead status"
                      onChange={(e) => update(l.id, { status: e.target.value })}
                      className={`rounded px-2 py-1 text-xs font-medium ${COLOR[l.status] ?? "bg-slate-100"}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
