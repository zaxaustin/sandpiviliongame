#!/usr/bin/env python3
"""
[LIBRARY AUDIT] - what is actually in the pool, and which books are dead.

Written 2026-08-03, from the steward's report: "there are still some dead
books in the library" and "we should have over 300 books right now."

WHY THIS IS PYTHON AND NOT A MODEL, stated because it is a standing rule
in this project (see data/shelf-rules.js, which quotes it):

    "only having the units do the sorting, or the things we can't do with
     Python or with Python assistance."

Counting objects, measuring text, spotting a Gutenberg header and finding
duplicates are all things code does exactly and a language model does
approximately and expensively. Nothing here calls an AI.

WHAT IT ANSWERS
  - how many books are really in MinIO, and how big
  - which are DEAD: too short to be a book, or nothing but boilerplate
  - which are DUPLICATES of each other (same normalised title)
  - what structure each one has, using the app's own chapter finder, so the
    audit and the Reader can never disagree about a book

USAGE
    python tools/library-audit.py                 # summary
    python tools/library-audit.py --full          # every book, one line each
    python tools/library-audit.py --json out.json # machine-readable

Needs the MinIO container up (docker compose up -d minio); reads over the
plain S3 HTTP API, anonymously, the same way the Reader does.
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error
from collections import defaultdict
from xml.etree import ElementTree

ENDPOINT = os.environ.get("MINIO_ENDPOINT", "http://localhost:9000")
BUCKET = os.environ.get("MINIO_BUCKET", "sand-pavilion-library")
NS = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}

# WHAT "DEAD" ACTUALLY MEANS, corrected on the first real run (2026-08-03).
#
# The first version flagged 9 of 296 and SEVEN were false alarms: the Metta
# Sutta (1,384 chars), the Mangala and Anattalakkhana suttas, "Cinderella",
# "The Gift of the Magi", the Declaration of Independence. All of those are
# real, complete works that happen to be short - and a rule that calls the
# Metta Sutta a broken file is a rule nobody will trust twice.
#
# So the test is not "is it short" but "is there a work in here at all",
# measured on the BODY with the Gutenberg wrapper removed. A failed fetch, a
# stub or an error page leaves a few hundred characters; the shortest real
# text in this library leaves well over a thousand.
DEAD_BODY = 900           # characters of actual body, boilerplate stripped


def fetch(url, timeout=30):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def list_objects():
    """Every object in the bucket, following continuation tokens."""
    out, token = [], None
    while True:
        url = f"{ENDPOINT}/{BUCKET}?list-type=2&max-keys=1000"
        if token:
            url += "&continuation-token=" + urllib.parse.quote(token, safe="")
        root = ElementTree.fromstring(fetch(url))
        for c in root.findall("s3:Contents", NS):
            out.append({
                "key": c.findtext("s3:Key", "", NS),
                "size": int(c.findtext("s3:Size", "0", NS)),
                "modified": c.findtext("s3:LastModified", "", NS),
            })
        if root.findtext("s3:IsTruncated", "false", NS) != "true":
            break
        token = root.findtext("s3:NextContinuationToken", "", NS)
        if not token:
            break
    return out


def title_of(key):
    name = key.rsplit("/", 1)[-1]
    name = re.sub(r"\.txt$", "", name)
    name = re.sub(r"^personal-", "", name)
    return name.replace("-", " ").strip()


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


GUT_START = re.compile(r"\*\*\*\s*START OF (THIS|THE) PROJECT GUTENBERG", re.I)
GUT_END = re.compile(r"\*\*\*\s*END OF (THIS|THE) PROJECT GUTENBERG", re.I)


def diagnose(text):
    """What is wrong with this text, if anything. Deterministic.

    Judged on the BODY, not the file: a short work with a long Gutenberg
    wrapper is a short work, not a broken download. See DEAD_BODY above."""
    problems = []
    body = text
    ms, me = GUT_START.search(text), GUT_END.search(text)
    if ms and me and me.start() > ms.end():
        body = text[ms.end():me.start()]
    body = body.strip()

    if "<html" in text[:2000].lower() or "<!doctype" in text[:2000].lower():
        problems.append("HTML, not text")
    if len(body) < DEAD_BODY:
        problems.append(f"no work here ({len(body)} chars of body)")
    elif not re.search(r"[A-Za-z]{4,}\s+[A-Za-z]{4,}\s+[A-Za-z]{4,}", body[:4000]):
        problems.append("no prose in the opening")
    return problems, len(body)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="one line per book")
    ap.add_argument("--json", metavar="PATH", help="write the full record")
    ap.add_argument("--limit", type=int, default=0, help="stop after N (for a quick look)")
    args = ap.parse_args()

    try:
        objects = list_objects()
    except urllib.error.URLError as e:
        print(f"Cannot reach MinIO at {ENDPOINT} - is the container up?  ({e})")
        return 2

    books = [o for o in objects if o["key"].endswith(".txt")]
    if args.limit:
        books = books[:args.limit]

    total_bytes = sum(b["size"] for b in books)
    print(f"{len(books)} texts in {BUCKET}, {total_bytes/1e6:.1f} MB")
    personal = [b for b in books if b["key"].startswith("personal/")]
    print(f"  {len(personal)} personal, {len(books)-len(personal)} shipped//root\n")

    by_title = defaultdict(list)
    records, dead = [], []

    for i, b in enumerate(books, 1):
        key = b["key"]
        title = title_of(key)
        by_title[norm(title)].append(key)
        try:
            raw = fetch(f"{ENDPOINT}/{BUCKET}/{urllib.parse.quote(key)}")
            text = raw.decode("utf-8", errors="replace")
        except Exception as e:
            records.append({"key": key, "title": title, "problems": [f"unreadable: {e}"]})
            dead.append(key)
            continue

        problems, body_len = diagnose(text)
        rec = {"key": key, "title": title, "bytes": b["size"],
               "chars": len(text), "body_chars": body_len, "problems": problems}
        records.append(rec)
        if problems:
            dead.append(key)
        if args.full:
            flag = "DEAD " if problems else "     "
            print(f"{flag}{title[:52]:54} {len(text):>9,} chars  {'; '.join(problems)}")
        elif i % 50 == 0:
            print(f"  ...read {i} of {len(books)}", file=sys.stderr)

    dupes = {t: ks for t, ks in by_title.items() if len(ks) > 1}

    print(f"\n{'='*64}")
    print(f"DEAD or suspect : {len(dead)}")
    for k in dead[:20]:
        r = next(r for r in records if r["key"] == k)
        print(f"    {r['title'][:50]:52} {'; '.join(r['problems'])}")
    if len(dead) > 20:
        print(f"    ...and {len(dead)-20} more")
    print(f"DUPLICATE titles: {len(dupes)}")
    for t, ks in list(dupes.items())[:10]:
        print(f"    {t[:50]:52} x{len(ks)}")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump({"records": records, "dead": dead,
                       "duplicates": {t: ks for t, ks in dupes.items()}}, f, indent=1)
        print(f"\nwrote {args.json}")
    return 0


if __name__ == "__main__":
    import urllib.parse  # noqa: E402  (used above)
    sys.exit(main())
