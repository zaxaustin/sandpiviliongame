#!/usr/bin/env python3
"""
tools/caravan/arxiv.py — the Caravan's no-signup research-paper connector.

arXiv's API needs no account, no email, no key, no approval — a real
advantage over Semantic Scholar's key-request form (which flatly refuses
personal email addresses like gmail.com; an institutional/corporate
email is a hard requirement on their end, not something to work around).
Same one-connector-per-named-source discipline as every other Caravan
script; this one just happens to need zero setup.

Every arXiv paper is genuinely open access — unlike Semantic Scholar,
there's no "maybe a PDF, maybe not" here. It does NOT extract text from
the PDF (same reasoning as semanticscholar.py: that needs a real PDF
parsing dependency this project doesn't otherwise carry); the PDF is
there to read outside the game for now.

**One real environment gotcha, hit and fixed during setup on this
machine:** Gutenberg and SuttaCentral both verify fine with this
Python's default SSL trust store, but arXiv's own certificate chain
does not — confirmed with `CERTIFICATE_VERIFY_FAILED: unable to get
local issuer certificate` even though other HTTPS sites worked. Fixed
by installing `certifi` (`pip install certifi`) and explicitly using
its CA bundle for this connector's requests. This is the one Caravan
script that isn't stdlib-only, for exactly that reason — every other
script in this folder verified fine without it.

Usage:
    python arxiv.py search "large language model memory" --limit 10
    python arxiv.py search "in-context learning" --category cs.CL --limit 5
    python arxiv.py get 2607.06341
    python arxiv.py download-pdf 2607.06341

Search query syntax (arXiv's own): prefix terms with all:/ti:/au:/abs:/cat:
and combine with AND/OR/ANDNOT, e.g. 'all:memory AND cat:cs.LG'.
"""
import argparse
import io
import json
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

# Windows consoles often default stdout to cp1252, which mangles non-ASCII
# author names (e.g. "Jörg") instead of erroring — silent corruption is worse
# than a crash, so force UTF-8 explicitly rather than leave it to the OS default.
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    sys.exit("This connector needs the 'certifi' package (arXiv's cert chain doesn't verify "
              "against this Python's default trust store). Run: pip install certifi")

API_BASE = "http://export.arxiv.org/api/query"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "SandPavilionCaravan/1.0"})
    with urllib.request.urlopen(req, timeout=20, context=SSL_CONTEXT) as resp:
        return resp.read()


def parse_entry(entry):
    def text(tag):
        el = entry.find(f"atom:{tag}", ATOM_NS)
        return el.text.strip() if el is not None and el.text else None

    arxiv_id = text("id")  # e.g. http://arxiv.org/abs/2607.06341v1
    short_id = arxiv_id.rsplit("/", 1)[-1] if arxiv_id else None
    pdf_url = None
    html_url = None
    for link in entry.findall("atom:link", ATOM_NS):
        if link.get("title") == "pdf":
            pdf_url = link.get("href")
        elif link.get("rel") == "alternate":
            html_url = link.get("href")
    authors = [a.find("atom:name", ATOM_NS).text for a in entry.findall("atom:author", ATOM_NS)]
    category = entry.find("arxiv:primary_category", ATOM_NS)

    return {
        "arxivId": short_id,
        "title": re.sub(r"\s+", " ", text("title") or "").strip(),
        "authors": authors,
        "published": (text("published") or "")[:10],
        "summary": re.sub(r"\s+", " ", text("summary") or "").strip(),
        "primaryCategory": category.get("term") if category is not None else None,
        "htmlUrl": html_url,
        "pdfUrl": pdf_url,
    }


def cmd_search(args):
    query = args.query
    if args.category:
        query = f"({query}) AND cat:{args.category}"
    params = {
        "search_query": query,
        "start": "0",
        "max_results": str(args.limit),
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    url = f"{API_BASE}?{urllib.parse.urlencode(params)}"
    root = ET.fromstring(fetch(url))
    total = root.find("opensearch:totalResults", {"opensearch": "http://a9.com/-/spec/opensearch/1.1/"})
    papers = [parse_entry(e) for e in root.findall("atom:entry", ATOM_NS)]

    print(f"{total.text if total is not None else '?'} total matches, showing {len(papers)}:")
    for p in papers:
        print(f"\n{p['arxivId']}  ({p['published']}){' [' + p['primaryCategory'] + ']' if p['primaryCategory'] else ''}")
        print(f"  {p['title']}")
        if p["authors"]:
            print(f"  {', '.join(p['authors'][:4])}" + (" et al." if len(p["authors"]) > 4 else ""))

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(papers, f, ensure_ascii=False, indent=2)
        print(f"\nWrote {len(papers)} results to {args.out}")


def cmd_get(args):
    url = f"{API_BASE}?id_list={args.arxiv_id}"
    root = ET.fromstring(fetch(url))
    entries = root.findall("atom:entry", ATOM_NS)
    if not entries:
        sys.exit(f"No paper found for arXiv ID '{args.arxiv_id}'.")
    print(json.dumps(parse_entry(entries[0]), ensure_ascii=False, indent=2))


def cmd_download_pdf(args):
    url = f"{API_BASE}?id_list={args.arxiv_id}"
    root = ET.fromstring(fetch(url))
    entries = root.findall("atom:entry", ATOM_NS)
    if not entries:
        sys.exit(f"No paper found for arXiv ID '{args.arxiv_id}'.")
    p = parse_entry(entries[0])
    if not p["pdfUrl"]:
        sys.exit(f"'{p['title']}' has no PDF link (unexpected for arXiv — check the paper page).")
    out_dir = args.out_dir or "library-sources/papers"
    os.makedirs(out_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() else "-" for c in p["title"].lower()).strip("-")
    out_path = os.path.join(out_dir, slug + ".pdf")
    data = fetch(p["pdfUrl"])
    with open(out_path, "wb") as f:
        f.write(data)
    print(f"Downloaded: {out_path}")
    print("Note: this is the raw PDF, not yet plain text — the Sand Pavilion's Reader doesn't "
          "render PDFs today, so this is for reading outside the game for now.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("search", help="Search papers by keyword")
    sp.add_argument("query")
    sp.add_argument("--limit", type=int, default=10)
    sp.add_argument("--category", default=None, help="e.g. cs.CL, cs.LG, cs.AI")
    sp.add_argument("--out", default=None, help="Also write full results as JSON")
    sp.set_defaults(func=cmd_search)

    gp = sub.add_parser("get", help="Fetch one paper's metadata by its arXiv ID (e.g. 2607.06341)")
    gp.add_argument("arxiv_id")
    gp.set_defaults(func=cmd_get)

    dp = sub.add_parser("download-pdf", help="Download a paper's PDF")
    dp.add_argument("arxiv_id")
    dp.add_argument("--out-dir", default=None)
    dp.set_defaults(func=cmd_download_pdf)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
