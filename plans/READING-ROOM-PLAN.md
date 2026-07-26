# The Reading Room — a corner where books read themselves, while you're there

Written 2026-07-12, at direct request: a **reading section where books are on
repeat and you can stop by to listen** — an ambient listening corner, like a
quiet radio by a fire, not a screen you operate. **A plan for later, mostly.**

**The one constraint the user stated, and it's load-bearing:** *"I don't want
to run things when I'm not in the room."* Nothing here runs in the background.
No always-on process, no server-side text-to-speech, no book grinding away
while the app is closed. **"On repeat" means it loops while you're actually
present and the app is open — and stops the instant you leave the nook or close
the app.** This isn't a limitation to apologize for; it's the same
no-background-polling rule the whole Pavilion already holds (README invariants;
[[feedback_automation_philosophy]]), and it happens to be *easy* here: the
browser's speech engine lives inside the page and dies with it, so "stops when
you're not there" is almost the default, not something to engineer around.

**The measure (north star):** ease. Reading a book today means sitting and
looking at a screen. This makes a book something you can *keep company with* —
put it on, sink into the bean-bag, close your eyes, let it read to you, and
wander off when you like. A different, gentler way to use the Library that's
already built.

---

## What this actually is, technically

Under the ambience, this is one concrete missing capability: **continuous,
auto-advancing read-aloud.** Today read-aloud is deliberately *per-page* — "🔊
Read this page" reads the current page and stops; you turn the page by hand
(`toggleFullTextReadAloud` in `overlays.js`, and the comment there explains
why: a 50-page utterance can't be stopped or resumed cleanly). The Reading Room
is what you get when a page's end **auto-turns and keeps going** — and, at the
book's end, **loops** (or steps to the next book in a little playlist).

The good news: the plumbing is already shaped for it. `tts.js`'s `speak(text,
onEnd)` already takes an **end callback** that fires when a page finishes — it's
just wired to "update the button" today. Wire it to "advance and speak the next
page" instead, and continuous reading falls out with very little new code.

**Reuses, not reinvents:**
- `tts.js` (`speak`/`stopSpeaking`/`skipSpeech`) — the whole voice layer.
- The **reading nook already in the world** (a bean-bag chair inside, a bench
  by the door — built 2026-07-09/11).
- The **four postures** (`M`) — sit or lie in the nook and listen.
- The **Library shelves** as the "playlist" source — no new content model.

---

## Phase 0 — Make read-aloud reliable enough for unattended reading

**This comes first, because a book can't read itself unattended if the voice
drops out after one page.** Note (2026-07-12): the user reported read-aloud
"no voice / never started," but on re-checking found it **may already be
working** — which strongly suggests the cause was the *async voice-load timing*
(#1 below): empty on first use, fine once the voice list loads. So this phase is
mostly **robustness/insurance for continuous reading**, not necessarily a live
bug fix — confirm the current state in the real app first, then harden only
what actually needs it. The classic Web Speech failure modes, none of which the
current `tts.js` guards against, and any of which would break *whole-book*
reading even if a single page works today:

1. **The async voice list.** `speechSynthesis.getVoices()` is empty on first
   call in Chromium and populates later, firing `voiceschanged`. Fix: warm the
   list and listen for that event, so a saved `voiceURI` (or any voice) is
   actually found when `speak()` runs.
2. **Electron ships no voices (the prime suspect for the desktop app).** In
   many Electron builds `getVoices()` returns `[]` outright — `ttsAvailable()`
   is still true (`'speechSynthesis' in window`), so the button shows, but
   nothing is audible. Fix: a real `hasVoices()` check and an **honest UI
   message** ("read-aloud has no voices available in this app") instead of a
   dead button — and, since the desktop app is the main focus, confirm whether
   Electron here needs a flag/config or a bundled voice to speak at all. This
   is the honest wall to find or clear before promising a Reading Room.
3. **The cancel→speak race.** Calling `cancel()` immediately before `speak()`
   can drop the utterance in Chromium; a paused engine also silently swallows
   `speak()`. Fix: defensive `resume()`, and don't cancel when nothing's
   speaking.
4. **The ~15-second cutoff.** Chromium stops any utterance longer than ~15s
   unless kept alive with a periodic `pause()/resume()` nudge. Needed the
   moment a whole page (or book) is read as one stretch.

**Deliverable:** read-aloud that reliably starts, finishes a long page, and
either works in the desktop app or says plainly why it can't. This alone
answers the original bug — the Reading Room is what it unlocks.

> Verification honesty: a headless `node`/smoke check can't *hear* audio, so
> Phase 0 has to be confirmed by actually listening in the real app (browser
> **and** desktop), not just by a green build. Called out so it isn't skipped.

---

## Phases 1–3 — the room itself

**Phase 1 — Continuous read (hands-free through a whole book).**
Wire the page-end callback to auto-advance: finish a page → turn → keep
reading, to the end of the book. A small **"now playing" card** (title, page,
⏸/⏹, the ±10s skip that already exists). It **stops when you leave** — leaving
the nook (a scene change) or closing the app calls `stopSpeaking()`, honoring
the constraint by construction. First real, usable slice.

**Phase 2 — On repeat / a playlist.**
"On repeat" for one book (loop at the end), or **cycle a shelf** (Theravada
straight through, say). **Resume-from-where-you-left-off** so stopping by later
continues rather than restarts — a tiny `data.reading.nowPlaying`
`{slug, page}`, saved like everything else, never a background timer.

**Phase 3 — The corner made real.**
Turn the reading nook into an actual listening corner: sit/lie posture tuned
for it, gentle ambient visuals, maybe a small "what's playing" sign by the
bean-bag. The atmosphere that makes it a *place you visit*, not a menu you
operate.

---

## What this explicitly is NOT

- **Not a background reader.** It never runs when you're not there — that's the
  whole stated point, and it matches the no-background-polling invariant.
- **Not cloud TTS.** Same "no paid cloud API" rule as all read-aloud today —
  the browser's own free, local voice, or nothing.
- **Not a podcast server / a feed.** It's a corner of one Pavilion you walk
  into, not a service that pushes audio at you.

---

## Cross-references

- `src/game/tts.js` — the voice layer Phase 0 hardens and the rest builds on.
- `plans/BETA-TESTING-FEEDBACK.md` #6 — the earlier TTS work (voice/speed
  picker, the ±10s skip); this continues that thread with reliability + the
  desktop-voice question.
- README invariants ("No background polling," "Local-first") and
  [[feedback_automation_philosophy]] — the rules this plan is careful to keep.
- `EIGHTFOLD-PATH-TEMPLE-PLAN.md` / `SCIENCE-RESEARCH-HALL-PLAN.md` — sibling
  "make an existing space do something real" plans; this is that for the nook.

**One line to hold onto:** the Library already lets you *read* a book; the
Reading Room lets you *keep company with* one — for as long as you're in the
room, and not a second longer.
