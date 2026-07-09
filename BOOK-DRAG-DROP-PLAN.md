# Book Drag-and-Drop Plan

Not started as code — this is the written plan first, same as every
other `*-PLAN.md` in this repo. See README's "What's next" for how
this fits the rest of the priority list.

## The actual idea, as asked for (2026-07-09)

Open an interface at the Caravan Desk, pick which website a book came
from, drag the actual file onto it, and the Pavilion "does the
lifting" — files it properly instead of the current terminal-only
pipeline. If the source isn't one of the preloaded, known websites,
it goes under the user's own notes instead of the shared queue.

## The one real constraint this plan has to design around

This is a browser-based game (a plain Vite/JS app, with an Electron
wrapper around the same code) — not a native app with filesystem
access by default. A dropped file's bytes are readable in the browser
via the standard HTML5 Drag-and-Drop + `FileReader` APIs, no problem.
But **writing that file to `library-sources/`, or running a Python
script (`library-draft.py`, `pdf-to-text.py`) against it, is not
something plain browser JavaScript can do** — no filesystem write, no
shelling out to a script. That's exactly why the current pipeline is
terminal-based in the first place, not an oversight to just code
around.

Two real paths, not equally simple:

**Path A — client-side only, works in the browser and the desktop app
identically.** Don't touch the filesystem or Python at all. Read the
dropped file directly in JS (`FileReader.readAsText` for `.txt` —
trivial), auto-detect a Gutenberg-style `Title:`/`Author:` header the
same way `library-draft.py`'s regex already does (that logic ports to
JS in a few lines), and pre-fill the **existing** "+ Add a text by
hand" form at the Caravan Desk (`newReviewManualForm`) with the
result — title, body, and a source dropdown (see below) instead of a
blank text field. From there it's the exact same Steward Review Queue
flow that already exists: approve, confirm license, generate a batch.
**This reuses real, already-built UI wholesale** — the new work is
just the drop zone and the auto-fill, not a new pipeline.

**Path B — real filesystem integration, Electron-only.** The drop zone
sends the file to the Electron main process (which has real Node.js
filesystem access) over IPC, which writes it into
`library-sources/<source>/` and can actually invoke `library-draft.py`
for a real pre-filled draft file, matching the terminal workflow
exactly. More capable (handles PDFs by shelling out to
`pdf-to-text.py`, keeps the raw file on disk the way the Caravan
pipeline already expects), but only ever works in the desktop app, not
a browser tab — a real, permanent capability gap between the two, not
a temporary limitation to code around later.

**Recommendation: build Path A first.** It's smaller, works everywhere
this game already runs, and gets the actual ask (drag a book in, don't
retype it by hand) working immediately for `.txt` files — which is
most of what actually gets sourced today. Path B is a real, separate
project (Electron IPC, invoking Python from the main process) worth
revisiting once Path A proves the interaction is actually used.

## The "pick the website" idea, mapped onto what already exists

`library-inbox/` already sorts manually-downloaded books into one
subfolder per source. The drop interface's source picker is that same
idea, surfaced in-game: a dropdown of known sources (Gutenberg,
Standard Ebooks, SuttaCentral, arXiv, OpenAlex, Archive.org, Wikisource
once it exists), each pre-filling the license/attribution fields the
same way a human filling out `library-draft.py --license` by hand
would — Gutenberg pre-suggests "Public Domain (Project Gutenberg)",
Standard Ebooks pre-suggests "Public Domain / CC0 (Standard Ebooks)",
and so on. Never auto-*confirms* the license — same non-negotiable
rule as everywhere else in this pipeline — just saves retyping the
same string every time for a known-quantity source.

**"If we can't find the website preloaded, put it under that user's
notes"** — exactly right, and it already maps onto something real:
route anything from an unrecognized source to the Research Desk's
personal notes (or a new project) instead of the shared Steward Review
Queue. That's the correct distinction already established in
`LIBRARY-GROWTH-PLAN.md` — personal reading/reference has much more
latitude than what goes on a shared shelf with a steward's name on it.
An unknown source hasn't earned shared-shelf trust yet; personal notes
is exactly where it belongs until it has.

## What doesn't change

The actual editorial step stays exactly as manual as it already is —
title/author auto-detection and a pre-filled form is not the same as
writing an honest summary, confirming a license, or deciding a
tradition. This plan automates the retyping, never the judgment.

## Rough shape, once this is picked up

1. A drop zone at the Caravan Desk, `.txt` only for v1 — reads the file
   client-side, runs the same header-detection regex `library-draft.py`
   already uses, and opens the existing manual-entry form pre-filled.
2. The source picker — a short, hand-maintained list matching known
   Caravan connectors, each with its own pre-filled license string.
3. Unknown-source routing to personal notes instead of the shared
   queue.
4. `.pdf` support, client-side (likely `pdf.js`, the same
   library-family Firefox itself uses) — a real second phase, since
   PDF text extraction quality is exactly the kind of thing
   `pdf-to-text.py` already had to solve carefully once; don't assume
   it's simpler just because it happens in the browser instead.
5. Path B (Electron filesystem integration), only if Path A proves the
   feature gets used and the manual terminal step is a real recurring
   friction, not a one-time evening's wish.
