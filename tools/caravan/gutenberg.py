#!/usr/bin/env python3
"""
The Caravan's first connector — Project Gutenberg.

Fetches one public-domain book by its Gutenberg ID and writes it out as a
JSON array in the exact shape the Sand Pavilion's Archive Desk "+ Bulk
import" box expects: [{title, license, source, body}, ...].

Deliberately lands in your own Archive Desk, never the shared Library —
per the project's own standing decision, mass-importing into the shared
SEED_LIBRARY stays a manual, human-reviewed choice, always. This script
only gets you as far as "the text is now sitting in a file on your own
computer, ready to paste in" — nothing more automated than that.

Only fetches from Project Gutenberg (gutenberg.org), a single named,
hand-picked source with a stdlib-only script — no scraping, no crawling,
no arbitrary URLs. That's the whole design: one connector per allowed
source, added by hand, not a general-purpose scraper.

Usage:
    python gutenberg.py 2680
    python gutenberg.py 2680 --out my_import.json --license "Public Domain"

Find a book's ID from its Gutenberg URL, e.g. gutenberg.org/ebooks/2680 -> 2680.
No third-party packages required — just Python 3's standard library.
"""
import argparse
import json
import os
import re
import sys
import urllib.request

GUTENBERG_TEXT_URLS = [
    "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt",
    "https://www.gutenberg.org/files/{id}/{id}-0.txt",
    "https://www.gutenberg.org/files/{id}/{id}.txt",
]
GUTENBERG_EBOOK_URL = "https://www.gutenberg.org/ebooks/{id}"

START_MARKERS = [
    re.compile(r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE | re.DOTALL),
    re.compile(r"\*END\*THE SMALL PRINT.*?\*\*\*", re.IGNORECASE | re.DOTALL),
]
END_MARKERS = [
    re.compile(r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK.*", re.IGNORECASE | re.DOTALL),
]
TITLE_LINE = re.compile(r"^Title:\s*(.+)$", re.MULTILINE)
AUTHOR_LINE = re.compile(r"^Author:\s*(.+)$", re.MULTILINE)


def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def fetch_text(book_id):
    last_err = None
    for template in GUTENBERG_TEXT_URLS:
        url = template.format(id=book_id)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SandPavilionCaravan/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="replace"), url
        except Exception as e:  # noqa: BLE001 — try the next mirror URL shape
            last_err = e
    raise SystemExit(f"Couldn't fetch book {book_id} from any known Gutenberg text URL: {last_err}")


def strip_boilerplate(raw):
    text = raw
    for pattern in START_MARKERS:
        m = pattern.search(text)
        if m:
            text = text[m.end():]
            break
    for pattern in END_MARKERS:
        m = pattern.search(text)
        if m:
            text = text[:m.start()]
            break
    return text.strip()


def guess_title(raw, fallback):
    m = TITLE_LINE.search(raw)
    return m.group(1).strip() if m else fallback


def guess_author(raw):
    m = AUTHOR_LINE.search(raw)
    return m.group(1).strip() if m else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book_id", help="Project Gutenberg ebook ID, e.g. 2680")
    ap.add_argument("--out", default=None, help="Output JSON file (default: gutenberg_<id>.json)")
    ap.add_argument("--license", default="Public Domain (Project Gutenberg)", help="License string to record")
    ap.add_argument("--for-library", action="store_true",
                     help="Write library-sources/<slug>.txt (Title:/Author: header re-prepended) instead of "
                          "the bulk-import JSON, so tools/caravan/library-draft.py can pick it up directly — "
                          "the shared-Library path, not the personal Archive Desk one.")
    args = ap.parse_args()

    print(f"Fetching Gutenberg #{args.book_id}...")
    raw, used_url = fetch_text(args.book_id)
    body = strip_boilerplate(raw)
    title = guess_title(raw, fallback=f"Gutenberg #{args.book_id}")
    author = guess_author(raw)
    source = GUTENBERG_EBOOK_URL.format(id=args.book_id)

    if args.for_library:
        # library-draft.py's TITLE_LINE/AUTHOR_LINE regexes look for these
        # at the start of the file — strip_boilerplate() already removed
        # Gutenberg's own header, so it's re-added here in the same shape.
        header = f"Title: {title}\n" + (f"Author: {author}\n" if author else "") + "\n"
        out_dir = "library-sources"
        os.makedirs(out_dir, exist_ok=True)
        out_path = args.out or os.path.join(out_dir, slugify(title) + ".txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(header + body)
        print(f"Fetched from: {used_url}")
        print(f"Title: {title}")
        if author:
            print(f"Author: {author}")
        print(f"Wrote: {out_path}")
        print(f"\nNext step: python tools/caravan/library-draft.py {out_path} "
              f"--source \"{source}\" --license \"{args.license}\"")
        return

    entry = {
        "title": title,
        "license": args.license,
        "source": source + (f" (author: {author})" if author else ""),
        "body": body,
    }
    out_path = args.out or f"gutenberg_{args.book_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump([entry], f, ensure_ascii=False, indent=2)

    print(f"Fetched from: {used_url}")
    print(f"Title: {title}")
    if author:
        print(f"Author: {author}")
    print(f"Body length: {len(body):,} characters")
    print(f"Wrote: {out_path}")
    print("\nNext step: open the Archive Desk in-game -> \"+ Bulk import\" -> paste this file's contents.")


if __name__ == "__main__":
    main()
