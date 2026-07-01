"use client";

import { Printer } from "lucide-react";

/**
 * Triggers the browser print dialog (→ "Save as PDF" or hard copy). Hidden from
 * the printout itself via `print:hidden`. Used on prescription / record views so
 * a clinic can hand the patient a copy. Portal chrome is hidden by PortalShell's
 * `print:hidden` and the global @media print rules in globals.css.
 */
export default function PrintButton({ label = "Print / Save PDF", className = "" }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95 print:hidden ${className}`}
    >
      <Printer size={14} /> {label}
    </button>
  );
}
