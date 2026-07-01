import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function ComingSoon({
  title,
  phase,
  blurb,
  cta
}: {
  title: string;
  phase?: string;
  blurb?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl">🛠️</div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {phase && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">{phase}</p>}
        <p className="mt-2 text-sm text-slate-500">{blurb || "This module is on the roadmap and will light up in an upcoming build pass."}</p>
        {cta && (
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#01586C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#024a5a] active:scale-95"
          >
            {cta.label} <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </div>
  );
}
