"""
JustDial scraper (Playwright-based, best-effort).

NOTE: JustDial's Terms of Service restrict automated scraping. Dev use only.
"""
from __future__ import annotations

from typing import Any
from urllib.parse import quote

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

from utils import (
    LUCKNOW_LOCALITIES,
    detect_locality,
    log,
    normalize_phone,
    polite_sleep,
    random_user_agent,
    slugify,
)

BASE = "https://www.justdial.com"


async def run(specialty: str | None, locality: str | None) -> list[dict[str, Any]]:
    spec = specialty or "Doctors"
    loc_path = locality if locality and locality.lower() != "all" else "Lucknow"
    url = f"{BASE}/Lucknow/{quote(spec)}/nct-10326354"
    log.info("JustDial: %s", url)

    rows: list[dict[str, Any]] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=random_user_agent())
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            # Click "Show more" up to 10 times
            for _ in range(10):
                try:
                    btn = await page.query_selector("button[data-track='loadmore'], .next.shade1")
                    if not btn:
                        break
                    await btn.click()
                    await polite_sleep(2, 4)
                except Exception:  # noqa: BLE001
                    break
            for _ in range(15):
                await page.mouse.wheel(0, 1800)
                await polite_sleep(0.4, 0.9)
            html = await page.content()
        except Exception as e:  # noqa: BLE001
            log.exception("JustDial load failed: %s", e)
            html = ""
        finally:
            await browser.close()

    if not html:
        return rows

    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(".resultbox") or soup.select("li.cntanr")
    for c in cards:
        name_el = c.select_one(".resultbox_title_anchor, .lng_cont_name")
        addr_el = c.select_one(".resultbox_address, .cont_fl_addr")
        phone_el = c.select_one(".callcontent, .contact-info, .greenfill_animation")
        if not name_el:
            continue
        name = name_el.get_text(strip=True)
        full_address = addr_el.get_text(" ", strip=True) if addr_el else loc_path
        loc_match = detect_locality(full_address, LUCKNOW_LOCALITIES) or (
            locality.title() if locality and locality.lower() != "all" else "Lucknow"
        )
        phone = normalize_phone(phone_el.get_text(strip=True) if phone_el else None)
        rows.append({
            "name": name if name.lower().startswith("dr") else f"Dr. {name}",
            "slug": slugify(name, spec, loc_match),
            "specialization": spec.title() if spec.lower() != "doctors" else "General Physician",
            "clinic_address": full_address,
            "locality": loc_match,
            "city": "Lucknow",
            "phone": phone,
            "whatsapp": phone,
            "verified": False,
            "is_active": True,
            "source": "justdial",
        })
    log.info("JustDial: %d cards parsed", len(rows))
    return rows
