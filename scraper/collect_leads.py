"""
HanuOne lead collector (scraper v2).

Collects ONBOARDING LEADS (doctors + nurses + home-care) with phone + email,
de-duplicates, and writes them to:
  1. scraper/output/leads_<kind>_<ts>.json   (always, no keys needed)
  2. Supabase `onboarding_leads` table        (only if SUPABASE keys are set)

Ops then works these leads in the admin panel: call -> consent -> documents ->
verify against the official registry -> mark the verified tick -> go live.

Usage:
  python collect_leads.py --kind doctor --source all --locality all
  python collect_leads.py --kind nurse  --locality all
  python collect_leads.py --kind doctor --source practo --dry-run

Live web sources need:  pip install -r requirements.txt && playwright install chromium
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from utils import LUCKNOW_LOCALITIES, lead_dedupe_key, log  # noqa: E402

OUT_DIR = Path(__file__).resolve().parent / "output"
OUT_DIR.mkdir(exist_ok=True)

DOCTOR_SPECIALTIES = [
    "Cardiologist", "Orthopedic", "Pediatrician", "Gynecologist", "Dermatologist",
    "Neurologist", "Diabetologist", "ENT Specialist", "Ophthalmologist",
    "General Physician", "Urologist", "Psychiatrist", "Physiotherapist",
    "Oncologist", "Gastroenterologist",
]


def _doctor_to_lead(d: dict[str, Any], source: str) -> dict[str, Any]:
    name = d.get("name") or d.get("full_name")
    city = d.get("city") or "Lucknow"
    phone = d.get("phone")
    return {
        "kind": "doctor",
        "full_name": name,
        "specialization": d.get("specialization"),
        "qualifications": ", ".join(d.get("qualifications") or []) if isinstance(d.get("qualifications"), list) else d.get("qualifications"),
        "city": city,
        "locality": d.get("locality"),
        "pincode": d.get("pincode"),
        "clinic_name": d.get("clinic_name"),
        "address": d.get("clinic_address") or d.get("address"),
        "phone": phone,
        "email": d.get("email"),
        "website": d.get("source_url"),
        "experience_years": d.get("experience_years"),
        "rating": d.get("rating"),
        "source": source,
        "source_url": d.get("source_url"),
        "raw_json": json.dumps(d, ensure_ascii=False)[:2000],
        "dedupe_key": lead_dedupe_key(name, city, phone),
        "status": "new",
    }


def dedupe(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for r in rows:
        key = r.get("dedupe_key") or lead_dedupe_key(r.get("full_name"), r.get("city"), r.get("phone"))
        if not r.get("full_name") or key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


async def collect_doctors(source: str, locality: str | None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    sources = ["google_places", "practo", "justdial"] if source == "all" else [source]
    localities = LUCKNOW_LOCALITIES if (locality or "").lower() == "all" else [locality]
    for src in sources:
        mod = __import__(f"scrapers.{src}", fromlist=["run"])
        for loc in localities:
            for sp in DOCTOR_SPECIALTIES:
                try:
                    batch = await mod.run(sp, loc)
                    for d in batch:
                        rows.append(_doctor_to_lead(d, src))
                except Exception as e:  # noqa: BLE001
                    log.exception("%s failed (sp=%s loc=%s): %s", src, sp, loc, e)
    return rows


async def collect_nurses(locality: str | None) -> list[dict[str, Any]]:
    from scrapers import nurses
    localities = LUCKNOW_LOCALITIES if (locality or "").lower() == "all" else [locality]
    rows: list[dict[str, Any]] = []
    for loc in localities:
        try:
            rows.extend(await nurses.run(None, loc))
        except Exception as e:  # noqa: BLE001
            log.exception("nurses failed (loc=%s): %s", loc, e)
    return rows


def write_json(kind: str, rows: list[dict[str, Any]]) -> Path:
    ts = time.strftime("%Y%m%d-%H%M%S")
    path = OUT_DIR / f"leads_{kind}_{ts}.json"
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def upsert_supabase(rows: list[dict[str, Any]]) -> int:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        log.info("Supabase keys not set; skipping DB upsert (JSON still written).")
        return 0
    try:
        from supabase import create_client
    except Exception as e:  # noqa: BLE001
        log.warning("supabase client missing: %s", e)
        return 0
    client = create_client(url, key)
    n = 0
    for i in range(0, len(rows), 100):
        batch = rows[i : i + 100]
        try:
            client.table("onboarding_leads").upsert(batch, on_conflict="dedupe_key").execute()
            n += len(batch)
        except Exception as e:  # noqa: BLE001
            log.exception("Supabase upsert failed: %s", e)
    return n


async def main(args: argparse.Namespace) -> None:
    if args.kind == "doctor":
        rows = await collect_doctors(args.source, args.locality or "all")
    elif args.kind == "nurse":
        rows = await collect_nurses(args.locality or "all")
    else:
        raise SystemExit("kind must be doctor or nurse")

    rows = dedupe(rows)
    log.info("Collected %d unique %s leads", len(rows), args.kind)
    with_phone = sum(1 for r in rows if r.get("phone"))
    with_email = sum(1 for r in rows if r.get("email"))
    log.info("  with phone: %d | with email: %d", with_phone, with_email)

    path = write_json(args.kind, rows)
    log.info("Wrote %s", path)

    if not args.dry_run:
        n = upsert_supabase(rows)
        log.info("Upserted %d leads to Supabase onboarding_leads", n)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="HanuOne lead collector (scraper v2)")
    p.add_argument("--kind", choices=["doctor", "nurse"], default="doctor")
    p.add_argument("--source", choices=["google_places", "practo", "justdial", "all"], default="all")
    p.add_argument("--locality", default="all")
    p.add_argument("--dry-run", action="store_true", help="JSON only, no Supabase write")
    return p.parse_args()


if __name__ == "__main__":
    asyncio.run(main(parse_args()))
