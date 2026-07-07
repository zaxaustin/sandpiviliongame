#!/usr/bin/env python3
"""
Turn a plain-text file you already have into a library-drafts/*.md
starting point — local, no cloud, works fine while you're mid-acquisition.

Takes a .txt file (from the Gutenberg connector, or anywhere else you
already have the real right to use) and writes a pre-filled draft into
library-drafts/, in the exact shape _TEMPLATE.md expects.

What this DOES automate: detecting a title/author if the text has a
Gutenberg-style header, and writing the file in the right shape so
you're filling in a summary, not fighting a blank template.

What this does NOT do, ever: guess whether something is legal to shelve.
License and source are always left for you to confirm by hand — that
judgment call doesn't get automated here, on purpose, the same as every
other review step in this project.

Usage:
    python tools/caravan/library-draft.py mytext.txt
    python tools/caravan/library-draft.py mytext.txt --title "..." --author "..." --license "Public Domain" --source "https://..." --tradition Daoism
"""
import argparse
import os
import re

TITLE_LINE = re.compile(r"^Title:\s*(.+)$", re.MULTILINE)
AUTHOR_LINE = re.compile(r"^Author:\s*(.+)$", re.MULTILINE)


def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("textfile", help="Path to a plain-text file you already have the right to use")
    ap.add_argument("--title", default=None)
    ap.add_argument("--author", default=None)
    ap.add_argument("--license", default=None, help="Never guessed automatically — you confirm this")
    ap.add_argument("--source", default=None, help="Where the text actually came from")
    ap.add_argument("--tradition", default=None)
    ap.add_argument("--out-dir", default="library-drafts")
    args = ap.parse_args()

    with open(args.textfile, "r", encoding="utf-8", errors="replace") as f:
        raw = f.read()

    title_match = TITLE_LINE.search(raw)
    author_match = AUTHOR_LINE.search(raw)
    title = args.title or (title_match.group(1).strip() if title_match else os.path.splitext(os.path.basename(args.textfile))[0])
    author = args.author or (author_match.group(1).strip() if author_match else None)

    slug = slugify(title)
    os.makedirs(args.out_dir, exist_ok=True)
    out_path = os.path.join(args.out_dir, slug + ".md")

    md = f"""# {title}

**Tradition:** {args.tradition or 'TODO — Theravada | Mahayana | Daoism | Practice | (something else — decide deliberately, see the README in this folder)'}
**License:** {args.license or 'TODO — confirm this yourself before anything else; never assumed automatically'}
**Source URL:** {args.source or 'TODO'}
**Attribution:** {author or 'TODO'}

## Summary

TODO — one to two sentences, in your own words. Open `{os.path.basename(args.textfile)}`
itself to actually read enough of it to write this honestly.

## Section 1 — a heading

TODO

## Section 2 — a heading

TODO
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md)

    print(f"Title detected: {title}")
    print(f"Author detected: {author}" if author else "No author line detected — fill in Attribution by hand.")
    print(f"Wrote: {out_path}")
    print("\nStill needs a human, always: confirm the license is actually correct, decide the")
    print("tradition on purpose, and write a real summary from having actually read some of it.")


if __name__ == "__main__":
    main()
