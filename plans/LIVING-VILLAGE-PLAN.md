# The Living Village — memory that grows, and residents you can watch live

Written 2026-07-12, at direct request, right after the talking/memory streamline
fixes. Two connected asks:

1. **Memory that matures** — "a converter from short-term memory to long-term
   memory," on top of the user-pruned topic list just built.
2. **A village you can see and join** — "have the agents walk around and
   participate in the Sand Pavilion in a way I can see and interact with, to
   build a village."

**A plan; build later.** It leans on `AGENT-EMBODIMENT-PLAN.md` (the "residents
that *act*" foundation) rather than repeating it — read that first; this adds the
*memory substrate* and the *visible, social, interactive* layer on top.

**Held to the soul of the project ([[project_platform_and_conductor]]):** the
village lives **while you're there**, as part of the world you're conducting —
not a background process running your residents' lives while the app is closed.
That "truly alive while you're away" version is a genuinely bigger lift (a server,
always-on) and is deliberately *not* this plan. Nothing happens unless you're
present to see it — which is the point, not a limitation. This is an abundance of
*life to walk into and join*, never agents acting on your behalf unwatched.

---

## Part A — the memory converter (short-term → long-term)

### Where memory is today (after the 2026-07-12 fixes)
- **Short-term = the topic list.** `data.agentMemory[agent]` — the last ~20
  topics you raised with each resident, 8 pinned into their prompt. Now
  **user-prunable** in the Data panel (you curate it so it never overcrowds).
- It stores *topics*, not *substance* — a resident recalls you asked about X, not
  what was concluded. Honest and leak-free, but shallow (see
  `AI-BACKEND-WALKTHROUGH.md`, and BETA-FEEDBACK #23).

### The two tiers
- **Short-term** (exists): the rolling topic list. Cheap, ephemeral, auto-capped.
- **Long-term** (new): a *small, curated set of durable facts* per resident —
  "what I actually know about this person" — e.g. *"is learning to code, aiming
  to lead this project"*, *"prefers plain answers over flourish."* Kept short on
  purpose (a handful of lines), because it rides in the prompt every message.

### The converter (the ask), kept honest and in-your-hands
When short-term fills, or **when you ask** (never on a timer — the conductor
rule), the resident distills the rolling topics + recent conversation into **one
or two candidate durable facts**, and — crucially — **you approve, edit, or
reject them** before they become long-term. This is the same "let the user
organise their memory" principle just built, extended: the AI *proposes* what's
worth keeping; the human *decides*. That keeps long-term memory accurate,
un-crowded, private, and trusted — and never a black box that quietly
accumulates a profile of you.

- **Data shape:** add `data.longMemory[agent] = [{ text, since }]` alongside the
  existing short list. Injected into the prompt as "what you durably know about
  this visitor," kept to a hard cap (small) so prompt size stays bounded — the
  scaling discipline from `CAPACITY-AND-PIPELINES.md` applied to memory.
- **Fully user-managed:** the same Data-panel UI that prunes short-term shows and
  edits long-term; you can promote, demote, edit, or forget any of it.
- **Why it matters:** long-term memory is what lets a resident greet you with
  real continuity — "last time you were wrestling with the timeout bug; how did
  that land?" — which is the single biggest step toward the *human-like*
  interaction the roadmap is aiming at.

### Honest risks
Staleness (a fact that was true months ago), privacy (durable > ephemeral, so
the user-approval gate matters more), and prompt-size creep (hence the hard cap).
All three are handled by keeping the human in the loop and the set small.

---

## Part B — the living village (visible + interactive)

### Foundation (from `AGENT-EMBODIMENT-PLAN.md`, not repeated here)
That plan already lays out the hard part: a **fixed, code-enforced action space**
(`moveTo`, `readBook`, `writeNote`, `greet`, and the minigames `fish`/`meditate`),
proven **one resident, one action first**, with all the model-reliability caveats.
The village is what you get once that action space exists and more than one
resident uses it.

### What the village adds on top
1. **Purposeful movement, not random wander.** Today `wander:true` is dumb random
   walking. The village replaces that (for AI residents) with movement toward a
   *chosen activity* — Quill walking to a shelf, the Monk to his cushion, Cobalt
   to the Caravan desk — so what you see reflects a real (logged) decision.
2. **Participation you can watch.** Residents actually doing the Pavilion's real
   things — reading a shelved book, sitting in one of the four postures, fishing
   the pond — the minigame idea from the embodiment plan, made visible. "Quill is
   rereading the Dhammapada by the window" is something you *see*, then can read
   about in the activity log.
3. **They notice each other, and you.** An unprompted `greet` — resident-to-
   resident, or resident-to-you when you walk up — is what turns "NPCs in rooms"
   into "a village." Kept gentle and rare so it's warmth, not noise.
4. **You can join in.** Walk up to a resident who's reading and you can ask about
   what they're reading; walk up to one fishing and sit with them. The
   interaction is *contextual to what they're currently doing* — the village is
   something you participate in, not just observe.

### The cadence (the conductor rule, concretely)
A resident gets a chance to *decide its next small action* on a **periodic tick
while you're in its scene** — never while you're away, never a background job.
So the village is alive exactly when you're there to conduct it, and still and
saved when you're not. This also bounds the local-AI inference cost (only the
resident in your current room is "thinking about what to do next," and only while
you're present) — the tick-rate/cost question the embodiment plan flags is
answered by "only near you, only while open."

### Phases (build order, each on the last)
0. **Prereq:** the embodiment plan's one-resident-one-action proof
   (`readBook` for Quill) actually ships and holds up. Nothing here starts before
   that.
1. **Purposeful movement for one resident** — Quill walks to the shelf he chose,
   visibly, before "reading" it. Movement now means something.
2. **Watchable participation + activity read-back** — the "what I did today"
   report (the embodiment plan's `quillReportBody`-style idea) so a resident's
   day is legible.
3. **A second resident + they notice each other/you** — the first real "village"
   moment: two residents, occasional greetings, you included.
4. **Join-in interactions** — context-aware talk based on what a resident is
   currently doing; long-term memory (Part A) makes those greetings continuous.
5. **The village rhythm** — a few residents each with a light daily pattern you
   can walk into. Still present-only; still conductor-driven.

---

## Part C — oversight without puppeteering ("parental controls," done right)

Added 2026-07-12 at the user's ask: as residents gain autonomy, he wants to *see
what's going on* and be able to *correct* — but **without editing the personality
they're building.** No reaching into a resident's charter, prompt, or memory to
"fix" them. Only **in-world corrective outlets** — "go self-reflect," "write an
apology once you've calmed down," a cooldown — the way you'd guide a person, not
reprogram a machine. This is a genuinely good governance model and it fits the
project's soul exactly (the human conductor guides; he doesn't rewrite the
players).

**How it works — two halves:**

1. **Visibility (the "see what's going on").** Every autonomous action a resident
   takes is already logged (`activityLog`); the village surfaces that as a
   readable, per-resident feed — *what they chose to do, and (optionally) the
   one-line reason the model gave.* Nothing a resident does is invisible. This is
   the audit trail, and it's cheap because the logging already exists.

2. **Correction as an in-world *action*, never a *edit*.** The conductor can issue
   a small, fixed set of **corrective outlets**, each of which is just a
   transient instruction handed to the resident's *next* decision — exactly the
   same mechanism as `foldContext`/`experimentContext` (a temporary line in the
   prompt for one turn), **not** a permanent change to who they are:
   - *"Go and sit with this a while"* → the resident's next action is steered to
     self-reflection (meditate, or write a private reflection note).
   - *"Make it right"* → prompts them to write an apology / a repair, in their own
     voice, when ready.
   - *"Take a breath"* → a cooldown: they pause autonomous action for a stretch.
   The resident responds **in their own developing personality** — you've given a
   nudge, not a rewrite. Their charter, long-term memory, and voice are untouched.

**Why this is the right shape:** it keeps the personality the user is investing in
intact (correction is relational, not surgical), it's fully transparent (you see
everything), and it never crosses into "the AI acts on you or without you" —
correction is always *your* deliberate act, in response to something you *saw*.
It's also very feasible: it's the existing activity log + a handful of transient
prompt-context nudges, not a new AI system.

**The line to hold:** guide like a gardener or a parent, never like a programmer
editing a save file. The corrective outlets shape *behavior in the moment*; they
never touch *who the resident is becoming*.

## Why the two parts belong in one plan

Memory and the village are the same goal from two sides: **residents that feel
like they persist and live.** Long-term memory gives them continuity *across your
visits*; the village gives them presence *during* a visit. Together they're the
difference between "chatbots in a nice map" and "a small place with people in it
you actually know" — which is the human-like, genuinely-helpful world the
platform roadmap is reaching for.

## Cross-references
- `AGENT-EMBODIMENT-PLAN.md` — the action-space foundation this stands on (read
  first).
- `AI-BACKEND-WALKTHROUGH.md` / BETA-FEEDBACK #23 — how memory works today and
  why "topics not substance" is the gap Part A closes.
- `PLATFORM-ROADMAP.md` — the village is a "human-like interaction" pillar; slots
  after streamline + beta, alongside voice.
- [[project_platform_and_conductor]] / [[feedback_automation_philosophy]] — the
  present-only, no-background, human-in-the-loop rules this plan is careful to
  keep.

**One line to hold onto:** long-term memory lets a resident remember you between
visits; the living village lets you catch them living during one — and both stay
in your hands, present only when you are.
