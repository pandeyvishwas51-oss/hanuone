import Link from "next/link";
import { Compass, Stethoscope, LayoutGrid, Sparkles, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const links = [
    { href: "/doctors", label: "Find doctors", icon: Stethoscope },
    { href: "/services", label: "All services", icon: LayoutGrid },
    { href: "/ai-doctor", label: "Ask Dr Hanu", icon: Sparkles }
  ];
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card animate-fade-in-up w-full max-w-md p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Compass size={26} />
        </span>
        <p className="mt-4 font-display text-4xl font-extrabold text-primary/20">404</p>
        <h1 className="mt-1 text-xl font-bold text-ink">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-muted">
          It may have moved, or never existed. Try one of these instead:
        </p>
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                <l.icon size={18} />
              </span>
              <span className="text-xs font-semibold text-ink">{l.label}</span>
            </Link>
          ))}
        </div>
        <Link href="/" className="btn-primary mt-6 inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to homepage
        </Link>
      </div>
    </div>
  );
}
