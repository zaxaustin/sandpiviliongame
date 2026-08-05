sure w# Library Drafts

A place to draft new Library entries directly in files — no game UI
required. You're the only steward right now, so working straight in
files and committing when a draft is ready is honestly simpler than
going through the in-game Steward Review Queue, which exists for when
there's more than one person submitting things.

## The workflow

1. **Get a book's full text and save it in `library-sources/`** (see
   that folder's own README) — either `python tools/caravan/gutenberg.py
   <book id>`, or a plain-text download from one of the other sources
   named in the main README's Library section. That's raw material —
   it does **not** go into the Library itself; the Library only ever
   stores a title, a license, a source link, and a real written summary,
   never the full text. See `_TEMPLATE.md` for exactly what shape a
   finished entry actually needs.
2. **Start the draft file.** Either copy `_TEMPLATE.md` by hand, or run
   `python tools/caravan/library-draft.py library-sources/<file>.txt` —
   it detects a title/author automatically if the text has a
   Gutenberg-style header, and writes a pre-filled draft here. It never
   guesses the license or tradition — those stay TODO until you
   actually decide them.
3. **Fill it in** — title, tradition, license, source URL, attribution,
   and (the real work) a summary and 2-3 sections in your own words,
   the same way every existing shelf entry in `src/game/data/seed.js` is
   written. Ask me to draft this part with you if you want a first pass
   to react to — reading and summarizing honestly is the one step here
   that isn't just filling in blanks.
4. **Check the finished draft**, with
   `python tools/caravan/promote-draft.py library-drafts/<slug>.md` — it
   parses the draft, **refuses if license or tradition is still `TODO`**,
   prints every field the next step needs, and stops. It writes nothing
   and moves nothing.

   > **Its push step is retired** (2026-08-02). It used to insert straight
   > into a hosted `library_documents` table; that project was deleted, so
   > no `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` is needed or possible.
   > If you find a doc still asking for one, that doc is stale — say so.

5. **Put it on the shelf**, and there are two different shelves:
   - **Your own Pavilion** — drag the `.txt` or `.epub` onto the window,
     or use Workshop → Caravan Desk → *"Add a text by hand."* This needs
     none of this pipeline, and it is what nearly everyone does.
   - **The catalog that ships with the app** — add the entry to
     `src/game/data/seed.js` by hand, using the fields step 4 printed,
     then `npm run build:beta` and `npm test`. The shipped catalog is
     source code now, so a shelf change is a reviewable, revertable
     commit. That is a feature, not a downgrade.

   Move the draft to `library-drafts/done/` yourself when you're finished
   with it — this folder stays a staging area, not a second copy of the
   Library. (The old script did that move automatically; the checker
   deliberately does not, since it no longer knows whether you finished.)

6. **Attaching the actual full text has no terminal path right now.**
   `push-fulltext.py` uploaded to local MinIO *and* updated the same
   deleted hosted table, so it now stops before doing either — stopping
   before the upload on purpose, so it can't leave an orphaned object in
   the bucket with nothing pointing at it. For your own Pavilion, the
   drag-and-drop in step 5 already stores the full text. See
   `plans/LIBRARY-SCALING-PLAN.md` for why full text lives in object
   storage rather than inline in the shelf entry.

## Why a `tradition` might not fit yet

The shelves today are Theravada, Mahayana, Daoism, Practice (the
Pavilion's own notes about itself), Science, Classics, Native American,
Hindu, and Tantra. A book from a tradition none of those cover (Sufi
poetry, say) doesn't
have a shelf to go on yet — that's a real, separate decision (a new
shelf means a layout change in `scenes.js`/`render.js`, not just a new
text), not something to force into the nearest existing category. Leave
`tradition` as a question in the draft if this comes up, and we'll
decide deliberately rather than by accident.
