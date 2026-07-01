import Link from "next/link";
import { X } from "lucide-react";
import { asArray, titleCase } from "@/lib/utils";

type SP = Record<string, string | string[] | undefined>;

/**
 * Urban-Company-style active-filter chips shown above the doctor results.
 * Each chip removes just its own filter value (arrays remove one entry); a
 * "Clear all" resets to the bare directory. Server component — pure links.
 */
export default function ActiveFilterChips({ searchParams }: { searchParams: SP }) {
  // Build a /doctors URL from a list of [key,value] pairs (page/sort dropped so
  // removing a filter always returns to page 1 with a fresh, valid result set).
  const href = (pairs: [string, string][]) => {
    const qs = new URLSearchParams();
    pairs.forEach(([k, v]) => qs.append(k, v));
    const s = qs.toString();
    return s ? `/doctors?${s}` : "/doctors";
  };

  // Flatten current filters into removable pairs (excluding page + sort).
  const pairs: [string, string][] = [];
  asArray(searchParams.specialty).forEach((v) => pairs.push(["specialty", v]));
  asArray(searchParams.locality).forEach((v) => pairs.push(["locality", v]));
  const pincode = typeof searchParams.pincode === "string" ? searchParams.pincode : undefined;
  if (pincode) pairs.push(["pincode", pincode]);
  const feeMax = typeof searchParams.feeMax === "string" ? searchParams.feeMax : undefined;
  if (feeMax) pairs.push(["feeMax", feeMax]);
  const feeMin = typeof searchParams.feeMin === "string" ? searchParams.feeMin : undefined;
  if (feeMin) pairs.push(["feeMin", feeMin]);
  const minRating = typeof searchParams.minRating === "string" ? searchParams.minRating : undefined;
  if (minRating) pairs.push(["minRating", minRating]);
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  if (q) pairs.push(["q", q]);

  if (pairs.length === 0) return null;

  const label = (k: string, v: string) => {
    switch (k) {
      case "specialty": return titleCase(v);
      case "locality": return titleCase(v);
      case "pincode": return `Pincode ${v}`;
      case "feeMax": return `Under ₹${v}`;
      case "feeMin": return `From ₹${v}`;
      case "minRating": return `${v}★ & up`;
      case "q": return `“${v}”`;
      default: return v;
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {pairs.map(([k, v], i) => (
        <Link
          key={`${k}-${v}-${i}`}
          href={href(pairs.filter((_, idx) => idx !== i))}
          aria-label={`Remove filter ${label(k, v)}`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 py-1 pl-3 pr-2 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {label(k, v)}
          <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
            <X size={11} />
          </span>
        </Link>
      ))}
      <Link href="/doctors" className="text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
        Clear all
      </Link>
    </div>
  );
}
