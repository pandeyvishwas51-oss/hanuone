# Hanuone — Lucknow ke Trusted Doctors, Ek Jagah

Phase 1: a clean, SEO-optimized doctor discovery directory for Lucknow, India.
Built for families (especially those living outside Lucknow) to find trusted
doctors for their parents.

## Stack

- **Frontend**: Next.js 14 (App Router) · TypeScript · Tailwind CSS
- **Database**: Supabase (Postgres) with full-text search via `pg_trgm`
- **Maps**: Google Maps Embed API
- **Scraper**: Python (Playwright + Google Places API)

## Project structure

```
hanuone/
├── app/
│   ├── page.tsx                    Homepage (hero + search + featured)
│   ├── doctors/
│   │   ├── page.tsx                Search results with filters
│   │   └── [slug]/page.tsx         Doctor profile (JSON-LD, WhatsApp CTA)
│   ├── specializations/[slug]/page.tsx
│   ├── localities/[slug]/page.tsx
│   ├── [locality]/[specialty]/page.tsx   Static SEO combo pages
│   ├── join/page.tsx               Home Care Network registration
│   ├── sitemap.ts                  Auto-generated sitemap
│   ├── robots.ts                   robots.txt
│   ├── layout.tsx
│   ├── loading.tsx
│   └── not-found.tsx
├── components/
│   ├── DoctorCard.tsx
│   ├── DoctorList.tsx
│   ├── DoctorProfileHero.tsx
│   ├── SearchBar.tsx
│   ├── FilterSidebar.tsx
│   ├── SortSelect.tsx
│   ├── Pagination.tsx
│   ├── SpecialtyCard.tsx
│   ├── LocalityChip.tsx
│   ├── RatingStars.tsx
│   ├── ReviewCard.tsx
│   ├── WhatsAppButton.tsx
│   ├── WaitlistForm.tsx
│   ├── BreadcrumbNav.tsx
│   ├── SeoHead.tsx                 JSON-LD Physician schema
│   ├── SiteHeader.tsx
│   └── SiteFooter.tsx
├── lib/
│   ├── supabase.ts                 Anon + service-role clients
│   ├── queries.ts                  All DB queries
│   ├── types.ts
│   └── utils.ts                    Slugify, fee format, WhatsApp link helpers
├── scraper/
│   ├── main.py                     CLI: --source, --specialty, --locality
│   ├── utils.py
│   └── scrapers/
│       ├── google_places.py        Recommended (legal, free tier)
│       ├── practo.py               Dev only — respect ToS
│       └── justdial.py             Dev only — respect ToS
├── supabase/
│   ├── schema.sql
│   └── seed.sql                    Specializations, localities, 5 doctors
└── public/
    ├── favicon.svg
    └── og-image.svg
```

## Quick start

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Open the SQL editor and run `supabase/schema.sql`, then `supabase/seed.sql`
3. Copy the project URL and anon/service keys

### 2. Frontend

```bash
cp .env.local.example .env.local
# Fill in your Supabase + Google Maps keys

npm install
npm run dev
```

The site runs on http://localhost:3000.

### 3. Scraper (optional)

See `scraper/README.md`. The recommended source is Google Places API:

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
python main.py --source google_places --locality all
```

## SEO

- Dynamic `<title>` and `<meta description>` on every page
- Open Graph + Twitter cards
- JSON-LD `Physician` schema on doctor profiles
- Auto-generated `sitemap.xml` (static + doctor + specialty + locality + combo pages)
- `robots.txt` with `/admin` and `/api` disallowed
- Canonical URLs everywhere
- Static `generateStaticParams` for high-converting `/[locality]/[specialty]` combos
- Breadcrumb navigation on all detail pages

## Out of scope (future)

Auth/login, booking, payments, admin panel, doctor onboarding portal, home-care
operations. The form at `/join` registers doctors, nurses and caregivers for the
**Hanuone Home Care Network**.
```


## Live Practo dataset (624 Lucknow doctors)

The repository ships with a fully scraped Lucknow dataset built from Practo's
public marketplace API. When `NEXT_PUBLIC_SUPABASE_URL` is unset the site
serves directly from `data/practo_doctors.json`, so you can launch immediately
without Supabase credentials.

### Re-scrape

```bash
# All 22 specialties, every page
python3 scripts/scrape_practo_lucknow.py

# A single specialty
python3 scripts/scrape_practo_lucknow.py --specialty Cardiologist

# Push directly to Supabase (requires SERVICE_ROLE_KEY)
python3 scripts/scrape_practo_lucknow.py --upsert
```

The runner writes:
- `data/practo_doctors.json` — full dataset
- `supabase/seed_practo.sql` — `INSERT … ON CONFLICT (slug) DO UPDATE` upserts

After re-scraping, regenerate the slim client lookup files:

```bash
python3 scripts/generate_client_data.py
```

This produces `data/client/pincodes.json` and `data/client/localities.json`,
which power the locality picker and pincode autocomplete on the client.

### Importing a captured network log

If you only have a `network-log_*.json` from DevTools, you can convert it to a
Supabase seed without running the live scraper:

```bash
python3 scripts/import_practo_log.py path/to/network-log.json --emit-sql > supabase/seed_practo.sql
```

## Locality + Pincode picker

`components/LocationSelector.tsx` is a client component used in:

- the homepage hero search bar
- the sticky site header (`HeaderLocationChip`)
- the filter sidebar on `/doctors`

Features:
- Search 99 Lucknow localities by name
- Type a 6-digit pincode → auto-resolves to its locality
- "Use my current location" → finds the nearest indexed locality via the
  Haversine distance against scraped clinic coordinates
- Last selection stored in `localStorage` under `hanuone:locality`

Pincodes are also accepted in the `q` parameter of `/doctors` (`/doctors?q=226010`)
and as a dedicated `pincode` filter (`/doctors?pincode=226010`).
