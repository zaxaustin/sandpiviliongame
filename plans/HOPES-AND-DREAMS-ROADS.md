# Hopes and Dreams — the roads, written down as walkable

Written 2026-07-11, at direct request, on the last day of a good
partnership: the README's "Hopes and dreams" attic turned into real,
staged roads — each with the dream in one line, the **first honest
slice** (a session or two of work, not a promise of the whole), and what
it genuinely waits on. Nothing here is scheduled; everything here is now
*startable* without re-deriving where to begin.

**The standing order of operations** (from `DAILY-HEAVY-LIFTING-PLAN.md`):
prove it → live it → learn with it → open it. Every road below comes
*after* "open it" unless marked otherwise. When in doubt, the north star
decides: ease, direction, knowledge into use.

---

## Road 1 — Residents who keep living (the big one)

**The dream:** come back tomorrow and Quill actually did something today —
presence, not a chatbot waiting frozen for you to walk up.

- **First slice:** *the idle tick, inside the open app.* One resident, one
  real action, no new process: while the Pavilion is open and the visitor
  is elsewhere, Quill occasionally "reads" a shelved book (a real page
  advances in her own small log; ask her later and she mentions it).
  Uses the existing frame loop like Sebastian's reminder sweep — a clock,
  not an AI timer; any AI flavor happens lazily at next conversation.
- **Second slice:** the same world state driven headless — a small Node
  process (the way `test/smoke.mjs` already loads scenes/entities without
  a browser) that advances resident life while the app is closed and
  writes back to the save. This is the real "always-on" half.
- **Waits on:** the beta being out; `AGENT-EMBODIMENT-PLAN.md` (which owns
  the action-API design). The reminder sweep (2026-07-11) is the proven
  pattern for slice 1.

## Road 2 — Federation: a Pavilion, not *the* Pavilion

**The dream:** anyone stands up their own instance; two Pavilions can
open a gate between them; no platform in the middle.

- **First slice (already true, say it louder):** the save-file IS a
  Pavilion-in-a-file, and the repo builds a working instance with zero
  config. "Standing up your own" is documented (MANUAL, PROTOCOLS,
  README Mode 5) — the missing piece is only a **"Standing up your own
  Pavilion" protocol** (PROTOCOLS.md stub already names it).
- **Second slice:** *the visit, read-only.* Export a "public wing" bundle
  (chosen shelves + café boards) as one JSON file another Pavilion can
  mount as a visitable room. File exchange first; servers never required.
- **Third slice:** the shared hosted Library (backend already decided:
  hybrid VPS when outgrown — `BETA-BUILD-PLAN.md` §5).
- **Waits on:** Road 4's seam, so a fork/visit carries the foundation
  without carrying Zac's personal shelves by default.

## Road 3 — The open protocol (the furthest light)

**The dream:** "what a resident is, what a shelf entry is, what a charter
is" as a documented shape other implementations could speak — email, not
an app.

- **First slice:** a `PROTOCOL-SHAPES.md` that just *documents the
  existing shapes honestly* (the doc/fullText entry, the CHAT_AGENTS
  record, the three charters, the save format). No new code — the shapes
  already exist; writing them down is the whole first step, and it makes
  Road 2's bundles a de-facto format.
- **Waits on:** nothing technical; waits on Road 2 proving anyone else
  wants to speak it.

## Road 4 — The foundation/additions seam (what forking needs)

**The dream:** someone forks the Pavilion and brings their own tradition —
keeping the engine, leaving Zac's Keep iconography, charter wording, and
curated shelves as *this* Pavilion's own additions.

- **First slice:** an inventory, not a refactor: mark in one doc which
  pieces are foundation (engine, rooms, desks, Store, charters-as-slots)
  vs. this-Pavilion's-own (the Keep's shrines, CHARTER's wording, the
  seed's curation). `TOOL-COMMONS-PLAN.md` already sketches the split —
  finish the inventory there.
- **Second slice:** make the seed swappable in one place (it nearly is:
  `SEED_LIBRARY` + charter.js are single files — the seam is real
  already; name it and keep it clean).
- **Waits on:** nothing; it's documentation-first work any session could do.

## Road 5 — The best home office (the daily-life flank)

Mostly absorbed into `DAILY-HEAVY-LIFTING-PLAN.md` Phase 1 (morning
briefing, weekly review, the Ledger). Still living here:

- **Voice in** — talking to residents via the browser's free
  `SpeechRecognition`, same no-paid-API rule as TTS out. First slice: a
  🎤 button on the chat input, desktop app first. Small and real.
- **Your own documents** — import a personal PDF/doc to the Archive Desk
  (private, never shared), readable and summarizable. First slice: `.txt`
  import exists in spirit via the Caravan personal path; the PDF half
  rides on `pdf-to-text.py` thinking becoming in-app (desktop can shell
  out — a real Electron capability the browser build never gets).
- **Focus mode** — a minimal borderless window straight onto one desk.
  First slice: an Electron menu item + a query param the renderer already
  respects. Small.

## Road 6 — The pet / companion (the beaver)

**The dream:** a creature that teaches by living its own life near you —
a beaver restoring a water table by building what beavers build.

- **First slice:** one beaver, one pond-edge, one *real* multi-day
  behavior (a dam that grows a little each real day you visit — calendar
  time, like the Greenhouse idea), zero dialogue, zero mechanics. You
  learn by watching. The deer/bunnies (decorative, 2026-07-08) proved
  the wandering-creature layer already exists.
- **Waits on:** nothing technical; waits on being *wanted* next to the
  daily-life work. Pairs naturally with the Greenhouse room whenever
  that room opens.

## Road 7 — Free higher education together (the Round Table)

**The dream:** study *alongside* others — a school shaped like an order,
not a platform.

- **First slice:** the Course Board's Stage 2 (sharing standards — a
  course as a shareable file with provenance, same discipline as books).
  A "course bundle" is Road 2's visit-bundle wearing school clothes.
- **Second slice:** the Round Table room opens as the co-study space the
  Five Animals track was always meant to inhabit (a real course, the
  Monk as its teacher-of-record).
- **Waits on:** real testers actually arriving (Stage 2's own trigger,
  per `COURSE-BOARD-PLAN.md`).

## Road 8 — The accessibility pass (load-bearing before "for everyone")

**The dream honestly restated:** "AI worth everyone having" isn't true
until *everyone* includes people who need text scaling, a colorblind-safe
palette, and remappable keys.

- **First slice:** a settings panel with a text-size slider (CSS
  variables make this cheap) and key remapping for the six actions the
  game actually uses. The palette audit is a one-session pass with a
  contrast checker.
- **Waits on:** nothing. Honestly the best "polish week" candidate before
  testers — it widens who the beta can even reach.

---

**If only one road gets walked next, walk Road 1's first slice.** A
resident seen *doing* something — even one page of one book — changes
what the Pavilion feels like more than any feature list, and every
pattern it needs was proven this week by the smallest feature in the
house: the butler's quiet bell.
