# Library Drafts

A place to draft new Library entries directly in files — no game UI
required. You're the only steward right now, so working straight in
files and committing when a draft is ready is honestly simpler than
going through the in-game Steward Review Queue, which exists for when
there's more than one person submitting things.

## The workflow

1. **Get a book's full text**, if you're starting from an outside
   source: `python tools/caravan/gutenberg.py <book id>` (see
   `LEARNING-PATH.md` Stage 9 for what that script does and why it only
   ever talks to Project Gutenberg). That gives you the raw material —
   it does **not** go into the Library itself; the Library only ever
   stores a title, a license, a source link, and a real written summary,
   never the full text. See `_TEMPLATE.md` for exactly what shape a
   finished entry actually needs.
2. **Start the draft file.** Either copy `_TEMPLATE.md` by hand, or run
   `python tools/caravan/library-draft.py <path to a .txt file>` — it
   detects a title/author automatically if the text has a Gutenberg-style
   header, and writes a pre-filled draft here. It never guesses the
   license or tradition — those stay TODO until you actually decide them.
3. **Fill it in** — title, tradition, license, source URL, attribution,
   and (the real work) a summary and 2-3 sections in your own words,
   the same way every existing shelf entry in `src/game/data/seed.js` is
   written. Ask me to draft this part with you if you want a first pass
   to react to — reading and summarizing honestly is the one step here
   that isn't just filling in blanks.
4. **When it's ready**, ask me (or, once you're comfortable with the
   pattern, do it yourself) to fold it into `src/game/data/seed.js` as a
   real entry, matching the shape every other text there already uses.
   That's a real code change — worth its own git commit, so there's a
   record of exactly when and why each text joined the shelf.
5. **Delete or archive the `.md` draft** once it's actually in
   `seed.js` — this folder is a staging area, not a second copy of the
   Library.

## Why a `tradition` might not fit yet

The four shelves today are Theravada, Mahayana, Daoism, and Practice
(the Pavilion's own notes about itself). A book from a different
tradition (Stoic philosophy, Vedanta, Sufi poetry, whatever) doesn't
have a shelf to go on yet — that's a real, separate decision (a new
shelf means a layout change in `scenes.js`/`render.js`, not just a new
text), not something to force into the nearest existing category. Leave
`tradition` as a question in the draft if this comes up, and we'll
decide deliberately rather than by accident.
