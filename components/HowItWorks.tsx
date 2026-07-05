import type { LucideIcon } from "lucide-react";

export type HowStep = { Icon: LucideIcon; title: string; text: string };

/**
 * Icon-led "how it works" strip for patient service pages. Replaces dense
 * explanatory paragraphs with a scannable, numbered row of icon steps — far
 * more user-friendly than a wall of text.
 */
export default function HowItWorks({ title = "How it works", steps }: { title?: string; steps: HowStep[] }) {
  return (
    <section aria-label={title}>
      <h2 className="h3">{title}</h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ Icon, title: t, text }, i) => (
          <li
            key={t}
            style={{ animationDelay: `${Math.min(i, 4) * 60}ms` }}
            className="card animate-fade-in-up relative flex flex-col p-5"
          >
            <span className="absolute right-4 top-4 text-sm font-bold text-primary/15">{i + 1}</span>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon size={20} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-ink">{t}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
