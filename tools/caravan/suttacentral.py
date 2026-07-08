#!/usr/bin/env python3
"""
The Caravan's second connector — SuttaCentral.

Fetches one sutta's segmented ("bilara") translation from suttacentral.net
and assembles it into continuous, readable full text: paragraphs and
headings exactly as the source API structures them, nothing invented,
nothing paraphrased, nothing summarized.

Deliberately narrow, like gutenberg.py: one named, hand-picked source
(suttacentral.net's public API), stdlib-only, no scraping of arbitrary
URLs — just two known endpoints:

  GET /api/bilarasuttas/{uid}/{lang}?author_uid={author}
      -> the segmented ("bilara") translation: a `translation_text` dict
      keyed by segment ID (e.g. "mn10:1.1"), a matching `html_text` dict
      of per-segment HTML templates (paragraph/heading wrapping), and a
      `keys_order` list giving the *true* document order. Important
      gotcha found while building this: `translation_text`'s own dict
      key order does NOT reliably match document order on every sutta —
      always walk `keys_order`, never `translation_text.keys()`. A
      handful of structural segment IDs can appear in `keys_order` with
      no corresponding entry in `translation_text` (blank divider
      segments); those are skipped rather than guessed at.

  GET /api/suttaplex/{uid}
      -> title/blurb/collection metadata, used here only to pull the
      already-translated sutta title. SuttaCentral's public API does not
      appear to surface a `license` field directly on either endpoint —
      the CC0 1.0 status of Bhikkhu Sujato's translations is a fact
      about his publishing terms, not something this API states, so the
      calling project cites it independently (same as it already does
      in seed.js).

Headings inside the body come only from the source's own `html_text`
templates (segments SuttaCentral itself wraps in <h1>-<h4>) — never
invented here.

Usage:
    python suttacentral.py mn10
    python suttacentral.py snp1.8 --author sujato --out mn10.json
    python suttacentral.py mn118 --for-library

No third-party packages required — just Python 3's standard library.
"""
import argparse
import html as html_lib
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request

# Windows consoles often default stdout to cp1252, which crashes outright
# (rather than silently mangling) on real diacritics in Pali transliteration
# (Kālāma, Saṅgha, etc.) — force UTF-8 explicitly rather than leave it to
# the OS default. Same fix as arxiv.py, same underlying cause.
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

API_BASE = "https://suttacentral.net/api"
BILARA_URL = API_BASE + "/bilarasuttas/{uid}/{lang}"
SUTTAPLEX_URL = API_BASE + "/suttaplex/{uid}"
SUTTA_URL = "https://suttacentral.net/{uid}"

BLOCK_CLOSE_TAGS = re.compile(r"</(h1|h2|h3|h4|p|li|header|article)>", re.IGNORECASE)
HEADING_TAG = re.compile(r"<(h[1-4])[^>]*>(.*?)</\1>", re.IGNORECASE | re.DOTALL)
ANY_TAG = re.compile(r"<[^>]+>")
WHITESPACE_RUN = re.compile(r"[ \t]+")
BLANK_RUNS = re.compile(r"\n{3,}")


def slugify(s):
    # Pali transliteration is full of diacritics (Kālāma, Saṅgha) — decompose
    # to base letter + combining mark, then drop the marks, so a title turns
    # into "kalamas" not "k-l-mas" (every accented letter silently vanishing).
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "SandPavilionCaravan/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_bilara(uid, lang="en", author="sujato"):
    url = BILARA_URL.format(uid=uid, lang=lang) + f"?author_uid={author}"
    data = fetch_json(url)
    for key in ("translation_text", "html_text", "keys_order"):
        if key not in data:
            raise SystemExit(f"Unexpected bilara response shape for {uid}: missing '{key}' key. "
                              f"Got keys: {sorted(data.keys())}")
    return data, url


def fetch_suttaplex(uid):
    data = fetch_json(SUTTAPLEX_URL.format(uid=uid))
    return data[0] if data else None


def assemble_html(bilara):
    """Walk keys_order (the true document order) and fill each segment's
    html template with its own translation text. Segments with no
    translation_text entry (a handful of purely-structural IDs) contribute
    nothing rather than a guess. Returns (doc_html, skipped_segment_ids)."""
    translation_text = bilara["translation_text"]
    html_text = bilara["html_text"]
    keys_order = bilara["keys_order"]
    parts = []
    missing = []
    for key in keys_order:
        if key not in translation_text:
            missing.append(key)
            continue
        segment_text = translation_text[key]
        template = html_text.get(key, "{}")
        if "{}" in template:
            parts.append(template.replace("{}", segment_text))
        else:
            parts.append(template + segment_text)
    return "".join(parts), missing


def html_to_text(doc_html):
    """Turn the assembled per-segment HTML into readable plain text:
    headings on their own line, paragraphs separated by a blank line, all
    markup stripped, entities unescaped. No wording is touched — only
    whitespace/structure derived from the source's own markup."""
    doc_html = HEADING_TAG.sub(lambda m: "\n\n" + m.group(0) + "\n\n", doc_html)
    doc_html = BLOCK_CLOSE_TAGS.sub(lambda m: m.group(0) + "\n\n", doc_html)
    text = ANY_TAG.sub("", doc_html)
    text = html_lib.unescape(text)
    lines = [WHITESPACE_RUN.sub(" ", ln.strip()) for ln in text.split("\n")]
    text = "\n".join(lines)
    text = BLANK_RUNS.sub("\n\n", text)
    return text.strip()


def fetch_clean_text(uid, lang="en", author="sujato"):
    """The reusable core: fetch one sutta and return (title, body_text,
    source_url, skipped_segment_ids)."""
    bilara, used_url = fetch_bilara(uid, lang, author)
    plex = fetch_suttaplex(uid)
    title = plex.get("translated_title", "").strip() if plex and plex.get("translated_title") else uid
    doc_html, missing = assemble_html(bilara)
    body = html_to_text(doc_html)
    return title, body, used_url, missing


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("uid", help="SuttaCentral sutta UID, e.g. mn10, snp1.8, mn118")
    ap.add_argument("--lang", default="en", help="Translation language code (default: en)")
    ap.add_argument("--author", default="sujato", help="Translator author_uid (default: sujato)")
    ap.add_argument("--license", default="CC0 1.0", help="License string to record")
    ap.add_argument("--out", default=None, help="Output JSON file (default: suttacentral_<uid>.json)")
    ap.add_argument("--for-library", action="store_true",
                     help="Write library-sources/<slug>.txt (Title:/Author: header prepended) instead of "
                          "the bulk-import JSON, for tools/caravan/library-draft.py — the shared-Library "
                          "path, not the personal Archive Desk one.")
    args = ap.parse_args()

    print(f"Fetching SuttaCentral {args.uid} ({args.lang}, author={args.author})...")
    title, body, used_url, missing = fetch_clean_text(args.uid, args.lang, args.author)
    if missing:
        print(f"Note: {len(missing)} segment ID(s) had no translation text and were skipped: {missing}",
              file=sys.stderr)

    source = SUTTA_URL.format(uid=args.uid)

    if args.for_library:
        author_line = "Author: Bhikkhu Sujato\n" if args.author == "sujato" else ""
        header = f"Title: {title}\n{author_line}\n"
        out_dir = "library-sources"
        os.makedirs(out_dir, exist_ok=True)
        out_path = args.out or os.path.join(out_dir, slugify(title) + ".txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(header + body)
        print(f"Fetched from: {used_url}")
        print(f"Title: {title}")
        print(f"Wrote: {out_path}")
        print(f"\nNext step: python tools/caravan/library-draft.py {out_path} "
              f"--source \"{source}\" --license \"{args.license}\"")
        return

    entry = {
        "title": title,
        "license": args.license,
        "source": source + f" (author: Bhikkhu Sujato)",
        "body": body,
    }
    out_path = args.out or f"suttacentral_{slugify(args.uid)}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump([entry], f, ensure_ascii=False, indent=2)

    print(f"Fetched from: {used_url}")
    print(f"Title: {title}")
    print(f"Body length: {len(body):,} characters")
    print(f"Wrote: {out_path}")
    print("\nNext step: open the Archive Desk in-game -> \"+ Bulk import\" -> paste this file's contents.")


if __name__ == "__main__":
    main()
