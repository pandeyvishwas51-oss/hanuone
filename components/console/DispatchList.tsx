"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Zap } from "lucide-react";
import { SectionCard, Pill, statusTone, EmptyState } from "@/components/portal/ui";

type Visit = { id: string; patientName: string; patientPhone: string; serviceType: string; serviceName: string | null; address: string; pincode: string | null; status: string; customerGender: string | null; assignmentReason: string | null; assignedProfessionalId: string | null };

export default function DispatchList({ requested, assigned }: { requested: Visit[]; assigned: Visit[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  async function autoAssign(visitId: string) {
    setBusy(visitId);
    try {
      const r = await fetch("/api/admin/visits/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitId }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setMsg((m) => ({ ...m, [visitId]: j.reason || j.error || "No suitable provider found" })); return; }
      router.refresh();
    } catch {
      setMsg((m) => ({ ...m, [visitId]: "Network error — check your connection and retry." }));
    } finally {
      setBusy(null); // never leave the button stuck disabled
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Unassigned · {requested.length}</h3>
        {requested.length === 0 ? <EmptyState icon={<Zap size={22} />} title="Nothing waiting" hint="New home-visit requests appear here for dispatch." /> : (
          <div className="space-y-2">
            {requested.map((v) => (
              <SectionCard key={v.id} className="!p-0">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{v.patientName}</span>
                      <Pill tone={statusTone(v.status)}>{v.status}</Pill>
                      {v.customerGender && <Pill tone="slate">{v.customerGender}</Pill>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {v.address}{v.pincode ? `, ${v.pincode}` : ""}</div>
                    <div className="text-xs text-slate-400">{v.serviceName || v.serviceType}</div>
                    {msg[v.id] && <div className="mt-1 text-xs font-semibold text-rose-600">{msg[v.id]}</div>}
                  </div>
                  <button disabled={busy === v.id} onClick={() => autoAssign(v.id)} className="flex items-center gap-1.5 rounded-xl bg-[#01586C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#024a5a] disabled:opacity-50">
                    <Zap size={15} /> {busy === v.id ? "Matching…" : "Auto-assign"}
                  </button>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </div>

      {assigned.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Recently assigned · {assigned.length}</h3>
          <div className="space-y-2">
            {assigned.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-800">{v.patientName}</span><Pill tone={statusTone(v.status)}>{v.status.replace(/_/g, " ")}</Pill></div>
                  <div className="text-xs text-slate-400">{v.serviceName || v.serviceType} · {v.assignmentReason || "assigned"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
