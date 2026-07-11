# Local AI Monitoring Plan

**Steps 1-3 built and verified live, 2026-07-10** — the "🧠 Local AI" panel
(Ollama's `/api/ps`), per-action elapsed-time logging, and the "Today's
session" summary card. Only step 4 (real CPU/GPU percentages — desktop-only,
needs a new package in Electron's main process) is still just the plan.
See `BETA-TESTING-FEEDBACK.md` #15 for the original raw ask this is
built from, and `LEARNING-PATH.md` for the companion module written
alongside this plan, teaching the concepts a beginner needs to actually
understand what this feature shows them.

## The actual goal

Asked for directly, 2026-07-09, in two parts: see CPU usage from the
local AI models, and how many can run at once — both as a real beta-
testing tool (is a given action actually expensive?) and as a genuine
shipped feature ("a cool developer feature for this app"). Step 1
(below) answers "how many, and how big" for real; steps 2-4 are still
just the plan, ready to pick up, not a promise they're next in line.

## What exists today, precisely — checked directly, not assumed

- `src/game/ai/provider.js`'s `makeOllamaProvider()` already calls
  Ollama's `/api/tags` endpoint (via the same `localFetch()` helper
  every local call uses) to detect what's installed and pick a model —
  this is presence/detection, not usage.
- The title screen and pause menu already show a live connection status
  line ("● Connected to Ollama · llama3.2" / "○ No local AI detected") —
  this is the entire "resource visibility" surface that exists right now.
- **Nothing tracks memory, VRAM, concurrency, or timing for any AI call
  anywhere in the codebase today.**

## The real constraint, found before promising anything

A browser (and Electron's renderer process, which is just Chromium) has
**no API that reaches real system CPU/GPU utilization at all** — that's
not a gap in this project, it's a hard platform wall, the same category
of "confirmed, not assumed" limit the README already documents for
directly fetching Gutenberg/arXiv from inside the game. True CPU/GPU
percentage would need Electron's *main* process (real Node, real OS
access) and a new dependency (`systeminformation` is the standard
package for this) — genuinely possible since this is mainly a desktop
app now, but a real, separate, harder step, not part of a first version.

## What's actually free — real, available data today

**Ollama's own `/api/ps` endpoint** — same shape and same `localFetch()`
pattern as the existing `/api/tags` call, zero new dependency. It
reports, for every currently *loaded* model: its name, total `size`,
`size_vram` (how much is actually resident on GPU vs. spilled to system
RAM — the honest, real "is this using my GPU" answer), and `expires_at`
(when Ollama will unload it if idle). This alone answers "how many can
run at once" (however many `/api/ps` lists) and "is this one on the
GPU" (`size_vram > 0`) — real signal, not a placeholder.

**Per-action timing** — every `AI.chat()` call already has a clear start
and end in the code calling it (`overlays.js`, every resident's
send-message function). Wrapping each with `Date.now()` before/after and
logging the elapsed milliseconds costs nothing new to build and answers
"what effect did this specific action have" in the one way that's
actually measurable without system access: how long it took.

## The plan — in order, each step small and shippable alone

1. **[x] Built 2026-07-10.** A "🧠 Local AI" panel, reachable from the
   pause menu, same pattern as the existing "📊 Your Data" panel.
   `makeOllamaProvider()` gained a `listLoaded()` method (`provider.js`)
   wrapping `/api/ps` the same way `isAvailable()` already wraps
   `/api/tags`; the panel calls it fresh only while actually open (a
   `↻ Refresh` button, no timer), and shows an honest message instead of
   a fake zero when the active connection isn't Ollama at all. Verified
   live, not just built: opened against this machine's actual running
   Ollama instance — correctly showed "nothing loaded right now" since
   no model was resident in memory at the time, exactly the intended
   behavior (a model only loads once a resident is actually asked
   something).
2. **[x] Built 2026-07-10.** Every provider's `chat()` gets wrapped in a
   `withTiming()` helper (`provider.js`) — the same side-channel pattern
   `lastThinking` already used, applied once instead of touching all
   three providers' own `chat()` bodies. Every `logActivity('Asked...')`
   call site now appends `elapsedTag()` — "(2.3s · llama3.2:latest)" —
   sitting right in the existing activity log, no separate system.
   Verified live: a real question asked of Quill came back with the tag
   correctly attached.
3. **[x] Built 2026-07-10.** A "Today's session" card in the Local AI
   panel itself — real-ask count, total and average reply time, and a
   per-model breakdown — parsed back out of that same activity log
   (`sessionAISummary()`), no new instrumentation, exactly as planned.
   Verified with injected real-shaped log entries (2.3s + 5.1s + 11.4s):
   the panel correctly computed "3 real asks today... avg 6.3s."
4. **Deferred, on purpose: real CPU/GPU percentage.** Needs
   `systeminformation` (or equivalent) in Electron's main process, a new
   IPC bridge through `preload.cjs` the same shape `USER-DATA` panel's
   planned save-dialog work would add, and doesn't exist at all for the
   web build (`sandpiviliongame.vercel.app`) — a real, later, desktop-
   only step, not promised alongside steps 1-3.

## What this deliberately does not include

No always-on polling loop — every number here is pulled fresh only when
the panel is actually open, the same discipline the rest of this
project already holds itself to around local-AI cost. No fine-tuning or
training pipeline of any kind; that's a much later, separate decision
(what data, whose model, what it's actually for) explicitly flagged as
out of scope in `AGENT-EMBODIMENT-PLAN.md` too, not assumed just because
usage data would exist once this ships.
