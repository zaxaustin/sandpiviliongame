/* ================================================================
   [CARRYING] — the one verb for "I found this here, I need it there."

   Built 2026-08-07 from plans/CARRYING-AND-WHERE-THINGS-ARE-KEPT.md.
   The steward's diagnosis is the whole reason this file exists:

     "we want the sand pavilion to be there for the user not do
      everything they can automatically."

   So carrying is MANUAL, and that is the feature. It is not a new
   rule either — the-day.js already says a path you picked up beats a
   path inferred from progress, because "picking one up is you saying
   so, and a stated intention must not be outranked by a heuristic."
   This is that sentence made into an object.

   THREE THINGS IT IS NOT:

   1 · NOT A COPY. An entry is a REFERENCE — a slug, a note key. The
       save still owns the thing. If it is deleted, the entry goes
       stale LOUDLY (see stale()) rather than becoming a ghost copy of
       something you threw away.

   2 · NOT STORAGE. The cap is on ATTENTION, not on how much you own.
       Everything is still in the Library, the Notes Log, the Course
       Board. This is the small set you are working on now, and it is
       capped so it stays readable at a glance — which is the only
       thing it is for.

   3 · NOT A DATABASE TABLE. Carrying needs no backend at all, and
       that is deliberate: a `carrying` table would be a second copy
       of what the save owns, which is the store.js scar exactly. The
       named queries resolve what a reference POINTS AT; they must
       never own the pointing.

   ONE TABLE DRIVES EVERYTHING. KINDS below says what can be carried
   AND where each kind can be put down. Two hand-written lists that
   must agree is rule 4's exact shape, and hideAllOv(), the window
   exports and the resident roster have each already drifted that way.

   Pure: no DOM, no imports, no reaching for `data`. So npm test can
   hold it to all of the above rather than trusting it.
   ================================================================ */

/* The cap. A standard game inventory — big enough that nobody meets it
   in ordinary use, small enough that the backpack stays glanceable.
   Meeting it is not a failure state: pickUp() says so plainly and
   nothing is silently dropped. */
export const CARRY_CAP = 20;

/* WHAT CAN BE CARRIED, AND WHERE IT GOES DOWN.

   `places` is the whole point: a room asks canAccept(place, kind)
   rather than keeping its own list of what it takes. Add a kind here
   and every surface that already accepts it works, with nothing else
   edited — which is the opposite of the bespoke-button problem this
   replaces. */
export const KINDS = {
  book:    { icon: '📖', label: 'book',    places: ['studyTable', 'reader', 'mission'] },
  note:    { icon: '🗒', label: 'note',    places: ['studyTable', 'writingDesk', 'lesson'] },
  chapter: { icon: '🔖', label: 'chapter', places: ['studyTable', 'writingDesk', 'lesson'] },
  lesson:  { icon: '🌱', label: 'lesson',  places: ['today', 'mission'] },
  paper:   { icon: '📄', label: 'paper',   places: ['bench', 'investigation', 'studyTable'] },
};
export const KIND_KEYS = Object.keys(KINDS);

/* Every place named by any kind, derived rather than listed. A surface
   that thinks it accepts something no kind offers is a dead drop, and
   npm test can now say so. */
export const PLACES = [...new Set(KIND_KEYS.flatMap(k => KINDS[k].places))].sort();

export function canAccept(place, kind) {
  const k = KINDS[kind];
  return !!k && k.places.includes(place);
}

/* Identity of a carried thing. Kind AND ref, because a book and a note
   may perfectly well share a slug-shaped string, and putting down "the
   Dhammapada" should not also put down the note about it. */
const same = (a, kind, ref) => a && a.kind === kind && String(a.ref) === String(ref);

/* ---- IN HAND, OR ON THE SHELF FOR LATER -------------------------------

   Asked for 2026-08-07, when the cap was settled as a hard refusal:

     "make sure there is a place to put notes and books that say something
      like pick up later, i dont want people to feel like trhere not able to
      hold somthing just that to focus them in whats in the invitoruy."

   Exactly right, and it is what makes a hard cap kind instead of mean. The
   cap exists to focus attention, not to ration what you own — so a full
   backpack must never be a wall. It is a redirection: "not now, but here."

   ONE STORE, A FLAG. `later:true` on the same entry rather than a second
   array — this project spent a day removing a second carry system and is not
   adding one back. The flag means everything downstream keeps one identity,
   one set of rules, and one place to look.

   THE SHELF IS NOT THE BAG, AND THAT IS LOAD-BEARING. `carried()` excludes
   it, so the cap only counts what is in hand, and groundingFor() excludes it
   too — a note you set aside for later is NOT something a resident may see.
   "What you carry is what a resident can see" stays literally true, which it
   would not if the shelf were quietly part of the bag.                     */
const inHand = e => e && !e.later;

/* What is actually IN THE BAG — the cap, the grounding and every count use
   this, never the raw array. */
export function carried(list) { return (list || []).filter(inHand); }
export function setAsideList(list) { return (list || []).filter(e => e && e.later); }

export function isCarrying(list, kind, ref) {
  return (list || []).some(e => same(e, kind, ref) && inHand(e));
}
export function isSetAside(list, kind, ref) {
  return (list || []).some(e => same(e, kind, ref) && e.later);
}

export function carriedOf(list, kind) {
  return (list || []).filter(e => inHand(e) && e.kind === kind);
}

/* SET ASIDE — "pick up later". No cap: this is a shelf, and a shelf that
   fills up would be the same wall wearing a different label. */
export function setAside(list, entry, now) {
  const cur = Array.isArray(list) ? list.slice() : [];
  if (!entry || !KINDS[entry.kind] || entry.ref == null || entry.ref === '') {
    return { list: cur, ok: false, reason: 'That is not something you can set aside.' };
  }
  const at = cur.findIndex(e => same(e, entry.kind, entry.ref));
  if (at >= 0) { cur[at] = { ...cur[at], later: true }; return { list: cur, ok: true, moved: true }; }
  cur.push({ kind: entry.kind, ref: String(entry.ref),
             label: String(entry.label || entry.ref), since: now || '', later: true });
  return { list: cur, ok: true };
}

/* TAKE IT UP AGAIN — off the shelf and into the bag, cap and all. The one
   place the cap can bite twice, so it says the same thing it said the first
   time rather than inventing a second wording. */
export function takeUp(list, kind, ref) {
  const cur = Array.isArray(list) ? list.slice() : [];
  const at = cur.findIndex(e => same(e, kind, ref));
  if (at < 0) return { list: cur, ok: false, reason: 'That is not on your shelf.' };
  if (carried(cur).length >= CARRY_CAP) {
    return { list: cur, ok: false, full: true,
      reason: 'Your backpack is full (' + CARRY_CAP + '). Set something down to make room — '
            + 'it goes back to where it lives, nothing is lost.' };
  }
  cur[at] = { ...cur[at] }; delete cur[at].later;
  return { list: cur, ok: true };
}

/* PICK UP. Returns {list, ok, reason} — never throws, and never
   silently declines. A caller that ignores `reason` will show a button
   that does nothing, which is the house failure mode, so the reason is
   a sentence fit to put on screen rather than a code. */
export function pickUp(list, entry, now) {
  const cur = Array.isArray(list) ? list.slice() : [];
  if (!entry || !KINDS[entry.kind] || entry.ref == null || entry.ref === '') {
    return { list: cur, ok: false, reason: 'That is not something you can carry.' };
  }
  if (isCarrying(cur, entry.kind, entry.ref)) {
    // Already held is a SUCCESS. Pressing "take" twice must not read as a
    // failure, and must not put a second copy in the bag.
    return { list: cur, ok: true, already: true, reason: 'Already in your backpack.' };
  }
  /* THE CAP COUNTS WHAT IS IN HAND, not what you own. The shelf is
     deliberately outside it — see setAside() above. */
  if (carried(cur).length >= CARRY_CAP) {
    /* A FULL BACKPACK IS A REDIRECTION, NOT A WALL. The cap exists to focus
       attention on what is in front of you; it is not a limit on what you
       may keep. So the refusal names the way through in the same breath, and
       `canSetAside` tells the caller to offer it as one press — a message
       that only says no is the same dead end this project keeps removing. */
    return { list: cur, ok: false, full: true, canSetAside: true,
      reason: 'Your backpack is full (' + CARRY_CAP + ') — that keeps it to what you are '
            + 'actually working on. Put this on your "pick up later" shelf instead, or set '
            + 'something down to make room. Nothing is ever lost either way.' };
  }
  cur.unshift({ kind: entry.kind, ref: String(entry.ref),
                label: String(entry.label || entry.ref), since: now || '' });
  return { list: cur, ok: true };
}

/* SET DOWN — the deliberate word. Never "remove", never "delete": the
   thing goes back to where it lives and the Today panel uses the same
   word for a project past its date, on purpose. */
export function setDown(list, kind, ref) {
  const cur = Array.isArray(list) ? list : [];
  return cur.filter(e => !same(e, kind, ref));
}

export function setDownAll(list) { return []; }

/* WHAT YOU ARE CARRYING THAT NO LONGER EXISTS.

   A reference outlives the thing it points at — a book removed from the
   shelf, a note deleted. `exists` is supplied by the caller (only it
   can know), so this stays pure. Stale entries are REPORTED, not
   silently dropped: a bag that quietly empties itself is the failure
   mode where you stop trusting the bag. */
export function stale(list, exists) {
  return (list || []).filter(e => e && !exists(e.kind, e.ref));
}

/* A short line for the HUD. Never a bare number — "3" reads as a demand,
   the same reason theDayLine is a sentence. */
export function carryLine(list) {
  const held = carried(list), shelf = setAsideList(list).length;
  const tail = shelf ? ' · ' + shelf + ' to pick up later' : '';
  if (!held.length) return shelf ? shelf + ' waiting on your shelf' : '';
  if (held.length === 1) return 'carrying ' + (held[0].label || 'one thing') + tail;
  return 'carrying ' + held.length + ' things' + tail;
}

/* GROUNDING: what a resident is allowed to see, in one place.

   "The backpack is the grounding" — what you carried in is what the
   resident can see. Not a heuristic guessing relevance, not the whole
   catalogue. This returns the REFERENCES; resolving them to text is the
   caller's job, because that reaches for the save and for retrieval.js.

   The uncapped-prompt bug has been fixed three times because every
   grounding block was assembled by hand and written fresh. A carried
   list is already capped, by a person, on purpose — so the cap is not
   a discipline anyone has to remember here. */
export function groundingFor(list, kinds) {
  const want = kinds && kinds.length ? kinds : KIND_KEYS;
  /* carried(), NOT the raw list. Something set aside for later is on a shelf,
     not in your hands, and "what you carry is what a resident can see" has to
     stay literally true or it is just a slogan. */
  return carried(list).filter(e => want.includes(e.kind));
}
