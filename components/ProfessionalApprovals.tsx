"use client";

import { useEffect, useState } from "react";

type Pro = {
  id: string;
  fullName: string;
  role: string;
  phone: string;
  specialization: string | null;
  city: string | null;
  status: string;
};

export default function ProfessionalApprovals() {
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/professionals");
    const j = await r.json();
    setPros(j.professionals ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, action: "verify" | "reject" | "suspend") {
    setBusyId(id);
    await fetch("/api/admin/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action })
    });
    await load();
    setBusyId(null);
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (pros.length === 0) return <p className="text-sm text-muted">No provider applications yet.</p>;

  const color: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    verified: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-600",
    suspended: "bg-slate-100 text-slate-600"
  };

  return (
    <div className="grid gap-2">
      {pros.map((p) => (
        <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="font-medium text-ink">{p.fullName} <span className="text-xs text-muted">· {p.role}</span></div>
            <div className="text-xs text-muted">{[p.specialization, p.city, p.phone].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${color[p.status] ?? "bg-slate-100"}`}>{p.status}</span>
            {p.status !== "verified" && (
              <button disabled={busyId === p.id} onClick={() => act(p.id, "verify")} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
            )}
            {p.status !== "rejected" && (
              <button disabled={busyId === p.id} onClick={() => act(p.id, "reject")} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600">Reject</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
