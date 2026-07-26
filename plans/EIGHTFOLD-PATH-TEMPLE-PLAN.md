# Eightfold Path Temple Plan

**Visuals built and verified live, 2026-07-10 — see the "Status" note at
the bottom.** Written down the same day, asked for directly: rather than
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

1. **[x] Done 2026-07-10.** Exact tile placement for the eight new
   sign-stations within the Keep's existing floor plan (`scenes.js`'s
   `buildKeep()`) — paired left/right down the corridor, ascending
   south to north toward the shrine, mirroring the Buddha/Ganesha
   layout's own symmetry.
2. **[x] Done.** Real sign text per fold — the Pali name, the plain
   English name, the fold's real meaning cited to the shelved Dhammapada
   (Chapter XX, "The Path"), and the one-line tie to an existing
   Pavilion feature from the list above, for all eight.
3. **[x] Done.** Verified live via a real Playwright run against the
   actual running game, not just read: teleported into the Keep,
   confirmed all eight signs render in the correct paired layout with no
   collisions, and read the first sign's full text on screen to confirm
   it renders correctly (including the Pali diacritics).
4. **(B), the full eight-room complex** — still not picked up, on
   purpose. (A) hasn't yet been walked and judged "too small" by anyone
   but this session; a real call, not a default.

## What's still actually open

**Real interaction, past reading a sign — now given a direction
(2026-07-12).** The build above is deliberately visuals-only, per direct
instruction that session — walk up, read, that's the whole mechanic today.
The user has since named what the interaction is *for*: **the Eightfold Path
as a pillar of continuous improvement** — "a way forward, a pillar for people
to say *no, this is not enough, I can keep improving this aspect.*" So each
fold becomes not a station you complete but an **aspect you can always push
further, deliberately never marked done** — a ladder with no top rung, which
is the opposite of a checklist or a score (and must stay that way to fit the
project's anti-gamification, anti-completion ethos).

**The shape is decided (2026-07-12): the reflection ladder.** Walking up to a
fold's sign opens a small panel where you can, any time, write a short
reflection on where you actually are with that aspect and name **one concrete
way you could push it further** — kept, dated, added to over time, and **never
"finished," never scored, never a checklist** (a ladder with no top rung is the
whole point; a completion mechanic would betray it). It leans on the tie-ins
each fold already has (Right Intention → the planner's intention field; Right
Effort → sparks/carry-forward; Right Mindfulness → the four postures), so a
reflection can point at a real Pavilion practice, not just a resolution. The
Monk, the Path's living teacher in the Keep, is the natural resident to help
counsel on a fold when asked. This is a real feature, its own build — not
assumed small — and sits alongside the Science Hall as the "keep improving"
half of the same foundation (see `SCIENCE-RESEARCH-HALL-PLAN.md` and
`project_foundation_vision` in memory).

### The build, when picked up (not built yet — the honest next slice)

1. **Data:** `data.temple.folds` (or similar) — a small map keyed by fold id,
   each holding a dated list of `{where, next, ts}` entries. Add to `freshData()`
   with an older-save patch, same pattern as `data.hall`.
2. **Reach it:** the eight fold-signs in `buildKeep()` already render and are
   walkable; make each one open a per-fold panel (a new `hallOv`-style overlay)
   instead of only showing sign text. The sign's Dhammapada quote stays at the
   top of the panel — reading and reflecting in one place.
3. **The panel:** the fold's name (Pali + English), its shelved Dhammapada
   verse, its existing tie-in as a live link, then the two open-ended fields
   ("where I am," "one way to push further") and the kept, dated history below.
   No score, no "mark done." An optional "ask the Monk about this fold" button
   that opens his chat grounded in the fold (reuses the resident chat stack, the
   same way `talkToInvestigator()` does).
4. **Verify** the usual way (`node --check`, smoke, build), update MANUAL +
   README + dev-log, same as the Science Hall pass.

**The bare-bones-vs-Zac's-addition question, from `TOOL-COMMONS-PLAN.md`
— still genuinely undecided.** Is this Temple something every fork of
this project would want, or specifically this Pavilion's own tradition,
the same category as the Monk's own teaching? Flagged, not answered,
when the visuals shipped; still open.

## What this explicitly is not

Not a rename of the Workshop rooms — those stay exactly as sketched in
README's "What's next" #9, their own separate, practical idea (now also
built — see `README.md`'s "Done since" trail, 2026-07-10). Not a new
game mechanic — reuses the existing sign/shrine rendering system
throughout, on purpose.
