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

**Phase 1 — Design tokens (the foundation, invisible, safe). ✅ DONE 2026-07-26.**
Extracted one `:root` system at the top of `style.css`: a named **palette**
(surfaces `--void/--ground/--field/--surface/--surface-raised/--parchment`, ink
`--ink/--ink-soft/--muted/--muted-light/--muted-card`, the gold `--gold/
--gold-bright/--gold-deep`, edges `--edge/--edge-faint/--edge-gold/--edge-warm`,
and semantic accents `--blue*/--green*/--danger*`), a **spacing scale**
(`--sp-1..6` = 4/8/12/16/24), a **radius scale** (`--r-sm/md/lg` = 6/9/12),
**shadow** tokens, and a **type** token (`--font-mono`). The core components
(`body`, `.panel` + headings/meta/p, `.btn`/`.btn.ghost`, `.xbtn`, `.card` +
`.t`/`.s`, `.badge`, inputs/textarea, `label`) now read from them. **Every value
is identical to before → zero visual change**; the look is now tunable from one
block. Full mapping recorded in `VISUAL-REVAMP-CHANGELOG.md`. *Still literal for
now (normalised in Phase 2):* the odd radii (7/8/10px) and per-component
paddings, and the many one-off hexes in `#dialog`, the chat view, the phone
cards, the calendar, and spines — those get pointed at tokens as each area is
touched in Phase 2.

**Phase 2 — The interface chrome (where "pro" is felt). ◀ IN PROGRESS.** First
pieces **done 2026-07-26:** (a) the **pause menu** regrouped into labelled
sections in a two-column grid (prominent Resume, danger-red reset); (b)
**interaction states** across the whole UI — button hover feedback (solid
brightens, ghost gets a warm wash), a consistent keyboard focus ring, card hover
lift, smooth transitions. Both verified by screenshot. Still to do: normalise
spacing onto `--sp-*` and radii onto `--r-*`, and consistent empty states. With
tokens in place:
normalize radii/borders/spacing to the scale; unify card/button/badge styling;
add considered **hover** and **focus-visible** states + gentle transitions;
consistent, nicely-done empty states everywhere; a cohesive panel header
treatment. This is the overlays — the part the user means by "the interface is
everything." The single biggest jump from "functional" to "pro."

**Phase 3 — Typography (the biggest single "professional" lever). ◀ STARTED
2026-07-26.** The **two-face system** is in: `--font-mono` (chrome — labels,
buttons, the terminal) + `--font-read` (a warm serif for prose). First applied to
the **Reader** — book title/headings/summary/full-text now read in the serif at
15.5px/1.8, chrome stays mono. Chosen a **web-safe stack** (Georgia → Palatino →
serif) rather than a bundled `@font-face` data URI for now — zero fetch, ships on
Windows/Mac, graceful serif fallback on Linux; revisit an embedded face only if we
want one exact type everywhere. Still to do: extend the serif to other real
reading surfaces (dialogue text, chat bubbles) if it reads well there, and settle
a related **type scale** (sizes/line-heights).

**Phase 4 — The world, sprites & title screen.** Palette-locked tiles/sprites so
the world reads as one composed scene; gentle ambient light/vignette; per-room
accent identity; a stronger **title screen** (the first impression a friend
gets). Bigger — needs pixel-art passes; pairs with
`CHARACTER-CUSTOMIZATION-PLAN.md`. Still low-res, still cheap.
  - **Art constraint, stated 2026-07-26:** keep the warm walk-around **RPG feel**
    the user likes — but **all art is original**, resembling **no existing game's
    characters, sprites, tilesets, logos, or names** (no legal exposure, ever),
    and **no creature-collecting / pet system for now**. The vibe is "a cozy
    top-down RPG town," achieved with our own tiles and palette — never by
    borrowing anyone's IP.

**Phase 5 — Motion & touches.** Gentle overlay open/close transitions, a nicer
AI-thinking state, cohesive iconography, one consistent toast/confirmation
language. The small stuff that separates "made with care" from "functional."

## How we actually do it (the honest method)

Visuals need *eyes* — and as of 2026-07-26 the running game **can** be seen from
here: `puppeteer-core` drives the system Chrome against `vite preview`, opens any
overlay via its `window.*` function, and captures a PNG that gets reviewed
directly (see `reference_screenshotting_the_game`). So the method is now:
1. Make the change, **screenshot it**, and look — catching regressions and ugly
   spots before they ship. A style-guide mockup is still useful for proposing a
   *direction* to the user up front (the published artifact "The Sand Pavilion —
   Visual System").
2. The user reviews in the real app when they want — keep / kill / tweak.
3. Apply in **small, verifiable steps**; never a big blind restyle. Screenshots +
   `build`/smoke verify each step.

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
