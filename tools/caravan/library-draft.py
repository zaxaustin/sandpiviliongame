#!/usr/bin/env python3
"""
Turn a plain-text file you already have into a library-drafts/*.md
starting point — local, no cloud, works fine while you're mid-acquisition.

Takes a .txt file (from the Gutenberg connector, or anywhere else you
already have the real right to use) and writes a pre-filled draft into
library-drafts/, in the exact shape _TEMPLATE.md expects.

What this DOES automate: detecting a title/author if the text has a
Gutenberg-style header, and writing the file in the right shape so
you're filling in a summary, not fighting a blank template. Optionally
(--ai-draft, off by default), asking a local Ollama model to *suggest* a
summary and tradition — always left clearly marked as a suggestion to
confirm, never written in as final.

What this does NOT do, ever: guess whether something is legal to shelve.
License and source are always left for you to confirm by hand — that
judgment call doesn't get automated here, on purpose, the same as every
other review step in this project. --ai-draft never touches either field,
even when it succeeds.

Usage:
    python tools/caravan/library-draft.py mytext.txt
    python tools/caravan/library-draft.py mytext.txt --title "..." --author "..." --license "Public Domain" --source "https://..." --tradition Daoism
    python tools/caravan/library-draft.py mytext.txt --ai-draft   # needs Ollama already running locally; falls back to plain TODOs if it isn't
"""
import argparse
import json
import os
import re
import urllib.request

TITLE_LINE = re.compile(r"^Title:\s*(.+)$", re.MULTILINE)
AUTHOR_LINE = re.compile(r"^Author:\s*(.+)$", re.MULTILINE)
TRADITIONS = ["Theravada", "Mahayana", "Daoism", "Practice", "Science", "Classics",
              "Native American", "Hindu", "Tantra"]


def slugify(s):
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "untitled"


def ai_suggest(excerpt, ai_url):
    """Ask a local Ollama model for a *suggested* summary + tradition —
    never a final answer, never touches license/source. Returns None on
    any failure (Ollama not running, bad JSON, timeout) so this always
    degrades cleanly to the plain-TODO behavior below, never a hard
    dependency on Ollama being installed at all."""
    prompt = (
        "You are helping draft an entry for a small, hand-curated Library commons. Given the "
        "start of a real text below, suggest a short, honest 1-2 sentence summary in your own "
        "words (not a copied blurb), and which tradition it most likely belongs to, from exactly "
        "this list: " + ", ".join(TRADITIONS) + ", or Other if none fit.\n"
        'Respond with ONLY a JSON object, no other text: {"summary": "...", "tradition": "..."}\n\n'
        "Text excerpt:\n" + excerpt[:3000]
    )
    body = json.dumps({
        "model": "llama3.2", "stream": False, "think": False,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    try:
        req = urllib.request.Request(
            ai_url.rstrip("/") + "/api/chat", data=body,
            headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        content = result.get("message", {}).get("content", "")
        match = re.search(r"\{.*\}", content, re.DOTALL)
        return json.loads(match.group(0)) if match else None
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("textfile", help="Path to a plain-text file you already have the right to use")
    ap.add_argument("--title", default=None)
    ap.add_argument("--author", default=None)
    ap.add_argument("--license", default=None, help="Never guessed automatically — you confirm this")
    ap.add_argument("--source", default=None, help="Where the text actually came from")
    ap.add_argument("--tradition", default=None)
    ap.add_argument("--out-dir", default="library-drafts")
    ap.add_argument("--ai-draft", action="store_true",
                     help="Ask a local Ollama model to suggest a summary and tradition. Needs "
                          "Ollama already running at --ai-url; falls back to plain TODOs, same as "
                          "not passing this flag at all, if it isn't reachable. Never touches "
                          "license or source, even when it succeeds.")
    ap.add_argument("--ai-url", default="http://localhost:11434", help="Ollama base URL")
    args = ap.parse_args()

    with open(args.textfile, "r", encoding="utf-8", errors="replace") as f:
        raw = f.read()

    title_match = TITLE_LINE.search(raw)
    author_match = AUTHOR_LINE.search(raw)
    title = args.title or (title_match.group(1).strip() if title_match else os.path.splitext(os.path.basename(args.textfile))[0])
    author = args.author or (author_match.group(1).strip() if author_match else None)

    ai = None
    if args.ai_draft:
        print("Asking the local Ollama model for a suggested summary and tradition…")
        ai = ai_suggest(raw, args.ai_url)
        if ai is None:
            print("Couldn't get a suggestion (Ollama not running, or an unexpected reply) —")
            print("falling back to plain TODOs, same as not passing --ai-draft at all.")

    ai_tradition = ai.get("tradition") if ai else None
    ai_summary = ai.get("summary") if ai else None

    slug = slugify(title)
    os.makedirs(args.out_dir, exist_ok=True)
    out_path = os.path.join(args.out_dir, slug + ".md")

    tradition_line = args.tradition or (
        f"{ai_tradition} — AI-suggested, decide deliberately before shelving (see README in this folder)"
        if ai_tradition else
        'TODO — Theravada | Mahayana | Daoism | Practice | (something else — decide deliberately, see the README in this folder)'
    )
    summary_block = (
        f"{ai_summary}\n\n↑ AI-suggested — read the actual text and confirm this is honest and "
        f"accurate before shelving, then remove this note."
        if ai_summary else
        f"TODO — one to two sentences, in your own words. Open `{os.path.basename(args.textfile)}`\n"
        f"itself to actually read enough of it to write this honestly."
    )

    md = f"""# {title}

**Tradition:** {tradition_line}
**License:** {args.license or 'TODO — confirm this yourself before anything else; never assumed automatically'}
**Source URL:** {args.source or 'TODO'}
**Attribution:** {author or 'TODO'}

## Summary

{summary_block}

## Section 1 — a heading

TODO

## Section 2 — a heading

TODO
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md)

    print(f"Title detected: {title}")
    print(f"Author detected: {author}" if author else "No author line detected — fill in Attribution by hand.")
    if ai_summary or ai_tradition:
        print("AI-suggested summary/tradition written in, clearly marked — read them before trusting them.")
    print(f"Wrote: {out_path}")
    print("\nStill needs a human, always: confirm the license is actually correct, decide the")
    print("tradition on purpose, and write a real summary from having actually read some of it.")


if __name__ == "__main__":
    main()
