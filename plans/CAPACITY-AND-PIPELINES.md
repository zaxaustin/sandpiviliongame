# Capacity & the AI pipeline — the honest picture

Written 2026-07-12, at direct request: *"help me understand what I am
missing"* about the local-AI pipeline, and *"figure out what are the limits of
space and how many things we can add — I don't wanna glitch out."* This is the
straight, grounded answer to both, read from the real code
(`src/game/data/store.js`, `src/game/ai/provider.js`), not from memory.

---

## Part 1 — The local-AI pipeline, end to end (and where it breaks)

When a resident answers you, this exact chain runs. Understanding it *is*
understanding "what I'm missing," because a break anywhere in it shows up the
same way — a resident that won't talk.

1. **Ollama is installed and running** on your machine, serving at
   `http://localhost:11434`. If it isn't running, nothing downstream matters.
   (Check: `ollama serve`, or the tray icon; `curl http://localhost:11434/api/tags`
   should list your models.)
2. **A model is pulled.** `ollama pull llama3.2`. **Avoid "thinking" models**
   (`qwen3.5`, `deepseek-r1`, `qwq`) — `provider.js` documents the exact failure
   found the hard way: they spend their whole budget on invisible reasoning and
   can return *empty* after minutes. `bestLocalModel()` picks the largest
   installed model for the Monk; everything else prefers a `llama3.2`.
3. **The game reaches Ollama.** This is the step most likely to be "what you're
   missing," and it differs by build:
   - **Desktop app (the main focus):** `provider.js`'s `localFetch` routes
     through `window.desktopBridge` — the Electron *main process* makes the
     request, which was never subject to browser CORS. **No setup needed.**
   - **Browser tab:** a plain `fetch` to localhost, so the browser's CORS rule
     applies — you must set `OLLAMA_ORIGINS` to include the dev port (see
     README) and restart Ollama, or every call silently fails `isAvailable()`.
4. **Detection & model-pick.** `detectAI()` tries each enabled connection in
   order; the first whose `isAvailable()` succeeds (a 1.2s `/api/tags` ping)
   wins and becomes `AI`. `:cloud` models are filtered out (they 403 without a
   paid Ollama subscription).
5. **A reply.** A resident builds a **system prompt** (charter + identity +
   live grounding: the Library, your day, the investigations, etc.) + the
   conversation history → `AI.chat()`. Ollama streams tokens back (NDJSON);
   `sendChatMessage` shows them live. Budgets: `short` 450 tok / 45s, `long`
   1600 / 120s, `deep` 3000 / 180s (the Monk only).

**So "what am I missing" is almost always one of:** Ollama not running · no
(or only a *thinking*) model pulled · in a **browser**, `OLLAMA_ORIGINS` not
set · or a model too big for your RAM/VRAM so it's swapped to disk and crawls.
The 🧠 Local-AI panel (pause menu) reads Ollama's own `/api/ps` and shows what's
actually loaded and where (RAM vs GPU) — the first place to look when a reply
is slow or blank. The tiered "which model for which machine" guide is
`PROTOCOLS.md` Protocol 2; the fuller accounting is `AI-INTEGRATION-NOTES.md`.

**Nothing runs in the background, by design.** Every AI call is triggered by a
real action of yours — there is no polling loop, no daemon. That's a standing
invariant, not an accident (README). So "clean up the background pipelines"
really means *keep this chain healthy*, not *find the hidden process* — there
isn't one.

---

## Part 2 — The limits of space (what "glitch out" actually looks like)

There are **four separate stores**, with very different ceilings. Knowing which
is which is the whole answer to "how many things can we add."

| Store | Holds | Real ceiling | What overflow looks like |
|---|---|---|---|
| **Browser `localStorage`** (`sandPavilionSave.v2`) | Your whole save: planner, notes, courses, calendar, agent memory, **hall investigations/experiments**, temple reflections, activity log, **and — in the *browser* build — the full text of personal books, inlined** | **~5–10 MB per browser**, hard | `Store.save()` returns `false`, and `entities.js` warns you to Export Save. This is the real "glitch out" line — on the **web build only**. |
| **Desktop app files** | Personal books' full **text**, written as plain files in the app's own data folder | **Your disk** (effectively unlimited) | n/a in practice |
| **MinIO (local Docker)** | Full text of *certified* Library books | **100 GB allocated, a few MB used** | Thousands of books before it's a question |
| **Supabase** | The catalog *card* only (title, license, tags, search) — tiny per book | Very high | Not a near-term limit |

**The load-bearing takeaway:** on the **web build**, personal books live in
localStorage, so a handful of full-length books can approach the ~5–10 MB wall
— that's the glitch risk. On the **desktop app (the main focus)**, personal
book *text* is written to files instead, so the save stays small and you can add
far, far more. **This is a concrete reason the desktop app is the right home**
for a heavy reader, and worth saying to testers plainly.

The **shipped bundle** is a different axis: it's ~630 KB of code (not content —
the seed catalog is only ~28 KB of summaries, not full books). It grows with
*features*, not with books, and is fine for a long time; the Vite "chunk > 500
KB" note is cosmetic.

### One real scaling risk, found while looking (flagged, not yet fixed)

Every grounded resident (Quill, the Monk, the Investigator) builds its system
prompt by concatenating **every** Library doc's summary
(`Store.allDocs().map(...)`). At ~50 books this is nothing. At several hundred
it becomes a large prompt on *every* message — slower replies and, on a
small-context local model, eventually crowding out the actual conversation.
**Fix when the Library gets big, not now:** ground residents on a *relevant
subset* (search-selected, or shelf-scoped) instead of the whole catalogue. Noted
here so it's a known limit with a known answer, not a surprise later. Related:
`LIBRARY-SCALING-PLAN.md`.

---

## What this means for "how many things can we add"

- **Books, desktop app:** effectively as many as your disk holds. Go big.
- **Books, web build:** modest — a shelf or two of full text before localStorage
  is the limit. Fine for a demo; the desktop app is the real reader.
- **Investigations, experiments, reflections, notes, courses:** tiny text
  records — thousands are no problem in any build.
- **The thing to watch as the Library scales to hundreds+ of books:** the
  resident-prompt grounding above, not storage.

**Cross-references:** `LIBRARY-SCALING-PLAN.md` (the MinIO/Supabase split and
setup), `AI-INTEGRATION-NOTES.md` (the AI accounting), `PROTOCOLS.md` Protocol 2
(model-picking), `LOCAL-AI-MONITORING-PLAN.md` (the 🧠 panel).
