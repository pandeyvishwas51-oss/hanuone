"use client";

import { useEffect, useState } from "react";
import { Landmark, BadgeCheck, ShieldAlert } from "lucide-react";

type Bank = { accountName: string; accountNumberMasked: string | null; hasAccount: boolean; ifsc: string; upiId: string; verified: boolean };

export default function BankAccountForm() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [editing, setEditing] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/providers/bank").then((r) => r.json()).then((j) => {
      if (ignore || !j.ok) return;
      setBank(j.bank); setAccountName(j.bank.accountName || ""); setIfsc(j.bank.ifsc || ""); setUpiId(j.bank.upiId || ""); if (!j.bank.hasAccount && !j.bank.upiId) setEditing(true);
    }).catch(() => {});
    return () => { ignore = true; };
  }, []);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/providers/bank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountName, accountNumber, ifsc, upiId }) });
      const j = await r.json();
      if (!j.ok) { setMsg({ ok: false, text: j.error || "Could not save" }); return; }
      const fresh = await (await fetch("/api/providers/bank")).json();
      if (fresh.ok) setBank(fresh.bank);
      setAccountNumber(""); setEditing(false); setMsg({ ok: true, text: "Payout details saved. We'll verify them before the next payout." });
    } catch { setMsg({ ok: false, text: "Network error. Please try again." }); } finally { setBusy(false); }
  }

  if (!bank) return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading payout details…</div>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Landmark size={19} /></span>
          <div>
            <div className="text-sm font-bold text-slate-800">Payout account</div>
            <div className="text-xs text-slate-500">Where we send your earnings</div>
          </div>
        </div>
        {bank.hasAccount || bank.upiId ? (
          bank.verified
            ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><BadgeCheck size={13} /> Verified</span>
            : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"><ShieldAlert size={13} /> Pending verification</span>
        ) : null}
      </div>

      {!editing ? (
        <div className="mt-4">
          {bank.hasAccount && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm">
              <div className="font-semibold text-slate-700">{bank.accountName}</div>
              <div className="text-slate-500">A/c {bank.accountNumberMasked} · {bank.ifsc}</div>
            </div>
          )}
          {bank.upiId && <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-600">UPI · {bank.upiId}</div>}
          <button onClick={() => setEditing(true)} className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{bank.hasAccount || bank.upiId ? "Update details" : "Add details"}</button>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Account holder name" aria-label="Account holder name" maxLength={120} value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Bank account number" aria-label="Account number" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 18))} />
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase" placeholder="IFSC (e.g. HDFC0001234)" aria-label="IFSC code" maxLength={11} value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase().slice(0, 11))} />
          <div className="flex items-center gap-2 text-[11px] text-slate-400"><span className="h-px flex-1 bg-slate-100" /> or UPI <span className="h-px flex-1 bg-slate-100" /></div>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="UPI ID (e.g. name@upi)" aria-label="UPI ID" maxLength={80} value={upiId} onChange={(e) => setUpiId(e.target.value)} />
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={busy} className="flex-1 rounded-lg bg-[#01586C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#024a5a] disabled:opacity-50">{busy ? "Saving…" : "Save payout details"}</button>
            {(bank.hasAccount || bank.upiId) && <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>}
          </div>
        </div>
      )}
      {msg && <p className={`mt-2 text-xs font-medium ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
    </div>
  );
}
