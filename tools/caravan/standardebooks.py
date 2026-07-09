#!/usr/bin/env python3
"""
tools/caravan/standardebooks.py — the Caravan's Standard Ebooks connector.

Standard Ebooks (standardebooks.org) meticulously re-typesets and
proofreads public-domain texts — a real quality step above raw Gutenberg
scans. Its own OPDS catalog (the structured feed built for this kind of
lookup) needs a Patrons Circle membership or a project contribution to
access, not just a free account — confirmed directly, not assumed, by
requesting it and getting a 401. So this connector uses two different
real, structured, non-scraping sources instead:

1. **GitHub's own public API** (api.github.com) to search/list Standard
   Ebooks' ~1,500 book repos — every ebook's source lives in its own
   public repo under github.com/standardebooks, one book per repo, each
   with a `description` (title/author/translator) and a `homepage`
   (the exact standardebooks.org URL) already filled in. This is GitHub's
   real API, not scraping standardebooks.org itself.
2. **The book's own "single page" reading view** on standardebooks.org
   (e.g. .../ebooks/marcus-aurelius/meditations/george-long/text/single-page)
   to get the actual text. Checked against robots.txt first: it disallows
   crawling `/ebooks/*/downloads/*` (the binary epub/kindle files) but
   not the reading views themselves. This script parses that page's real
   EPUB3 semantic markup (the `epub:type` vocabulary — e.g.
   `bodymatter`/`frontmatter`/`backmatter` — a stable, documented
   standard every Standard Ebooks title uses identically) to keep the
   actual chapters and drop the titlepage/imprint/colophon/copyright
   boilerplate, not by guessing at page layout.

**Being polite, not required but real:** GitHub's API allows 60
unauthenticated requests/hour per IP — fine for occasional lookups, easy
to exhaust doing real research. A free GitHub account and a personal
access token (Settings -> Developer settings -> Personal access tokens;
no scopes needed for reading public data) raises this to 5,000/hour. Set
it as GITHUB_TOKEN and this script sends it automatically.

Usage:
    python standardebooks.py search "meditations"
    python standardebooks.py search "sherlock holmes" --limit 10
    python standardebooks.py get marcus-aurelius_meditations_george-long
    python standardebooks.py fetch-text marcus-aurelius_meditations_george-long

No third-party packages required — stdlib only (html.parser), same as
every other Caravan connector except pdf-to-text.py.
"""
import argparse
import html
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

GITHUB_API = "https://api.github.com"
BLOCK_TAGS = {"p", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "figcaption", "td"}
FRONT_BACK_MARKER = re.compile(r"\b(frontmatter|backmatter)\b")
BODYMATTER_MARKER = re.compile(r"\bbodymatter\b")


def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def github_headers():
    headers = {"User-Agent": "SandPavilionCaravan/1.0", "Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def github_json(url):
    req = urllib.request.Request(url, headers=github_headers())
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        if e.code == 403 and "rate limit" in body.lower():
            sys.exit("GitHub's rate limit is exhausted for this IP (60/hour unauthenticated). "
                      "Set GITHUB_TOKEN (a free personal access token, no scopes needed) to raise it to 5,000/hour.")
        sys.exit(f"GitHub API returned {e.code}: {body}")


def parse_description(desc):
    # "Epub source for the Standard Ebooks edition of TITLE, by AUTHOR[. Translated by TRANSLATOR]"
    m = re.match(r"Epub source for the Standard Ebooks edition of (.+?), by (.+?)(?:\. Translated by (.+))?$", desc or "")
    if not m:
        return desc, None, None
    return m.group(1), m.group(2), m.group(3)


def summarize_repo(r):
    title, author, translator = parse_description(r.get("description"))
    return {
        "repo": r["full_name"].split("/", 1)[-1],
        "title": title,
        "author": author,
        "translator": translator,
        "homepage": r.get("homepage"),
    }


def cmd_search(args):
    query = urllib.parse.quote(f"org:standardebooks {args.query} in:name,description")
    data = github_json(f"{GITHUB_API}/search/repositories?q={query}&per_page={args.limit}")
    books = [summarize_repo(r) for r in data.get("items", [])]
    print(f"{data.get('total_count', '?')} total matches, showing {len(books)}:")
    for b in books:
        print(f"\n{b['repo']}")
        print(f"  {b['title']}" + (f" — trans. {b['translator']}" if b["translator"] else ""))
        if b["author"]:
            print(f"  {b['author']}")
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(books, f, ensure_ascii=False, indent=2)
        print(f"\nWrote {len(books)} results to {args.out}")


def cmd_get(args):
    r = github_json(f"{GITHUB_API}/repos/standardebooks/{args.repo}")
    print(json.dumps(summarize_repo(r), ensure_ascii=False, indent=2))


class BodymatterExtractor(HTMLParser):
    """Keeps only text inside <section epub:type="bodymatter ..."> elements —
    the real, stable EPUB3 semantic vocabulary Standard Ebooks applies
    identically across every title — dropping titlepage/imprint/colophon/
    copyright-page/toc/nav boilerplate by structure, not by guessing layout."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.section_stack = []  # True = this section (or an ancestor) is bodymatter
        self.skip_stack = []     # True = inside <nav>, always skipped regardless of section
        self.chunks = []
        self.current = []

    def _in_bodymatter(self):
        return any(self.section_stack) and not any(self.skip_stack)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        # Standard Ebooks uses <section> for a continuous work's chapters and
        # <article> for each work in a collection (e.g. one short story per
        # <article>, with <section epub:type="chapter"> beneath it) — both
        # are real EPUB3 sectioning content, tracked identically here.
        if tag in ("section", "article"):
            etype = attrs.get("epub:type", "")
            if BODYMATTER_MARKER.search(etype):
                self.section_stack.append(True)
            elif FRONT_BACK_MARKER.search(etype):
                self.section_stack.append(False)
            else:
                self.section_stack.append(self.section_stack[-1] if self.section_stack else False)
        elif tag == "nav":
            self.skip_stack.append(True)
        elif tag in BLOCK_TAGS and self._in_bodymatter():
            self._flush()

    def handle_endtag(self, tag):
        if tag in ("section", "article") and self.section_stack:
            self.section_stack.pop()
        elif tag == "nav" and self.skip_stack:
            self.skip_stack.pop()
        elif tag in BLOCK_TAGS and self._in_bodymatter():
            self._flush()

    def handle_data(self, data):
        if self._in_bodymatter():
            self.current.append(data)

    def _flush(self):
        text = re.sub(r"\s+", " ", "".join(self.current)).strip()
        if text:
            self.chunks.append(text)
        self.current = []

    def get_text(self):
        self._flush()
        return "\n\n".join(self.chunks)


def cmd_fetch_text(args):
    repo = github_json(f"{GITHUB_API}/repos/standardebooks/{args.repo}")
    info = summarize_repo(repo)
    if not info["homepage"]:
        sys.exit(f"Repo '{args.repo}' has no homepage URL set — can't find its reading page.")
    url = info["homepage"].rstrip("/") + "/text/single-page"
    print(f"Fetching {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "SandPavilionCaravan/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw_html = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        sys.exit(f"Couldn't fetch the reading page ({e.code}): {url}")

    extractor = BodymatterExtractor()
    extractor.feed(raw_html)
    body = html.unescape(extractor.get_text())
    if not body.strip():
        sys.exit("Extracted no bodymatter text — this title's markup may not follow the usual pattern; "
                  "check the page by hand.")

    title = info["title"] or args.repo
    author = info["author"]
    header = f"Title: {title}\n" + (f"Author: {author}\n" if author else "") + "\n"
    out_dir = "library-sources"
    os.makedirs(out_dir, exist_ok=True)
    out_path = args.out or os.path.join(out_dir, slugify(title) + ".txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(header + body)

    print(f"Title: {title}")
    if author:
        print(f"Author: {author}")
    if info["translator"]:
        print(f"Translator: {info['translator']}")
    print(f"Body length: {len(body):,} characters")
    print(f"Wrote: {out_path}")
    print("\nLicense: Standard Ebooks dedicates its own typesetting/transcription work to the public "
          "domain (CC0) on top of an already-public-domain source text — confirm on the book's own page "
          f"({info['homepage']}) before shelving, same as every other source.")
    print(f"\nNext step: python tools/caravan/library-draft.py {out_path} --source \"{info['homepage']}\" --license \"Public Domain / CC0 (Standard Ebooks)\"")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("search", help="Search Standard Ebooks titles/authors by keyword")
    sp.add_argument("query")
    sp.add_argument("--limit", type=int, default=10)
    sp.add_argument("--out", default=None, help="Also write full results as JSON")
    sp.set_defaults(func=cmd_search)

    gp = sub.add_parser("get", help="Fetch one book's metadata by its repo name (e.g. marcus-aurelius_meditations_george-long)")
    gp.add_argument("repo")
    gp.set_defaults(func=cmd_get)

    fp = sub.add_parser("fetch-text", help="Fetch a book's full text and write it to library-sources/")
    fp.add_argument("repo")
    fp.add_argument("--out", default=None)
    fp.set_defaults(func=cmd_fetch_text)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
