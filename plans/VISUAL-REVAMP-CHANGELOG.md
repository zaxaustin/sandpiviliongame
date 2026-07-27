# Visual Revamp — Changelog

A running, concrete record of every visual change made during the revamp (see
`VISUAL-POLISH-PLAN.md` for the phased plan). Kept so any change can be
understood, reproduced, or reverted later. Newest first.

---

## 2026-07-26 · Phase 4 (start) — the title screen, redesigned as a threshold

**Files:** `index.html` (`#title` markup), `src/game/style.css` (`#title` + new
`.titleInner/.titleRule/.titleTag/.titleStatus/.titleBtns`)

**What:** The entrance was a wall of monospace over a flat dark. Redesigned as a
composed threshold:
- A **warm hearth-glow** background (layered radial gradients) with a soft bottom
  vignette, over near-black — candlelight, not a black curtain.
- The mono name kept as the **"sign"** (larger `clamp(30–52px)`, letter-spaced, a
  soft gold text-glow).
- An **ornamental rule** with a small centred floret (&#10086;) — a rose in the
  rafters.
- The old descriptive paragraph replaced with a one-line **serif invitation**
  (`--font-read`, italic, balanced) — the two-face system used to *welcome*, not
  to explain. Orientation moved fully to the "New here?" button.
- Quiet, coloured **status lines** (green save / blue AI / muted library) and a
  centred button stack; the Enter button gets a faint glow.
- A gentle `titleRise` fade-in on load (respects `prefers-reduced-motion`).
Verified by screenshot — reads as a real, reverent entrance. build ✓.

---

## 2026-07-26 · Phase 2 interaction states + Phase 3 (start) reading serif

**Files:** `src/game/style.css`

**Interaction states (Phase 2):** every button now gives feedback and every
focus is visible.
- `.btn` — smooth `filter/transform/box-shadow` transition + `:hover
  brightness(1.07)` (keeps its existing press-down `:active`).
- `.btn.ghost` — a faint warm wash + brighter edge on hover
  (`background:rgba(224,164,60,.12); border-color:var(--gold-bright)`) that works
  regardless of the button's own accent, plus a subtle `:active` nudge.
- `.menuDanger:hover` — a danger-red wash instead of gold.
- `.xbtn` — transition added.
- One consistent keyboard **focus ring** (`outline:2px solid var(--gold-bright)`)
  on buttons, links, cards, spines — accessibility + polish.
- `.card:hover` — border gold **and** a slightly lifted background.
Verified by screenshot (hover wash on a menu item reads clearly, not garish).

**Reading serif (Phase 3 start):** added `--font-read` (Georgia → Palatino →
serif; web-safe, no fetch). The Reader's **prose** — book title, section
headings, summary, and full-text page — now renders in the serif at a comfier
`15.5px/1.8`, while all surrounding chrome (buttons, meta, the notes column)
stays in `--font-mono`. A book now reads like a book; the two-face system is the
biggest single "pro" lever and this is its first, contained application.
Verified: the reader screenshot shows serif prose against mono chrome — clean and
intentional. build ✓, smoke ✓.

---

## 2026-07-26 · Phase 2 (start) — Pause menu grouped + screenshot pipeline

**Files:** `src/game/ui/overlays.js` (`renderMenu`), `src/game/style.css`
(`.menuResume/.menuSection/.menuGrid/.menuItem/.menuDanger`)

**What:** The pause menu was one long stack of ~19 identical ghost buttons.
Regrouped into **labelled sections** (Your day · Library · Local AI · Account &
data · Save & session) laid out in a **two-column grid**, with a prominent solid
**▸ Resume** at top and the reset in danger red. Same buttons/handlers, real
hierarchy — the first visible "pro" jump, and it now fits the viewport.

**Verified visually** (see below) via a new screenshot pipeline: `puppeteer-core`
driving the *system* Chrome (no browser download) against `vite preview`, calling
the game's `window.*` overlay functions and capturing PNGs. This is how visual
work is checked from now on — the running game can finally be *seen*, not guessed.
Recorded for reuse in memory `reference_screenshotting_the_game`.

**Verification:** build ✓, smoke ✓; screenshots of menu/shelf/reader confirm the
grouped menu and that Phase-1 tokens caused **no regressions** (reader parchment
skin, panels, buttons all correct).

---

## 2026-07-26 · Phase 1 — Design tokens (zero visual change)

**Files:** `src/game/style.css`

**What:** Introduced a `:root { … }` design-token block at the top of the
stylesheet and pointed the core UI components at it. **No pixel changed on
screen** — every token was set to the exact value the components already used;
this is purely "define the look in one place so it's tunable."

**Tokens added** (name → value):

- Surfaces: `--void:#141019`, `--ground:#1a130c`, `--field:#1b140d`,
  `--surface:#221a12`, `--surface-raised:#241b12`, `--parchment:#2a2118`
- Ink: `--ink:#f5e9d4`, `--ink-soft:#eadfca`, `--muted:#9c8b74`,
  `--muted-light:#cbb79a`, `--muted-card:#b3a288`
- Gold accent: `--gold:#e0a43c`, `--gold-bright:#ffd98a`, `--gold-deep:#8a6423`
- Edges: `--edge:#55432e`, `--edge-faint:#3a2e20`, `--edge-gold:#6b4a2f`,
  `--edge-warm:#8a6a3a`
- Accents: `--blue:#7fa9c9`, `--blue-soft:#a9c7e8`, `--blue-deep:#4a6a8a`,
  `--green:#7fa36b`, `--green-soft:#a9cf90`, `--danger:#b56f6f`,
  `--danger-soft:#e0a0a0`
- Type: `--font-mono:'Courier New', monospace`
- Spacing: `--sp-1:4px … --sp-6:24px` (defined for Phase 2; not yet applied)
- Radius: `--r-sm:6px`, `--r-md:9px`, `--r-lg:12px`
- Shadows: `--shadow-panel:0 10px 40px rgba(0,0,0,.6)`,
  `--shadow-card:0 4px 8px rgba(0,0,0,.35)`

**Components converted to tokens:** `html,body` (bg + font), `.panel` and its
`h2/h3/.meta/.meta b/p`, `.btn`, `.btn.ghost`, `.xbtn` (+`:hover`), `.card`
(+`:hover`, `.t`, `.s`), `#dropZone.over`, `.badge` (+`.lic`), `a.link`,
`input[type=text]`/`textarea` (+`:focus`), `label`.

**Deliberately left literal for Phase 2** (normalising these is an intentional,
visible change, not part of the zero-change foundation): the non-scale radii
(`7px` on `.btn`/inputs, `8/10px` elsewhere), per-component paddings, and the
many one-off hexes still inside `#dialog`, `#hud`/`#menuBtn`, the chat view
(`.bubble` etc.), the pocket cards (`#chatPhone`/`#bookPhone`/`#butlerPing`), the
calendar, the planner blocks, and the book spines. Those get pointed at the same
tokens as each area is polished.

**Verification:** `npm run build` ✓, smoke test ✓ (10 scenes, 22 docs).

**Revert:** delete the `:root` block and restore literal values (the git commit
for this change is self-contained).

---

## 2026-07-26 · Phase 0 — Shelf organization

**Files:** `src/game/ui/overlays.js` (`openShelf`, `renderShelf`, new
`shelfSortKey`/`SHELF_ROW_MAX`), `src/game/style.css` (`.shelfRow`,
`.shelfRowCap`)

**What:** Each shelf now **sorts alphabetically** by title (leading "the/a/an"
ignored) and breaks into **bays of ≤20 books**, each captioned with its letter
range and index range (e.g. `A–D · 1–20`). Sorting happens once when the shelf
opens (`state.shelfDocs` becomes the ordered list), so `selectBook`/`shelfNav`
indices stay correct.

**Known follow-up:** sort is **by title** because books carry no `author` field
yet. Adding `author` to the data model + the add-a-book form, then switching
`shelfSortKey` to prefer it, flips this to true by-author shelving.

**Verification:** `node --check` ✓, smoke ✓ (10 scenes), build ✓.
