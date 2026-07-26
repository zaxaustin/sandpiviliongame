# Visual Polish — making it look intentional and professional (without betraying the sleeper car)

Written 2026-07-26, at direct request: make the Pavilion "look more appealing and
professional" — *a game that's not a game*, as good as we can make it.

## The reconciliation up front (so this doesn't fight a standing decision)

The **sleeper-car decision stays**: low-res on purpose, so the machine's real
resources go to a local AI, a big Library, and real work — not the renderer. But
"low-res on purpose" was **never** meant to mean *unpolished*. There's a world of
difference between *cheap-looking* and *deliberately minimal but cohesive.*
**Professional here = intentional, consistent, and cared-for — not high-res.**
Everything in this plan is CSS/layout/palette/pixel-art discipline; none of it
spends CPU/GPU. It makes the Pavilion look like someone *chose* every pixel,
which is exactly the sleeper-car ethos made visible.

## Honest read of where it is now

Genuinely coherent already — this is polish, not a rescue:
- A real aesthetic: **amber (#e0a43c) on dark parchment (#2a2118/#1a130c)**,
  typewriter monospace, warm cream text, soft dark shadows, the reader in
  dark-ink-on-parchment. The phone/card/badge patterns are consistent.
- **What holds it back from "professional":**
  1. **No design tokens** — every colour is hardcoded (dozens of `#e0a43c`,
     `#f5e9d4`…) in `style.css` *and* in inline `style="…"` all over
     `overlays.js`. You can't tune the look in one place, and small
     inconsistencies creep in.
  2. **Slightly inconsistent scales** — radii (6/7/8/9/12px), borders (2/3px),
     paddings vary a little. Small, but the eye reads it as "not quite tidy."
  3. **Monospace everywhere** — a strong, characterful choice (the terminal
     soul), but for long reading/UI it can read as "unfinished" to some. A
     refined *type system* (mono for accents/labels, a warmer readable face for
     body) is the single biggest "feels professional" lever — and a taste call.
  4. **The world/sprites are minimal** — fine per the sleeper car, but palette
     cohesion, gentle ambient light, and a stronger title screen would make it
     feel *composed* rather than placeholder.

## The plan, cheapest-highest-impact first

**Phase 1 — Design tokens (the foundation).** Extract one `:root` system in
`style.css`: a named **palette** (`--gold`, `--ink`, `--parchment`, `--muted`,
`--edge`, the blue/green/red accents), a **spacing scale** (4/8/12/16/24), a
**radius scale** (one small, one medium), **border** and **shadow** tokens, and
**type** tokens. Swap the core components (`.panel/.btn/.card/.badge/.xbtn/inputs`)
to use them. Values start *identical to today* (zero visual change) — then the
whole look is tunable from ten lines. This is the highest-leverage, lowest-risk
step and everything else builds on it.

**Phase 2 — Component consistency & states.** Normalize radii/borders/spacing to
the scale; unify card/button/badge styling; add considered **hover and
focus-visible** states (accessibility *and* polish) and gentle **transitions**.
Consistent empty-states ("nothing here yet" done nicely everywhere). This is
where "tidy and cared-for" is felt.

**Phase 3 — Typography.** The big "professional" lever, done with your eye: a
real type scale (sizes/line-heights that relate), and likely a **two-face
system** — keep the typewriter mono for labels, badges, the Computer, and code;
introduce a clean, warm face for body/reading (a bundled or web-safe font, no
external fetch — CSP/offline-safe). Keep the soul; lift the readability.

**Phase 4 — The world & sprites.** Palette-locked tiles and sprites so the world
reads as one composed scene; simple ambient light/vignette; room identity
(each room's own accent); a stronger **title screen**. Bigger, needs pixel-art
passes — pairs with `CHARACTER-CUSTOMIZATION-PLAN.md`. Still low-res, still cheap.

**Phase 5 — Motion & touches.** Gentle overlay open/close transitions, a nicer
AI-thinking state, cohesive iconography, a consistent "toast"/confirmation
language. The small stuff that separates "made with care" from "functional."

## How we actually do visual work (the honest method)

Visuals need *eyes*, and I can't see the running game from here. So:
1. I propose a direction you can **look at** (a self-contained style-guide
   mockup — see the artifact made alongside this plan), not blind CSS edits.
2. You react — keep/kill/tweak.
3. I apply the approved direction to the **real** `style.css` (starting with the
   Phase-1 tokens), and you run the app to confirm each step. Small, verifiable
   changes — never a big blind restyle of a working app.

## What this explicitly is NOT
- Not high-res art, 3D, or anything that spends the resources the sleeper car
  protects. Cohesion and intention, not horsepower.
- Not a rewrite — it's tokenizing and tidying a design that already works.

## Cross-references
- `CLAUDE.md` — the sleeper-car standing decision this is careful to honor.
- `CHARACTER-CUSTOMIZATION-PLAN.md` — the sprite/appearance work Phase 4 leans on.
- `src/game/style.css` — the stylesheet Phase 1–2 tokenize and tidy.

**One line to hold onto:** professional isn't more pixels — it's making every
pixel look chosen; tokenize the look, tidy the scales, lift the type, and the
same sleeper car reads as a thing built with real care.
