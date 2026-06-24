import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { auditSite, topFixes, type PageTypeAudit } from "@/lib/seo-audit";
import { CheckCircle2, XCircle, Search, Bot, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "SEO / AEO / GEO Tracker", robots: { index: false } };

export default async function SeoTrackerPage() {
  const user = await getCurrentUser();
  if (!user || (!user.isAdmin && user.role !== "admin")) redirect("/login?next=/admin/seo");

  const audit = auditSite();
  const fixes = topFixes(audit, 6);

  return (
    <div className="container-page py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h2">SEO · AEO · GEO Tracker</h1>
          <p className="mt-1 text-sm text-muted">
            On-page readiness across Google SEO, AI answer engines (AEO) and generative engines (GEO).
            Live ranking + AI-citation data plugs in once GSC / DataForSEO keys are set.
          </p>
        </div>
        <div className="text-xs text-muted">Generated {new Date(audit.generatedAt).toLocaleString("en-IN")}</div>
      </header>

      {/* Pillar scores */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <ScoreCard label="Overall" value={audit.overall} icon={<Sparkles className="h-5 w-5" />} big />
        <ScoreCard label="SEO" value={audit.byPillar.SEO} icon={<Search className="h-5 w-5" />} />
        <ScoreCard label="AEO" value={audit.byPillar.AEO} icon={<Bot className="h-5 w-5" />} />
        <ScoreCard label="GEO" value={audit.byPillar.GEO} icon={<Sparkles className="h-5 w-5" />} />
      </div>

      {/* GEO files */}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <FileBadge ok={audit.geoFiles.llmsTxt} label="/llms.txt" />
        <FileBadge ok={audit.geoFiles.robotsAiBots} label="robots.txt → AI bots allowed" />
        <FileBadge ok={audit.geoFiles.sitemap} label="sitemap.xml" />
      </div>

      {/* Top fixes */}
      <section className="mt-8 card p-6">
        <h2 className="h3">Top fixes by impact</h2>
        <ol className="mt-3 space-y-2">
          {fixes.length === 0 ? (
            <li className="text-sm text-muted">All tracked checks passing. 🎉</li>
          ) : (
            fixes.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                  {i + 1}
                </span>
                <span className="text-ink">{f}</span>
              </li>
            ))
          )}
        </ol>
      </section>

      {/* Per-page scorecard */}
      <section className="mt-8 space-y-4">
        <h2 className="h3">Page-type scorecard</h2>
        {audit.pages.map((p) => (
          <PageRow key={p.pageType} page={p} />
        ))}
      </section>
    </div>
  );
}

function ScoreCard({ label, value, icon, big }: { label: string; value: number; icon: ReactNode; big?: boolean }) {
  const color = value >= 80 ? "text-emerald-600" : value >= 60 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon} {label}
      </div>
      <div className={`mt-2 font-bold ${color} ${big ? "text-4xl" : "text-3xl"}`}>{value}</div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function FileBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {label}
    </span>
  );
}

function PageRow({ page }: { page: PageTypeAudit }) {
  return (
    <details className="card p-5">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-ink">{page.pageType}</div>
          <code className="text-xs text-muted">{page.examplePath}</code>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <Pill label="SEO" v={page.seo} />
          <Pill label="AEO" v={page.aeo} />
          <Pill label="GEO" v={page.geo} />
          <span className="text-base text-ink">{page.score}</span>
        </div>
      </summary>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {page.checks.map((c) => (
          <div key={c.key} className="flex items-center gap-2 text-sm">
            {c.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-400" />}
            <span className={c.pass ? "text-ink" : "text-muted"}>
              <span className="mr-1 text-[10px] font-semibold uppercase text-muted">{c.group}</span>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function Pill({ label, v }: { label: string; v: number }) {
  const c = v >= 80 ? "bg-emerald-50 text-emerald-700" : v >= 60 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
  return <span className={`rounded px-2 py-0.5 ${c}`}>{label} {v}</span>;
}
