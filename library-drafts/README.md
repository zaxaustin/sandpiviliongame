# Library Drafts

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
4. **When it's ready**, run
   `python tools/caravan/promote-draft.py library-drafts/<slug>.md` —
   it parses the finished draft, refuses if license or tradition is
   still `TODO`, and inserts it straight into Supabase's
   `library_documents` table. Live in the game immediately, no code
   deploy needed. (Needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   set as environment variables first — see the script's own docstring;
   `python tools/caravan/promote-draft.py --help`.)
5. The script moves the finished draft to `library-drafts/done/`
   automatically — this folder stays a staging area, not a second copy
   of the Library.
6. **Optional: attach the actual full text**, once the raw source is
   already sitting in `library-sources/` from step 1. Run
   `python tools/caravan/push-fulltext.py <slug> library-sources/<file>.txt
   --translator "..." --source-url "..." --license "..."` — uploads the
   real text to this machine's local Library storage (MinIO) and wires
   up the Reader's "📖 Read the full text" button, live immediately. See
   `LIBRARY-SCALING-PLAN.md` for why full text lives in object storage
   now instead of inline in the shelf entry itself. Same
   `SUPABASE_SERVICE_ROLE_KEY` requirement as step 4, plus a running
   local MinIO (`docker ps` should show `sand-pavilion-minio`).

## Why a `tradition` might not fit yet

The four shelves today are Theravada, Mahayana, Daoism, and Practice
(the Pavilion's own notes about itself). A book from a different
tradition (Stoic philosophy, Vedanta, Sufi poetry, whatever) doesn't
have a shelf to go on yet — that's a real, separate decision (a new
shelf means a layout change in `scenes.js`/`render.js`, not just a new
text), not something to force into the nearest existing category. Leave
`tradition` as a question in the draft if this comes up, and we'll
decide deliberately rather than by accident.
