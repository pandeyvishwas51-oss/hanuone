#!/usr/bin/env python3
"""Generate Hanuone brand imagery via Azure gpt-image-2 -> public/generated/.

Run:  IMG_KEY="<azure-key>" python3 scripts/generate-images.py [id1 id2 ...]
Auth that works for this resource: BOTH api-key + Bearer headers, ?api-version=preview.
"""
import os, sys, json, time, base64, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "generated"
OUT.mkdir(parents=True, exist_ok=True)

KEY = os.environ.get("IMG_KEY") or os.environ.get("OPENAI_API_KEY")
BASE = os.environ.get("IMG_BASE", "https://free-credits-openai-pro-resource.services.ai.azure.com/openai/v1")
MODEL = os.environ.get("IMG_MODEL", "gpt-image-2")
if not KEY:
    sys.exit("Set IMG_KEY")

manifest = json.loads((ROOT / "scripts" / "image-manifest.json").read_text())
style = manifest["style"]
jobs = manifest["images"]
only = sys.argv[1:]
if only:
    jobs = [j for j in jobs if j["id"] in only]

URL = f"{BASE}/images/generations?api-version=preview"

def gen(job):
    prompt = f"{job['prompt']}\n\nStyle: {style}"
    body = json.dumps({"model": MODEL, "prompt": prompt, "n": 1, "size": job["size"]}).encode()
    req = urllib.request.Request(URL, data=body, method="POST")
    req.add_header("api-key", KEY)
    req.add_header("Authorization", f"Bearer {KEY}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read())
    b64 = data["data"][0]["b64_json"]
    (OUT / f"{job['id']}.png").write_bytes(base64.b64decode(b64))

ok = 0
for j in jobs:
    for attempt in range(1, 6):
        try:
            print(f"… {j['id']} ({j['size']}) ", end="", flush=True)
            gen(j)
            print("✓")
            ok += 1
            time.sleep(12)  # pace under per-minute limit
            break
        except urllib.error.HTTPError as e:
            code = e.code
            if code == 429:
                print("429, waiting 25s")
                time.sleep(25); continue
            print(f"✗ HTTP {code}: {e.read()[:160].decode('utf-8','replace')}")
            time.sleep(4)
            if attempt == 5: break
        except Exception as e:
            print(f"✗ {str(e)[:140]}")
            time.sleep(4)
            if attempt == 5: break

print(f"\nGenerated {ok}/{len(jobs)} -> public/generated/")
