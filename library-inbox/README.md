# Library Inbox

Drop books here by hand, sorted into the folder for whichever website
you got them from. This is the manual half of the pipeline described in
`plans/LIBRARY-GROWTH-PLAN.md` — the automated half is `tools/caravan/`.

## The workflow

1. **Download from one of the sites in `plans/LIBRARY-GROWTH-PLAN.md`'s
   source list**, plain text if the site offers it (most public-domain
   sites do — Gutenberg, Wikisource, Standard Ebooks, Archive.org's
   "Full Text" view). A PDF is fine too if that's all that's offered;
   it'll need text extraction before it can become a shelf entry.
2. **Drop the file into the matching subfolder** — `standard-ebooks/`
   for a Standard Ebooks download, `openstax/` for an OpenStax textbook,
   and so on. `other/` is there for anything that doesn't fit yet.
3. **Tell me (or note it yourself) where it came from and what license
   the site states** — the exact page, not just "I found it online."
   This is the one step nothing here can automate: a shelf entry is a
   claim someone's making about a text's real provenance, same as
   every existing one.
4. From there it's the same pipeline as an automated fetch:
   `library-draft.py` → write the real summary by hand → `promote-draft.py`
   → optionally `push-fulltext.py` to attach the full text. See
   `library-drafts/README.md` for the exact commands.

## Why sorted by website, not just dumped in one folder

**This folder doubles as a signal for what to build next.** Once a
subfolder has real volume — a handful of manual drops from the same
site — that's the sign a real named Caravan connector for that site is
worth writing (same reasoning as `plans/LIBRARY-GROWTH-PLAN.md`'s "why
hand-picked connectors" section): a pattern proven by hand a few times
becomes a script, the same way `gutenberg.py` and `suttacentral.py`
already did. Sorted-by-source from the start means that graduation is
just "look at which folder filled up," not a sorting job later.

## Not committed to git

This whole folder is gitignored, same as `library-sources/` — raw book
text doesn't belong in version control, whether it's a whole public-domain
novel or a scanned textbook. Nothing here is "in the Library" until it's
gone through the real pipeline above.
