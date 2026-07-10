# Eightfold Path Temple Plan

Not started. Written down 2026-07-10, asked for directly: rather than
rename the sketched Workshop rooms (README's "What's next" #8 — the
Ledger, the Maker's Bench, the Greenhouse, the Records Hall, the Round
Table, the Mailroom) after the Noble Eightfold Path, put the Path where
it actually belongs — the Keep, the Pavilion's existing temple, already
home to the Buddha shrine, the Ganesha shrine, and the Monk's own
quarters. The Workshop rooms stay exactly as sketched, untouched by this
plan, their own separate thing.

## The eight folds, in the real, canonical order

Not "right view, right speech, right understanding, etc." loosely — the
actual order matters here the same way it mattered to get Ganesha's body
right, not just his silhouette. Traditionally grouped into three
divisions, walked in this order:

**Wisdom (paññā)**
1. **Right View** (sammā-diṭṭhi) — seeing clearly: the Four Noble Truths
   as they actually are, not as hoped or assumed.
2. **Right Intention** (sammā-saṅkappa) — the resolve behind action:
   renouncing ill will and harm, aiming at something worth aiming at.

**Ethical conduct (sīla)**
3. **Right Speech** (sammā-vācā) — truthful, kind, not divisive or idle.
4. **Right Action** (sammā-kammanta) — conduct that doesn't harm.
5. **Right Livelihood** (sammā-ājīva) — a way of earning that doesn't
   require harming to sustain itself.

**Mental discipline (samādhi)**
6. **Right Effort** (sammā-vāyāma) — sustained, honest practice, not a
   burst of motivation.
7. **Right Mindfulness** (sammā-sati) — real awareness of body, feeling,
   mind, and phenomena, moment to moment.
8. **Right Concentration** (sammā-samādhi) — the settled, absorbed
   attention the other seven make possible.

**Real source, already shelved:** the Dhammapada (`dhammapada`,
Theravada shelf, F. Max Müller's 1881 translation, already full-text in
the Library) names this directly in Chapter XX, "The Path" — opening
"The best of paths is the eightfold" and naming each fold by name in the
verses that follow. The Temple's signage should quote from this exact,
already-verified edition rather than paraphrase from memory — same
discipline as every other shelved text here.

## Why the Keep, not the Workshop

The Workshop rooms are practical: a budget tracker, a physical-build
bench, a co-study room. Mapping "Right Speech" onto the Mailroom or
"Right Livelihood" onto the Round Table would be forcing a fit that
isn't there. The Keep already *is* the Pavilion's spiritual home — the
Monk's own system prompt already says he upholds "the Four Noble Truths
and the Noble Eightfold Path" for everyone who lives here or visits; a
Temple built around the Path is that role made spatial, not a new idea
grafted on.

## The real design constraint: the Keep is one small room

`buildKeep()` in `scenes.js` is 18×13 tiles, deliberately small and
quiet — the Keeper's own line says so directly ("No throne in this keep,
friend — just the charter and a good roof"), and the Monk was moved in
from the Library specifically for a *quieter* room. Two ways to actually
build eight folds into that:

- **(A) Eight stations within the current room — recommended.** New
  sign-tiles (the same system already rendering the Buddha shrine,
  Ganesha shrine, and Charter signs — no new mechanic needed), placed as
  a real walkable circuit through the room's open southern floor (below
  the existing shrine line at y≈2–5), in the canonical order above,
  ending near the Monk's own platform since he's the Path's living
  teacher. Keeps the room's established "small and quiet" character
  intact — a real circuit to walk, not a wing to add.
- **(B) A real eight-room complex**, one small room per fold, warped
  between like the Library's own Study/basement doors. Closer to a
  literal "temple," but a much bigger build (eight new tile grids, eight
  sets of art and signage) and works against the Keep's own established
  identity as one quiet room, not a wing. Worth keeping in mind only if
  (A), once built and walked, genuinely feels too small for what's
  being asked.

**(A) is the real recommendation** — smaller, faster, and doesn't fight
the room's own established character.

## Making it more than a plaque trail

The strongest version of this doesn't just quote the Dhammapada eight
times — it ties each fold to something that already exists elsewhere in
the Pavilion, so walking the Path is also a walk through what the whole
place already means:

1. **Right View** → the Charter itself, and the Library's own promise
   (every text answers what it is, where it's from, what it costs to
   keep) — seeing clearly is already this project's first principle.
2. **Right Intention** → the Writing Desk's own intention field
   (`openPlanner()`) — the game already asks "what's your intention for
   today" every morning; this fold names why that question is there.
3. **Right Speech** → the café's steward-moderated Notice Board, and the
   AI residents' own careful tone (never invented, never cruel).
4. **Right Action** → the no-poison ethic itself — nothing in this
   Pavilion is real harm dressed up as content, checked, not assumed.
5. **Right Livelihood** → a forward nod to the Ledger and the Grant Desk
   (real, honest work, real numbers) — without merging into the
   Workshop rooms themselves.
6. **Right Effort** → the daily planner's sparks and carry-forward
   system — the Pavilion's actual machinery for sustained, honest daily
   practice.
7. **Right Mindfulness** → the four postures (`M` — walking, standing,
   sitting, lying down) already built.
8. **Right Concentration** → meditation itself, and the sketched Five
   Animals practice track further out.

This turns the Temple into a real index of the Pavilion's own meaning,
not eight isolated quotations — the same instinct that made the Ganesha
statue worth a second pass instead of a placeholder blob.

## A sane build order, if picked up

1. **Exact tile placement** for the eight new sign-stations within the
   Keep's existing floor plan — a real layout decision, best made
   looking at the actual room (or a screenshot of it), not guessed blind
   from the tile-grid source.
2. **Real sign text per fold** — the Pali/Sanskrit name, the plain
   English name, a line from the actual shelved Dhammapada translation,
   and the one-line tie to an existing Pavilion feature from the list
   above.
3. **Verify live** — walk the full circuit in order, same discipline as
   every other content addition here (screenshot-checked, not just
   read), confirm the order actually reads correctly room to room.
4. **(B), the full eight-room complex** — only revisited later, and only
   if (A) genuinely feels too small once it's real and walkable.

## What this explicitly is not

Not a rename of the Workshop rooms — those stay exactly as sketched in
README's "What's next" #8, their own separate, practical idea. Not a
new game mechanic — reuses the existing sign/shrine rendering system
throughout, on purpose.
