# Hanuone scraper

Collects doctor data for Lucknow from multiple sources and upserts into Supabase.

## Setup

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

Create a `.env` in the project root or `scraper/.env` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_PLACES_API_KEY=...   # optional but recommended
```

## Run

```bash
# Google Places (recommended, legal, free tier)
python main.py --source google_places --locality all

# A single locality + specialty
python main.py --source google_places --specialty cardiologist --locality gomtinagar

# Practo (development/testing only — respect ToS in production)
python main.py --source practo --specialty cardiologist --locality gomtinagar

# JustDial
python main.py --source justdial --locality all

# Everything
python main.py --source all --locality all
```

After scraping, doctor counts on `specializations` and `localities` tables are auto-refreshed.

## Files

- `main.py` — CLI entrypoint, dedup, upsert, count refresh
- `scrapers/google_places.py` — Google Places API (recommended)
- `scrapers/practo.py` — Practo HTML scraping (Playwright)
- `scrapers/justdial.py` — JustDial HTML scraping (Playwright)
- `scraper_errors.log` — failed/skipped rows

## Legal note

Practo and JustDial Terms of Service restrict automated scraping. Use them only for
development/seed data. For production rely on:

1. Google Places API
2. National Medical Commission public registry
3. Doctor self-registration via the website
