"""Import doctors from a captured Practo `network-log_*.json` file.

Reads the captured marketplace API responses and emits SQL upserts (default)
or upserts directly to Supabase with `--upsert`.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from practo_parser import dedup_with_unique_slugs, emit_sql, to_doctor_row


def extract_doctors_from_log(log_path: Path) -> list[dict]:
    data = json.loads(log_path.read_text())
    rows = []
    for r in data.get("requests", []):
        if "search/provider/v2" not in r.get("url", ""):
            continue
        body = r.get("response_body")
        if not body:
            continue
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            continue
        entities = ((payload.get("doctors") or {}).get("entities") or {})
        for ent in entities.values():
            row = to_doctor_row(ent)
            if row:
                rows.append(row)
    return dedup_with_unique_slugs(rows)


def upsert_supabase(rows: list[dict]) -> int:
    try:
        from supabase import create_client  # type: ignore
    except ImportError:
        sys.exit("pip install supabase python-dotenv")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    client = create_client(url, key)
    n = 0
    for i in range(0, len(rows), 100):
        client.table("doctors").upsert(rows[i : i + 100], on_conflict="slug").execute()
        n += len(rows[i : i + 100])
    try:
        client.rpc("refresh_doctor_counts").execute()
    except Exception:
        pass
    return n


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("log_file", type=Path)
    p.add_argument("--out-json", type=Path)
    p.add_argument("--upsert", action="store_true")
    p.add_argument("--emit-sql", action="store_true")
    args = p.parse_args()

    rows = extract_doctors_from_log(args.log_file)
    print(f"Parsed {len(rows)} unique doctors", file=sys.stderr)

    if args.out_json:
        args.out_json.parent.mkdir(parents=True, exist_ok=True)
        args.out_json.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
        print(f"Wrote {args.out_json}", file=sys.stderr)

    if args.upsert:
        n = upsert_supabase(rows)
        print(f"Upserted {n} doctors", file=sys.stderr)
    elif args.emit_sql or not args.out_json:
        print(emit_sql(rows))


if __name__ == "__main__":
    main()
