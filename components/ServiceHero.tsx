import { Check } from "lucide-react";

/** Premium gradient hero for patient service pages (lab, vitals, medicine…). */
export default function ServiceHero({ title, subtitle, badges, emoji }: { title: string; subtitle: string; badges?: string[]; emoji?: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-600 p-6 text-white shadow-lg sm:p-8">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute right-20 top-24 h-28 w-28 rounded-full bg-accent/25 blur-2xl" />
      <div className="relative">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{emoji ? `${emoji} ` : ""}{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-white/80 sm:text-base">{subtitle}</p>
        {badges && badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 backdrop-blur-sm">
                <Check size={13} className="text-emerald-300" /> {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
