"""
Hanuone scraper entrypoint.

Usage:
  python main.py --source google_places --specialty cardiologist --locality gomtinagar
  python main.py --source all --locality all
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path
from typing import Any, Iterable

# Allow `from scrapers.x import run` and `from utils import ...`
sys.path.insert(0, str(Path(__file__).resolve().parent))

from supabase import create_client  # type: ignore
from utils import LUCKNOW_LOCALITIES, log

SPECIALTIES = [
    "Cardiologist",
    "Orthopedic",
    "Pediatrician",
    "Gynecologist",
    "Dermatologist",
    "Neurologist",
    "Diabetologist",
    "ENT Specialist",
    "Ophthalmologist",
    "General Physician",
    "Urologist",
    "Psychiatrist",
    "Physiotherapist",
    "Oncologist",
    "Gastroenterologist",
]


def get_supabase():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
    return create_client(url, key)


def dedup(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    unique: list[dict[str, Any]] = []
    for r in rows:
        key = (r.get("name", "").lower().strip(), r.get("clinic_address", "").lower().strip())
        if key in seen or not r.get("name"):
            continue
        seen.add(key)
        unique.append(r)
    return unique


def upsert_doctors(rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    client = get_supabase()
    inserted = 0
    # Upsert in chunks to avoid huge requests
    for i in range(0, len(rows), 100):
        batch = rows[i : i + 100]
        try:
            client.table("doctors").upsert(batch, on_conflict="slug").execute()
            inserted += len(batch)
        except Exception as e:  # noqa: BLE001
            log.exception("Upsert batch failed: %s", e)
    return inserted


def refresh_counts() -> None:
    client = get_supabase()
    try:
        client.rpc("refresh_doctor_counts").execute()
        log.info("Refreshed doctor_count on specializations and localities")
    except Exception as e:  # noqa: BLE001
        log.warning("refresh_doctor_counts RPC failed (run schema.sql first): %s", e)


async def run_source(
    source: str, specialty: str | None, locality: str | None
) -> list[dict[str, Any]]:
    if source == "google_places":
        from scrapers import google_places
        return await google_places.run(specialty, locality)
    if source == "practo":
        from scrapers import practo
        return await practo.run(specialty, locality)
    if source == "justdial":
        from scrapers import justdial
        return await justdial.run(specialty, locality)
    raise ValueError(f"Unknown source: {source}")


async def run(args: argparse.Namespace) -> None:
    sources: Iterable[str]
    if args.source == "all":
        sources = ["google_places", "practo", "justdial"]
    else:
        sources = [args.source]

    specialties = SPECIALTIES if args.specialty == "all" else [args.specialty] if args.specialty else [None]
    localities = LUCKNOW_LOCALITIES if args.locality == "all" else [args.locality] if args.locality else [None]

    rows: list[dict[str, Any]] = []
    for src in sources:
        for sp in specialties:
            for loc in localities:
                log.info("Running %s | specialty=%s | locality=%s", src, sp, loc)
                try:
                    batch = await run_source(src, sp, loc)
                    rows.extend(batch)
                except Exception as e:  # noqa: BLE001
                    log.exception("Source %s failed: %s", src, e)

    rows = dedup(rows)
    log.info("Total unique rows ready to upsert: %d", len(rows))

    if args.dry_run:
        for r in rows[:10]:
            log.info("DRY: %s, %s", r.get("name"), r.get("clinic_address"))
        return

    inserted = upsert_doctors(rows)
    log.info("Upserted %d rows", inserted)
    refresh_counts()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Hanuone doctor scraper")
    p.add_argument(
        "--source",
        choices=["google_places", "practo", "justdial", "all"],
        default="google_places",
    )
    p.add_argument("--specialty", default=None, help="Specialty name or 'all'")
    p.add_argument("--locality", default=None, help="Lucknow locality or 'all'")
    p.add_argument("--dry-run", action="store_true", help="Don't write to Supabase")
    return p.parse_args()


if __name__ == "__main__":
    asyncio.run(run(parse_args()))
