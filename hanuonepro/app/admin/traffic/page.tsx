export const dynamic = "force-dynamic";
export const revalidate = 0;

import { sql } from "drizzle-orm";
import { Activity, Eye, Globe, MonitorSmartphone, Repeat, UserCheck } from "lucide-react";
import { db } from "@/lib/db";
import StatCard from "@/components/admin/StatCard";
import { TimeseriesArea, HorizontalBar, DonutChart } from "@/components/admin/Charts";

type Row<T extends string> = Record<T, string | number>;

async function getTrafficData() {
  const dbi = db();
  const [
    totalsRow,
    todayRow,
    last24hRow,
    last7dRow,
    uniqueRow,
    bySiteRows,
    byDeviceRows,
    byCountryRows,
    topPathsHanuoneRows,
    topPathsHanuoneProRows,
    topReferrersRows,
    timeseriesRows,
    recentRows
  ] = await Promise.all([
    dbi.execute<Row<"c">>(sql`SELECT COUNT(*)::int AS c FROM pageviews`),
    dbi.execute<Row<"c">>(sql`SELECT COUNT(*)::int AS c FROM pageviews WHERE created_at::date = current_date`),
    dbi.execute<Row<"c">>(sql`SELECT COUNT(*)::int AS c FROM pageviews WHERE created_at > now() - interval '24 hours'`),
    dbi.execute<Row<"c">>(sql`SELECT COUNT(*)::int AS c FROM pageviews WHERE created_at > now() - interval '7 days'`),
    dbi.execute<Row<"c">>(sql`SELECT COUNT(DISTINCT visitor_id)::int AS c FROM pageviews WHERE visitor_id IS NOT NULL`),
    dbi.execute<Row<"site" | "c">>(sql`SELECT site, COUNT(*)::int AS c FROM pageviews GROUP BY site ORDER BY c DESC`),
    dbi.execute<Row<"device" | "c">>(sql`SELECT COALESCE(device, 'unknown') AS device, COUNT(*)::int AS c FROM pageviews GROUP BY device ORDER BY c DESC`),
    dbi.execute<Row<"country" | "c">>(sql`SELECT COALESCE(country, 'unknown') AS country, COUNT(*)::int AS c FROM pageviews WHERE created_at > now() - interval '30 days' GROUP BY country ORDER BY c DESC LIMIT 10`),
    dbi.execute<Row<"path" | "c">>(sql`SELECT path, COUNT(*)::int AS c FROM pageviews WHERE site = 'hanuone' AND created_at > now() - interval '30 days' GROUP BY path ORDER BY c DESC LIMIT 10`),
    dbi.execute<Row<"path" | "c">>(sql`SELECT path, COUNT(*)::int AS c FROM pageviews WHERE site = 'hanuonepro' AND created_at > now() - interval '30 days' GROUP BY path ORDER BY c DESC LIMIT 10`),
    dbi.execute<Row<"host" | "c">>(sql`
      SELECT
        CASE
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          ELSE COALESCE(NULLIF(SPLIT_PART(SPLIT_PART(referrer, '://', 2), '/', 1), ''), referrer)
        END AS host,
        COUNT(*)::int AS c
      FROM pageviews
      WHERE created_at > now() - interval '30 days'
      GROUP BY host
      ORDER BY c DESC
      LIMIT 10
    `),
    dbi.execute<Row<"d" | "c">>(sql`
      WITH days AS (
        SELECT generate_series(current_date - interval '29 days', current_date, '1 day')::date AS d
      )
      SELECT to_char(days.d, 'YYYY-MM-DD') AS d, COALESCE(COUNT(p.id), 0)::int AS c
      FROM days
      LEFT JOIN pageviews p ON p.created_at::date = days.d
      GROUP BY days.d
      ORDER BY days.d
    `),
    dbi.execute<Row<"site" | "path" | "country" | "city" | "device" | "created_at">>(sql`
      SELECT site, path, COALESCE(country, '') AS country, COALESCE(city, '') AS city, COALESCE(device, '') AS device, created_at
      FROM pageviews
      ORDER BY created_at DESC
      LIMIT 20
    `)
  ]);

  const total = Number((totalsRow.rows ?? totalsRow as any)[0]?.c ?? 0);
  const today = Number((todayRow.rows ?? todayRow as any)[0]?.c ?? 0);
  const last24h = Number((last24hRow.rows ?? last24hRow as any)[0]?.c ?? 0);
  const last7d = Number((last7dRow.rows ?? last7dRow as any)[0]?.c ?? 0);
  const unique = Number((uniqueRow.rows ?? uniqueRow as any)[0]?.c ?? 0);

  const arr = (r: any) => (Array.isArray(r) ? r : r.rows ?? []);

  return {
    total,
    today,
    last24h,
    last7d,
    unique,
    bySite: arr(bySiteRows).map((r: any) => ({ name: r.site, count: Number(r.c) })),
    byDevice: arr(byDeviceRows).map((r: any) => ({ name: r.device, count: Number(r.c) })),
    byCountry: arr(byCountryRows).map((r: any) => ({ name: r.country, count: Number(r.c) })),
    topPathsHanuone: arr(topPathsHanuoneRows).map((r: any) => ({ name: r.path, count: Number(r.c) })),
    topPathsHanuonePro: arr(topPathsHanuoneProRows).map((r: any) => ({ name: r.path, count: Number(r.c) })),
    topReferrers: arr(topReferrersRows).map((r: any) => ({ name: r.host, count: Number(r.c) })),
    timeseries: arr(timeseriesRows).map((r: any) => ({ date: r.d, count: Number(r.c) })),
    recent: arr(recentRows)
  };
}

function timeAgo(d: string | Date) {
  const t = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - t.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminTrafficPage() {
  const t = await getTrafficData();
  const newPlatform = t.total === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Live traffic</h1>
          <p className="mt-1 text-sm text-muted">First-party analytics, embedded right here. Refreshes on every reload.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
        </span>
      </header>

      {newPlatform && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          No pageviews tracked yet. Open the patient site or HanuonePro in another tab; this dashboard will populate within seconds.
        </div>
      )}

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pageviews, all time" value={t.total.toLocaleString("en-IN")} icon={Eye} tint="bg-primary/10 text-primary" />
        <StatCard label="Pageviews today" value={t.today} icon={Activity} tint="bg-violet-50 text-violet-600" />
        <StatCard label="Last 24 hours" value={t.last24h} icon={Repeat} tint="bg-blue-50 text-blue-600" />
        <StatCard label="Last 7 days" value={t.last7d} icon={Repeat} tint="bg-cyan-50 text-cyan-600" />
        <StatCard label="Unique visitors" value={t.unique} icon={UserCheck} tint="bg-emerald-50 text-emerald-600" />
      </section>

      {/* Trend */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Pageviews, last 30 days</h2>
            <p className="text-xs text-muted">Daily total across both Hanuone and HanuonePro.</p>
          </div>
          <span className="text-xs font-semibold text-emerald-600">{t.last7d} in 7d</span>
        </div>
        <div className="mt-3">
          <TimeseriesArea data={t.timeseries} label="pageviews" color="#0F4C5C" />
        </div>
      </section>

      {/* Distributions */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Traffic by site</h2>
          <p className="text-xs text-muted">Patient site vs. professional dashboard.</p>
          <div className="mt-3"><DonutChart data={t.bySite.length ? t.bySite : [{ name: "no data", count: 1 }]} /></div>
        </div>
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Devices</h2>
          <p className="text-xs text-muted">Mobile, desktop, tablet share.</p>
          <div className="mt-3"><DonutChart data={t.byDevice.length ? t.byDevice : [{ name: "no data", count: 1 }]} /></div>
        </div>
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Top countries (30d)</h2>
          <p className="text-xs text-muted">From Vercel geo headers.</p>
          <div className="mt-3"><HorizontalBar data={t.byCountry.length ? t.byCountry : [{ name: "no data", count: 0 }]} color="#FF6B35" /></div>
        </div>
      </section>

      {/* Top paths */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Top pages, hanuone.vercel.app</h2>
          <p className="text-xs text-muted">Most-viewed paths on the patient directory, last 30 days.</p>
          <div className="mt-3"><HorizontalBar data={t.topPathsHanuone.length ? t.topPathsHanuone : [{ name: "no data", count: 0 }]} color="#0F4C5C" /></div>
        </div>
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Top pages, hanuonepro.vercel.app</h2>
          <p className="text-xs text-muted">Most-viewed paths on the pro dashboard, last 30 days.</p>
          <div className="mt-3"><HorizontalBar data={t.topPathsHanuonePro.length ? t.topPathsHanuonePro : [{ name: "no data", count: 0 }]} color="#FF6B35" /></div>
        </div>
      </section>

      {/* Referrers + recent */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Top referrers</h2>
          <p className="text-xs text-muted">Where your traffic is coming from.</p>
          <div className="mt-3"><HorizontalBar data={t.topReferrers.length ? t.topReferrers : [{ name: "Direct", count: 0 }]} color="#5390D9" /></div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Recent pageviews</h2>
            <Globe size={16} className="text-muted" />
          </div>
          {t.recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No pageviews yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5 text-sm">
              {t.recent.map((r: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="rounded-md bg-primary/5 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                      {r.site}
                    </span>
                    <span className="ml-2 truncate text-ink">{r.path}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
                    <span className="hidden sm:inline-flex items-center gap-1">
                      <MonitorSmartphone size={12} /> {r.device || "?"}
                    </span>
                    <span className="hidden sm:inline">{[r.city, r.country].filter(Boolean).join(", ") || "-"}</span>
                    <span>{timeAgo(r.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold text-ink">Bonus: deeper analytics</h2>
        <p className="mt-1 text-xs text-muted">
          Vercel's web analytics dashboard (page-level conversion, web vitals) lives on vercel.com.
          The data above is our own first-party tracker, written to Neon, and refreshes on every page load.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="https://vercel.com/pandeyvishwas51-oss-projects/hanuone/analytics" target="_blank" rel="noopener" className="btn-outline text-sm">Vercel Analytics: Hanuone</a>
          <a href="https://vercel.com/pandeyvishwas51-oss-projects/hanuonepro/analytics" target="_blank" rel="noopener" className="btn-outline text-sm">Vercel Analytics: HanuonePro</a>
        </div>
      </section>
    </div>
  );
}
