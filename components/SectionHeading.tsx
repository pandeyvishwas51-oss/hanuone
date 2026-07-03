import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * One consistent section header used across marketing + listing pages so every
 * section shares the same rhythm and alignment: optional eyebrow, a display
 * title, an optional subtitle, and an optional right-aligned action link.
 * Pass `center` for hero-style centered sections.
 */
export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  center = false,
  className = ""
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: { href: string; label: string };
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mb-6 flex flex-col gap-3 sm:mb-8 ${
        center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
      } ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-accent">
            <span className="h-1 w-1 rounded-full bg-accent" />
            {eyebrow}
          </span>
        )}
        <h2 className="h2 mt-2">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-muted sm:text-[15px]">{subtitle}</p>}
      </div>
      {action && !center && (
        <Link
          href={action.href}
          className="group inline-flex flex-none items-center gap-1 text-sm font-semibold text-primary hover:text-primary-600"
        >
          {action.label}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
