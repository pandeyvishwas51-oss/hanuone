"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";

type Row = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  specialization: string | null;
  locality: string | null;
  status: string | null;
  aadhaarUrl: string | null;
  certificateUrls: string[];
  createdAt: string | null;
};

export default function ProfessionalsTable({ rows }: { rows: Row[] }) {
  const [data, setData] = useState(rows);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function update(id: string, status: string) {
    setBusyId(id);
    const reason = status === "rejected" ? prompt("Reason for rejection (optional):") || "" : "";
    const r = await fetch("/api/admin/professionals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, rejectionReason: reason })
    });
    setBusyId(null);
    if (r.ok) {
      startTransition(() => {
        setData((d) => d.map((row) => (row.id === id ? { ...row, status } : row)));
      });
    } else {
      alert("Could not update");
    }
  }

  return (
    <div className="mt-6 card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-bg/50 text-left text-xs uppercase text-muted">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Locality</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Documents</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 align-top">
                <div className="font-medium text-ink">{r.name}</div>
                {r.specialization && <div className="text-xs text-muted">{r.specialization}</div>}
              </td>
              <td className="px-4 py-3 align-top capitalize">{r.role.replace("_", " ")}</td>
              <td className="px-4 py-3 align-top">{r.locality || "-"}</td>
              <td className="px-4 py-3 align-top">
                <div className="text-xs">{r.email}</div>
                <div className="text-xs text-muted">{r.phone}</div>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap gap-2 text-xs">
                  {r.aadhaarUrl ? (
                    <a href={r.aadhaarUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <FileText size={12} /> Aadhaar
                    </a>
                  ) : (
                    <span className="text-muted">No Aadhaar</span>
                  )}
                  {r.certificateUrls.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <FileText size={12} /> Cert {i + 1}
                    </a>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <span className={
                  r.status === "verified" ? "badge badge-verified" :
                  r.status === "rejected" ? "badge badge-rejected" :
                  r.status === "suspended" ? "badge badge-rejected" :
                  "badge badge-pending"
                }>{r.status}</span>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busyId === r.id || r.status === "verified"}
                    onClick={() => update(r.id, "verified")}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Verify
                  </button>
                  <button
                    disabled={busyId === r.id || r.status === "rejected"}
                    onClick={() => update(r.id, "rejected")}
                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">No professionals yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
