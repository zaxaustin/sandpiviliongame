# AI Integration — what's actually running, what it costs, and the rule

> **STATUS (2026-07-11):** the two live risks this doc named are resolved.
> **Live streaming is built** (Ollama NDJSON + a desktop streaming bridge —
> replies and the Monk's reasoning reveal as they generate). **The
> `bestLocalModel()` concern closed as guidance-not-downgrade:** the Monk
> keeps the largest installed model (standing rule), and a tiered
> model-picking guide now lives in `PROTOCOLS.md` Protocol 2 + the
> Connections panel, so the person choosing models chooses informed. The
> Monk's prompt was also re-grounded the same day (identity + Library
> knowledge, not a rulebook — see the dev log).

Written 2026-07-10, asked for directly: understand what's going on under
the hood, and set the priority plainly — **effectiveness before features
or extra personalities.** This is the honest accounting, grounded in the
real code (`src/game/ai/provider.js`, `CHAT_AGENTS` in `ui/overlays.js`),
not a sales pitch.

## The one rule this document exists to state

**Make the AI actually work before making it more elaborate.** A resident
that answers reliably in a plain voice is worth more than a resident with
a rich personality that hangs, returns blank, or takes two minutes. Every
tradeoff below gets decided in that order: reliability and speed first,
then grounding and honesty, and only then character and flourish. New
personalities, new residents, and new AI-flavored features wait until the
core reply pipeline is boringly dependable.

This isn't philosophy for its own sake — it's already the difference
between a tool someone actually uses daily and a tech demo they poke once.

## What actually happens when you talk to a resident

1. **Detection.** On load (and whenever the Connections panel changes),
   `detectAI()` walks the enabled connections in order and picks the
   first that answers `isAvailable()`. That's the *only* connection used,
   for every resident and every desk — there's no per-resident routing.
2. **The prompt.** Each resident/tool builds a system prompt: the charter
   (`CHARTER` for the in-world residents, the neutral `WORK_CHARTER` for
   the practical work tools — see that split below), plus its own "you are
   X" framing, plus whatever it's grounded in (Quill gets the shelf list,
   the Steward gets the café board, the Grant Desk gets the project's own
   documents). Nothing else is sent — the visible conversation and that
   grounding, never anything silent.
3. **The call.** `AI.chat(messages, opts)` — `stream:false`, so the whole
   reply arrives at once (there's no live token streaming today, for any
   provider; that's a real, separate future piece). A token budget and a
   timeout are picked by tier (below).
4. **The safety nets.** If a reply comes back empty (a real failure mode,
   see "thinking models" below), it retries once with a bigger budget. If
   the connection is dead, the resident falls back to scripted dialog and
   says so plainly rather than hanging.
5. **Memory.** The last 20 real questions per resident are kept
   (`agentMemory`) and fed back into that resident's next system prompt,
   so it has continuity across visits. This is local, per-device, and
   visible to you (Quill's memory report shows exactly what he's holding).

## The three reply tiers, with the real numbers

`REPLY_TOKENS = { short:450, long:1600, deep:3000 }`
`REPLY_TIMEOUT = { short:45s, long:120s, deep:180s }`

- **short** — ordinary NPC chat and quick assistant replies. Capped tight
  on purpose: fast, cheap, and resistant to a model burning its whole
  budget before it starts answering.
- **long** — real drafted documents (a grant section, a full course).
  Needs room to finish a thought.
- **deep** — reserved for the Mountain Monk alone, with `think:true` and
  the largest installed model (`bestLocalModel()`). A standing decision
  that the Monk gets real room to think — **and the single biggest
  effectiveness risk in the whole system, see below.**

## The real cost of running AI inside a game-like interface

This is the honest part. A game and a language model want opposite things,
and every design choice here is managing that tension:

- **Latency vs. immediacy.** A game is built on instant feedback — press a
  key, something happens now. A local model reply takes anywhere from ~2
  seconds (llama3.2 on a warm GPU) to 30–180 seconds (a big thinking model
  cold). That gap is the fundamental cost. The typewriter reveal, the
  "…thinking" bubble, and the empty-reply retry are all mitigations for
  it, not fixes — the reply genuinely isn't instant, and pretending
  otherwise would be worse.
- **Real machine resources.** This is the sleeper-car point made concrete
  (see `LIBRARY-GROWTH-PLAN.md`): the game itself is deliberately cheap so
  the machine's real resources go to the model. But a running model is not
  free — a 9B model can hold several GB in VRAM/RAM and pin the GPU or CPU
  for the length of a reply. That's real electricity, real heat, real
  memory pressure on the same machine you're also working on. **This is
  exactly why nothing here polls a model in the background** — every AI
  call is triggered by a real user action, never a timer. The Local AI
  panel reads `/api/ps` only while it's open, for the same reason.
- **Reliability vs. capability.** Bigger, "smarter" models are slower and
  more failure-prone (see thinking models). Smaller models are faster and
  more predictable but shallower. The default (`llama3.2`) is chosen for
  reliability, not raw capability — an effectiveness-first call.
- **Determinism, given up.** A scripted NPC says the same correct thing
  every time. An AI resident varies and can fail. The scripted-dialog
  fallback is what keeps a dead or slow connection from breaking the game
  for someone who never set up AI at all — the whole world still works
  with zero AI, forever.
- **Cloud is faster and smarter, and costs the whole point.** A cloud
  connection (Claude, ChatGPT, Grok) answers faster and better than any
  local model — but sends the conversation off-device, which is exactly
  the surveillance-free promise this project is built on. That's why every
  connection is labeled 🏠 local / ☁ cloud: it's a real, per-connection
  choice the user makes with eyes open, not a default.

## Known effectiveness risks in the current code — name them, don't hide them

- **The Monk's model selection (the biggest one).** `bestLocalModel()`
  picks the largest-parameter installed model for the Monk. But "largest"
  and "most reliable" are often opposites: the largest model on a given
  machine is frequently a *thinking* model (qwen3.5, deepseek-r1), which
  is precisely the kind that can spend its whole budget on invisible
  reasoning and return **empty or after minutes**. So the resident the
  project cares most about is the single most exposed to the worst failure
  mode. This is a live example of a *feature* decision ("give the Monk the
  best") undercutting *effectiveness* ("the Monk should actually answer").
  Worth a real fix — bias the Monk's pick toward a model that reliably
  answers, or exclude known thinking-model families from `bestLocalModel()`
  unless nothing else is installed.
- **Thinking models in general.** The README already warns users away from
  them; the code guards short replies with a capped budget and an
  empty-reply retry. Still the most common cause of "it didn't answer."
- **Context window.** Long conversations eventually exceed what the model
  can hold; the earliest turns silently stop being visible to it. Named in
  the Connections panel's own explainer now, not fixable in-game (a hard
  model limit), but worth knowing.
- **No streaming.** `stream:false` everywhere means the visitor waits with
  a "…" for the *whole* reply, with no partial feedback. Live streaming is
  a real, bounded future improvement — it wouldn't make replies faster,
  but it would make the wait *feel* far shorter, which for a game-like
  interface is most of the battle.

## The CHARTER / WORK_CHARTER split (2026-07-10)

The in-world residents (Quill, the Steward, the Monk) carry the full
devotional `CHARTER` — they're characters in a monastery, the Buddhist
framing is theirs. The practical work tools (the course/lesson planner,
the Computer, the Research and Grant desks, the summarizer) carry the
neutral `WORK_CHARTER` instead: same harm-declining guardrail, no roleplay,
no devotional framing, and an explicit instruction to serve any goal on
its own terms. This is effectiveness-first in action — a lesson planner
that skewed every course toward the dharma was a worse lesson planner, and
a work tool doesn't need to perform a personality to be useful.

## What this means for what gets built next

- **Fix effectiveness gaps before adding residents or personality.** The
  Monk's model selection is the first real one.
- **Streaming is the highest-value reliability-adjacent feature** — it
  attacks the latency cost head-on without needing a bigger model.
- **Don't add a background AI loop** (an always-thinking resident, an
  ambient briefing that generates on a timer) until it can be done without
  violating the no-background-polling rule — see `AGENT-EMBODIMENT-PLAN.md`,
  which already flags exactly this tension. A resident that "keeps living
  while the tab's closed" is a real hope, but it's a real cost too, and
  effectiveness-first means it waits until it can be done without pinning
  the machine.
