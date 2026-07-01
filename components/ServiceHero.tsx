import { Check } from "lucide-react";

/** Premium gradient hero for patient service pages (lab, vitals, medicine…). */
export default function ServiceHero({ title, subtitle, badges, emoji }: { title: string; subtitle: string; badges?: string[]; emoji?: string }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary to-primary-400 p-6 text-white shadow-[0_20px_50px_-20px_rgba(1,88,108,0.55)] sm:p-9">
      {/* Soft depth: warm accent glow + cool highlight + faint grid texture */}
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="relative">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">{emoji ? `${emoji} ` : ""}{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">{subtitle}</p>
        {badges && badges.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">
                <Check size={13} className="text-emerald-300" strokeWidth={3} /> {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
