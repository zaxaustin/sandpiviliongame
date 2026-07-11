# The Beta Launch — a small core, real outlets, and a Pavilion you fill yourself

> **STATUS (2026-07-11, later the same day):** the build this stance called
> for happened — see `BETA-BUILD-PLAN.md`'s STATUS banner (personal library,
> local-only installer, orientation, the tiered model guide answering #1
> below). This doc stays open as the *stance*; what remains actionable from
> it is the welcome-packet decision (seed 21 vs live 49) and the tester
> round itself — both tracked as README "near gates."

Written 2026-07-11, from the user's own framing. This is the *shape* of what
opens to other people — not a feature list, a stance. It sits above
`BETA-TESTING-FEEDBACK.md` (the running issue log) and `FOUNDATION-AND-EXTRAS.md`
(the per-feature triage): those say what's broken and what's core; this says
what the whole thing is *for* when a stranger first walks in.

## The stance, stated the way it was given

> "The Sand Pavilion should be as small as possible, with outlets to link
> your local AI. We don't have to go too nuts because a better coder can
> make their own setup and won't change easily. This really is my way of
> adding to the amazing work already done — by giving people a game-like
> interface to do real work. That is our bread and butter. They should fill
> the Pavilion up just as we have."

Three things fall out of that, and they're the whole plan:

1. **Keep the core small.** Resist building everyone's tool for them. The
   Pavilion's gift is the *interface* — a walkable, game-like place to do
   real work — not a finished cathedral. A capable coder will fork and build
   their own setup anyway; we don't chase them. We serve the person who
   wants a good place to start and the means to make it theirs.
2. **Ship real outlets, not walls.** The places to plug in *your own* things
   — your own local AI, your own books, your own tools — are the actual
   product. The Connections panel, the Library intake, the Caravan, the
   `tools/` convention: these are the outlets. Make them clear, make them
   honest about their limits, and stop there.
3. **Let people fill it themselves.** "They should fill the Pavilion up just
   as we have." The satisfaction (and the whole commons point) is that a
   visitor brings their own shelf, their own residents' models, their own
   work — the Pavilion arrives mostly empty-but-ready, not pre-decided.

## What a new visitor actually gets at first arrival

- **A welcome packet of books** — the seed Library being built now, real and
  readable on the shelves from the first minute, zero setup. This is the
  "arrives ready, not empty" half. (Tie-in: the 5 newest books are still
  catalog-only until their full text is pushed to local MinIO — worth
  closing before the packet is the first thing a stranger reads.)
- **Clear outlets to add their own AI, per their own machine** — the
  customization piece below. The single most important outlet, because it's
  the one that turns dead NPCs into residents that talk back, and it's the
  one most sensitive to *whose* hardware it runs on.
- **A minimal first-arrival orientation** — not the full tutorial (deferred,
  see `FOUNDATION-AND-EXTRAS.md`), just enough that someone who isn't Zac
  knows where to start and that nothing breaks by clicking around.

## The AI-customization piece — the resolution to the Monk model risk

This is where the beta stance meets the biggest open reliability gap
(`AI-INTEGRATION-NOTES.md`: `bestLocalModel()` hands the Monk the largest
installed model, often an unreliable "thinking" model). The user's steer,
2026-07-11, resolves it **without** lobotomizing anyone:

- **The Monk is definitely in the beta — guidance is the whole point.**
  (User, 2026-07-11: "he will definitely be included in the beta launch;
  what people are missing is guidance.") The Monk isn't a nice-to-have to
  gate behind reliability worries — he's the resident that delivers the one
  thing the user believes people actually lack. So the job is to make him
  *reliably good*, not to hold him back.
- **The concrete beta task: curate a series of models he works well with,
  across a variety of computers.** (User: "picking a series of models that
  he works well with on a variety of different computers — then we can truly
  beta launch.") This is a real, testable piece of pre-launch work: find and
  recommend a small **tiered set** — a model that gives genuinely good
  guidance and *actually runs* on a modest laptop, one for a mid machine,
  one for a beefy GPU — so whatever hardware a tester has, there's a known-
  good Monk model for it. Tested against real guidance quality *and* real
  latency/reliability on that class of machine, not guessed. The
  customization UI then points each user at the right tier for their box.
- **The Monk needs good thinking, and the thought should be visible.** Not
  "strip reasoning models away." The Monk is a thinker; the collapsed "💭
  thought for a moment" toggle already shows his reasoning after the fact,
  and *watching it think live* (streaming) is a real wanted future piece,
  not a thing to design away.
- **Users install and assign models suited to their own machine.** A beefy
  machine can give the Monk a big reasoning model on purpose and enjoy it; a
  modest laptop should quietly get something that answers. "Hence the
  customize plan for the beta launch" — model choice becomes *the user's*,
  matched to *their* hardware, surfaced in the setup rather than guessed.
- **So the actual build is two layers:**
  1. **A safe default that never hangs a newcomer.** The small guard still
     worth adding to `bestLocalModel()`: prefer a model that reliably
     answers unless the user has deliberately chosen otherwise. Protects the
     less-techy first-run — a stranger's flagship-resident first impression
     can't be a two-minute hang or a blank box.
  2. **Real per-resident (at least per-Monk) model assignment.** This does
     **not exist yet** — `detectAI()` picks one connection for *everyone*,
     no per-resident routing (`AI-INTEGRATION-NOTES.md`). Letting a user say
     "the Monk runs `qwen3.5:9b`, everyone else runs `llama3.2`" is a genuine
     new capability the customization UI needs. The Connections panel is
     where it belongs — an outlet made a little richer, not a new system.

The standing rule still holds (`feedback-monk-model-priority`): the Monk is
the one resident who gets real room to think. The refinement is only *how*
that model is chosen — deliberately, per machine, with a reliable floor —
instead of always-the-biggest, sight unseen.

## Why the user is learning the AI tradeoffs now (and why it's in scope)

Not curiosity for its own sake — **so the less-techy people who try the beta
can be helped, not just shipped at.** Understanding what a thinking model
does, why it hangs, what VRAM/latency cost, what a context window limits, is
the knowledge that lets Zac walk a confused first-timer back to a working
setup. That's why `LEARNING-PATH.md` (Stages 16-17), the Connections-panel
explainer, and `AI-INTEGRATION-NOTES.md` all exist and matter: they're the
support material for a human helping other humans through the one genuinely
technical outlet in the whole Pavilion.

## What this plan is NOT

- Not a promise to build every visitor's tool (see `TOOL-COMMONS-PLAN.md` —
  the foundation-and-teaching approach, deliberately not a builder).
- Not a heavy onboarding wizard. Small core, remember.
- Not a change to the local-first, no-background-polling, provenance-at-the-
  door invariants. Those are the frame the outlets hang in.

## Open, in rough order

1. **Curate the Monk's tiered model set** — the named "truly beta launch"
   task: find a small set of models that give genuinely good guidance and
   run acceptably across modest / mid / beefy machines, tested for both
   answer quality and real latency/reliability per tier. This *is* the
   reliability fix, done properly — a known-good Monk for each class of
   hardware instead of "always the biggest, sight unseen."
2. **The safe-default guard in `bestLocalModel()`** — the small floor under
   #1: a non-techy first-run gets a reliable model unless they've chosen
   otherwise, so nobody's first Monk is a hang or a blank box.
3. **Per-resident model assignment in the Connections panel** — the real
   "customize your AI to your machine" outlet, and where a user picks the
   Monk's tier for their box. Bigger; the heart of the customization plan.
4. **Live-streaming the Monk's reasoning** — ✅ **built 2026-07-11.** "See the
   train of thought" as it happens: `provider.js`'s `ollamaStreamChat()` reads
   the `stream:true` NDJSON token stream, and `sendChatMessage()` shows the
   reasoning live (open above the answer) with the answer typing in real time.
   Browser reads the fetch body stream; the desktop app got a streaming IPC
   channel (`fetchStream`); any failure falls back to the buffered request.
   Static + parse-tested; the live on-screen check is the user's to run.
5. **Welcome packet finish** — full text pushed for the catalog-only books so
   the first shelf a stranger opens is whole.
6. **First-arrival orientation** — the minimal "you are here" pass.
