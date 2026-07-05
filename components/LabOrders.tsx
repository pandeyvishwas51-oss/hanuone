"use client";

import { useState } from "react";

export type LabOrder = {
  id: string;
  testName: string;
  patientName: string;
  patientPhone: string;
  collectionType: string | null;
  slotDate: string | null;
  slotTime: string | null;
  status: string;
  reportUrl: string | null;
  createdAt: string | null;
};

// Lab fulfilment lifecycle.
const FLOW: Record<string, { next: string; label: string } | null> = {
  booked: { next: "sample_collected", label: "Sample collected" },
  sample_collected: { next: "report_ready", label: "Report ready" },
  report_ready: { next: "completed", label: "Complete" },
  completed: null,
  cancelled: null
};

const COLOR: Record<string, string> = {
  booked: "bg-amber-50 text-amber-700",
  sample_collected: "bg-sky-50 text-sky-700",
  report_ready: "bg-sky-50 text-sky-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700"
};

export default function LabOrders({ initial }: { initial: LabOrder[] }) {
  const [orders, setOrders] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function patch(id: string, body: { status?: string; reportUrl?: string }) {
    const prev = orders.find((o) => o.id === id);
    setBusy(id); setErr("");
    // Optimistic; roll back if the server rejects.
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...(body.status ? { status: body.status } : {}), ...(body.reportUrl ? { reportUrl: body.reportUrl } : {}) } : o)));
    try {
      const r = await fetch("/api/pro/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, type: "lab", ...body }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || "Could not update the lab order."); }
    } catch (e) {
      if (prev) setOrders((os) => os.map((o) => (o.id === id ? prev : o)));
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {err && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      {orders.map((o) => {
        const step = FLOW[o.status];
        const terminal = o.status === "completed" || o.status === "cancelled";
        return (
          <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-800">{o.testName}</div>
                <div className="text-xs text-slate-500">{o.patientName} · {o.patientPhone} · {o.collectionType === "walkin" ? "Walk-in" : "Home"}{o.slotDate ? ` · ${o.slotDate}` : ""}{o.slotTime ? ` ${o.slotTime}` : ""}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLOR[o.status] ?? "bg-slate-100"}`}>{o.status.replace(/_/g, " ")}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {step && (
                <button disabled={busy === o.id} onClick={() => patch(o.id, { status: step.next })}
                  className="rounded-lg bg-[#01586C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#024a5a] disabled:opacity-50">
                  {busy === o.id ? "…" : step.label}
                </button>
              )}
              {o.reportUrl ? (
                <a href={o.reportUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">View report</a>
              ) : (
                <ReportLinkButton onSave={(url) => patch(o.id, { reportUrl: url, status: o.status === "booked" || o.status === "sample_collected" ? "report_ready" : o.status })} disabled={busy === o.id} />
              )}
              {!terminal && (
                <button disabled={busy === o.id} onClick={() => patch(o.id, { status: "cancelled" })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportLinkButton({ onSave, disabled }: { onSave: (url: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  if (!open) return <button disabled={disabled} onClick={() => setOpen(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Attach report</button>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Report URL" className="min-h-[36px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
      <button disabled={!url.trim() || disabled} onClick={() => { onSave(url.trim()); setOpen(false); setUrl(""); }} className="rounded-lg bg-[#01586C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save</button>
    </span>
  );
}
