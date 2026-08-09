# The residents learn to say "I can't reach that"

> ## ✅ BUILT 2026-08-10. Kept as the record of a plan that survived contact.
>
> `reachGap()` is pure in `data/lookup.js`, three states, doors derived from
> `PLACES`. `reachGapBlock()` composes it into `pathwayBlock()`; `reachGapOffer()`
> renders the 🎒 buttons under the reply. Live suite:
> `test/live/resident-reach.cjs`, **21 checks, Electron**, including the round
> trip — press the button, the book is carried, the gap closes, passages arrive.
>
> **Both corrections in this file were right and both were needed.** Correction 1
> (compute `NOTHING_HERE_YET` from `Store.allDocs()`, never from the lookup) is
> now an assertion. Correction 2 (the suite must be Electron) is why two of the
> three states are tested at all.
>
> **Two things the plan did not foresee, both found by running it:**
>
> - **A catalogue miss is not a gap while the visitor is being answered from
>   their own book.** Carrying *Walden* and asking a follow-up produced real
>   passages *and* "we do not have that, try the Request Board" in the same
>   breath. Both true; together, nonsense. `reachGap` now takes `served`.
> - **`passagesFor()` was searching on the raw question**, and `retrieval.js`
>   keeps a deliberately small stopword list — so *"do you have anything by
>   hildegard of bingen"* retrieved two pages of Thoreau that merely contained
>   *"have"*. It uses the shared `groundingPlan()` terms now. **One road to
>   knowledge, third time.**
>
> The one honest limit this file stated — *"it does not make a carried book
> searchable"* — **was closed the same day**, one commit earlier. Carry a book
> and you now get real passages with page numbers.


*Designed 2026-08-10, against the real code. Not built — the session it was
scoped for became a documentation reconciliation instead. Everything below was
verified at the time of writing; re-check the line anchors, not the line
numbers.*

---

## The gap, in the steward's words

> *"we should be able to have the resedents be like i dont have acces to this
> can you please put the book in your back pack and add it to the pavilion.
> kinda thing i know this but for a new user we gotta hold there hand"*

A resident cannot say that today, and **the reason is structural rather than a
missing sentence in a prompt.**

`libraryLookupBlock()` in `ui/residents.js` searches the catalogue, formats up
to twelve rows into a string — `- "Walden" — Thoreau (Personal)` — and **throws
the rows away**. Those rows are *shelf metadata*: title, author, shelf. **Not
one word of any book's text is in them.**

So Quill can tell you *Walden* is shelved and cannot answer a single question
about what is inside it — **and has no vocabulary for the difference.** He
answers from the title, or he goes quiet. That is CLAUDE.md rule 5 exactly: a
silent wrong thing where a loud honest one belongs.

**The bridge already exists and is one press away: 🎒 Take with you.** Nothing
tells a new visitor that. The steward knows; nobody else would.

## The principle this obeys

> *"i would rather have a strong foundation for tomrrow than loose functionalty
> for the local ai."*

Whether a resident is blocked is **a set lookup, not a judgement**. The app
knows exactly what it put in the prompt and exactly what is in the backpack.
Rule 7: this belongs in deterministic code, and the model is handed the small
correct result.

---

## Part 1 · `reachGap()` — pure, in `data/lookup.js`

Beside `groundingPlan()`. **Not a new file** — `lookup.js` already owns "one road
to knowledge" and already carries `LOOKUP_NOTICE`, the visitor-facing sentence
for the *notes* half of this exact boundary. This is the books half. Two modules
answering "what can a resident reach" is the drift its own header exists to stop.

```js
reachGap({ hits, carrying, total }) → { gap, line, doors, titles }
```

| gap | when | what the visitor is told |
|---|---|---|
| `SHELVED_NOT_CARRIED` | rows returned, none carried | open it, press 🎒 Take with you, ask again |
| `NOT_IN_THE_PAVILION` | real terms, zero rows | 🐫 Caravan Desk if they have the file · 📌 Request Board to have it fetched |
| `NOTHING_HERE_YET` | `total === 0` | 📥 Bring a book in — the shelf starts empty on purpose |

**The third state is separate deliberately.** Telling someone with zero books
that "that title is not on these shelves" is true and useless — it describes
their whole Library as a miss. Since `SEED_LIBRARY` is `[]`, **this is what a
brand-new install actually hits.**

### ⚠ Correction 1 — gap 3 must not depend on the database

`libraryLookupBlock()` returns `null` when `Store.dbAvailable()` is false, and
a browser tab has no bridge. As first drafted, the whole gap hung off that
lookup — so **the one state a new visitor hits would be the state that never
fires** in the web build.

`Store.allDocs().length` needs no bridge. **Compute `NOTHING_HERE_YET`
independently of the lookup.** Gaps 1 and 2 stay desktop-only, which is correct
— the desktop app is the main focus — and must be *stated* rather than
discovered.

### Doors are derived, never typed

Label and opener come from `PLACES` in `data/places.js`: `PLACES.review`
(🐫 Caravan Desk), `PLACES.requests` (📌 Request Board), `PLACES.intake`
(📥 Bring a book in). **Renaming a room changes the resident's sentence.**

Rule 4: a hand-typed room name across seven prompts is `hideAllOv()` wearing a
hat, and this project has paid for that shape three times. Both files stay pure;
no cycle.

## Part 2 · The prompt half

`libraryLookupBlock()` keeps its rows on **`state.dialog.shelfLookup`** — the
exact pattern `notesLookupBlock()` already uses with `d.noteSearch`. Then
`pathwayBlock()` appends `reachGap(...).line`, so **every resident gets it and
none can fail to.**

Write it as a **situation, not a script.** An instruction phrased as dialogue
gets delivered as dialogue — a mistake this very file already made and fixed
(see the `hits.length === 0` branch and its comment about the H.G. Wells run).

**Cost: zero tokens when nothing is out of reach.** ~35 when something is.

## Part 3 · The panel half — the actual hand-hold

A resident saying "put it in your backpack" to someone who does not know where
the backpack is has **moved** the dead end, not removed it.

`shelfLookupReceipt(d)` in `overlays.js`, composed into
`renderChatQuickActions()` beside `noteSearchReceipt(d)`, which it mirrors:

- **gap 1** — `🎒 Carry "<title>"` per uncarried hit, **capped at 4**, calling
  the existing `toggleInventory(slug)`
- **gap 2** — `📥 Bring a book in` · `📌 Request Board`
- **gap 3** — `📥 Bring a book in`, plus the one sentence on why it is empty

**The resident never carries anything itself. Every button is a human press** —
the same rule `noteSearchReceipt`'s 🎒 offers already keep.

### One honest limit, stated rather than blurred

This closes *"I can see it but can't read it."* It **does not** make a carried
book searchable — `carriedLines()` still contributes a card, not passages. That
is the other half, planned in `AI-INTEGRATION-NOTES.md` → *Retrieval reaches the
residents*. **Do this one first**, then that one.

---

## Verification

### `npm test` — break every guard on purpose first

Rule 3. Three guards were born dead in this project already.

1. `reachGap` given a hit that **is** carried → **no line.** Break it and the
   resident tells you to carry what is already in your bag.
2. `total: 0` → `NOTHING_HERE_YET`, never `NOT_IN_THE_PAVILION`.
3. **A derivation, not a grep** — the door named must be a real `PLACES` entry
   *and* its opener must appear in the window-export list `npm test` already
   derives, so a resident can never send someone to a door that is not there.
   **A comment must not be able to satisfy it** — a comment satisfied one of
   this project's guards already.

### ⚠ Correction 2 — the live suite must be Electron, not Chrome

`libraryLookupBlock()` returns `null` with no bridge, so **gaps 1 and 2 would
test nothing in a browser.** That is the "two homes need two suites" rule again.

- **`test/live/resident-reach.cjs` — Electron.** Run as
  `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/resident-reach.cjs`,
  the shape `note-search.cjs` already has. Use `test/live/_books.mjs` — **never
  the seed**, which no longer exists. Ask about a shelved-but-uncarried book;
  assert the prompt line and the 🎒 button; **press it**; assert the book is
  carried and the gap is gone on the next ask.
- **Browser** covers only what it honestly can: gap 3 on an empty shelf, and
  that the receipt renders with real buttons.

### LOOK AT IT

`npm run build:beta && npm run preview`, real Chrome, `page.on('pageerror')`
attached, **and read the .png**: the receipt under a reply, the buttons, a
narrow window.

---

## Noted while designing this, not fixed

**Quill and the Monk each call `libraryLookupBlock()` twice per message** — once
in their own `systemPrompt()` and again inside `pathwayBlock()`. With up to 4
terms per lookup that is 8 database round-trips where 4 would do. Harmless for
correctness (both writes stash the same rows on `state.dialog.shelfLookup`), and
worth folding in when this work is done. Registered in `docs/DOCS-DRIFT.md`.
