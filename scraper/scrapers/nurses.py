"""
Nurse / home-care staff lead scraper for Lucknow.

Sources:
  1. Justdial "nursing services / home nursing" listings (phone + name + area).
  2. U.P. Nurses & Midwives Council registration search (name + reg number),
     used to CROSS-CHECK credentials, not to publish.

IMPORTANT (legal + product): output here is ONBOARDING LEADS only. Ops must
call each contact, take consent, collect documents and verify before any
profile goes live. Nothing scraped is published to patients directly.

Live runs need: pip install -r requirements.txt && playwright install chromium
"""
from __future__ import annotations

from typing import Any
from urllib.parse import quote

from utils import (
    detect_locality,
    extract_email,
    extract_phones,
    lead_dedupe_key,
    LUCKNOW_LOCALITIES,
    log,
    polite_sleep,
    random_user_agent,
)

JUSTDIAL = "https://www.justdial.com"

NURSE_QUERIES = [
    "Home Nursing Services",
    "Nursing Bureau",
    "Patient Care Services at Home",
    "Elderly Care Services",
    "Physiotherapist at Home",
]


async def _justdial_nurses(query: str, locality: str | None) -> list[dict[str, Any]]:
    """Scrape Justdial nursing listings. Returns lead dicts with phone/email."""
    rows: list[dict[str, Any]] = []
    try:
        from playwright.async_api import async_playwright
        from bs4 import BeautifulSoup
    except Exception as e:  # noqa: BLE001
        log.warning("Playwright/bs4 not installed, skipping live nurse scrape: %s", e)
        return rows

    city = "Lucknow"
    loc = f"{locality}-" if locality and locality.lower() != "all" else ""
    url = f"{JUSTDIAL}/{city}/{quote(query)}/{loc}"

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(user_agent=random_user_agent())
        page = await ctx.new_page()
        log.info("Justdial nurses: %s", url)
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            for _ in range(8):
                await page.mouse.wheel(0, 1600)
                await polite_sleep(0.6, 1.2)
            html = await page.content()
        except Exception as e:  # noqa: BLE001
            log.exception("Justdial load failed: %s", e)
            await browser.close()
            return rows

        soup = BeautifulSoup(html, "html.parser")
        # Justdial markup changes often; we grab broad listing blocks and parse text.
        cards = soup.select("[class*='resultbox'], [class*='store-details'], li[class*='cntanr']")
        for c in cards:
            text = c.get_text(" ", strip=True)
            name_el = c.select_one("[class*='lng_cont_name'], [class*='store-name'], h2, h3")
            name = name_el.get_text(strip=True) if name_el else None
            if not name:
                continue
            phones = extract_phones(text)
            email = extract_email(text)
            locality_detected = detect_locality(text, LUCKNOW_LOCALITIES) or locality
            rows.append(
                {
                    "kind": "nurse",
                    "full_name": name,
                    "city": city,
                    "locality": locality_detected,
                    "address": None,
                    "phone": phones[0] if phones else None,
                    "alt_phone": phones[1] if len(phones) > 1 else None,
                    "email": email,
                    "source": "justdial",
                    "source_url": url,
                    "raw_json": text[:1000],
                    "dedupe_key": lead_dedupe_key(name, city, phones[0] if phones else None),
                }
            )
        await browser.close()
    return rows


async def run(specialty: str | None, locality: str | None) -> list[dict[str, Any]]:
    """specialty is ignored for nurses; we sweep nursing-related queries."""
    out: list[dict[str, Any]] = []
    for q in NURSE_QUERIES:
        try:
            out.extend(await _justdial_nurses(q, locality))
            await polite_sleep()
        except Exception as e:  # noqa: BLE001
            log.exception("Nurse query failed %s: %s", q, e)
    return out
