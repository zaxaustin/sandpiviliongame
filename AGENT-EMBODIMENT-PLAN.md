# Agent Embodiment Plan

Not started. Written down now, while the idea is fresh (2026-07-08),
the same way `DESKTOP-APP-PLAN.md` and `LIBRARY-SCALING-PLAN.md` were —
so it survives between sessions instead of living only in one
conversation. This is genuinely a later-priority item; see README's
"What's next" for how it's sequenced against everything else, and don't
start building from this document without confirming it's actually next.

## The actual goal

Every AI-backed resident today — Quill, the Monk, the Steward, the
Computer — has a voice but no body. They stand in one fixed spot,
say nothing until spoken to, and do nothing at all when the player
isn't looking. **The ask: give them an actual body in the world** — the
ability to walk somewhere, pick a book off a shelf and actually read
it, leave a real note behind, greet another resident or the player
without being spoken to first. Not a bigger chat window; an agent that
*acts*, the same way `README.md`'s own closing dream already named:
"residents who keep living... not just waiting frozen for you to walk
up."

## What exists today, precisely, so the gap is clear

- **Movement**: NPCs already move — `wander:true` (Ember, Moss, Cobalt,
  the deer/bunnies) drives simple random walking in `entities.js`. This
  is not AI-driven at all; it's a fixed wander behavior with no
  decision-making behind it.
- **Conversation**: `ai:true` residents (Quill, the Monk, the Steward,
  the Computer) call `AI.chat()` with a system prompt when the player
  initiates — see `CHAT_AGENTS` in `overlays.js`. This only ever runs
  in response to the player; nothing happens if nobody's talking to them.
- **No resident has ever taken an action other than replying with
  text.** No resident has read a book, written a note, or moved with
  any purpose. This is the entire gap this plan is about closing.

## Why this is a real jump, not an extension of chat

Chat today is "the player asks, the model answers" — one request, one
reply, done. Embodiment means **the model has to decide to act without
being asked**, and its output has to become a real game-state change
(a position, a book actually opened, a note actually saved) instead of
just words in a dialog box. That's a different shape of problem:

- **An action space has to exist and be enforced code-side.** An LLM
  can't be trusted to directly mutate game state from free text — it
  needs a small, fixed menu of real functions (`moveTo(x,y)`,
  `readBook(slug)`, `writeNote(text)`, `greet(npcId)`, `say(text)`) and
  code that validates every call before it touches `data`/`state`, the
  same discipline `localFetch()`'s localhost-only allowlist already
  uses for a different reason: never trust the model's output to be
  safe by default.
- **Local models vary a lot at this** — this project has already hit
  real, model-specific weirdness twice (thinking models burning their
  reply budget silently, a paid cloud model getting auto-picked ahead
  of a working local one). Reliable "tool calling" / structured output
  from a small local model is a real open risk, not a solved problem —
  budget real testing time across a few different models before
  assuming this works the way it does with a large cloud model.
- **Something has to decide *when* an agent acts**, not just *what* it
  does when triggered. A simple version: a periodic tick while the
  player is in the same scene, giving the resident a chance to act.
  The much harder version — acting while the tab is closed — needs an
  always-on backend process (a server, or a scheduled job), not just
  client-side JS in a browser tab that isn't open. Worth being honest
  now: **that specific dream (truly living while you're away) is a
  meaningfully bigger lift than "wanders and reads while you're
  playing"** — a different project phase, not a detail of this one.

## A real, bounded first version — not the whole vision at once

Rather than a general action API for every resident on day one, prove
the idea small and specific first:

1. **Pick one resident** (Quill is the obvious choice — already
   Library-grounded, already knows what's on the shelves) and give
   them exactly one real action: **read a book off the shelf during an
   idle tick**, chosen from what's actually shelved, logged somewhere
   the player can see (`activityLog`, or a visible note in the
   Library) — "Quill spent the afternoon rereading the Dhammapada."
2. **Prove the loop end-to-end** before adding more actions: does the
   model reliably pick a real, currently-shelved book (not a
   hallucinated title)? Does it happen at a sensible cadence, not
   constantly or never? Does it survive a save/reload?
3. **Only then** expand the action set (writing a note, moving between
   rooms, greeting the player unprompted) and only then consider a
   second resident.

This mirrors how every other AI feature in this project actually got
built — Quill's chat, then the Steward's, then the Monk's, each proven
before the next, never all four AI residents redesigned in one pass.

## Open questions for whoever picks this up

- Does an autonomous action get its own `AI.chat()` call with a
  narrower system prompt ("here's the shelf, here's your last few
  actions, pick your next one or do nothing"), or reuse the existing
  per-resident prompts with an action menu appended? Likely the former
  — mixing "answer this player's question" and "decide what to do
  next unprompted" in one prompt risks confusing a small local model.
- What's the actual tick rate, and does it cost real local-AI
  inference time noticeably (a wandering NPC deciding to act every few
  seconds could make a local model peg the CPU/GPU for no real
  benefit) — needs real measurement, not a guess.
- Does this only run for the Library's Quill, or eventually every
  AI-backed resident in their own room? Scope creep risk if not kept
  explicit per phase.
- Should the player be able to *see* an action actually happening (a
  short animation, a visible state change) versus just reading about
  it after the fact in a log? Visible-while-it-happens is much more
  "alive," but a real render/animation task, not just backend logic.
