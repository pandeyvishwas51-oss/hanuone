import Link from "next/link";
import Sparkline from "./Sparkline";

/** Page header with title, subtitle and optional right-aligned actions. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** A premium stat card with icon chip, big value, optional delta + sparkline. */
export function StatCard({
  label, value, icon, accent = "#01586C", delta, deltaUp, spark, index = 0
}: { label: string; value: string; icon?: React.ReactNode; accent?: string; delta?: string; deltaUp?: boolean; spark?: number[]; index?: number }) {
  return (
    <div
      style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }}
      className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        {icon && <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${accent}14`, color: accent }}>{icon}</span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {delta && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${deltaUp ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{delta}</span>
        )}
      </div>
      {spark && spark.length > 1 && <div className="mt-2 -mb-1"><Sparkline data={spark} color={accent} /></div>}
    </div>
  );
}

/** A titled content card with optional header action. */
export function SectionCard({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          {title && <h2 className="text-sm font-bold text-slate-800">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const PILL: Record<string, string> = {
  // generic
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/10",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/10",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/10",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/10",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/10"
};

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: keyof typeof PILL }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${PILL[tone]}`}>{children}</span>;
}

/** Map common status strings to pill tones. */
export function statusTone(s: string | null | undefined): keyof typeof PILL {
  const v = (s || "").toLowerCase();
  if (["completed", "booked", "paid", "verified", "confirmed"].includes(v)) return "green";
  if (["pending", "pending_payment", "requested", "on_the_way", "unpaid"].includes(v)) return "amber";
  if (["in_progress", "arrived", "assigned"].includes(v)) return "blue";
  if (["cancelled", "rejected", "suspended", "refunded"].includes(v)) return "rose";
  return "slate";
}

export function EmptyState({ icon, title, hint, cta }: { icon?: React.ReactNode; title: string; hint?: string; cta?: { label: string; href: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
      {icon && <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
      {cta && <Link href={cta.href} className="mt-4 inline-block rounded-xl bg-[#01586C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#024a5a]">{cta.label}</Link>}
    </div>
  );
}

/** Tab bar for client dashboards. */
export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: { key: T; label: string }[]; active: T; onChange: (k: T) => void }) {
  return (
    <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${active === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
