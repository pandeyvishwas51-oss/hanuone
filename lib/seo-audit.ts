// Internal SEO/AEO/GEO readiness tracker.
// Scores Hanuone's own page TYPES on the on-page signals we control, producing
// a live scorecard (the internal analogue of the seo-geo-tracker autopilot).
// External signals (live rankings, AI citations) plug in later via GSC /
// DataForSEO MCP — those require the user's API keys.

export type Check = { key: string; label: string; pass: boolean; group: "SEO" | "AEO" | "GEO" };

export type PageTypeAudit = {
  pageType: string;
  examplePath: string;
  checks: Check[];
  score: number; // 0–100
  seo: number;
  aeo: number;
  geo: number;
};

export type SiteAudit = {
  generatedAt: string;
  overall: number;
  byPillar: { SEO: number; AEO: number; GEO: number };
  pages: PageTypeAudit[];
  geoFiles: { llmsTxt: boolean; robotsAiBots: boolean; sitemap: boolean };
};

function pct(checks: Check[], group?: Check["group"]): number {
  const set = group ? checks.filter((c) => c.group === group) : checks;
  if (!set.length) return 100;
  return Math.round((set.filter((c) => c.pass).length / set.length) * 100);
}

function auditPageType(pageType: string, examplePath: string, signals: Record<string, boolean>): PageTypeAudit {
  const checks: Check[] = [
    { key: "title", label: "Unique <title>", pass: !!signals.title, group: "SEO" },
    { key: "meta", label: "Meta description", pass: !!signals.meta, group: "SEO" },
    { key: "canonical", label: "Canonical URL", pass: !!signals.canonical, group: "SEO" },
    { key: "og", label: "OpenGraph / Twitter card", pass: !!signals.og, group: "SEO" },
    { key: "breadcrumb", label: "BreadcrumbList schema", pass: !!signals.breadcrumb, group: "SEO" },
    { key: "primarySchema", label: "Primary entity JSON-LD", pass: !!signals.primarySchema, group: "SEO" },
    { key: "answerBlock", label: "Citable answer block", pass: !!signals.answerBlock, group: "AEO" },
    { key: "faq", label: "FAQ + FAQPage schema", pass: !!signals.faq, group: "AEO" },
    { key: "speakable", label: "Speakable schema", pass: !!signals.speakable, group: "AEO" },
    { key: "medicalWebPage", label: "MedicalWebPage + lastReviewed", pass: !!signals.medicalWebPage, group: "AEO" },
    { key: "inLlms", label: "Linked from /llms.txt", pass: !!signals.inLlms, group: "GEO" },
    { key: "inSitemap", label: "In sitemap.xml", pass: !!signals.inSitemap, group: "GEO" }
  ];
  return {
    pageType,
    examplePath,
    checks,
    score: pct(checks),
    seo: pct(checks, "SEO"),
    aeo: pct(checks, "AEO"),
    geo: pct(checks, "GEO")
  };
}

/**
 * Static readiness snapshot reflecting what each page type currently renders.
 * Update the signal flags as pages gain/lose schema so the scorecard stays honest.
 */
export function auditSite(): SiteAudit {
  const pages: PageTypeAudit[] = [
    auditPageType("Doctor profile", "/doctors/[slug]", {
      title: true, meta: true, canonical: true, og: true, breadcrumb: true, primarySchema: true,
      answerBlock: true, faq: false, speakable: true, medicalWebPage: true, inLlms: true, inSitemap: true
    }),
    auditPageType("Specialty page", "/specializations/[slug]", {
      title: true, meta: true, canonical: true, og: true, breadcrumb: true, primarySchema: true,
      answerBlock: true, faq: true, speakable: true, medicalWebPage: true, inLlms: true, inSitemap: true
    }),
    auditPageType("Locality page", "/localities/[slug]", {
      title: true, meta: true, canonical: true, og: true, breadcrumb: true, primarySchema: true,
      answerBlock: true, faq: true, speakable: true, medicalWebPage: true, inLlms: true, inSitemap: true
    }),
    auditPageType("Locality × Specialty", "/[locality]/[specialty]", {
      title: true, meta: true, canonical: true, og: true, breadcrumb: true, primarySchema: true,
      answerBlock: false, faq: false, speakable: false, medicalWebPage: false, inLlms: false, inSitemap: true
    }),
    auditPageType("Home", "/", {
      title: true, meta: true, canonical: true, og: true, breadcrumb: false, primarySchema: true,
      answerBlock: false, faq: true, speakable: false, medicalWebPage: false, inLlms: true, inSitemap: true
    }),
    auditPageType("Services", "/services", {
      title: true, meta: true, canonical: true, og: true, breadcrumb: false, primarySchema: false,
      answerBlock: false, faq: false, speakable: false, medicalWebPage: false, inLlms: true, inSitemap: true
    })
  ];

  const all = pages.flatMap((p) => p.checks);
  const geoFiles = { llmsTxt: true, robotsAiBots: true, sitemap: true };

  return {
    generatedAt: new Date().toISOString(),
    overall: pct(all),
    byPillar: { SEO: pct(all, "SEO"), AEO: pct(all, "AEO"), GEO: pct(all, "GEO") },
    pages,
    geoFiles
  };
}

/** Top fixes ranked by impact (lowest-scoring AEO/GEO gaps first). */
export function topFixes(audit: SiteAudit, limit = 5): string[] {
  const fixes: { msg: string; weight: number }[] = [];
  for (const p of audit.pages) {
    for (const c of p.checks) {
      if (!c.pass) {
        const weight = c.group === "AEO" ? 3 : c.group === "GEO" ? 2 : 1;
        fixes.push({ msg: `[${c.group}] ${p.pageType}: add ${c.label}`, weight });
      }
    }
  }
  return fixes.sort((a, b) => b.weight - a.weight).slice(0, limit).map((f) => f.msg);
}
