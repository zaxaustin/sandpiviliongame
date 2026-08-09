/* ================================================================
   [SEED] — library documents. In Phase 3 these rows move into the
   library_documents table; `doc` becomes the JSONB column.
   License + source are first-class fields, never buried in the blob.
   ================================================================ */
/* THE INLINED SEED TEXTS ARE GONE — 2026-08-10, with the seed shelf itself.
   src/game/data/library-texts/ held six full books (248 KB) compiled into
   every build, for six books nobody can open any more. Deleted rather than
   left importable: an unused import is a pathway back, and the instruction
   was "not a single thing left". The texts survive in
   archive/seed-texts-2026-08-10/ and docs/BOOKS-TO-SOURCE.md says where to
   get better editions. */

/* CHRISTIAN and CHINESE added 2026-08-03, at the steward's ask and with the
   measurement that made it urgent. Sorting his real 294-book library, books
   kept landing on visibly wrong shelves — and the cause was not the librarian
   guessing badly. It was that the right shelf did not exist:

     Christian                                    9 books, NO shelf
     Chinese beyond Daoism (Confucius, Mencius)  11 books, partial

   A model asked to file The Imitation of Christ among Theravada, Mahayana,
   Daoism, Practice, Science, Classics, Native American, Hindu, Tantra,
   Fiction and Non-fiction is not being asked a fair question. An empty
   Christian shelf in a library that claims to hold the world's traditions is
   far stranger by its absence than by being empty.

   Adding to this array is safe by construction: every existing book keeps
   whatever shelf it is on. Nothing is re-filed by this change.

   STILL HOMELESS, and both larger than either shelf added here: Myth &
   Folklore (30 books) and Esoteric & Occult (25). Noted so the next
   wrong-shelf report is not a surprise. */
export const TRADITIONS = ['Theravada','Mahayana','Daoism','Chinese','Hindu','Tantra','Christian','Native American','Practice','Science','Classics','Fiction','Non-fiction'];
/* Categories are a second, orthogonal axis to tradition — "what kind of
   text is this" rather than "which lineage." Every seed text today is
   the same kind (classical, hand-vetted, non-fiction) — the taxonomy is
   defined now, ahead of content that will actually use the other
   values, same instinct as `saveVersion`: the field should exist before
   it's needed, not be retrofitted once it is. */
export const CATEGORIES = [
  { id:'classical',   label:'Classical' },
  { id:'non-fiction',  label:'Non-fiction' },
  { id:'fiction',      label:'Fiction' },
  { id:'research',     label:'Research papers' },
  { id:'ai-written',   label:'AI-written' },
  { id:'personal',     label:'Personal' },
];
/* Optional `added:'YYYY-MM-DD'` field, same "define before it's needed"
   instinct — undated entries (everything seeded so far) just never show
   the Index/shelf's "NEW" tag. `promote-draft.py` (sketched in the
   README's Growing the Library section) should stamp this automatically
   once it exists; until then, set it by hand on anything freshly added. */
/* ================================================================
   THE SEED SHELF IS EMPTY, AND THAT IS THE DESIGN — 2026-08-10.

   Twenty-seven books used to be hardcoded here. They are gone at the
   steward's instruction: "delete the seed books all of them with not a
   single thing left."

   WHY, IN ONE LINE: twenty-one of the twenty-seven were TWO-SECTION
   EXCERPTS PRETENDING TO BE BOOKS. Opening The Republic gave you a
   paragraph and a footnote under a real title, a real author and a real
   licence. That is worse than an empty shelf, because an empty shelf
   tells the truth and asks you to fill it.

   NINE OF THEM WERE OURS — A Visitor's Handbook, When Something Goes
   Wrong, Filling Your Own Shelves and the rest. Onboarding documentation
   shelved as if it were literature. If any of it belongs in the game
   again it goes in the Welcome panel, on a sign, or in MANUAL.md, where a
   person looks for help — not on a shelf beside Darwin.

   NOTHING WAS DESTROYED. Every one is preserved verbatim in
   archive/seed-texts-2026-08-10/, and docs/BOOKS-TO-SOURCE.md is the
   re-download list: Standard Ebooks or Gutenberg for the classics,
   SuttaCentral (CC0) for the five suttas.

   THIS IS NOT A BROKEN STATE AND MUST NEVER READ AS ONE. A Pavilion with
   no seed books is a Pavilion whose Library is YOURS from the first day,
   which was already the standing decision:

     "filling up your own library makes one have a sence of ownerhip."
     "The seed shelf is an on-ramp, not a library."

   The on-ramp is now the intake table, which is a better one: a book you
   chose beats a book we chose, and the empty shelf says so out loud
   instead of hiding behind twenty-seven stubs. Anything reading this list
   must handle length 0 as ORDINARY, never as an error.
   ================================================================ */
const RAW_SEED_LIBRARY = [];
export const SEED_LIBRARY = RAW_SEED_LIBRARY.map(d => ({ category:'classical', ...d }));
