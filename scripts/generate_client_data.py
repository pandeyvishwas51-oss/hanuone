"""Generate lean client-side data files from the Practo scrape.

Outputs:
  data/client/pincodes.json   — { "226010": "Gomtinagar", ... }
  data/client/localities.json — [{name, slug, doctor_count, lat, lng}, ...]
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "practo_doctors.json"
OUT = ROOT / "data" / "client"


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = json.loads(SRC.read_text())

    pincode_map: dict[str, str] = {}
    counts: Counter[str] = Counter()
    coord_sums: dict[str, list[float]] = {}

    for r in rows:
        loc = r.get("locality")
        if not loc:
            continue
        counts[loc] += 1
        if r.get("latitude") and r.get("longitude"):
            agg = coord_sums.setdefault(loc, [0.0, 0.0, 0])
            agg[0] += float(r["latitude"])
            agg[1] += float(r["longitude"])
            agg[2] += 1
        pin = r.get("pincode")
        if pin and pin not in pincode_map:
            pincode_map[pin] = loc

    localities = []
    for name, count in counts.most_common():
        agg = coord_sums.get(name)
        lat = agg[0] / agg[2] if agg and agg[2] else None
        lng = agg[1] / agg[2] if agg and agg[2] else None
        localities.append(
            {
                "name": name,
                "slug": slugify(name),
                "doctor_count": count,
                "lat": lat,
                "lng": lng,
            }
        )

    (OUT / "pincodes.json").write_text(json.dumps(pincode_map, indent=2, ensure_ascii=False))
    (OUT / "localities.json").write_text(json.dumps(localities, indent=2, ensure_ascii=False))
    print(f"pincodes.json ({len(pincode_map)} entries) + localities.json ({len(localities)})")


if __name__ == "__main__":
    main()
