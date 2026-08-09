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

     NOTES ARE NOT SEARCHED UNASKED.  What you wrote is yours. No
                             resident goes looking through your notes on
                             its own initiative — not as background
                             grounding, not to seem clever.

                             BUT IF YOU ASK, IT LOOKS. Narrowed
                             2026-08-07, at the steward's word:

                               "lets put functionality over privacy the
                                backend should help people"

                             The first version of this rule said NEVER,
                             and never was too strong: it meant "Quill,
                             what did I write about impermanence?" could
                             not be answered at all, which is one of the
                             most useful things a resident could do with
                             a local index that already stems. Refusing
                             that is not privacy, it is a missing
                             feature wearing privacy's coat.

                             So the line moved from WHO to WHY. Asked:
                             yes. Unasked: no. That keeps the property
                             that actually mattered — nothing about you
                             is gathered up and handed to a model
                             because it happened to be lying around —
                             while the visitor can hand over anything
                             they like, which was always their right.

     PUBLISHED IS PUBLIC.    A note you curated and published is a
                             commons packet and behaves like a book,
                             because you already decided that.

     SEALED IS SEALED.       Added 2026-08-08, and it sits OUTSIDE
                             everything above: "private is truly
                             private" (steward). A sealed note is not
                             reachable by a search, by an ask, or by
                             anything else. The rule above moved the
                             line from WHO to WHY; this puts a per-note
                             boundary around the WHY, so a visitor can
                             say "not this one, ever" about a single
                             note without turning the feature off.

                             The states live in data/note-reach.js —
                             pure, like this file, and for the same
                             reason. Composed here rather than copied:
                             two answers to "may a model see this note"
                             is exactly the drift this project keeps
                             paying for.

   THE THIRD STATE IS THE POINT, not an exception (steward, 2026-08-07):
   "there should be public lessons and a place to put public notes for
   example if i wana do commentarty on a dhamma book or something like
   that, and people can do that for the bible."

   Commentary is the oldest form this Library has — a tradition of
   people writing beside a text for other people to read. So `published`
   is not "a note that leaked"; it is a first-class kind, and the
   private/shared/commons vocabulary in data/visibility.js already has
   the word for it. What makes it public is CURATION AND REVIEW by the
   person who wrote it, never a default, never a sync, and never the
   act of a resident. Private is the resting state; publishing is a
   decision, and until that decision the line above holds absolutely.

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

import { mayReachNote, reachOf } from './note-reach.js';
/* THE DOORS ARE DERIVED, NEVER TYPED. A room's name and its opener come from
   the one table that already owns them, so renaming a room changes what a
   resident says. A hand-typed room name across seven prompts is hideAllOv()
   wearing a hat, and this project has paid for that shape three times.
   Both files are pure data with no DOM, so there is no cycle. */
import { PLACES } from './places.js';

/* Words that carry no search signal. Kept here rather than in
   residents.js so every plugin extracts terms identically — two
   resident asking the same question must search the same thing. */
/* CONVERSATIONAL FILLER EARNS ITS PLACE HERE, added 2026-08-10 after reading a
   real transcript. The follow-up "so what does it actually say" searched the
   shelves for "actually", found nothing, and the panel duly offered the Request
   Board — while the resident was quoting the very book in the visitor's bag.
   These are words a person uses to CONTINUE a conversation, never to name a
   subject, and every one of them survives the length filter. */
export const LOOKUP_STOP = new Set(('a an the and or but if of in on at to for from by with is are was were be '
  + 'do does did have has had i you we they it that this these those what which who whom whose when where '
  + 'why how can could will would should about any some my your our me us book books read about got here '
  + 'actually really basically simply mean means meant tell tells telling said says think thinks know knows '
  + 'just like want wants need needs thing things something anything nothing everything more most also then '
  + 'there their theirs yours mine much many well even still going gonna okay maybe perhaps please thanks'
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
export function groundingPlan(question, carrying, opts) {
  const terms = lookupTerms(question);
  const held = Array.isArray(carrying) ? carrying : [];
  /* `asked` is the visitor deliberately saying "look through my notes" — a
     button pressed, or a question that plainly asks it. It is NEVER inferred
     from the wording alone: a question that merely mentions notes is not
     permission, and guessing would put the boundary back in the model's
     judgement, which is exactly where it must not live. */
  const asked = !!(opts && opts.searchMyNotes);
  /* The per-note boundary, OUTSIDE the asked/unasked one. A sealed note is
     not reachable by a search and not reachable by carrying it either —
     "truly private" would mean very little if dropping it in the backpack
     were a way around it. So it is filtered here, at the plan, rather than
     trusted to every caller downstream. */
  const reach = (opts && opts.noteReach) || {};
  const sealedHeld = held.filter(e => e && e.kind === 'note' && !mayReachNote(reach, e.ref, { asked: true }));
  const carried = held.filter(e => e && REACH[e.kind] && !sealedHeld.includes(e));
  return {
    terms,
    // may be searched in the Library — plus your own notes, but only on request
    search: terms.length ? (asked ? ['book', 'note'] : ['book']) : [],
    // arrives from the backpack whether or not anything was asked
    carried,
    asked,
    /* Sealed things you are carrying, so the surface can SAY it is holding
       them back. A bag that silently drops what it shows you is the failure
       mode this whole file exists to prevent. */
    sealed: sealedHeld,
    // stated so the visitor can be told, in the panel, what was reached for
    withheld: !asked && held.length === 0 && terms.length
      ? 'Your own notes were not searched. Ask, or put one in your backpack.'
      : '',
  };
}

/* ================================================================
   "I CAN SEE IT AND I CANNOT READ IT" — reachGap(), 2026-08-10.

   The steward's ask, and the reason it is code rather than a sentence
   added to seven prompts:

     "we should be able to have the resedents be like i dont have acces
      to this can you please put the book in your back pack and add it
      to the pavilion. kinda thing i know this but for a new user we
      gotta hold there hand"

   WHETHER A RESIDENT IS BLOCKED IS A SET LOOKUP, NOT A JUDGEMENT. The
   application knows exactly what the catalogue returned and exactly
   what is in the backpack; asking a model to work out the difference is
   rule 7 in reverse — slow, approximate, and wrong often enough to
   matter. So it is computed here, exactly, and the small correct result
   is what the model is handed.

   THREE STATES, and the third is separate on purpose:

     SHELVED_NOT_CARRIED   rows came back, none of them are in the bag.
                           The bridge already exists — 🎒 Take with you —
                           and nothing has ever told a new visitor so.
     NOT_IN_THE_PAVILION   real search terms, zero rows. Two real doors:
                           the Caravan Desk if they have the file, the
                           Request Board to have it fetched.
     NOTHING_HERE_YET      the Library is empty. Telling someone with no
                           books that "that title is not on these
                           shelves" is true and useless — it describes
                           their whole Library as a miss. SEED_LIBRARY is
                           [], so THIS IS WHAT A BRAND-NEW INSTALL HITS.

   `total` IS PASSED IN SEPARATELY AND MUST BE COMPUTED WITHOUT THE
   DATABASE — Store.allDocs().length, which needs no bridge. As first
   drafted the whole gap hung off the lookup, which returns null in a
   browser tab; the one state a new visitor actually hits would have
   been the one state that never fired.

   Pure, like everything else here: no DOM, no Store, no fetch. The
   caller supplies the three facts and renders what comes back.
   ================================================================ */
export const GAP = {
  SHELVED_NOT_CARRIED: 'SHELVED_NOT_CARRIED',
  NOT_IN_THE_PAVILION: 'NOT_IN_THE_PAVILION',
  NOTHING_HERE_YET:    'NOTHING_HERE_YET',
};
/* Capped, and the remainder named — the same rule every list handed to a model
   obeys here. Four buttons is a row; twelve is a wall. */
export const GAP_TITLE_CAP = 4;

function door(id) {
  const p = PLACES[id];
  if (!p) return null;                       // a door that is not in the table is not a door
  return { id, icon: p.icon, label: p.label, open: p.door };
}

export function reachGap(input) {
  const o = input || {};
  const hits = Array.isArray(o.hits) ? o.hits : [];
  const held = Array.isArray(o.carrying) ? o.carrying : [];
  const total = Number(o.total) || 0;
  const searched = !!o.searched;

  /* AN EMPTY LIBRARY OUTRANKS EVERYTHING, and is checked first and without
     reference to the search. */
  if (!total) {
    return {
      gap: GAP.NOTHING_HERE_YET, titles: [],
      doors: [door('intake')].filter(Boolean),
      line: '\n\nTHEIR LIBRARY IS EMPTY — not "this book is missing", but no books at all yet. '
        + 'The Pavilion ships with none on purpose: a shelf is meant to be built by the person whose '
        + 'it is. So do not answer as though a title were missing. Say plainly that there is nothing '
        + 'shelved yet, that they can bring one in, and that you will be far more use once they have. '
        + 'Say it in your own words, warmly and in one or two sentences.',
    };
  }
  if (!searched) return { gap: null, titles: [], doors: [], line: '' };

  const carried = new Set(held
    .filter(e => e && (e.kind === 'book' || e.kind === 'paper'))
    .map(e => String(e.ref)));

  if (!hits.length) {
    /* NOT A GAP IF THEY ARE ALREADY BEING ANSWERED FROM THEIR OWN BOOK.
       Read off a real transcript, 2026-08-10: carrying Walden and asking a
       follow-up produced real passages AND "we do not have that, try the
       Request Board" in the same breath. Both sentences were technically true
       — the catalogue matched nothing — and together they are nonsense. A
       resident quoting page 81 to you is not a resident that failed to reach
       something. Silence is the honest output here. */
    if (o.served) return { gap: null, titles: [], doors: [], line: '' };
    return {
      gap: GAP.NOT_IN_THE_PAVILION, titles: [],
      doors: [door('review'), door('requests')].filter(Boolean),
      line: '\n\nWHAT THEY ASKED FOR IS NOT ON THESE SHELVES, and there are two real ways to change '
        + 'that, which a new visitor will not know about. If they already have the file, it comes in '
        + 'at the Caravan Desk in the Workshop. If they do not, the Request Board in the Study is how '
        + 'a book gets fetched. Mention whichever fits, once, in your own words — and only if a book '
        + 'would actually help them. Never imply the Pavilion holds something it does not.',
    };
  }

  /* THE HIT MUST NOT ALREADY BE IN THE BAG. Telling someone to carry what they
     are already carrying is the whole failure this state exists to avoid, and
     it is the first thing to break on purpose. */
  const out = hits.filter(h => h && !carried.has(String(h.slug)));
  if (!out.length) return { gap: null, titles: [], doors: [], line: '' };

  const titles = out.slice(0, GAP_TITLE_CAP)
    .map(h => ({ slug: String(h.slug), title: String(h.title || h.slug) }));
  const rest = out.length - titles.length;

  return {
    gap: GAP.SHELVED_NOT_CARRIED, titles, rest,
    doors: [door('yourshelf')].filter(Boolean),
    line: '\n\nYOU CAN SEE THESE ON THE SHELF AND YOU CANNOT READ THEM. What you were handed is the '
      + 'catalogue — titles, authors, shelves — and not one word of any book\'s text. So you may say '
      + 'what is shelved and where; you may NOT say what is inside. If they want what a book actually '
      + 'says, the way through is for them to put it in their backpack, and then you will be given '
      + 'real passages from it. Say that plainly when it is the honest answer'
      + (titles.length === 1 ? ' — "' + titles[0].title + '" is the one.' : '.')
      + ' It is one press and they may not know it exists. Never guess at the contents from a title.',
  };
}

/* THE GUARD, USABLE AT RUNTIME AND IN A TEST.

   Given everything about to be handed to a model, return anything that
   should not be there. Empty means the line held. A caller that ignores
   this is the silent-failure shape, so it returns the offending items
   rather than a boolean. */
export function privacyLeaks(items, carrying, opts) {
  const held = Array.isArray(carrying) ? carrying : [];
  // if the visitor asked for their notes to be searched, a note is not a leak
  const asked = !!(opts && opts.searchMyNotes);
  const reach = (opts && opts.noteReach) || {};
  const isHeld = (it) => held.some(e => e && e.kind === it.kind && String(e.ref) === String(it.ref));
  return (items || []).filter(it => {
    if (!it || !REACH[it.kind]) return true;      // an unknown kind is not a licence
    if (maySearch(it.kind)) return false;         // books and published things are fine
    /* SEALED OUTRANKS EVERYTHING, and it is checked before `asked` and before
       `isHeld` on purpose. A sealed note is a leak whether the visitor asked,
       whether they carried it in, and whether some caller decided it was
       relevant. This is the assertion to break first: make it read `asked`
       and a sealed note walks straight into the prompt. */
    if (it.kind === 'note' && !mayReachNote(reach, it.ref, { asked: true })) return true;
    if (asked && it.kind === 'note') return false; // you asked; it looked
    return !isHeld(it);                           // everything else must have been carried
  });
}

/* What a note's state is, for a caller that has the map but should not have
   to import two modules to ask one question. Re-exported rather than
   re-implemented — there is one road to knowledge and one answer to this. */
export { reachOf, mayReachNote };

/* WHAT THE VISITOR IS TOLD, in the panel rather than in a prompt.
   The rule is only real if the person can see it holding. */
export const LOOKUP_NOTICE =
  'Books on these shelves can be looked up. Your notes cannot — put one in your '
  + 'backpack to talk about it, or publish it once you have curated it.';
