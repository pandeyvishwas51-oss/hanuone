# HANUone — SEO · AEO · GEO (Search & AI-Search Visibility)

A first-class feature, not an afterthought. Hanuone's growth model is zero-CAC discovery,
so we optimize for **all three** discovery surfaces:

| Pillar | Meaning | Goal |
|--------|---------|------|
| **SEO** | Search Engine Optimization (Google) | Rank for "best [specialty] in [locality]" across 3,900+ programmatic pages |
| **AEO** | Answer Engine Optimization | Be the quoted answer in ChatGPT, Perplexity, Gemini, Bing Copilot, Google AI Overviews |
| **GEO** | Generative Engine Optimization | Be discoverable/citable by AI crawlers; expose a machine-readable site map |

## What's implemented

### SEO (built earlier, extended)
- Programmatic pages: doctor profiles, specialty, locality, locality×specialty, sitemap of all.
- Per-page `<title>`, meta description, canonical, OpenGraph + Twitter cards.
- JSON-LD: `Organization`, `WebSite` (+ SearchAction), `Physician`, `MedicalSpecialty`, `Place`,
  `BreadcrumbList`, `ItemList`, `AggregateRating` — `lib/seo.ts`, `components/SeoHead.tsx`.

### AEO (new)
- **Citable answer blocks** — `components/AnswerBlock.tsx`: a 40–60 word, fact-dense, brand-attributed
  answer high on the page (the format answer engines lift verbatim). Class `.answer-block`.
- **Answer generators** — `doctorAnswer`, `specialtyAnswer`, `localityAnswer` in `lib/seo.ts`.
- **`MedicalWebPage` + `lastReviewed` + `reviewedBy`** — E-E-A-T trust signals AI engines weight.
- **`Speakable` schema** — marks the answer block + H1 as quotable.
- **FAQ + `FAQPage`** schema across specialty/locality pages (`components/FaqSection.tsx`).

### GEO (new)
- **`/llms.txt`** — `app/llms.txt/route.ts`: a dynamic, daily-regenerated AI "menu" of the site
  (key facts, core pages, specialties, localities, featured doctors). Follows llmstxt.org.
- **AI-bot-friendly `robots.txt`** — `app/robots.ts`: explicitly allows GPTBot, OAI-SearchBot,
  ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, etc., while blocking
  private surfaces (`/admin /api /account /consult /pro /my-bookings`).

### Internal tracker (the autopilot scorecard)
- **`/admin/seo`** — `app/admin/seo/page.tsx` + `lib/seo-audit.ts`: scores every page TYPE on
  SEO/AEO/GEO checks (out of 100 per pillar), shows GEO-file status, and lists **top fixes by impact**.
  Admin-only (middleware + `requireAdmin`).

## Pluggable later (needs the user's API keys)
- **Live rankings + impressions + CTR** → Google Search Console MCP.
- **AI-citation checks** (per engine, yes/no + reason) → AI-visibility checkers / DataForSEO MCP.
- **Daily logger + week-over-week trend charts** → cron task writing to a `seo_snapshots` table,
  rendered with Recharts on `/admin/seo`.

These slot into `lib/seo-audit.ts` (replace the static signal snapshot with live fetches) and the
dashboard's chart area — no architectural change required.

## Roll-out checklist for new page types
1. Add `<title>`, meta, canonical, OG.
2. Add primary JSON-LD + `BreadcrumbList`.
3. Add an `<AnswerBlock>` with a `*Answer()` generator.
4. Add `MedicalWebPage` + `Speakable` via `<JsonLd>`.
5. Add FAQ + `FAQPage`.
6. Ensure it's in `sitemap.ts` and referenced from `/llms.txt`.
7. Flip the signal flags in `lib/seo-audit.ts` so the scorecard reflects reality.
