import type { LucideIcon } from "lucide-react";

export type HowStep = { Icon: LucideIcon; title: string; text?: string };

/**
 * Icon-first "how it works" strip for patient service pages. Symbol-led and
 * deliberately low on words — a big icon, a short label, and an optional
 * one-liner. No walls of text.
 */
export default function HowItWorks({ title = "How it works", steps }: { title?: string; steps: HowStep[] }) {
  return (
    <section aria-label={title}>
      <h2 className="h3">{title}</h2>
      <ol className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {steps.map(({ Icon, title: t, text }, i) => (
          <li
            key={t}
            style={{ animationDelay: `${Math.min(i, 4) * 60}ms` }}
            className="card animate-fade-in-up relative flex flex-col items-center p-5 text-center"
          >
            <span className="absolute right-3 top-3 text-xs font-bold text-primary/15">{i + 1}</span>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon size={26} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-ink">{t}</h3>
            {text && <p className="mt-1 text-xs leading-snug text-muted">{text}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
