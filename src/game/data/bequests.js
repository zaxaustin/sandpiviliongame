/* ================================================================
   [BEQUESTS] — gifts left at the gate of the Inheritance Hall.

   The Hall itself ships EMPTY, and that stays true: nothing below is
   in the ground when you arrive. These are bequests *offered* — the
   same `.json` shape one person hands another, bundled with the build
   so a visitor's first act in that courtyard can be receiving
   something rather than staring at bare sand. You choose to plant
   them, one at a time, and you can dig any of them up again.

   Everything here is drawn from texts already on the Library's own
   shelves, under licenses that genuinely permit it (CC0 SuttaCentral
   translations, and the Pavilion's own writing). Quotations are
   marked as quotations and attributed where they come from — the same
   test every text passes at the Library door, applied to a gift.
   ================================================================ */

/* The Buddha's first discourse — Dhammacakkappavattana Sutta (SN 56.11),
   Bhikkhu Sujato's translation, CC0, already shelved here as "The First
   Sermon". Every passage quoted below is from that text verbatim. */
const SERMON = 'The First Sermon (SN 56.11), trans. Bhikkhu Sujato, CC0 — shelved on the Theravada shelf.';

/* ================================================================
   THE GATE IS BARE NOW — 2026-08-10.

   Three bequests used to be bundled here, and all three were seed-shelf
   pathways wearing a different coat:

     "The First Turning"  planted five BOOK CARDS — first-sermon,
                          dhammapada, satipatthana, anapanasati, metta —
                          which carried no text of their own. They were
                          pointers at seed books. With the seed shelf
                          deleted they would plant five titles that open
                          onto nothing.
     "Something buried"   was gated on `{ kind:'read', slug:'first-sermon' }`.
                          You can only mark a book read by opening it. That
                          book no longer exists, so the gift became
                          PERMANENTLY LOCKED — a dead end with a countdown
                          on it, which is the exact thing this project keeps
                          removing.

   The steward's instruction was plain: "make sure all seeded books and
   pathways to them are gone unless the books are from docker." This was
   one of them.

   WHAT IS NOT REMOVED: the Hall itself, and everything that makes it work
   — planting your own books, notes and courses, burying them behind a
   requirement, exporting a bequest as .json and importing someone else's.
   That mechanic was never the problem. What went is the three gifts the
   Pavilion shipped in its own courtyard, which is the more honest reading
   of the Hall's own sign anyway:

     "Nothing standing here was placed by the people who built the
      Pavilion — every one of them was planted by a visitor."

   That sentence is finally true.

   The old bequests are preserved verbatim in
   archive/seed-texts-2026-08-10/ alongside the seed books, and the
   Record Stone already renders an empty gate correctly (`gifts.length ?`).
   ================================================================ */
export const GATE_BEQUESTS = [];
