"""Reusable parsing helpers for Practo doctor records.

Used by both `import_practo_log.py` (offline log → SQL) and
`scrape_practo_lucknow.py` (live API → SQL).
"""
from __future__ import annotations

import re
from typing import Any, Iterable

DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
DAY_SHORT = {"MONDAY": "Mon", "TUESDAY": "Tue", "WEDNESDAY": "Wed", "THURSDAY": "Thu",
             "FRIDAY": "Fri", "SATURDAY": "Sat", "SUNDAY": "Sun"}


def slugify(*parts: str) -> str:
    s = " ".join(p for p in parts if p).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def collapse_timings(timings: list[dict[str, Any]] | None) -> str | None:
    if not timings:
        return None
    out: list[str] = []
    for t in timings:
        days = t.get("available_days") or []
        if not days:
            continue
        sorted_days = [d for d in DAY_ORDER if d in days]
        if sorted_days == DAY_ORDER:
            day_str = "Mon-Sun"
        elif sorted_days == DAY_ORDER[:6]:
            day_str = "Mon-Sat"
        elif sorted_days == DAY_ORDER[:5]:
            day_str = "Mon-Fri"
        else:
            day_str = "/".join(DAY_SHORT[d] for d in sorted_days)
        out.append(f"{day_str}: {t.get('begin_time')}–{t.get('end_time')}")
    return ", ".join(out) or None


def to_doctor_row(entity: dict[str, Any]) -> dict[str, Any] | None:
    name = entity.get("doctor_name") or ""
    if not name:
        return None
    spec = entity.get("specialization") or "General Physician"
    practice = entity.get("practice") or {}
    locality = entity.get("locality") or practice.get("locality") or "Lucknow"
    address_parts = [
        practice.get("name") or entity.get("clinic_name"),
        practice.get("address_line1"),
        practice.get("address_line2"),
        locality,
        practice.get("city") or "Lucknow",
    ]
    clinic_address = ", ".join([p for p in address_parts if p]) or "Lucknow"

    quals_raw = entity.get("qualifications") or []
    qualifications = [q.get("qualification") for q in quals_raw if q.get("qualification")]

    sub_specs = sorted({
        (s.get("sub_specialty") or s.get("specialty") or "")
        for s in (entity.get("specialties") or [])
    } - {"", spec})

    fee = entity.get("consultation_fees")
    if isinstance(fee, (int, float)) and fee <= 0:
        fee = None

    rec_pct = entity.get("recommendation_percent")
    rating = round(rec_pct / 20.0, 1) if isinstance(rec_pct, (int, float)) and rec_pct > 0 else None

    photo = (entity.get("profile_photo") or {}).get("url") or entity.get("image_url")
    profile_url = entity.get("profile_url")
    if profile_url and profile_url.startswith("/"):
        profile_url = "https://www.practo.com" + profile_url
    if profile_url:
        profile_url = profile_url.replace(" ", "%20")

    return {
        "name": name,
        "slug": slugify(name, spec, locality),
        "specialization": spec,
        "sub_specializations": sub_specs or None,
        "qualifications": qualifications or None,
        "experience_years": entity.get("experience_years"),
        "clinic_name": practice.get("name") or entity.get("clinic_name"),
        "clinic_address": clinic_address,
        "locality": locality,
        "city": practice.get("city") or "Lucknow",
        "pincode": practice.get("zipcode"),
        "latitude": entity.get("latitude"),
        "longitude": entity.get("longitude"),
        "phone": None,  # Practo gates phone numbers
        "whatsapp": None,
        "consultation_fee_min": fee,
        "consultation_fee_max": fee,
        "timing": collapse_timings(practice.get("timings") or []),
        "languages": ["Hindi", "English"],
        "rating": rating,
        "review_count": entity.get("reviews_count") or entity.get("patients_count") or 0,
        "profile_image_url": photo,
        "verified": False,
        "is_active": True,
        "source": "practo",
        "source_url": profile_url,
    }


def dedup_with_unique_slugs(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen_keys: set[tuple[str, str]] = set()
    seen_slugs: set[str] = set()
    for row in rows:
        key = (row["name"].lower().strip(), (row["clinic_address"] or "").lower().strip())
        if key in seen_keys:
            continue
        base_slug = row["slug"] or slugify(row["name"])
        slug = base_slug
        i = 2
        while slug in seen_slugs:
            slug = f"{base_slug}-{i}"
            i += 1
        row["slug"] = slug
        seen_slugs.add(slug)
        seen_keys.add(key)
        out.append(row)
    return out


# --------------------------------------------------------------------------
# SQL emitter
# --------------------------------------------------------------------------
SQL_COLUMNS = [
    "name", "slug", "specialization", "sub_specializations", "qualifications",
    "experience_years", "clinic_name", "clinic_address", "locality", "city",
    "pincode", "latitude", "longitude", "phone", "whatsapp",
    "consultation_fee_min", "consultation_fee_max", "timing", "languages",
    "rating", "review_count", "profile_image_url", "verified", "is_active",
    "source", "source_url",
]


def _sql_literal(v: Any) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        if not v:
            return "ARRAY[]::TEXT[]"
        return "ARRAY[" + ", ".join(_sql_literal(x) for x in v) + "]"
    s = str(v).replace("'", "''")
    return f"'{s}'"


def emit_sql(rows: Iterable[dict[str, Any]]) -> str:
    out = ["-- Auto-generated from Practo importer\n"]
    cols = ", ".join(SQL_COLUMNS)
    update = ", ".join(f"{c} = EXCLUDED.{c}" for c in SQL_COLUMNS if c != "slug")
    for row in rows:
        values = ", ".join(_sql_literal(row.get(c)) for c in SQL_COLUMNS)
        out.append(
            f"INSERT INTO doctors ({cols}) VALUES ({values})\n"
            f"ON CONFLICT (slug) DO UPDATE SET {update};\n"
        )
    out.append("\nSELECT refresh_doctor_counts();\n")
    return "".join(out)
