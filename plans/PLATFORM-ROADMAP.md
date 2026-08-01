# The Platform — vision, philosophy, and the road to it

> **Positioning settled 2026-07-28** — see
> [`TRUST-LEVELS-AND-GATEWAYS-PLAN.md`](TRUST-LEVELS-AND-GATEWAYS-PLAN.md).
> The website is the **commons**; the installed app is **your Pavilion**. Not a
> lite version and a full version — two different things, one you visit and one
> you live in. That is where the sense of ownership comes from, and it is the
> answer to the "web vs desktop" tension this roadmap left open.

Written 2026-07-12, at direct request: *"take stock of the overall product…
set this plan out, get it written down, tackle each thing over time."* This is
the **master roadmap** — the spine that orders every other plan against one
vision. It is deliberately high-level and durable; the detail lives in the
plans it points to. Read this to know *what we're building and in what order*;
read the linked plans to know *how*.

---

## Taking stock — where we actually are (and it's a good place)

Honestly assessed, this is already a real product, not a demo:

- **A walkable world** with a Library (real, licensed, full-text books), a
  Study, a Workshop of working desks, a Café, and a Keep/Temple.
- **AI residents** grounded in the actual shelves, the day, and a charter —
  Quill (teaches), the Monk (guides), Sebastian (runs your day), the Computer,
  and the Investigator.
- **Four pillars standing:** the Library + Learning Paths (the ground), the
  Science & Research Hall (dissect + test), the Eightfold reflection ladder
  (keep climbing), and the Pavilion Academy (planned).
- **Local-first and yours:** book text in local MinIO/Docker (100 GB reserve),
  a beta that runs with zero cloud, save export/import, MIT-licensed, git
  history clean of secrets.

**The verdict:** the *bare minimum* — "an app for one person" — is done and
good. Everything below is about the actual goal, which is bigger.

---

## The vision, stated plainly

**We are not building an app for one person. We are building a platform where
everyone can have their own library** — and where local AI can *finally* really
help people in their daily lives. The single-user Pavilion is the bare minimum;
the platform is the point.

Three things this means concretely:

1. **Everyone gets their own library** — an empty Pavilion they fill themselves,
   on their own machine, owned entirely by them. (Largely *already true* via the
   local-first desktop app — see the backend reconciliation below.)
2. **A framework anyone can use** — not "download our library," but "here are the
   tools to build your own, from scratch." The Caravan, the add-a-book paths,
   `library-inbox/` already make a from-nothing library the normal case.
3. **AI that genuinely helps daily life** — reliable, fast, and *human-like*
   enough that talking to it feels like working with a person, not operating a
   tool.

---

## The philosophy (load-bearing — this is the soul, not decoration)

**A true sandbox with a human conductor.** The Pavilion gives you the tools and
the space to create; it never acts on its own. **Nothing gets done if you don't
do anything — and anything can get done if you do.** The human is the conductor;
the AI and the tools are the orchestra, powerful but silent until you lift the
baton. This is why *there is no background process, ever* (a standing invariant):
not a technical limitation, a moral stance. An **abundance system** — tools to
create, given freely, that amplify a person's own agency instead of replacing or
harvesting it.

Every future feature is judged against this: does it give the conductor more
reach without ever taking the baton? A feature that "does things for you while
you're away" fails this test on purpose. A feature that lets you *get more done
when you act* passes.

---

## The backend reconciliation (resolving "off Supabase" vs. "something like it for everyone")

These feel contradictory but aren't, once split correctly:

- **Your own library needs NO central backend.** The local-first desktop app
  already gives every person their own library on their own machine, zero
  services. "Everyone can have their own library" is *mostly already true* the
  moment someone else runs the beta. This is the pure form of the goal, and it
  needs nothing from Supabase or any cloud.
- **The *connective* layer is the only thing that needs "something like
  Supabase"** — accounts, cross-device sync, a shared Commons, and eventually
  discovering/visiting others' Pavilions. That layer is **optional** and
  **opt-in**, never required to have your own library.

So the standing decision holds ([[feedback_prefer_local_over_supabase]], CLAUDE.md):
- **Personal instance & the beta:** local, no backend required.
- **The connective platform layer:** a self-hosted "Supabase-like" stack (Postgres
  + MinIO + auth) — see `SELF-HOSTED-STACK-PLAN.md`. **Honest pragmatism:** to get
  a beta into people's hands *fast*, hosted Supabase (magic-link auth already
  built, free tier) is a legitimate bare-minimum starting point even if we don't
  love it — with the self-hosted stack as the destination, not the start. The
  purest end-state is **federation**: everyone self-hosts their own Pavilion, and
  a light gateway lets them visit each other — no central backend at all.

---

## The road, ordered (tackle over time)

Ordered against the vision, not by ease. Each links to its real plan.

### 1. Streamline toward "close to perfect" — polish, not new rooms *(next)*
The highest-leverage work now is **not more features** — it's making what exists
excellent. The core daily loop and the AI interactions should feel finished.
- AI **reliability & speed** first (the standing rule) — a resident that answers
  well every time beats a new room. `AI-INTEGRATION-NOTES.md`, `PROTOCOLS.md` Prot. 2.
- **Human-like interactions** — tone, memory, responsiveness; the residents
  feeling like people. `feedback_prompts_are_guidelines`.
- Sweep `BETA-TESTING-FEEDBACK.md` rough edges; smooth the daily loop
  (`DAILY-HEAVY-LIFTING-PLAN.md`).
- The library-prompt scaling fix flagged in `CAPACITY-AND-PIPELINES.md` before
  the Library grows large.

### 2. Ship it to real people — the empty library, filled by them
"Everyone has their own library" starts the instant a second person runs it.
- **Post the beta on GitHub and take the repo public** — the git history is
  already verified clean of secrets and MIT-licensed (`DESKTOP-APP-PLAN.md`).
  This is a real, outward-facing step and *the user's call to pull the trigger*;
  the prep (README polish, a GitHub Release with the installer, a short "fill
  your own Pavilion" onboarding) can be readied first. `BETA-LAUNCH-PLAN.md`,
  `BETA-BUILD-PLAN.md`.
- Then a handful of real testers → `BETA-TESTING-FEEDBACK.md` fills with things
  nobody imagined. The student improves the school.

### 3. Human-like interaction: voice — "just speak, and things get done"
The leap that makes AI *feel* like help. Voice out exists; **voice in** (the
browser's free `SpeechRecognition`) is the gap.
`PAVILION-ACADEMY-PLAN.md` Phase 3, `HOPES-AND-DREAMS-ROADS.md` Road 5. The dream
in the user's words: *"if I can just speak and have things get done, and research
papers reviewed and made, I'll be a happy camper."*

### 4. The connective platform layer — a backend everyone can use
The "something like Supabase for everyone," done our way.
- Own the backend: `SELF-HOSTED-STACK-PLAN.md` (local → self-hosted → federation).
- Accounts / each person's own library / optional shared Commons.
- The bare-foundation-vs-personal-additions seam so a fork keeps the engine and
  brings its own tradition: `TOOL-COMMONS-PLAN.md`; federation in
  `HOPES-AND-DREAMS-ROADS.md`.

### 5. The pillar features, over time (indexed, not urgent)
Real plans, tackled as the above allows:
- **Course Progression Tree** — 101 → prereq tree, build-your-own curriculum
  (`COURSE-PROGRESSION-PLAN.md`) + the Academy tutor (`PAVILION-ACADEMY-PLAN.md`).
- **Reading Room** — books on repeat, present-only (`READING-ROOM-PLAN.md`).
- **Agent embodiment** — a resident that *acts* when you ask (`AGENT-EMBODIMENT-PLAN.md`).
- **Local coding agents as collaborators (future)** — capable, private local AI
  agents that actually help build real projects. Named 2026-07-12 as the one use
  case worth scaling hardware for; until then keep models modest (cooling is the
  real limit — see `feedback_compute_and_coding_agents`). The "AI worth everyone
  having" vision (README Hopes) pointed at building, not just conversing.
- **The Workshop rooms, the Greenhouse, character customization** — the long tail
  in README "What's next" and `HOPES-AND-DREAMS-ROADS.md`.

---

## What I recommend we actually do first

If it were one call: **polish the core and ship the beta public (steps 1 + 2),
in that order.** You can't get "close to perfect for everyone" in the abstract —
you get there by making the daily loop excellent *and* putting it in real hands
so reality tells you what "perfect" means. Voice (step 3) is the next leap after
that; the connective backend (step 4) grows when there are actually people to
connect. Everything else is indexed above so nothing is lost, and none of it
blocks the two things that matter most right now.

## Cross-references (the plan index this spine points at)

Foundations & backend: `SELF-HOSTED-STACK-PLAN.md`, `CAPACITY-AND-PIPELINES.md`,
`LIBRARY-SCALING-PLAN.md`, `LIBRARY-GROWTH-PLAN.md`, `DESKTOP-APP-PLAN.md`.
Daily use & AI: `DAILY-HEAVY-LIFTING-PLAN.md`, `AI-INTEGRATION-NOTES.md`.
Learning: `COURSE-PROGRESSION-PLAN.md`, `PAVILION-ACADEMY-PLAN.md`, `LEARNING-PATH.md`.
Pillars & rooms: `SCIENCE-RESEARCH-HALL-PLAN.md`, `EIGHTFOLD-PATH-TEMPLE-PLAN.md`,
`READING-ROOM-PLAN.md`, `AGENT-EMBODIMENT-PLAN.md`.
Platform & sharing: `BETA-LAUNCH-PLAN.md`, `BETA-BUILD-PLAN.md`,
`TOOL-COMMONS-PLAN.md`, `HOPES-AND-DREAMS-ROADS.md`.

**One line to hold onto:** the app for one person is the bare minimum and it's
done; the platform where everyone holds their own library — filled by their own
hand, helped by an AI that never acts without them — is the actual work, and
it's now written down to tackle over time.
