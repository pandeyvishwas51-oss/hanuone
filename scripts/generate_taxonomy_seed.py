"""Build a SQL file that inserts every locality+specialty seen in the scraped
data into the lookup tables, so filters and URLs work everywhere."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "practo_doctors.json"
OUT = ROOT / "supabase" / "seed_taxonomy.sql"


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def main() -> None:
    rows = json.loads(SRC.read_text())
    localities = sorted({r["locality"] for r in rows if r.get("locality")})
    specialties = sorted({r["specialization"] for r in rows if r.get("specialization")})
    pincodes = sorted({(r["pincode"], r["locality"]) for r in rows if r.get("pincode")})

    out: list[str] = ["-- Auto-merge taxonomy from Practo scrape\n"]
    out.append("-- Localities --\n")
    for name in localities:
        slug = slugify(name)
        out.append(
            f"INSERT INTO localities (name, slug) VALUES ('{name.replace(chr(39), chr(39)*2)}', '{slug}')\n"
            f"ON CONFLICT (slug) DO NOTHING;\n"
        )
    out.append("\n-- Specializations --\n")
    for name in specialties:
        slug = slugify(name)
        out.append(
            f"INSERT INTO specializations (name, slug) VALUES ('{name.replace(chr(39), chr(39)*2)}', '{slug}')\n"
            f"ON CONFLICT (slug) DO NOTHING;\n"
        )
    out.append(f"\n-- Pincode coverage: {len(pincodes)} unique (pincode, locality) pairs\n")
    out.append("\nSELECT refresh_doctor_counts();\n")
    OUT.write_text("".join(out))
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"Localities: {len(localities)}  Specialties: {len(specialties)}  Pincodes: {len(pincodes)}", file=sys.stderr)


if __name__ == "__main__":
    main()
