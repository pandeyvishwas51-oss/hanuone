"""
Google Places scraper for Hanuone.

Uses the Places API (Text Search + Place Details) — 100% legal, returns
name, address, phone, rating, review count, photos.

Free tier: 10,000 requests/month.

Docs: https://developers.google.com/maps/documentation/places/web-service/overview
"""
from __future__ import annotations

import os
from typing import Any, Iterable

import httpx

from utils import (
    LUCKNOW_LOCALITIES,
    detect_locality,
    log,
    normalize_phone,
    parse_experience,
    polite_sleep,
    slugify,
)

PLACES_TEXT_SEARCH = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACE_DETAILS = "https://maps.googleapis.com/maps/api/place/details/json"


async def _fetch_json(client: httpx.AsyncClient, url: str, params: dict[str, Any]) -> dict[str, Any]:
    r = await client.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


async def search_doctors(
    specialty: str | None,
    locality: str | None,
    api_key: str,
    max_pages: int = 3,
) -> list[dict[str, Any]]:
    """Search Google Places for doctors. Returns Hanuone doctor dicts."""
    query_parts = []
    if specialty:
        query_parts.append(specialty)
    else:
        query_parts.append("doctor")
    query_parts.append("in")
    query_parts.append(locality or "Lucknow")
    if locality and locality.lower() != "lucknow":
        query_parts.append("Lucknow")
    query = " ".join(query_parts)

    log.info("Google Places query: %s", query)
    results: list[dict[str, Any]] = []
    next_token: str | None = None

    async with httpx.AsyncClient() as client:
        for page in range(max_pages):
            params: dict[str, Any] = {"key": api_key}
            if next_token:
                params["pagetoken"] = next_token
                # Google requires a short delay before pagetoken becomes valid
                await polite_sleep(2, 3)
            else:
                params["query"] = query

            data = await _fetch_json(client, PLACES_TEXT_SEARCH, params)
            status = data.get("status")
            if status not in ("OK", "ZERO_RESULTS"):
                log.warning("Google Places returned status=%s, error=%s", status, data.get("error_message"))
                break

            for place in data.get("results", []):
                place_id = place.get("place_id")
                if not place_id:
                    continue
                details = await _fetch_json(
                    client,
                    PLACE_DETAILS,
                    {
                        "key": api_key,
                        "place_id": place_id,
                        "fields": ",".join([
                            "name",
                            "formatted_address",
                            "international_phone_number",
                            "formatted_phone_number",
                            "rating",
                            "user_ratings_total",
                            "geometry",
                            "url",
                            "photos",
                            "opening_hours",
                            "types",
                        ]),
                    },
                )
                if details.get("status") != "OK":
                    continue
                row = _to_doctor_row(details["result"], specialty, locality)
                if row:
                    results.append(row)
                await polite_sleep(0.4, 1.0)

            next_token = data.get("next_page_token")
            if not next_token:
                break
            await polite_sleep(2.5, 4.0)

    log.info("Google Places returned %d doctors for '%s'", len(results), query)
    return results


def _to_doctor_row(result: dict[str, Any], specialty: str | None, hint_locality: str | None) -> dict[str, Any] | None:
    name = result.get("name")
    address = result.get("formatted_address")
    if not name or not address:
        return None

    # Skip places that aren't medical (Google returns various)
    types = result.get("types") or []
    if types and not any(t in types for t in ("doctor", "hospital", "health", "physiotherapist", "dentist")):
        return None

    locality = detect_locality(address, LUCKNOW_LOCALITIES) or (hint_locality.title() if hint_locality else "Lucknow")
    spec_name = (specialty or "General Physician").title()
    if spec_name == "Ent":
        spec_name = "ENT Specialist"

    geometry = result.get("geometry", {}).get("location") or {}
    photo_ref = None
    photos = result.get("photos") or []
    if photos:
        photo_ref = photos[0].get("photo_reference")
    photo_url = (
        f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo_ref}&key={os.environ.get('GOOGLE_PLACES_API_KEY','')}"
        if photo_ref
        else None
    )

    phone = normalize_phone(
        result.get("international_phone_number") or result.get("formatted_phone_number")
    )

    return {
        "name": name,
        "slug": slugify(name, spec_name, locality),
        "specialization": spec_name,
        "clinic_address": address,
        "locality": locality,
        "city": "Lucknow",
        "latitude": geometry.get("lat"),
        "longitude": geometry.get("lng"),
        "phone": phone,
        "whatsapp": phone,
        "rating": result.get("rating"),
        "review_count": result.get("user_ratings_total") or 0,
        "profile_image_url": photo_url,
        "verified": False,
        "is_active": True,
        "source": "google_places",
        "source_url": result.get("url"),
        "experience_years": parse_experience(name),
    }


async def run(specialty: str | None, locality: str | None) -> list[dict[str, Any]]:
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        log.error("GOOGLE_PLACES_API_KEY not set; skipping google_places source")
        return []
    if locality and locality.lower() == "all":
        rows: list[dict[str, Any]] = []
        for loc in LUCKNOW_LOCALITIES:
            try:
                rows.extend(await search_doctors(specialty, loc, api_key))
            except Exception as e:  # noqa: BLE001
                log.exception("google_places failed for %s: %s", loc, e)
        return rows
    return await search_doctors(specialty, locality, api_key)
