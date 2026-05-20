"""
Practo scraper (Playwright-based).

NOTE: Practo's Terms of Service restrict automated scraping. Use only for
development seed data. For production, use Google Places + NMC + self-registration.
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
    parse_experience,
    parse_fee_range,
    polite_sleep,
    random_user_agent,
    slugify,
)

BASE = "https://www.practo.com"


def _build_url(specialty: str | None, locality: str | None, page: int) -> str:
    spec = specialty or "doctor"
    city = "Lucknow"
    locality_q = f"{locality}, " if locality and locality.lower() != "all" else ""
    q = quote(f"{spec} in {locality_q}{city}")
    return f"{BASE}/search/doctors?results_type=doctor&q={q}&city={city}&page={page}"


async def run(specialty: str | None, locality: str | None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen_keys: set[str] = set()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=random_user_agent())
        page = await context.new_page()

        page_num = 1
        while page_num <= 20:
            url = _build_url(specialty, locality if locality and locality.lower() != "all" else None, page_num)
            log.info("Practo: %s", url)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
                # Lazy-load all cards
                for _ in range(8):
                    await page.mouse.wheel(0, 1500)
                    await polite_sleep(0.5, 1.0)
            except Exception as e:  # noqa: BLE001
                log.exception("Practo page load failed: %s", e)
                break

            html = await page.content()
            cards = _parse_cards(html, specialty, locality)
            if not cards:
                log.info("Practo: no more cards on page %d", page_num)
                break

            new_count = 0
            for c in cards:
                k = (c["name"].lower(), c["clinic_address"].lower())
                if k in seen_keys:
                    continue
                seen_keys.add(k)
                rows.append(c)
                new_count += 1
            log.info("Practo: page %d → %d new", page_num, new_count)

            if new_count == 0:
                break
            page_num += 1
            await polite_sleep(2.5, 5.0)

        await browser.close()
    return rows


def _parse_cards(html: str, specialty: str | None, hint_locality: str | None) -> list[dict[str, Any]]:
    """Parse Practo doctor cards. Selectors are best-effort and may need updates."""
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict[str, Any]] = []
    cards = soup.select('div[data-qa-id="doctor_card"]') or soup.select(".listing-doctor-card")
    for c in cards:
        name_el = c.select_one('h2[data-qa-id="doctor_name"], .doctor-name')
        spec_el = c.select_one('[data-qa-id="doctor-specializations"], .doctor-specialty')
        exp_el = c.select_one('[data-qa-id="doctor_experience"]')
        clinic_el = c.select_one('[data-qa-id="doctor_clinic_name"]')
        addr_el = c.select_one('[data-qa-id="practice_locality"], [data-qa-id="practice_city"]')
        fee_el = c.select_one('[data-qa-id="consultation_fee"]')
        rating_el = c.select_one('[data-qa-id="doctor_recommendation"]')
        reviews_el = c.select_one('[data-qa-id="total_feedback"]')
        img_el = c.select_one("img")
        link_el = c.select_one("a[href*='/doctor/']")

        if not name_el:
            continue
        name = name_el.get_text(" ", strip=True)
        specialization = (spec_el.get_text(" ", strip=True) if spec_el else (specialty or "General Physician")).split(",")[0].strip()
        experience = parse_experience(exp_el.get_text(strip=True) if exp_el else None)
        clinic_name = clinic_el.get_text(strip=True) if clinic_el else None
        addr_text = addr_el.get_text(", ", strip=True) if addr_el else ""
        full_address = f"{clinic_name + ', ' if clinic_name else ''}{addr_text}".strip(", ")
        fee_min, fee_max = parse_fee_range(fee_el.get_text(strip=True) if fee_el else None)
        rating_text = rating_el.get_text(strip=True) if rating_el else ""
        rating = None
        if rating_text and rating_text.endswith("%"):
            try:
                pct = float(rating_text.rstrip("%"))
                rating = round(pct / 20.0, 1)  # convert 0-100 % to 0-5
            except ValueError:
                rating = None
        review_count = 0
        if reviews_el:
            digits = "".join(ch for ch in reviews_el.get_text() if ch.isdigit())
            review_count = int(digits) if digits else 0
        photo = img_el["src"] if img_el and img_el.get("src", "").startswith("http") else None
        source_url = BASE + link_el["href"] if link_el and link_el.get("href", "").startswith("/") else None

        locality = detect_locality(full_address, LUCKNOW_LOCALITIES) or (hint_locality.title() if hint_locality and hint_locality.lower() != "all" else "Lucknow")

        out.append({
            "name": name,
            "slug": slugify(name, specialization, locality),
            "specialization": specialization,
            "experience_years": experience,
            "clinic_name": clinic_name,
            "clinic_address": full_address or locality,
            "locality": locality,
            "city": "Lucknow",
            "phone": None,  # Practo hides numbers behind captcha
            "whatsapp": None,
            "consultation_fee_min": fee_min,
            "consultation_fee_max": fee_max,
            "rating": rating,
            "review_count": review_count,
            "profile_image_url": photo,
            "verified": False,
            "is_active": True,
            "source": "practo",
            "source_url": source_url,
        })
    return out
