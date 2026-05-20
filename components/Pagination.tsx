import Link from "next/link";

type Props = {
  baseUrl: string;
  searchParams: Record<string, string | string[] | undefined>;
  page: number;
  pageSize: number;
  total: number;
};

function buildHref(base: string, sp: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((item) => params.append(k, item));
    else params.set(k, v);
  }
  params.set("page", String(page));
  return `${base}?${params.toString()}`;
}

export default function Pagination({ baseUrl, searchParams, page, pageSize, total }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const window = 2;
  const start = Math.max(1, page - window);
  const end = Math.min(totalPages, page + window);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      {prev ? (
        <Link href={buildHref(baseUrl, searchParams, prev)} className="btn-outline">
          ← Previous
        </Link>
      ) : (
        <span className="btn-outline opacity-40">← Previous</span>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(baseUrl, searchParams, p)}
          className={`grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-semibold ${
            p === page ? "bg-primary text-white" : "border border-primary/15 bg-white text-ink"
          }`}
        >
          {p}
        </Link>
      ))}
      {next ? (
        <Link href={buildHref(baseUrl, searchParams, next)} className="btn-outline">
          Next →
        </Link>
      ) : (
        <span className="btn-outline opacity-40">Next →</span>
      )}
    </nav>
  );
}
