#!/usr/bin/env python3
"""
tools/caravan/openalex.py — the Caravan's open-scholarly-index connector.

OpenAlex (openalex.org) is a fully open index of ~250M scholarly works —
a free, modern replacement for the old Microsoft Academic Graph. One API,
no signup, no key, and it links straight to the legal open-access copy of
a paper when one exists, across many publishers in one lookup — a real
advantage over arxiv.py/semanticscholar.py, which can each only ever see
their own single source. Same one-connector-per-named-source discipline
as every other Caravan script; this one just happens to cover far more
ground per lookup.

What this gets you: title, authors, year, an OpenAlex/DOI-based ID, a
reconstructed plain-text abstract (OpenAlex stores abstracts as a word
position index for copyright reasons, not as a string — this script
reconstructs it), and — when a legal open-access copy exists anywhere —
its PDF URL and license (when the source actually declares one; many
repositories, arXiv included, don't set this field even though the paper
itself is freely readable). It does NOT extract full text from PDFs;
pair with tools/caravan/pdf-to-text.py for that, same as arxiv.py.

**Being polite, not required but real:** OpenAlex asks callers to include
a contact email as `mailto` — doing so puts requests in a faster, more
reliable pool. Set OPENALEX_MAILTO (your own email) and this script sends
it automatically; without one, requests still work, just potentially
slower under load.

Usage:
    python openalex.py search "large language model memory" --limit 10
    python openalex.py search "in-context learning" --open-access-only --year-min 2022
    python openalex.py get W2026267776
    python openalex.py get 10.1038/nrn3916          # also accepts a bare DOI
    python openalex.py download-pdf W3036167779

No third-party packages required — stdlib only, same as every other
Caravan connector except pdf-to-text.py.
"""
import argparse
import io
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

# Windows consoles often default stdout to cp1252, which mangles non-ASCII
# author names and punctuation instead of erroring — force UTF-8 explicitly,
# same fix arxiv.py already needed for the same reason.
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

API_BASE = "https://api.openalex.org"
SELECT = "id,doi,title,publication_year,authorships,open_access,best_oa_location,abstract_inverted_index"


def mailto_param():
    email = os.environ.get("OPENALEX_MAILTO")
    return {"mailto": email} if email else {}


def request_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "SandPavilionCaravan/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"OpenAlex returned {e.code}: {e.read().decode('utf-8', 'replace')}")


def reconstruct_abstract(inverted_index):
    if not inverted_index:
        return None
    positions = {}
    for word, idxs in inverted_index.items():
        for i in idxs:
            positions[i] = word
    return " ".join(positions[i] for i in sorted(positions))


def summarize_work(w):
    authors = [a["author"]["display_name"] for a in (w.get("authorships") or [])]
    oa = w.get("open_access") or {}
    best = w.get("best_oa_location") or {}
    doi = (w.get("doi") or "").replace("https://doi.org/", "")
    return {
        "id": (w.get("id") or "").rsplit("/", 1)[-1],
        "doi": doi or None,
        "title": w.get("title"),
        "year": w.get("publication_year"),
        "authors": authors,
        "isOpenAccess": oa.get("is_oa", False),
        "oaUrl": oa.get("oa_url"),
        "pdfUrl": best.get("pdf_url"),
        "license": best.get("license"),
        "abstract": reconstruct_abstract(w.get("abstract_inverted_index")),
    }


def cmd_search(args):
    params = {"search": args.query, "per-page": str(args.limit), "select": SELECT}
    if args.open_access_only:
        params["filter"] = "open_access.is_oa:true"
    if args.year_min:
        yr_filter = f"publication_year:>{args.year_min - 1}"
        params["filter"] = (params.get("filter") + "," + yr_filter) if "filter" in params else yr_filter
    params.update(mailto_param())
    url = f"{API_BASE}/works?{urllib.parse.urlencode(params)}"
    data = request_json(url)
    works = [summarize_work(w) for w in data.get("results", [])]

    total = data.get("meta", {}).get("count", "?")
    print(f"{total} total matches, showing {len(works)}:")
    for w in works:
        oa_tag = " [open access PDF]" if w["pdfUrl"] else (" [open access]" if w["isOpenAccess"] else "")
        print(f"\n{w['id']}  ({w['year']}){oa_tag}")
        print(f"  {w['title']}")
        if w["authors"]:
            print(f"  {', '.join(w['authors'][:4])}" + (" et al." if len(w["authors"]) > 4 else ""))
        if w["license"]:
            print(f"  license: {w['license']}")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(works, f, ensure_ascii=False, indent=2)
        print(f"\nWrote {len(works)} results to {args.out}")


def resolve_id(raw_id):
    # Accepts a bare OpenAlex ID (W123...), a full openalex.org URL, a bare
    # DOI (10.xxxx/...), or a full doi.org URL — OpenAlex's own /works/
    # endpoint understands all of these once given the right prefix.
    if raw_id.startswith("http"):
        return raw_id.rsplit("/", 1)[-1] if "openalex.org" in raw_id else raw_id
    if raw_id.startswith("10."):
        return f"doi:{raw_id}"
    return raw_id


def cmd_get(args):
    params = mailto_param()
    params["select"] = SELECT
    url = f"{API_BASE}/works/{resolve_id(args.work_id)}?{urllib.parse.urlencode(params)}"
    w = request_json(url)
    print(json.dumps(summarize_work(w), ensure_ascii=False, indent=2))


def cmd_download_pdf(args):
    params = mailto_param()
    params["select"] = SELECT
    url = f"{API_BASE}/works/{resolve_id(args.work_id)}?{urllib.parse.urlencode(params)}"
    w = summarize_work(request_json(url))
    if not w["pdfUrl"]:
        sys.exit(f"'{w['title']}' has no open-access PDF OpenAlex knows about "
                 "(check oaUrl / the paper's own landing page by hand).")
    out_dir = args.out_dir or "library-sources/papers"
    os.makedirs(out_dir, exist_ok=True)
    slug = "".join(c if c.isalnum() else "-" for c in w["title"].lower()).strip("-")
    out_path = os.path.join(out_dir, slug + ".pdf")
    req = urllib.request.Request(w["pdfUrl"], headers={"User-Agent": "SandPavilionCaravan/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"Fetching the PDF itself failed ({e.code}) even though OpenAlex listed it as open access — "
                  f"try the landing page by hand: {w['oaUrl']}")
    with open(out_path, "wb") as f:
        f.write(data)
    print(f"Downloaded: {out_path}")
    print(f"License OpenAlex reports for this copy: {w['license'] or '(not declared — confirm on the source page before shelving)'}")
    print("Note: this is the raw PDF, not yet plain text — run tools/caravan/pdf-to-text.py on it next.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("search", help="Search works by keyword")
    sp.add_argument("query")
    sp.add_argument("--limit", type=int, default=10)
    sp.add_argument("--year-min", type=int, default=None)
    sp.add_argument("--open-access-only", action="store_true")
    sp.add_argument("--out", default=None, help="Also write full results as JSON")
    sp.set_defaults(func=cmd_search)

    gp = sub.add_parser("get", help="Fetch one work's metadata + abstract by OpenAlex ID or DOI")
    gp.add_argument("work_id")
    gp.set_defaults(func=cmd_get)

    dp = sub.add_parser("download-pdf", help="Download a work's open-access PDF, if OpenAlex knows one")
    dp.add_argument("work_id")
    dp.add_argument("--out-dir", default=None)
    dp.set_defaults(func=cmd_download_pdf)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
