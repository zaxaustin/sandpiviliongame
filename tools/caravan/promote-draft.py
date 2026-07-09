#!/usr/bin/env python3
"""
tools/caravan/promote-draft.py — the last mile of the Caravan pipeline.

Takes a completed library-drafts/*.md file (see library-drafts/README.md
and _TEMPLATE.md for the exact shape) and inserts it as a real row in
Supabase's library_documents table — the shared Library shelves, live in
the game immediately, no code deploy needed.

Refuses to run if license or tradition is still literally "TODO" — the
one non-negotiable check this project's own rules already state in the
in-game Steward Review Queue. Every other judgment (does this actually
belong on a shelf, is the summary honest) is yours, made before you ever
run this script — it does the mechanical part, never the reading.

Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment
variables — the *service role* key (Settings -> API in your Supabase
dashboard), not the publishable/anon key .env.local uses for the game
itself. The service role key bypasses row-level security entirely, the
same elevated access a real steward action needs — this script runs on
your own machine, as the steward, not in the browser. It must never be
committed, shared, put in .env.local, or pasted anywhere the game's
client-side code could reach it. Treat it like a password.

Usage (PowerShell):
    $env:SUPABASE_URL = "https://xxxx.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
    python tools/caravan/promote-draft.py library-drafts/lieh-tzu.md

No third-party packages required — just Python 3's standard library,
same as every other Caravan connector.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

TITLE_LINE = re.compile(r"^#\s+(.+)$", re.MULTILINE)
SECTION = re.compile(r"^##\s+(.+?)\n\n(.*?)(?=\n##\s+|\Z)", re.MULTILINE | re.DOTALL)


def field(text, name):
    m = re.search(rf"^\*\*{re.escape(name)}:\*\*\s*(.+)$", text, re.MULTILINE)
    return m.group(1).strip() if m else None


def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def parse_draft(text):
    title_m = TITLE_LINE.search(text)
    if not title_m:
        sys.exit("Couldn't find a '# Title' line at the top — is this a real draft file?")
    title = title_m.group(1).strip()

    tradition = field(text, "Tradition")
    license_ = field(text, "License")
    source_url = field(text, "Source URL")
    attribution = field(text, "Attribution")
    # Optional — matches CATEGORIES in src/game/data/seed.js (classical,
    # non-fiction, fiction, research, ai-written, personal). Not validated
    # against that list here on purpose: same trust model as tradition/
    # license, the steward's word is the check, not a hardcoded enum.
    category = field(text, "Category") or "classical"

    for label, value in [("Tradition", tradition), ("License", license_)]:
        if not value or "TODO" in value:
            sys.exit(f"{label} is still TODO — this is the one check that never gets skipped. "
                      f"Confirm it's real, edit the draft, then run this again.")

    summary = None
    sections = []
    for heading, body in SECTION.findall(text):
        heading, body = heading.strip(), body.strip()
        if heading.lower() == "summary":
            summary = body
        else:
            sections.append({"heading": heading, "body": body})

    if not summary:
        sys.exit("No '## Summary' section found — every shelf entry needs one.")
    if not sections:
        sys.exit("No sections found beyond the summary — add at least one '## heading' section.")

    return {
        "slug": slugify(title),
        "title": title,
        "tradition": tradition,
        "license": license_,
        "source_url": source_url or None,
        "attribution": attribution or None,
        "category": category,
        "doc": {"summary": summary, "sections": sections},
    }


def insert(row, base_url, service_key):
    url = base_url.rstrip("/") + "/rest/v1/library_documents"
    req = urllib.request.Request(
        url,
        data=json.dumps(row).encode("utf-8"),
        method="POST",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        sys.exit(f"Supabase rejected the insert ({e.code}): {body}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("draft", help="Path to a completed library-drafts/*.md file")
    ap.add_argument("--done-dir", default="library-drafts/done", help="Where the draft moves once promoted")
    args = ap.parse_args()

    base_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not service_key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment variables first — "
                  "the service role key from Settings -> API in your Supabase dashboard, not the "
                  "publishable key .env.local uses. See this script's own docstring (python "
                  "tools/caravan/promote-draft.py --help).")

    with open(args.draft, "r", encoding="utf-8") as f:
        text = f.read()

    row = parse_draft(text)
    print(f"Promoting: {row['title']}  ({row['tradition']}, {row['license']})")
    result = insert(row, base_url, service_key)
    slug = result[0]["slug"] if result else row["slug"]
    print(f"Inserted into library_documents: {slug}")

    os.makedirs(args.done_dir, exist_ok=True)
    done_path = os.path.join(args.done_dir, os.path.basename(args.draft))
    os.replace(args.draft, done_path)
    print(f"Moved draft to: {done_path}")
    print("\nLive immediately — the shelf reads from Supabase now, no deploy needed. "
          "Refresh the game to see it.")


if __name__ == "__main__":
    main()
