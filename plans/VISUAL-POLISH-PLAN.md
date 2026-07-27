# Visual Polish — the revamp plan: ugly duckling → swan

Reframed 2026-07-26, at direct request: the interface is what's lacking; spend
real time "in the eyes of a front-end designer" and make it look **pro-game**,
without betraying the sleeper car. Worked as a sequenced plan we execute **one
step at a time**, each verified before the next.

## 0. The stack question, settled first (it changes everything)

The user asked: make it a **Java-style game**, or keep it as-is to **one day be
an interactive website**? The honest answer:

**Keep the current stack. Don't rewrite.** Two facts settle it:

1. **It's already the interactive website.** This is **vanilla JavaScript**
   (not TypeScript — worth knowing), bundled by Vite, running *both* as the
   Electron desktop app **and** live on the web (`sandpiviliongame.vercel.app`)
   from one codebase. The "one day a website" goal is *already met*; a rewrite
   would spend effort to get back to where we are.
2. **Java would cost everything and buy nothing for our goals.** Java isn't a
   web-game language — going that way means desktop-only, losing the web target,
   the Electron app, and every overlay/scene/AI-integration already built. It
   does **not** make the local-first/local-AI story better (that's Ollama +
   MinIO on your machine regardless of the game's language).

**"More game-like" is not a language problem — it's a craft problem** we solve in
the stack we have: the HTML/CSS interface (the overlays — "the interface is
everything," and it's all styleable today) and the `<canvas>` world renderer
(cheap pixel art on purpose — the sleeper car). If we ever want richer *world*
rendering later, the seam is to layer a small canvas library **into** this same
web app — never a rewrite. Recommendation stands: **vanilla JS, web + Electron,
polish the craft.**

## The reconciliation (so this honors a standing decision)

The **sleeper-car decision stays**: low-res on purpose, so the machine's real
resources go to a local AI, a big Library, and real work — not the renderer. But
"low-res" never meant *unpolished*. **Professional here = intentional, consistent,
cared-for — not high-res.** Everything below is CSS/layout/palette/pixel
discipline; none of it spends CPU/GPU. It makes the Pavilion look like someone
*chose* every pixel — the sleeper-car ethos made visible.

## The revamp, phase by phase (execute one by one)

**Phase 0 — Shelf organization. ✅ DONE 2026-07-26.** A real library is ordered.
Each shelf now sorts alphabetically (leading "the/a/an" ignored, librarian-style)
and breaks into **bays of at most 20**, each captioned with its letter range
(e.g. `A–D · 1–20`) — an ordered stack instead of one endless scroll. Sorting
happens once at open, so indices stay honest. *By title for now* — a book has no
stored `author` field yet; adding one flips this to by-author (small follow-up:
add `author` to the data model + the add form, then change `shelfSortKey`).

**Phase 1 — Design tokens (the foundation, invisible, safe).** Extract one
`:root` system in `style.css`: named **palette** (`--gold`, `--ink`,
`--parchment`, `--muted`, `--edge`, the blue/green/red accents), a **spacing
scale** (4/8/12/16/24), a **radius scale** (one small, one medium), **border**
and **shadow** tokens, **type** tokens. Swap the core components
(`.panel/.btn/.card/.badge/.xbtn`/inputs) to use them. Values start *identical to
today* → zero visual change → then the whole look tunes from ten lines. Highest
leverage, lowest risk; everything after builds on it.

**Phase 2 — The interface chrome (where "pro" is felt).** With tokens in place:
normalize radii/borders/spacing to the scale; unify card/button/badge styling;
add considered **hover** and **focus-visible** states + gentle transitions;
consistent, nicely-done empty states everywhere; a cohesive panel header
treatment. This is the overlays — the part the user means by "the interface is
everything." The single biggest jump from "functional" to "pro."

**Phase 3 — Typography (the biggest single "professional" lever).** A real type
scale (sizes/line-heights that relate) and a **two-face system**: keep the
typewriter mono for labels, badges, the Computer, and code; introduce a clean,
warm face for body/reading — inlined as a `@font-face` data URI (CSP/offline-safe,
no external fetch). Keeps the soul, lifts the readability.

**Phase 4 — The world, sprites & title screen.** Palette-locked tiles/sprites so
the world reads as one composed scene; gentle ambient light/vignette; per-room
accent identity; a stronger **title screen** (the first impression a friend
gets). Bigger — needs pixel-art passes; pairs with
`CHARACTER-CUSTOMIZATION-PLAN.md`. Still low-res, still cheap.

**Phase 5 — Motion & touches.** Gentle overlay open/close transitions, a nicer
AI-thinking state, cohesive iconography, one consistent toast/confirmation
language. The small stuff that separates "made with care" from "functional."

## How we actually do it (the honest method)

Visuals need *eyes*, and the running game can't be seen from here. So:
1. For look-changing steps, propose a direction you can **see** — a
   self-contained style-guide mockup (the published artifact "The Sand Pavilion
   — Visual System"), not blind CSS edits.
2. You react — keep / kill / tweak.
3. Apply the approved direction to the **real** `style.css` in **small,
   verifiable steps**; you run the app to confirm each. Never a big blind
   restyle of a working app. (Logic/organization steps like Phase 0 are safe to
   just build + verify with the smoke test/build.)

## What this is NOT
- Not a language rewrite (see §0). Not high-res, 3D, or anything that spends the
  resources the sleeper car protects. Cohesion and intention, not horsepower.
- Not a from-scratch redesign — it's tokenizing, tidying, and lifting a design
  that already works.

## Cross-references
- `CLAUDE.md` — the sleeper-car standing decision this honors.
- `CHARACTER-CUSTOMIZATION-PLAN.md` — the sprite/appearance work Phase 4 leans on.
- `src/game/style.css` — the stylesheet Phases 1–3 tokenize and tidy.
- `src/game/ui/overlays.js` — `renderShelf` (Phase 0), the overlays (Phase 2).

**One line to hold onto:** professional isn't more pixels or a new language — it's
making every pixel look chosen. Order the shelves, tokenize the look, tidy the
scales, lift the type, and the same sleeper car reads as a thing built with real
care.
