/* ================================================================
   [NOTE REACH] — may a model on this machine see this note?

   Set 2026-08-08 by the steward, and the second half is the whole
   reason this file exists rather than a boolean:

     "we should be able to toggle are notes between private and publid
      and we should also add something like ai can read and private is
      truly private."

   THREE STATES:

     SEALED    Not reachable. Not by a search, not when you ask, not
               by any resident, ever. The ONE state an explicit ask
               cannot cross.

     ASKABLE   A resident may search it — but only when you press.
               Unasked is still never. THE DEFAULT, and it is exactly
               the rule data/lookup.js already draws, so nothing
               already written changes reach the day this ships.

     PUBLISHED You curated it and published it. It behaves like a
               book, because you already decided that.

   THIS IS NOT data/visibility.js, AND MERGING THEM WOULD BE WRONG.
   Two different questions, and they are genuinely independent:

     visibility.js  CAN THIS LEAVE THE MACHINE?   private / shared / commons
     this file      MAY A LOCAL MODEL SEE IT?     sealed / askable / published

   A note can be private in every sense that matters — it never leaves
   this computer, nothing syncs, no server has ever heard of it — and
   still be something you are glad to hand your own resident when you
   ask it a question. That is the ordinary case, and it is why ASKABLE
   is the default. Conversely a note may be sealed and still be
   `private` on the other axis; sealing it changes nothing about where
   it lives. If these were one field, sealing a note would look like
   unpublishing it, and unpublishing would look like hiding it from
   yourself. They cross, so they stay apart.

   ABSENT MEANS ASKABLE, and that is load-bearing. The store only ever
   holds a DELIBERATE departure from the default, so:
     - hundreds of existing notes need no migration and no backfill;
     - the save does not grow for the common case;
     - and setting a note back to askable REMOVES the entry rather
       than recording "askable", so there is one representation of the
       default instead of two that can disagree.

   A PRESENT BUT UNRECOGNISED VALUE FAILS CLOSED — it is treated as
   sealed, not as the default. Absence is a statement we make ("nobody
   has touched this"); an unknown string is a statement we cannot
   read, and the safe reading of "I cannot tell what permission this
   is" is to withhold. lookup.js takes the same line about an unknown
   kind: an unknown is not a licence.

   Pure: no DOM, no imports, no reaching for `data`. The caller owns
   the map and hands it in. So npm test can hold every sentence above
   rather than trusting it — same reason lookup.js is pure, and the
   line here is stricter than the one there.
   ================================================================ */

export const DEFAULT_REACH = 'askable';

/* The states, with the words the interface uses. Kept here beside the
   rule rather than in the panel, so a badge and the boundary it claims
   to describe can never drift apart. */
export const REACH_STATES = {
  sealed: {
    icon: '🔒', label: 'Sealed',
    help: 'No resident can read this, even if you ask. Truly private.',
  },
  askable: {
    icon: '🔎', label: 'Askable',
    help: 'A resident can search this only when you ask it to. Never on its own.',
  },
  published: {
    icon: '🏛', label: 'Published',
    help: 'You published this. It behaves like a book on the shelves.',
  },
};
export const REACH_KEYS = Object.keys(REACH_STATES);

/* What state a note is in. `map` is data.noteReach — a side-map keyed by
   the note's gathered key, touching no note itself. */
export function reachOf(map, key) {
  const raw = map && key != null ? map[key] : undefined;
  if (raw === undefined || raw === null || raw === '') return DEFAULT_REACH;
  return REACH_STATES[raw] ? raw : 'sealed';   // unreadable permission → withhold
}

/* Set it, purely. Returns a NEW map; the caller persists.
   Going back to the default DELETES the entry — see the header. */
export function setReach(map, key, state) {
  const next = Object.assign({}, map || {});
  if (key == null || key === '') return next;
  if (!REACH_STATES[state] || state === DEFAULT_REACH) delete next[key];
  else next[key] = state;
  return next;
}

/* THE BOUNDARY ITSELF, in one expression.

   `asked` is the visitor deliberately pressing "search my notes" — the
   same flag lookup.js takes, and never inferred from wording. Note that
   sealed ignores it completely: that is the entire point of the state,
   and it is the first thing to break on purpose. */
export function mayReach(state, opts) {
  const asked = !!(opts && opts.asked);
  switch (state) {
    case 'sealed':    return false;      // an ask cannot cross this
    case 'published': return true;       // it behaves like a book
    case 'askable':   return asked;      // only because you pressed
    default:          return false;      // unreadable → withhold
  }
}

/* The same question, from the note's key — the form nearly every caller
   actually wants, so nobody has to remember to compose the two. */
export function mayReachNote(map, key, opts) {
  return mayReach(reachOf(map, key), opts);
}

/* Split a list of notes into what a resident may see and what it may not,
   with the reason kept. The UI needs both halves: the backpack has to show
   a sealed note it is WITHHOLDING, or the bag is lying about what it holds
   (and a bag you cannot read is not a boundary).

   `keyOf` is supplied by the caller because a gathered note, a carried
   entry and a search row all name their key differently. */
export function partitionByReach(notes, map, opts, keyOf) {
  const key = keyOf || (n => n && n.key);
  const seen = [], withheld = [];
  for (const n of (notes || [])) {
    const state = reachOf(map, key(n));
    (mayReach(state, opts) ? seen : withheld).push({ note: n, reach: state });
  }
  return { seen, withheld };
}

/* How many notes have been deliberately sealed. For the line in Your Data
   and the backpack — a count of departures from the default, which is all
   the store ever holds. */
export function sealedCount(map) {
  return Object.keys(map || {}).filter(k => reachOf(map, k) === 'sealed').length;
}

/* WHAT THE VISITOR IS TOLD, in the panel rather than in a prompt.
   The rule is only real if the person can watch it hold. */
export const REACH_NOTICE =
  'Every note is 🔎 askable: a resident reads it only when you ask, never on its own. '
  + 'Seal one 🔒 and nothing can read it — not even when you ask.';
