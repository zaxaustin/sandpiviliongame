/* ================================================================
   [LOOKUP] — one road to knowledge, and one line no resident crosses.

   Set 2026-08-07 by the steward, and both halves matter:

     "the lookup for ai can be the library database how they handle
      that data should depend on there role so we can leave the
      pathway to knolege the same for all ai plugins."

     "we can tell the users that books we can lookup but your notes
      are private you got to put them in the back pack for us to talk
      about. or to make them public after curation and review."

   ONE PATHWAY, N BEHAVIOURS. Every resident reaches the Library the
   same way — same query, same terms, same honest "found nothing".
   What differs is what the role DOES with the result: Quill says
   where it sits and what else is like it, the Monk asks what it is
   for, the Tutor breaks it down. Before this, the pathway lived
   privately inside residents.js, which meant a new plugin either
   re-implemented it or went without — and a second implementation of
   "how do I find a book" is the drift this project keeps paying for.

   THE LINE, AND IT IS NOT A PREFERENCE:

     BOOKS ARE LOOKED UP.    The catalogue is shelf metadata — titles,
                             authors, licences. A resident may search
                             it freely and say plainly what is not
                             there.

     NOTES ARE CARRIED.      What you wrote is yours. NO resident may
                             search your notes, ever. If you want one
                             discussed, you put it in the backpack —
                             a deliberate act, by you, every time.

     PUBLISHED IS PUBLIC.    A note you curated and published is a
                             commons packet and behaves like a book,
                             because you already decided that.

   The point of putting this in code rather than in a prompt: a prompt
   is a request and a function is a boundary. `searchNotes` exists and
   works — it stems, it ranks — and it is for the VISITOR searching
   their own Notes Log. The same query called on a resident's behalf
   is a different act, and the difference cannot live in an
   instruction that a model may or may not follow.

   Pure: no DOM, no Store, no fetch. The caller does the querying;
   this decides WHAT MAY BE ASKED FOR. So npm test can hold the line
   rather than trust it.
   ================================================================ */

/* Words that carry no search signal. Kept here rather than in
   residents.js so every plugin extracts terms identically — two
   resident asking the same question must search the same thing. */
export const LOOKUP_STOP = new Set(('a an the and or but if of in on at to for from by with is are was were be '
  + 'do does did have has had i you we they it that this these those what which who whom whose when where '
  + 'why how can could will would should about any some my your our me us book books read about got here'
  ).split(' '));

/* WHAT MAY BE REACHED FOR, BY KIND. `search` means a resident may go
   and look; `carried` means it only ever arrives because a person put
   it in the backpack. One table, so the boundary is stated once. */
export const REACH = {
  book:      'search',
  paper:     'search',
  published: 'search',
  note:      'carried',
  chapter:   'carried',
  lesson:    'carried',
};

export function maySearch(kind) { return REACH[kind] === 'search'; }
export function mustBeCarried(kind) { return REACH[kind] === 'carried'; }

/* The terms a question actually searches on. Deterministic and shared,
   so "why did it find that" has an answer you can read. */
export function lookupTerms(question, max) {
  const q = String(question == null ? '' : question).toLowerCase();
  const words = q.replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !LOOKUP_STOP.has(w));
  return [...new Set(words)].slice(0, max == null ? 4 : max);
}

/* THE PLAN, BEFORE ANYTHING IS FETCHED.

   Returns what this question is allowed to reach for, given what the
   visitor is carrying. The caller then performs exactly this and
   nothing else — which means the boundary is checkable without a
   database, and a plugin that wants more has to change this file in
   front of everybody.

   `carrying` is the backpack (see data/carrying.js). Notes in it are
   fair game precisely because a person put them there. */
export function groundingPlan(question, carrying) {
  const terms = lookupTerms(question);
  const held = Array.isArray(carrying) ? carrying : [];
  return {
    terms,
    // may be searched in the Library
    search: terms.length ? ['book'] : [],
    // arrives only from the backpack, never from a query
    carried: held.filter(e => e && REACH[e.kind]),
    // stated so the visitor can be told, in the panel, what was reached for
    withheld: held.length === 0 && terms.length
      ? 'Your notes are private. Put one in your backpack to talk about it.'
      : '',
  };
}

/* THE GUARD, USABLE AT RUNTIME AND IN A TEST.

   Given everything about to be handed to a model, return anything that
   should not be there. Empty means the line held. A caller that ignores
   this is the silent-failure shape, so it returns the offending items
   rather than a boolean. */
export function privacyLeaks(items, carrying) {
  const held = Array.isArray(carrying) ? carrying : [];
  const isHeld = (it) => held.some(e => e && e.kind === it.kind && String(e.ref) === String(it.ref));
  return (items || []).filter(it => {
    if (!it || !REACH[it.kind]) return true;      // an unknown kind is not a licence
    if (maySearch(it.kind)) return false;         // books and published things are fine
    return !isHeld(it);                           // everything else must have been carried
  });
}

/* WHAT THE VISITOR IS TOLD, in the panel rather than in a prompt.
   The rule is only real if the person can see it holding. */
export const LOOKUP_NOTICE =
  'Books on these shelves can be looked up. Your notes cannot — put one in your '
  + 'backpack to talk about it, or publish it once you have curated it.';
