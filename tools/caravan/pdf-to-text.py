#!/usr/bin/env python3
"""
tools/caravan/pdf-to-text.py — the missing link between a fetched paper
and a real Library shelf entry.

Every other Caravan connector (gutenberg.py, suttacentral.py) works
because its source hands back clean text directly. arxiv.py and
semanticscholar.py can only hand back a PDF — a page-layout format, not
a text format — so a fetched paper has been dead-ending outside the
game. This script does exactly one job: take a PDF, hand back clean
paragraph text in the same library-sources/<slug>.txt shape
library-draft.py already expects (Title:/Author: header, same as
gutenberg.py --for-library). Nothing downstream needs to know the
source was ever a PDF.

Needs `pypdf` (pure-Python, no system-level install: pip install pypdf)
— the one Caravan script that isn't stdlib-only, for exactly that
reason; every other connector's "no dependencies" rule was about
avoiding scraping frameworks, not avoiding PDF parsing.

**Known, real limitation, worth trusting honestly rather than hiding:**
academic PDF layout is messy — two-column text, footnotes, figure
captions, references — and naive extraction can interleave columns or
scramble reading order. This gets you most of the way, not a perfect
extraction; a human read-through before writing the draft's summary
(step 3 of the pipeline, always manual anyway) is the real check, same
trust model as every other step here.

Usage:
    python tools/caravan/pdf-to-text.py library-sources/papers/some-paper.pdf
    python tools/caravan/pdf-to-text.py library-sources/papers/some-paper.pdf --title "..." --author "..."
"""
import argparse
import os
import re
import sys

try:
    from pypdf import PdfReader
except ImportError:
    sys.exit("This script needs the 'pypdf' package (pure-Python, no system install). Run: pip install pypdf")


def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def clean_page_text(text):
    # Undo line-wrap hyphenation ("exam-\nple" -> "example") before
    # anything else collapses the newline it depends on.
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    # A lone newline inside a paragraph is just where the PDF wrapped a
    # line, not an actual paragraph break — join it into a space and
    # let real paragraph breaks (blank lines) survive.
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text(pdf_path):
    reader = PdfReader(pdf_path)
    pages = [clean_page_text(page.extract_text() or "") for page in reader.pages]
    return "\n\n".join(p for p in pages if p), reader.metadata


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf_path", help="Path to a PDF you already have the real right to use")
    ap.add_argument("--title", default=None, help="Overrides the PDF's own metadata title, often unreliable for papers")
    ap.add_argument("--author", default=None)
    ap.add_argument("--out", default=None, help="Output .txt path (default: library-sources/<slug>.txt)")
    args = ap.parse_args()

    if not os.path.isfile(args.pdf_path):
        sys.exit(f"No such file: {args.pdf_path}")

    print(f"Extracting text from {args.pdf_path}...")
    body, metadata = extract_text(args.pdf_path)
    if not body.strip():
        sys.exit("Extracted no text at all — this PDF may be scanned images rather than real text "
                  "(needs OCR, which this script doesn't do) or is otherwise unreadable by pypdf.")

    fallback_title = os.path.splitext(os.path.basename(args.pdf_path))[0].replace("-", " ").title()
    title = args.title or (metadata.title if metadata and metadata.title else fallback_title)
    author = args.author or (metadata.author if metadata and metadata.author else None)

    header = f"Title: {title}\n" + (f"Author: {author}\n" if author else "") + "\n"
    out_path = args.out or os.path.join("library-sources", slugify(title) + ".txt")
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(header + body)

    print(f"Title: {title}")
    if author:
        print(f"Author: {author}")
    print(f"Pages extracted: {len(PdfReader(args.pdf_path).pages)}")
    print(f"Body length: {len(body):,} characters")
    print(f"Wrote: {out_path}")
    print("\nRead this before writing anything: two-column academic layout can scramble reading order "
          "or interleave text with figure captions/references. Skim the output before trusting it.")
    print(f"\nNext step: python tools/caravan/library-draft.py {out_path} --tradition Science")


if __name__ == "__main__":
    main()
