#!/usr/bin/env python3
"""
tools/caravan/epub-to-text.py — turn an EPUB you already have into clean
shelf-ready text, so you never have to format a .txt by hand.

EPUB is the format most free-book sites hand you (Standard Ebooks,
Project Gutenberg's "EPUB" download, many library exports). Under the
hood it's just a ZIP of XHTML chapter files plus a manifest that lists
their real reading order — so this reads that structure directly and
writes the same library-sources/<slug>.txt shape the rest of the pipeline
already expects (a "Title:/Author:" header, then the body). Nothing
downstream needs to know the source was ever an EPUB.

Stdlib only — zipfile, xml.etree, html.parser — the same "no third-party
packages" rule every Caravan connector holds except pdf-to-text.py. An
EPUB is a well-structured, documented format; parsing it needs no
scraping framework and no page-layout guessing, unlike a PDF.

How it stays honest about what's the actual book:
  - It follows the EPUB's own SPINE (its declared reading order), not
    whatever order files happen to sit in the ZIP.
  - It reads the EPUB3 `epub:type` semantic vocabulary when present
    (the same stable standard standardebooks.py already relies on) to
    drop titlepage / imprint / colophon / copyright / table-of-contents
    boilerplate, keeping the real chapters — by structure, not by
    guessing. When a file carries no such markup (older/plainer EPUBs),
    its text is kept rather than dropped, so nothing real is lost.
  - Navigation, scripts, and styles are always skipped.

What it does NOT do, on purpose (same as every step here): decide whether
the book is legal to shelve. License and source stay yours to confirm by
hand in the draft step — an EPUB from Standard Ebooks is public-domain/CC0,
but an EPUB is just a container and says nothing about rights on its own.

Usage:
    python tools/caravan/epub-to-text.py path/to/book.epub
    python tools/caravan/epub-to-text.py book.epub --title "..." --author "..."
    python tools/caravan/epub-to-text.py book.epub --out library-sources/my-book.txt

Then either:
  - drag the resulting .txt onto the Caravan Desk in-game ("+ Add a text
    by hand"), or
  - keep going in the terminal:
    python tools/caravan/library-draft.py library-sources/<slug>.txt
"""
import argparse
import io
import os
import posixpath
import re
import sys
import zipfile
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BLOCK_TAGS = {"p", "div", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
              "figcaption", "td", "tr", "dd", "dt", "pre"}
SKIP_TAGS = {"script", "style", "head", "nav"}
FRONT_BACK_MARKER = re.compile(r"\b(frontmatter|backmatter|toc|titlepage|imprint|colophon|copyright-page)\b")
CONTAINER_PATH = "META-INF/container.xml"


def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def local(tag):
    """Local name of a possibly namespaced ElementTree tag ('{ns}title' -> 'title')."""
    return tag.rsplit("}", 1)[-1].lower()


class ChapterExtractor(HTMLParser):
    """Extract readable block text from one XHTML document.

    Keeps text by default; suppresses it only while inside a <section>/
    <article> whose epub:type marks it as frontmatter/backmatter/nav
    boilerplate, or inside a skip tag (script/style/head/nav). This "keep
    unless told otherwise" stance is what makes it work on plain EPUBs
    that carry no epub:type at all, while still trimming the boilerplate
    from richly-tagged ones like Standard Ebooks."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0
        self.suppress_stack = []   # epub:type frontmatter/backmatter/etc. sections
        self.section_types = []    # parallel: whether each open section/article was a suppressor
        self.chunks = []
        self.current = []

    def _keeping(self):
        return self.skip_depth == 0 and not any(self.suppress_stack)

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            return
        if tag in ("section", "article"):
            etype = dict(attrs).get("epub:type", "")
            suppress = bool(FRONT_BACK_MARKER.search(etype))
            self.suppress_stack.append(suppress)
            self.section_types.append(tag)
            return
        if tag == "br" and self._keeping():
            self.current.append(" ")
        elif tag in BLOCK_TAGS and self._keeping():
            self._flush()

    def handle_startendtag(self, tag, attrs):
        if tag.lower() == "br" and self._keeping():
            self.current.append(" ")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in SKIP_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if tag in ("section", "article") and self.section_types:
            self.section_types.pop()
            if self.suppress_stack:
                self.suppress_stack.pop()
            return
        if tag in BLOCK_TAGS and self._keeping():
            self._flush()

    def handle_data(self, data):
        if self._keeping():
            self.current.append(data)

    def _flush(self):
        text = re.sub(r"[ \t\r\n]+", " ", "".join(self.current)).strip()
        if text:
            self.chunks.append(text)
        self.current = []

    def get_text(self):
        self._flush()
        return "\n\n".join(self.chunks)


def read_zip_text(zf, path):
    try:
        return zf.read(path).decode("utf-8", errors="replace")
    except KeyError:
        return None


def find_opf_path(zf):
    container = read_zip_text(zf, CONTAINER_PATH)
    if not container:
        sys.exit("Not a valid EPUB: missing META-INF/container.xml (is this really an .epub?).")
    root = ET.fromstring(container)
    for el in root.iter():
        if local(el.tag) == "rootfile" and el.get("full-path"):
            return el.get("full-path")
    sys.exit("Not a valid EPUB: container.xml names no rootfile (the .opf package).")


def parse_opf(zf, opf_path):
    xml = read_zip_text(zf, opf_path)
    if xml is None:
        sys.exit(f"EPUB is missing its package file at {opf_path}.")
    root = ET.fromstring(xml)

    title, author = None, None
    manifest = {}   # id -> href (relative to the opf's own folder)
    spine = []      # list of idrefs, in reading order

    for el in root.iter():
        name = local(el.tag)
        if name == "title" and title is None and (el.text or "").strip():
            title = el.text.strip()
        elif name == "creator" and author is None and (el.text or "").strip():
            author = el.text.strip()
        elif name == "item":
            item_id, href = el.get("id"), el.get("href")
            if item_id and href:
                manifest[item_id] = href
        elif name == "itemref":
            idref = el.get("idref")
            if idref:
                spine.append(idref)

    opf_dir = posixpath.dirname(opf_path)
    docs = []
    for idref in spine:
        href = manifest.get(idref)
        if not href:
            continue
        # Resolve relative to the OPF's folder and normalise (strip #anchors).
        full = posixpath.normpath(posixpath.join(opf_dir, href.split("#", 1)[0]))
        docs.append(full)
    return title, author, docs


def extract_epub(epub_path):
    with zipfile.ZipFile(epub_path) as zf:
        opf_path = find_opf_path(zf)
        title, author, docs = parse_opf(zf, opf_path)
        if not docs:
            sys.exit("EPUB has an empty spine — no readable chapters found.")
        parts = []
        for doc_path in docs:
            xhtml = read_zip_text(zf, doc_path)
            if not xhtml:
                continue
            ex = ChapterExtractor()
            try:
                ex.feed(xhtml)
            except Exception:
                continue  # one malformed chapter shouldn't sink the whole book
            text = ex.get_text()
            if text.strip():
                parts.append(text)
    body = "\n\n".join(parts)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return title, author, body


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("epub_path", help="Path to an .epub you already have the real right to use")
    ap.add_argument("--title", default=None, help="Override the EPUB's own metadata title")
    ap.add_argument("--author", default=None, help="Override the EPUB's own metadata author")
    ap.add_argument("--out", default=None, help="Output .txt path (default: library-sources/<slug>.txt)")
    args = ap.parse_args()

    if not os.path.isfile(args.epub_path):
        sys.exit(f"No such file: {args.epub_path}")

    print(f"Reading {args.epub_path} ...")
    title, author, body = extract_epub(args.epub_path)
    if not body.strip():
        sys.exit("Extracted no text — this EPUB may be image-only (scanned pages, needs OCR) "
                 "or use an unusual structure. Check it in a reader first.")

    fallback = os.path.splitext(os.path.basename(args.epub_path))[0].replace("_", " ").replace("-", " ").title()
    title = args.title or title or fallback
    author = args.author or author

    header = f"Title: {title}\n" + (f"Author: {author}\n" if author else "") + "\n"
    out_path = args.out or os.path.join("library-sources", slugify(title) + ".txt")
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(header + body)

    print(f"Title: {title}")
    if author:
        print(f"Author: {author}")
    print(f"Body length: {len(body):,} characters")
    print(f"Wrote: {out_path}")
    print("\nLicense is still yours to confirm — an EPUB is just a container and says nothing about "
          "rights on its own. (Standard Ebooks and Gutenberg EPUBs are public-domain/CC0; confirm on "
          "the book's own page before shelving, same as every source.)")
    print("\nNext step, either one:")
    print(f"  - in-game: drag {out_path} onto the Caravan Desk (\"+ Add a text by hand\"), or")
    print(f"  - terminal: python tools/caravan/library-draft.py {out_path}")


if __name__ == "__main__":
    main()
