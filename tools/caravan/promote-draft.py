#!/usr/bin/env python3
"""
RETIRED 2026-08-02 — the push step no longer goes anywhere.

This wrote a row into a hosted database that the game read as its
catalog. That backend was deleted outright rather than left dormant
(CLAUDE.md, 2026-07-12 standing decision), so there is nothing at the
far end of this any more and no key is needed by anybody.

What is still useful: the draft PARSER below, and its refusal to accept
a draft whose license or tradition still says TODO. Run it as a check,
then add the entry to src/game/data/seed.js by hand and rebuild — see
PROTOCOLS.md, Protocol 1, Pathway B. The catalog is source code now, so
a shelf change is a reviewable commit.

tools/caravan/promote-draft.py — now a draft CHECKER, not a publisher.

Takes a completed library-drafts/*.md file (see library-drafts/README.md
and _TEMPLATE.md for the exact shape), parses it, prints the fields you
will need, and stops. It writes nothing and moves nothing.

Refuses a draft whose license or tradition is still literally "TODO" —
the one non-negotiable check this project's own rules already state in
the in-game Steward Review Queue. Every other judgment (does this
actually belong on a shelf, is the summary honest) is yours, made before
you ever run this — it does the mechanical part, never the reading.

Usage:
    python tools/caravan/promote-draft.py library-drafts/lieh-tzu.md

NO KEYS, NO ACCOUNT, NO NETWORK. The SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
this file used to demand are gone along with the service they named. If you
find a doc still asking for them, that doc is stale — say so.

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

    # THE PUSH STEP IS RETIRED; THE CHECKING STEP IS NOT.
    #
    # This script used to end by inserting a row into a Supabase project,
    # deleted 2026-08-02. What survives is the half worth keeping: parse_draft()
    # refuses a draft that still says TODO in its license or attribution, which
    # is the provenance-first rule made executable, and PROTOCOLS.md Pathway B
    # step 4 tells people to run it for exactly that.
    #
    # So: validate loudly, then stop honestly and say where the row goes now.
    # Killing the validator along with the dead push would have removed the one
    # automated check on the rule this project cares most about.
    with open(args.draft, "r", encoding="utf-8") as f:
        text = f.read()

    row = parse_draft(text)          # raises/exits if the draft still says TODO
    print(f"Draft parses clean: {row['title']}  ({row['tradition']}, {row['license']})")
    print(f"  slug:        {row['slug']}")
    print(f"  source_url:  {row.get('source_url') or '(none)'}")
    print(f"  attribution: {row.get('attribution') or '(none)'}")

    sys.exit(
        "\nTHAT IS AS FAR AS THIS SCRIPT GOES, and the draft above is fine.\n"
        "\n"
        "The push step is retired. It wrote to Supabase, which this project\n"
        "deleted on 2026-08-02; no environment variable brings it back, and\n"
        "the draft has deliberately NOT been moved to done/.\n"
        "\n"
        "To finish, pick the one that matches what you are doing:\n"
        "\n"
        "  a book for YOUR Pavilion  ->  drag the .txt or .epub onto the\n"
        "     window, or Workshop -> Caravan Desk -> 'Add a text by hand'.\n"
        "     This is the real path and needs none of this pipeline.\n"
        "\n"
        "  a book for the SHIPPED catalog  ->  add the entry to\n"
        "     src/game/data/seed.js by hand, then `npm run build:beta` and\n"
        "     `npm test`. The fields above are every field you need.\n"
        "     PROTOCOLS.md Pathway B step 4 is the long version.\n"
        "\n"
        "The shipped catalog is source code now, so shelving a book is a\n"
        "commit someone can read, review and revert. That is the feature."
    )


if __name__ == "__main__":
    main()
