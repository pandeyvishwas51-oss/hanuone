import Link from "next/link";
import { Stethoscope, TestTube, Pill, Activity, HeartPulse, Mic } from "lucide-react";

/**
 * Urban-Company-style category quick-access bar: a one-tap row of the core
 * services, placed right under the hero search. Horizontally scrollable on
 * mobile, evenly spread on desktop.
 */
// Ordered by patient intent / frequency: consult first, then pharmacy, diagnostics,
// monitoring, home care, and the always-on AI assistant.
// One cohesive brand treatment (teal), with the flagship AI Doctor as the
// single orange accent — avoids the cluttered rainbow of per-item colours.
const CATEGORIES = [
  { href: "/doctors", label: "Doctors", Icon: Stethoscope, tint: "bg-primary/10 text-primary" },
  { href: "/medicine", label: "Medicines", Icon: Pill, tint: "bg-primary/10 text-primary" },
  { href: "/lab", label: "Lab Tests", Icon: TestTube, tint: "bg-primary/10 text-primary" },
  { href: "/vitals", label: "Vitals", Icon: Activity, tint: "bg-primary/10 text-primary" },
  { href: "/home-nursing", label: "Home Care", Icon: HeartPulse, tint: "bg-primary/10 text-primary" },
  { href: "/ai-doctor", label: "AI Doctor", Icon: Mic, tint: "bg-accent/10 text-accent" }
];

export default function CategoryBar() {
  return (
    <nav aria-label="Service categories" className="mx-auto mt-4 max-w-4xl">
      <ul className="no-scrollbar flex snap-x gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:gap-3 sm:overflow-visible">
        {CATEGORIES.map(({ href, label, Icon, tint }, i) => (
          <li key={href} className="snap-start">
            <Link
              href={href}
              style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
              className="group flex w-[88px] animate-fade-in-up flex-col items-center gap-2 rounded-2xl border border-primary/10 bg-white p-3 text-center shadow-[0_1px_3px_rgba(1,88,108,0.06)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_10px_24px_-12px_rgba(1,88,108,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-auto"
            >
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${tint} transition group-hover:scale-105`}>
                <Icon size={20} />
              </span>
              <span className="text-xs font-semibold text-ink">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
