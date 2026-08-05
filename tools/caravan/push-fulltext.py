#!/usr/bin/env python3
"""
RETIRED 2026-08-02 — THIS SCRIPT DOES NOT WORK. It stops before doing
anything, on purpose. Everything below the next paragraph describes how it
worked when it worked, and is kept only because rewriting it is a real job
someone may take on.

Its second half merged into a Supabase JSONB column, and that project was
deleted outright rather than left dormant. It exits BEFORE the MinIO upload,
so it cannot leave an orphaned object in the bucket with no catalogue row
pointing at it. To get a book's full text in today: drag the .txt or .epub
onto the Pavilion's window — the desktop app writes the text as a real file
and the catalogue row into the local database. To rewrite this properly, the
writes it needs already exist as named queries in electron/db.cjs.

--- how it worked, for whoever rebuilds it -------------------------------

tools/caravan/push-fulltext.py — attach a full book's text to an existing
Library shelf entry, the streamlined way.

The normal flow to add a book stays: fetch it (gutenberg.py or
suttacentral.py), write a real summary/sections draft, promote it with
promote-draft.py — that part isn't changing, and shouldn't be rushed,
since the summary is the one thing that still needs a human's actual
reading and judgment. This script is the *second*, optional step: once a
slug already exists on a shelf, attach its real full text so the Reader's
"Read the full text" button appears — without hand-editing seed.js or
writing raw SQL, and without ever inlining the text into Supabase's JSONB
column (see LIBRARY-SCALING-PLAN.md for why that stops scaling).

What it does:
  1. Uploads the given text file into local MinIO (via `mc pipe` over
     Docker — no AWS SDK dependency, matches the exact recipe already
     verified working for this project) under the given slug.
  2. Merges a `fullText` object into that slug's `library_documents.doc`
     JSONB column in Supabase — {translator, source_url, license,
     storage:{bucket,key}} — without touching the existing
     summary/sections.

Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment
variables (same as promote-draft.py — the service role key, never
committed, never in .env.local). MinIO's own credentials/endpoint are
read from .env.local automatically (MINIO_ENDPOINT, MINIO_ROOT_USER,
MINIO_ROOT_PASSWORD, MINIO_BUCKET) since those aren't sensitive in the
same way — they only reach a service on this machine's own localhost.

Usage (PowerShell):
    $env:SUPABASE_URL = "https://xxxx.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
    python tools/caravan/push-fulltext.py lieh-tzu library-sources/lieh-tzu.txt `
        --translator "tr. Lionel Giles (1912)" `
        --source-url "https://www.gutenberg.org/ebooks/12313" `
        --license "Public Domain (Project Gutenberg)"

Requires Docker running locally (for `mc`) and this machine's MinIO
container up (see LIBRARY-SCALING-PLAN.md). No third-party Python
packages — stdlib only, same as every other Caravan connector.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request


def load_env_local():
    """Only pulls the non-sensitive MINIO_* values — SUPABASE_SERVICE_ROLE_KEY
    is deliberately never read from here, matching promote-draft.py's own rule."""
    path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    values = {}
    if not os.path.exists(path):
        return values
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip().startswith("MINIO_"):
                values[k.strip()] = v.strip()
    return values


def upload_to_minio(text_path, slug, endpoint, bucket, user, password):
    key = slug + ".txt"
    # `mc` runs *inside* its own throwaway container, reaching out to the
    # host's published port — from there, "localhost" means the container
    # itself, not this machine. Docker Desktop's host.docker.internal is
    # the correct address for that one hop; the game's browser client (not
    # inside a container) correctly keeps using plain localhost.
    container_endpoint = re.sub(r"://(localhost|127\.0\.0\.1)([:/]|$)", r"://host.docker.internal\2", endpoint)
    alias_cmd = f"mc alias set local {container_endpoint} {user} {password} >/dev/null && mc pipe local/{bucket}/{key}"
    with open(text_path, "rb") as f:
        data = f.read()
    proc = subprocess.run(
        ["docker", "run", "-i", "--rm", "--entrypoint", "sh", "minio/mc", "-c", alias_cmd],
        input=data,
        capture_output=True,
    )
    if proc.returncode != 0:
        sys.exit(f"MinIO upload failed:\n{proc.stderr.decode('utf-8', 'replace')}")
    print(f"Uploaded {len(data):,} bytes to local/{bucket}/{key}")
    return bucket, key


def fetch_current_doc(slug, base_url, service_key):
    url = f"{base_url.rstrip('/')}/rest/v1/library_documents?slug=eq.{slug}&select=doc"
    req = urllib.request.Request(url, headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            rows = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"Couldn't fetch slug '{slug}' ({e.code}): {e.read().decode('utf-8', 'replace')}")
    if not rows:
        sys.exit(f"No existing shelf entry for slug '{slug}' — run promote-draft.py first. "
                  f"This script only attaches full text to a book that's already on a shelf.")
    return rows[0]["doc"]


def patch_doc(slug, doc, base_url, service_key):
    url = f"{base_url.rstrip('/')}/rest/v1/library_documents?slug=eq.{slug}"
    req = urllib.request.Request(
        url,
        data=json.dumps({"doc": doc}).encode("utf-8"),
        method="PATCH",
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
        sys.exit(f"Supabase rejected the update ({e.code}): {e.read().decode('utf-8', 'replace')}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug", help="Existing library_documents slug to attach full text to")
    ap.add_argument("text_file", help="Path to the plain-text full book (already vetted/sourced)")
    ap.add_argument("--translator", required=True, help="e.g. 'tr. Lionel Giles (1912)' or a translator's name")
    ap.add_argument("--source-url", required=True, help="Where this specific edition/translation actually lives")
    ap.add_argument("--license", required=True, help="e.g. 'Public Domain (Project Gutenberg)', 'CC0 1.0'")
    args = ap.parse_args()

    # STOP FIRST, before every other check. This script updates a Supabase
    # project deleted on 2026-08-02, so it cannot finish no matter what else
    # is configured. Sitting further down, this guard let a missing MinIO
    # password answer first — sending the reader off to fix a credential that
    # was never the problem. The real reason has to be the first thing said.
    sys.exit(
        "push-fulltext.py DOES NOT WORK. Its second half updates Supabase,\n"
        "which this project deleted on 2026-08-02. No environment variable\n"
        "will fix it, and it stops before uploading so it cannot leave an\n"
        "orphaned object in MinIO.\n"
        "\n"
        "To get a book's full text in today: drag the .txt or .epub onto the\n"
        "Pavilion's window. The desktop app stores the text as a real file\n"
        "and the catalogue row goes to the local database.\n"
        "\n"
        "Rewriting this against local Postgres + MinIO is a real job worth\n"
        "doing. See LEARNING-PATH.md Stage 15."
    )

    if "TODO" in args.license or "TODO" in args.translator:
        sys.exit("License/translator still says TODO — confirm it's real before running this.")

    env = load_env_local()
    endpoint = os.environ.get("MINIO_ENDPOINT", env.get("MINIO_ENDPOINT", "http://localhost:9000"))
    bucket = os.environ.get("MINIO_BUCKET", env.get("MINIO_BUCKET", "sand-pavilion-library"))
    user = os.environ.get("MINIO_ROOT_USER", env.get("MINIO_ROOT_USER"))
    password = os.environ.get("MINIO_ROOT_PASSWORD", env.get("MINIO_ROOT_PASSWORD"))
    if not user or not password:
        sys.exit("MINIO_ROOT_USER / MINIO_ROOT_PASSWORD not found in the environment or .env.local.")

    base_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    bucket, key = upload_to_minio(args.text_file, args.slug, endpoint, bucket, user, password)

    doc = fetch_current_doc(args.slug, base_url, service_key)
    doc["fullText"] = {
        "translator": args.translator,
        "source_url": args.source_url,
        "license": args.license,
        "storage": {"bucket": bucket, "key": key},
    }
    patch_doc(args.slug, doc, base_url, service_key)
    print(f"'{args.slug}' now has a real full-text reader — live immediately, no code deploy needed.")


if __name__ == "__main__":
    main()
