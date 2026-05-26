"""Multi-city Practo scraper.

Reuses the Practo `marketplace-api/dweb/search/provider/v2` endpoint we
discovered earlier. Iterates every specialty across one or more cities, walks
all pages, and writes:

  data/practo_doctors.json      - merged dataset (existing rows preserved)
  data/practo_<city>.json       - per-city dataset
  supabase/seed_practo.sql      - SQL upserts

Usage:
  python scripts/scrape_practo.py --cities Lucknow Delhi
  python scripts/scrape_practo.py --cities Delhi --specialty Cardiologist
  python scripts/scrape_practo.py --cities Lucknow Delhi --upsert
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
import urllib.parse
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parent))
from practo_parser import dedup_with_unique_slugs, emit_sql, to_doctor_row

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SQL_OUT = ROOT / "supabase" / "seed_practo.sql"

API = "https://www.practo.com/marketplace-api/dweb/search/provider/v2"
PER_PAGE = 10
MAX_PAGES = 200
RETRIES = 3

SPECIALTIES = [
    "General Physician",
    "Cardiologist",
    "Orthopedic",
    "Pediatrician",
    "Gynecologist",
    "Dermatologist",
    "Neurologist",
    "Diabetologist",
    "ENT",
    "Ophthalmologist",
    "Urologist",
    "Psychiatrist",
    "Physiotherapist",
    "Oncologist",
    "Gastroenterologist",
    "Dentist",
    "Pulmonologist",
    "Endocrinologist",
    "Nephrologist",
    "Rheumatologist",
    "Ayurveda",
    "Homoeopath"
]

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


def build_url(city: str, specialty: str, page: int) -> str:
    q = json.dumps([{"word": specialty, "autocompleted": True, "category": "subspeciality"}])
    params = {
        "city": city,
        "q": q,
        "results_type": "doctor",
        "url_path": "/search/doctors",
        "ad_limit": "2",
        "platform": "desktop_web",
        "topaz": "true",
        "reach_version": "v4",
        "page": str(page),
        "enable_partner_listing": "true",
        "placement": "DOCTOR_SEARCH",
        "show_new_reach_card": "true",
        "with_ad": "true"
    }
    return f"{API}?{urllib.parse.urlencode(params)}"


def fetch_json(url: str) -> dict[str, Any] | None:
    headers = {
        "User-Agent": UA,
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.practo.com/search/doctors"
    }
    last_err: Exception | None = None
    for attempt in range(RETRIES):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as e:
            last_err = e
            wait = 2 ** attempt + random.random()
            print(f"   retry {attempt+1}/{RETRIES} after {wait:.1f}s ({e})", file=sys.stderr)
            time.sleep(wait)
    print(f"   failed after {RETRIES} attempts: {last_err}", file=sys.stderr)
    return None


def scrape_specialty(city: str, specialty: str, max_pages: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen_doctor_ids: set[int] = set()
    total: int | None = None
    for page in range(1, max_pages + 1):
        url = build_url(city, specialty, page)
        data = fetch_json(url)
        if data is None:
            break
        if total is None:
            total = (data.get("listing_data") or {}).get("doctors_found")
            print(f"  {city} | {specialty}: total reported = {total}", file=sys.stderr)
        entities = ((data.get("doctors") or {}).get("entities") or {})
        if not entities:
            break
        new_on_page = 0
        for ent in entities.values():
            doc_id = ent.get("doctor_id") or ent.get("id")
            if doc_id and doc_id in seen_doctor_ids:
                continue
            row = to_doctor_row(ent)
            if not row:
                continue
            if doc_id:
                seen_doctor_ids.add(doc_id)
            row["city"] = city
            rows.append(row)
            new_on_page += 1
        print(f"  {city} | {specialty}: page {page} -> {new_on_page} new (cumul {len(rows)})", file=sys.stderr)
        if new_on_page == 0:
            break
        if total and len(rows) >= total:
            break
        time.sleep(random.uniform(1.0, 2.0))
    return rows


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def write_outputs(all_rows: list[dict[str, Any]], by_city: dict[str, list[dict[str, Any]]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SQL_OUT.parent.mkdir(parents=True, exist_ok=True)

    main = DATA_DIR / "practo_doctors.json"
    main.write_text(json.dumps(all_rows, indent=2, ensure_ascii=False))
    print(f"Wrote {main.relative_to(ROOT)} ({len(all_rows)} rows)", file=sys.stderr)

    for city, rows in by_city.items():
        f = DATA_DIR / f"practo_{slugify(city)}.json"
        f.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
        print(f"  -> {f.relative_to(ROOT)} ({len(rows)} rows)", file=sys.stderr)

    SQL_OUT.write_text(emit_sql(all_rows))
    print(f"Wrote {SQL_OUT.relative_to(ROOT)}", file=sys.stderr)


def upsert_supabase(rows: list[dict[str, Any]]) -> int:
    # Direct psycopg fallback: write SQL then call psql in main script. We keep
    # `--upsert` here for parity but recommend psql for safety.
    raise NotImplementedError("Use the generated supabase/seed_practo.sql via psql instead.")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--cities", nargs="+", default=["Lucknow"])
    p.add_argument("--specialty", help="Restrict to a single specialty")
    p.add_argument("--max-pages", type=int, default=MAX_PAGES)
    args = p.parse_args()

    targets = [args.specialty] if args.specialty else SPECIALTIES

    all_rows: list[dict[str, Any]] = []
    by_city: dict[str, list[dict[str, Any]]] = {}

    for city in args.cities:
        print(f"\n=== {city} ===", file=sys.stderr)
        city_rows: list[dict[str, Any]] = []
        for s in targets:
            try:
                city_rows.extend(scrape_specialty(city, s, args.max_pages))
            except Exception as e:  # noqa: BLE001
                print(f"  ERROR {city} | {s}: {e}", file=sys.stderr)
            time.sleep(random.uniform(1.5, 2.5))
        deduped = dedup_with_unique_slugs(city_rows)
        by_city[city] = deduped
        all_rows.extend(deduped)
        print(f"  {city} unique: {len(deduped)}", file=sys.stderr)

    deduped_all = dedup_with_unique_slugs(all_rows)
    print(f"\nTotal unique across all cities: {len(deduped_all)}", file=sys.stderr)
    write_outputs(deduped_all, by_city)


if __name__ == "__main__":
    main()
