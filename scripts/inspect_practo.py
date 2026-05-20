"""Print the captured Practo /search/provider/v2 request shape (URL + headers)."""
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs

LOG = Path.home() / "Downloads" / "network-log_www.practo.com_2026-05-20T18-09-37.json"
data = json.loads(LOG.read_text())

for r in data["requests"]:
    if "search/provider/v2" not in r["url"]:
        continue
    print("=== request", r["index"], "===")
    print("URL:", r["url"][:300])
    print("\nrequest headers:")
    for h in (r.get("headers") or [])[:30]:
        if isinstance(h, dict):
            name = h.get("name") or h.get("key") or ""
            val = h.get("value") or ""
            if name.lower() == "cookie":
                val = (val[:80] + "...") if len(val) > 80 else val
            print(f"  {name}: {val}")
        else:
            print(" ", h)
    break
