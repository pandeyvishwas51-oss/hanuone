"""Shared utilities for Hanuone scrapers."""
from __future__ import annotations

import asyncio
import logging
import os
import random
import re
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")
load_dotenv(Path(__file__).resolve().parent / ".env")

LOG_PATH = Path(__file__).resolve().parent / "scraper_errors.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("hanuone.scraper")

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
]


def random_user_agent() -> str:
    return random.choice(USER_AGENTS)


async def polite_sleep(min_s: float = 2.5, max_s: float = 5.0) -> None:
    await asyncio.sleep(random.uniform(min_s, max_s))


def slugify(*parts: str) -> str:
    s = " ".join(p for p in parts if p).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) < 10:
        return None
    if len(digits) == 10:
        return f"+91{digits}"
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    return f"+{digits}"


def parse_fee_range(text: str | None) -> tuple[int | None, int | None]:
    if not text:
        return None, None
    matches = re.findall(r"(\d{2,5})", text.replace(",", ""))
    if not matches:
        return None, None
    nums = [int(m) for m in matches if 50 <= int(m) <= 50000]
    if not nums:
        return None, None
    return min(nums), max(nums)


def parse_experience(text: str | None) -> int | None:
    if not text:
        return None
    m = re.search(r"(\d{1,2})\s*\+?\s*(?:years|year|yrs|yr)", text, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


def detect_locality(address: str | None, known_localities: Iterable[str]) -> str | None:
    if not address:
        return None
    lower = address.lower()
    for loc in known_localities:
        if loc.lower() in lower:
            return loc
    return None


LUCKNOW_LOCALITIES = [
    "Gomtinagar",
    "Civil Lines",
    "Hazratganj",
    "Aliganj",
    "Indira Nagar",
    "Alambagh",
    "Mahanagar",
    "Rajajipuram",
    "Vikas Nagar",
    "Jankipuram",
    "Charbagh",
    "Aminabad",
    "Kapoorthala",
    "Butler Colony",
    "Nishatganj",
]
