# Batch Book Upload — add many books at once, from the same source

Written 2026-07-12, at direct request: drop **several books at once** when
they're all from the same website, and add them together instead of one at a
time. A natural extension now that single-book adding works end to end
(EPUB/txt drop → pick shelf → "📚 Add to my Library now"). **Written plan,
not code yet.**

**Why "same source" is the key that makes this simple:** the two things that
are otherwise per-book — **license** and **source** — become *shared* when
every file came from the same site (all Standard Ebooks = Public Domain/CC0;
all one Gutenberg pull = Public Domain). So a batch asks for the shared facts
**once** (which site, which shelf), and everything else is detected per file.
That's the whole reason batching is honest here and not a provenance
shortcut: you're vouching for one source, not rubber-stamping unknowns.

---

## What already exists to build on

Almost all of it — this is a small extension, not a new system:

- **The drop handler already receives every file.** `handleBookDrop` reads
  `event.dataTransfer.files[0]` — it just ignores files 2..n today. The
  browser hands over the whole `FileList` on a multi-file drop already.
- **Per-file parsing is done:** `epubToText(file)` (in-game EPUB unpack) and
  the `.txt` reader both already return `{title, author, body}`.
- **Shelving is already a clean helper:** `shelveAsPersonal({title, body,
  license, source, tradition})` shelves one book. A batch is a loop over it.
- **The source picker + shelf picker already exist** on the Add-a-Text form
  (`rmDropSource`, `rmTradition`) — exactly the two "ask once" fields.

So the real new work is only: *accept many files, show a review list, shelve
the checked ones in a loop with progress.*

---

## The shape (described, not coded)

1. **Drop many files** on the same drop zone (or a file-picker set to
   multiple). Each `.epub`/`.txt` is parsed in turn.
2. **One review list appears** instead of the single form filling — a row per
   book: its **detected title** (editable), author, character count, and a
   checkbox (on by default). A bad/unreadable file shows as a skipped row with
   its reason, never sinking the rest.
3. **The shared facts, picked once, up top:** the **shelf** (the existing
   "📚 Which shelf?" selector) and the **source/license** (the existing source
   picker; "Standard Ebooks" → CC0, etc.). These apply to every checked book.
4. **"📚 Add all N to my Library"** shelves the checked books in a loop via
   `shelveAsPersonal`, showing live progress ("Shelving 3 of 12…"), each
   landing on the chosen shelf marked 👤. A short summary at the end ("11
   added to Classics, 1 skipped — unreadable").

---

## The honest limits to design around (not discover)

- **Desktop is the real home for batch.** Personal book text stores as a file
  on desktop (no size worry) but inline-in-save in a browser — a dozen big
  EPUBs would blow a browser's localStorage. So: in a browser, cap the batch
  (or warn past a total size) and point at the desktop app; on desktop, let it
  run. Same seam the single-book path already respects, just enforced across a
  set.
- **Do it sequentially, with progress.** Inflating ten EPUBs at once is a
  memory spike; one after another with a visible counter is calmer and lets
  one failure be skipped cleanly.
- **Provenance stays honest.** Batch is for *one confirmed-free source at a
  time*. The shared license is only pre-filled because you picked a known
  source; an "unknown source" batch should still route to your own notes, not
  pretend a license. Never a "add everything, sort it out later" button.
- **Titles need a glance.** EPUB metadata titles are usually clean, but a
  Gutenberg `.txt` header can be messy — hence the editable title per row
  before adding, not blind trust.

---

## Phases — smallest safe path

- **Phase 1 — multi-file → review list → add all (personal path).** The
  common case: drop a folder's worth of Standard Ebooks, pick Classics + the
  source once, review, add all to Your shelves. Reuses `epubToText` and
  `shelveAsPersonal` untouched; the only new UI is the review list.
- **Phase 2 — per-row polish.** Editable titles, deselect, the skipped-file
  reasons, the browser size-cap warning.
- **Phase 3 — batch to the certified review queue.** The same list, but
  "Send all to review queue" for someone curating a shared commons (each
  becomes a pending item). Small, once Phase 1 exists.
- **Later — a whole-folder drop.** Dropping a *directory* (not just files)
  uses `webkitGetAsEntry`/the File System Access API — a real, separate
  browser capability; note it, don't assume it's the same size as Phase 1.

---

## Cross-references

- Extends the in-game book path in [`PROTOCOLS.md`](../PROTOCOLS.md) Protocol
  1 (Pathway A) and the EPUB work in `plans/done/BOOK-DRAG-DROP-PLAN.md`.
- The shelving helper and search fixes it builds on landed 2026-07-12
  (see `archive/dev-log-2026-07-11.txt`, addenda 8–11).
- Fits the daily-usefulness push in `DAILY-HEAVY-LIFTING-PLAN.md` — a Library
  fills far faster when a whole download folder goes in at once.

**One line to hold onto:** batching is safe here *only* because "same source"
means one license vouched once — keep that the hinge, and this stays a
convenience, never a provenance shortcut.
