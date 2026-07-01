"use client";

import { useState } from "react";

export default function ReferCard({ code, rewardInr, signedUp }: { code: string; rewardInr: number; signedUp: number }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : `/?ref=${code}`;
  const message = `I use HanuONE for doctors, lab tests, medicines and home care. Sign up with my code ${code} and we both get ₹${rewardInr} off: ${link}`;

  const [copyErr, setCopyErr] = useState(false);

  async function copy() {
    setCopyErr(false);
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable/denied (insecure context, permissions) — surface the
      // link so the user can copy it manually instead of a silent no-op.
      setCopyErr(true);
      setTimeout(() => setCopyErr(false), 4000);
    }
  }

  return (
    <div className="card p-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">Your referral code</div>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-primary/5 px-4 py-2 text-2xl font-bold tracking-wider text-primary">{code}</span>
        <button onClick={copy} className="rounded-lg border border-primary/30 px-3 py-2 text-sm font-semibold text-primary transition active:scale-95">
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      {copyErr && (
        <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
          Couldn&apos;t copy automatically — here&apos;s your link: <span className="font-semibold text-ink">{link}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
        >
          Share on WhatsApp
        </a>
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-ink">
          Share via SMS
        </a>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-2xl font-bold text-primary">{signedUp}</div>
          <div className="text-xs text-muted">Friends joined</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-2xl font-bold text-primary">₹{rewardInr}</div>
          <div className="text-xs text-muted">Reward each</div>
        </div>
      </div>
    </div>
  );
}
