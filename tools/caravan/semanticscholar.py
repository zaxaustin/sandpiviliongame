#!/usr/bin/env python3
"""
tools/caravan/semanticscholar.py — the Caravan's research-paper connector.

Searches Semantic Scholar's free public API (api.semanticscholar.org) —
real citation-aware search across academic AI/ML research, no scraping,
no Google Scholar (which has no API and whose terms explicitly prohibit
automated access — deliberately not built). Same one-connector-per-
named-source discipline as gutenberg.py and suttacentral.py.

What this gets you: title, authors, year, venue, abstract, and — when
the paper is open access — a direct PDF link. It does NOT extract full
text from PDFs (that needs a PDF-parsing library, a real dependency this
project's connectors don't otherwise need); reading a fetched PDF today
happens outside the game, the same way any downloaded file would. An
abstract alone is often enough to judge relevance before spending time
on the full paper.

**Rate limits, read this first:** Semantic Scholar's unauthenticated
pool is shared across everyone hitting the API with no key and gets
exhausted fast — confirmed hitting HTTP 429 repeatedly with backoff from
this machine during setup. A free API key (instant signup, no cost:
https://www.semanticscholar.org/product/api#api-key-form) raises your
own limit dramatically and is the realistic way to use this reliably.
Set it as SEMANTIC_SCHOLAR_API_KEY and this script will send it
automatically; without one, expect occasional/frequent 429s, especially
in bursts.

Usage:
    python semanticscholar.py search "large language model memory" --limit 10
    python semanticscholar.py search "in-context learning" --year-min 2022 --open-access-only
    python semanticscholar.py get 649def34f8be52c8b66281af98ae884c09aef38

    python semanticscholar.py search "transformer memory" --out results.json
    python semanticscholar.py download-pdf 649def34f8be52c8b66281af98ae884c09aef38

No third-party packages required — stdlib only, same as every other
Caravan connector.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API_BASE = "https://api.semanticscholar.org/graph/v1"
FIELDS = "title,year,authors,abstract,venue,externalIds,openAccessPdf,url"


def api_key():
    return os.environ.get("SEMANTIC_SCHOLAR_API_KEY")


def request_json(url, max_retries=3):
    headers = {"User-Agent": "SandPavilionCaravan/1.0"}
    key = api_key()
    if key:
        headers["x-api-key"] = key
    for attempt in range(max_retries):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(f"  (429 rate-limited, waiting {wait}s and retrying...)", file=sys.stderr)
                time.sleep(wait)
                continue
            body = e.read().decode("utf-8", "replace")
            if e.code == 429:
                sys.exit(
                    "Still rate-limited after retries. Semantic Scholar's unauthenticated pool "
                    "is shared and often exhausted - get a free API key and set "
                    "SEMANTIC_SCHOLAR_API_KEY: https://www.semanticscholar.org/product/api#api-key-form"
                )
            sys.exit(f"Semantic Scholar returned {e.code}: {body}")


def summarize_paper(p):
    return {
        "title": p.get("title"),
        "year": p.get("year"),
        "venue": p.get("venue"),
        "authors": [a.get("name") for a in (p.get("authors") or [])],
        "paperId": p.get("paperId"),
        "url": p.get("url"),
        "abstract": p.get("abstract"),
        "openAccessPdfUrl": (p.get("openAccessPdf") or {}).get("url"),
        "externalIds": p.get("externalIds"),
    }


def cmd_search(args):
    params = {"query": args.query, "limit": str(args.limit), "fields": FIELDS}
    if args.year_min:
        params["year"] = f"{args.year_min}-"
    url = f"{API_BASE}/paper/search?{urllib.parse.urlencode(params)}"
    data = request_json(url)
    papers = [summarize_paper(p) for p in data.get("data", [])]
    if args.open_access_only:
        papers = [p for p in papers if p["openAccessPdfUrl"]]

    for p in papers:
        oa = " [open access PDF]" if p["openAccessPdfUrl"] else ""
        print(f"\n{p['paperId']}  ({p['year']}){oa}")
        print(f"  {p['title']}")
        if p["authors"]:
            print(f"  {', '.join(p['authors'][:4])}" + (" et al." if len(p["authors"]) > 4 else ""))
        if p["venue"]:
            print(f"  {p['venue']}")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(papers, f, ensure_ascii=False, indent=2)
        print(f"\nWrote {len(papers)} results to {args.out}")


def cmd_get(args):
    url = f"{API_BASE}/paper/{args.paper_id}?fields={FIELDS}"
    data = request_json(url)
    p = summarize_paper(data)
    print(json.dumps(p, ensure_ascii=False, indent=2))


def cmd_download_pdf(args):
    url = f"{API_BASE}/paper/{args.paper_id}?fields={FIELDS}"
    data = request_json(url)
    p = summarize_paper(data)
    pdf_url = p["openAccessPdfUrl"]
    if not pdf_url:
        sys.exit(f"'{p['title']}' has no open-access PDF available through Semantic Scholar.")
    out_dir = args.out_dir or "library-sources/papers"
    os.makedirs(out_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() else "-" for c in p["title"].lower()).strip("-")
    out_path = os.path.join(out_dir, slug + ".pdf")
    req = urllib.request.Request(pdf_url, headers={"User-Agent": "SandPavilionCaravan/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        with open(out_path, "wb") as f:
            f.write(resp.read())
    print(f"Downloaded: {out_path}")
    print("Note: this is the raw PDF, not yet plain text — the Sand Pavilion's Reader doesn't "
          "render PDFs today, so this is for reading outside the game for now.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("search", help="Search papers by keyword")
    sp.add_argument("query")
    sp.add_argument("--limit", type=int, default=10)
    sp.add_argument("--year-min", type=int, default=None)
    sp.add_argument("--open-access-only", action="store_true")
    sp.add_argument("--out", default=None, help="Also write full results as JSON")
    sp.set_defaults(func=cmd_search)

    gp = sub.add_parser("get", help="Fetch one paper's metadata + abstract by its Semantic Scholar ID")
    gp.add_argument("paper_id")
    gp.set_defaults(func=cmd_get)

    dp = sub.add_parser("download-pdf", help="Download a paper's PDF, if open access")
    dp.add_argument("paper_id")
    dp.add_argument("--out-dir", default=None)
    dp.set_defaults(func=cmd_download_pdf)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
