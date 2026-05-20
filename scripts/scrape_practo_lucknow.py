"""Scrape every Lucknow doctor from Practo across all specialties.

Reuses the Practo `marketplace-api/dweb/search/provider/v2` endpoint that we
captured in the network log. The endpoint is publicly accessible (read-only
JSON); we paginate per specialty until the response yields no new entities or
hits `listing_data.doctors_found`.

Outputs:
  data/practo_doctors.json  — full deduped dataset
  supabase/seed_practo.sql  — SQL upserts for Supabase

Usage:
  python scripts/scrape_practo_lucknow.py
  python scripts/scrape_practo_lucknow.py --specialty cardiologist
  python scripts/scrape_practo_lucknow.py --upsert
"""
from __future__ import annotations

import argparse
import json
import os
import random
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
DATA_OUT = ROOT / "data" / "practo_doctors.json"
SQL_OUT = ROOT / "supabase" / "seed_practo.sql"

API = "https://www.practo.com/marketplace-api/dweb/search/provider/v2"
PER_PAGE = 10
MAX_PAGES = 200
RETRIES = 3

# These match Practo's own subspecialty terms (categories=subspeciality)
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
    "Homoeopath",
]

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


def build_url(specialty: str, page: int) -> str:
    q = json.dumps([{"word": specialty, "autocompleted": True, "category": "subspeciality"}])
    params = {
        "city": "Lucknow",
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
        "with_ad": "true",
    }
    return f"{API}?{urllib.parse.urlencode(params)}"


def fetch_json(url: str) -> dict[str, Any] | None:
    headers = {
        "User-Agent": UA,
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.practo.com/search/doctors?city=Lucknow",
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


def scrape_specialty(specialty: str, max_pages: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen_doctor_ids: set[int] = set()
    total: int | None = None
    for page in range(1, max_pages + 1):
        url = build_url(specialty, page)
        data = fetch_json(url)
        if data is None:
            break
        if total is None:
            total = (data.get("listing_data") or {}).get("doctors_found")
            print(f"  {specialty}: total reported = {total}", file=sys.stderr)
        entities = ((data.get("doctors") or {}).get("entities") or {})
        if not entities:
            print(f"  {specialty}: page {page} empty — stopping", file=sys.stderr)
            break
        new_on_page = 0
        for ent in entities.values():
            doc_id = ent.get("doctor_id") or ent.get("id")
            if doc_id and doc_id in seen_doctor_ids:
                continue
            row = to_doctor_row(ent)
            if not row:
                continue
            seen_doctor_ids.add(doc_id) if doc_id else None
            rows.append(row)
            new_on_page += 1
        print(f"  {specialty}: page {page} → {new_on_page} new (cumulative {len(rows)})", file=sys.stderr)
        if new_on_page == 0:
            break
        if total and len(rows) >= total:
            break
        time.sleep(random.uniform(1.2, 2.4))
    return rows


def write_outputs(rows: list[dict[str, Any]]) -> None:
    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)
    SQL_OUT.parent.mkdir(parents=True, exist_ok=True)
    DATA_OUT.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    SQL_OUT.write_text(emit_sql(rows))
    print(f"Wrote {DATA_OUT.relative_to(ROOT)} ({len(rows)} rows)", file=sys.stderr)
    print(f"Wrote {SQL_OUT.relative_to(ROOT)}", file=sys.stderr)


def upsert_supabase(rows: list[dict[str, Any]]) -> int:
    try:
        from supabase import create_client  # type: ignore
    except ImportError:
        sys.exit("pip install supabase python-dotenv")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    client = create_client(url, key)
    n = 0
    for i in range(0, len(rows), 100):
        client.table("doctors").upsert(rows[i : i + 100], on_conflict="slug").execute()
        n += len(rows[i : i + 100])
    try:
        client.rpc("refresh_doctor_counts").execute()
    except Exception:
        pass
    return n


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--specialty", help="Restrict to a single specialty (e.g. 'Cardiologist')")
    p.add_argument("--max-pages", type=int, default=MAX_PAGES)
    p.add_argument("--upsert", action="store_true")
    args = p.parse_args()

    targets = [args.specialty] if args.specialty else SPECIALTIES

    all_rows: list[dict[str, Any]] = []
    for s in targets:
        print(f"\n=== {s} ===", file=sys.stderr)
        rows = scrape_specialty(s, args.max_pages)
        all_rows.extend(rows)
        time.sleep(random.uniform(2.0, 3.5))

    deduped = dedup_with_unique_slugs(all_rows)
    print(f"\nTotal unique doctors: {len(deduped)}", file=sys.stderr)

    write_outputs(deduped)

    if args.upsert:
        n = upsert_supabase(deduped)
        print(f"Upserted {n} rows into Supabase", file=sys.stderr)


if __name__ == "__main__":
    main()
