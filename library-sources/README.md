# Library Sources

Raw plain-text downloads live here — the input material for
`library-drafts/`, not the drafts themselves. This folder is
git-ignored on purpose: it's a local cache of full book text, not
project source, and keeping it out of git keeps the repo light.

## The pathway

1. **Download a `.txt` file** from one of the sources in the main
   README's Library section (or ask me — running
   `tools/caravan/gutenberg.py <id>` already saves straight into a JSON
   shape; for other sources, save the plain text here directly). A
   research paper from `arxiv.py download-pdf` or `semanticscholar.py
   download-pdf` lands here as a `.pdf`, not a `.txt` — run
   `tools/caravan/pdf-to-text.py <the .pdf>` first to get plain text,
   then continue at step 3 the same as any other source. Skim the
   output before trusting it: academic PDF layout (two columns,
   footnotes, references) doesn't always extract in perfect reading
   order.
2. **Save it here** as `library-sources/<slug>.txt` — plain text,
   UTF-8, the book's actual title as the filename is fine.
3. **Run** `python tools/caravan/library-draft.py library-sources/<slug>.txt --source "<url>"`
   — it reads the file, detects title/author when it can, and writes a
   pre-filled draft into `library-drafts/<slug>.md`.
4. From there, follow `library-drafts/README.md`'s own steps: confirm
   the license, decide the tradition, write the real summary, fold the
   finished entry into `src/game/data/seed.js`.

Nothing in this folder ever reaches the shared Library directly — it's
raw material, one step removed even from the draft stage, two steps
removed from an actual shelf.
