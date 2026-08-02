# The Science & Research Hall — the Pavilion learns to *ask*, not just hold

Written 2026-07-12, at direct request: the Pavilion has a lot of *stored*
knowledge but nowhere that actively **investigates** it. Give the café Steward
— who is running empty while the Commons is on pause — a real second role as
the Pavilion's **Investigator**: a place that can test any claim honestly.
Mostly that's modern-day science and everyday claims; **and, when you want it
to, it can also be pointed at the truths that meditation and the Hindu
scriptures put forward, examined under a real scientific lens.** The scriptural
testing is *a thing the Hall is able to do, not the reason it exists* — a
capability you reach for when you're curious, never a lens every question has
to pass through (clarified directly by the user: "so we *can* test things, not
that we *have to* in the spiritual sense").

> **STATUS — Phases 0, 1, and 2 built 2026-07-12.** The Hall is real and
> reachable: a panel off the Research Desk (`openScienceHall`), the **method
> creed** on the wall (see "The method" below), four hand-written exemplar
> Investigations spanning both tracks and all four verdicts, the
> **Investigator** — the café Steward's second hat, speaking under
> `WORK_CHARTER` — as a live grounded chat, and **Phase 2: you can open and
> keep your own Investigations** (`data.hall.investigations`), with the
> evidence-and-falsifier fields *required* so a verdict can't be filed without a
> source and a way to be wrong. Also built: **"Dissect a paper"** — paste a
> paper you disagree with and the Investigator gives a real critical appraisal
> (steelman first, then probe method/leaps/overreach, argue the claim not the
> authors, work only from what's pasted), which can graduate into a kept
> investigation. **Phase 3 (self-experiments) built 2026-07-12** — define a
> practice + a 1–5 daily measure, log it honestly day by day
> (`data.hall.experiments`), then "🔬 Read my data with the Investigator," who
> reads the n-of-1 honestly including how it fools you (placebo, too few days,
> confounds). No background timer — a day counts only when you log it. `node
> --check` clean, smoke green, full build compiles.
> **Open:** Phase 3b (schedule the daily block on Sebastian's calendar + bell),
> Phase 4 (fetch real papers via
> the Caravan), Phase 5 (a real room in the world). The rest of this doc is the
> original plan, kept as written.

---

## The method — how to pursue it (the Hall's creed, added at direct request)

Stated plainly because the point of the Hall is that *we can't be the
gatekeepers of truth* — it should be open to debate, in the spirit of the First
Amendment's marketplace of ideas, **paired with** the discipline that you back
a claim with evidence rather than volume. Five principles, on the wall of the
room and in the Investigator's own charter:

1. **No one here is the gatekeeper of truth** — not the Investigator, not the
   founder, not the visitor. Every claim is open to challenge, including the
   ones already on the shelves and the Investigator's own verdicts.
2. **A seat at the table has a price: evidence.** Back a claim with a paper, a
   source, a real observation. Being certain isn't being right; the loudest
   voice isn't the truest.
3. **Name what would change your mind.** Reach for the humblest verdict the
   evidence supports and hold it provisionally — a claim you'd never give up is
   being defended, not tested.
4. **Argue the claim, never the person** — steelman the other side first; where
   a question is genuinely open, say it's contested and lay the sides out fair.
5. **"Beyond what science can say" is an honest answer, not a defeat** — some
   questions are the Monk's, not the microscope's.

This is enforced structurally, not just preached: the "open an investigation"
form makes the **question**, the **evidence/sources**, and the **falsifier**
required fields. You literally cannot file a finding here without stating what
backs it and what would change it.

**The honest framing (load-bearing, read this before anything else):** this is
a Hall of **inquiry, not vindication**. Its job is not to *prove the
scriptures right* — a laboratory that only ever confirms its founder's beliefs
is theater, and this project's whole ethic is that everything here **must
survive open scrutiny** (the no-poison rule, the Gutenberg/arXiv honesty wall,
"say so plainly when a browser truly can't"). The most powerful, most
on-brand version of this is the one that would satisfy a skeptic: form a real
question, look at the *actual* published evidence, and be willing to write
"supported," "unsupported," or "science can't say yet — here's why." Held that
way, the Hall becomes proof the tradition is unafraid of the light. Held the
other way, it becomes something no thoughtful person would trust. **The
first is the design.** (See "The one fork worth your call" at the end — if you
want the other, it changes everything below.)

**The measure (from the north star):** knowledge into use. A shelf teaches by
being read; the Hall teaches by turning a book into a *testable question* and
then honestly reporting what the world actually says back. Judged on "did it
make someone think more carefully," not "was it a clever AI trick."

---

## Why the Steward, and why now

The café Steward's one real job is moderating the Notice Board — and the
Commons is **dormant by choice** while local-first daily use is the priority
(README "The Commons"). So of the five residents he is the one genuinely
under-loaded: Quill teaches the shelves, the Monk guides on meaning, Sebastian
runs the day, the Computer is the terminal. Nobody *investigates*. That gap is
his new role, and it fits a steward's character honestly — a steward keeps the
grounds; keeping a laboratory is the same instinct pointed at questions
instead of a courtyard. He does not stop being the café's Steward; he gains a
second hat, the way a real caretaker of a place might also keep its records
and its instruments.

**The charter tension — the central design decision.** The café Steward runs
on the devotional `CHARTER` (in-character, Four-Noble-Truths framing, defers
to the Monk on meaning). An investigator examining a *spiritual* claim under a
*scientific* lens cannot wear that hat — a scientist who is doctrinally
committed to the answer isn't doing science. So **in the Hall the Steward
speaks under `WORK_CHARTER`** (neutral, secular, goal-agnostic — the same
charter the Computer, Research Desk, and the planned Academy Tutor use), even
though at the café he keeps `CHARTER`. Same resident, two rooms, two voices,
and the *reason* for the switch is itself the lesson: rigor means setting your
conclusion aside until the evidence is in. This is not charter-crossing
sloppiness — it is a deliberate, stated boundary, the same way Sebastian sits
*between* the two charters on purpose.

> This is the one place the plan does something new with the charter rules, so
> it's called out loudly rather than buried: **the Investigator is a
> WORK_CHARTER role, and the plan fails if it ever quietly becomes a
> devotional one that reasons toward a foregone conclusion.**

---

## What already exists to build on (so we don't reinvent)

Further along than a blank page — five real pieces fit:

- **The Science shelf** (Library): Darwin's *Origin of Species* and *Beagle*
  journal, plus the Library's first real research paper. Real ground-truth a
  scientist can cite instead of inventing.
- **The Hindu shelf**: the Bhagavad-Gita, the Upanishads, the
  Ramayana/Mahabharata, Wilkins' *Hindu Mythology*. The scriptures whose
  claims the Hall would actually examine — already shelved, already
  hash-verified, already readable in full.
- **Meditation is already in the world**: `M` cycles the four postures
  (sitting → lying → standing → walking). A self-experiment about meditation
  isn't hypothetical here — the practice it studies already runs in-game.
- **The day-spine**: Sebastian's calendar + the reminder bell (2026-07-11) is
  exactly the scaffold an *n-of-1 self-experiment* needs — a daily logged
  block, reminded, streak-tracked.
- **The chat stack + the Research Desk**: grounded residents, live streaming,
  per-resident memory, read-aloud; and the Workshop's Research Desk already
  turns an idea into next steps. The Investigator is a new *grounding* and a
  new *room*, not new plumbing.

**The eventual home:** a real **Science & Research Hall** room (its own
building on the Grounds, or the Workshop's still-"unfinished floor" given a
purpose — decide at build time; see Phase 1). Near-term it can live as a panel
reached from the existing Research Desk, the way the Academy lives at the
Course Board before the Round Table opens.

**The distinction from the Research Desk (kept deliberate):** the Research
Desk is *your* private thinking-through of *your* projects. The Hall is a
*shared, standing* body of **Investigations** — open questions with evidence
attached and an honest verdict — that persist and accumulate, the way the
Library accumulates books. One is a workbench; the other is a lab notebook the
whole Pavilion keeps.

---

## The heart: an "Investigation" is the Hall's unit of work

The Library's unit is a shelf entry (title / author / license / source). The
Hall's unit is an **Investigation** — a small, honest, structured record with
the same discipline applied to *questions* instead of *texts*:

- **The question** — stated as something that could actually come out either
  way. "Does a daily sitting practice measurably lower stress?" is an
  investigation. "Meditation is good" is not.
- **Where it comes from** — a book on the shelf, a scriptural claim, a modern
  headline, or your own life.
- **What the evidence actually says** — grounded in real material: a shelved
  text, a fetched paper (via the Caravan), or a self-experiment's own data.
  The Investigator cites what it draws from and never invents a study.
- **The verdict, honestly labeled** — one of: **Supported**, **Unsupported /
  contradicted**, **Mixed**, or **Beyond what science can currently say** (and
  *why* it's beyond — a claim about subjective experience, or one not framed
  to be testable, is a real and respectable category, not a dodge).
- **What would change the verdict** — the falsifiability line; the single most
  teaching-heavy field in the whole record.

This structure is the guardrail. A claim can't sit in the Hall as vibes; it
has to be phrased testably and answered honestly, or it doesn't earn a card.

### The two tracks, both honest

**Track A — Modern science, done properly.** Everyday-claim literacy and the
method itself: how a hypothesis becomes a test, what a control is, why "a
study found" isn't "science proved," reading a real paper without being fooled
by it. Pairs directly with the Science shelf and the Caravan's arXiv /
Semantic Scholar / OpenAlex connectors (paper-fetching already built).

**Track B — Contemplative science (the sensitive one, done the same way).**
This is a **real, peer-reviewed field**, not a fringe: the measurable effects
of meditation on attention, stress physiology, and the brain are genuinely
studied, and just as genuinely over-claimed in popular culture — which makes
it the *perfect* subject for a Hall whose whole point is telling the real
signal from the hype. The rule that keeps it honest:

- **Where real evidence exists, follow it wherever it goes** — including "the
  strong version of this claim isn't supported; the modest version is."
- **Where a claim is about lived, first-person experience** (the taste of a
  deep meditation, a scriptural account of consciousness), the honest verdict
  is often *"outside what a third-person experiment can settle"* — and the
  Hall says exactly that, plainly, rather than faking a measurement or
  dismissing the experience. That honesty is *more* respectful of the
  tradition, not less: it refuses to reduce a practice to a number it was
  never making a claim about.
- **A scriptural claim and a scientific finding are allowed to simply
  coexist** without one being made to "win." The Gita's teaching on equanimity
  and the stress-response literature can sit on the same card, each labeled
  for what it is — scripture, and evidence — without pretending scripture *is*
  evidence or that evidence *refutes* scripture. The Monk, note, remains the
  final voice on *meaning*; the Investigator only ever speaks to *evidence*,
  and hands the meaning question back to the Keep when it arises. That
  hand-off is the same one the Steward already makes at the café.

### Self-experiments — the honest, checkable core (the meditation tie-in)

The strongest, least-fakeable thing the Hall can do is let *you* run a real
**n-of-1 self-experiment**, because — like a coding exercise that either runs
or doesn't — your own logged data is a truth-check no model can bluff:

- Pick a practice already in the game (a daily sit via `M`), a duration, and a
  simple honest measure (a 1–5 "how settled do I feel" logged after).
- Sebastian schedules the daily block; the bell reminds you (opt-in, never a
  nag — the standing automation rule holds).
- After a real stretch, the Investigator helps you *read your own data
  honestly* — including all the ways an n-of-1 can fool you (placebo,
  expectation, the fact that you *wanted* it to work). Teaching you to
  distrust your own result correctly is the actual gift.

This is where meditation, the calendar, the streak scaffold, and the science
all meet — and it's completely honest, because it makes no claim beyond *your
own experience over these weeks*, clearly labeled as exactly that.

---

## The honest risks (named so they're designed around, not discovered)

- **Motivated reasoning — the whole game.** The single biggest risk is the
  Hall becoming an apologetics engine that dresses a foregone conclusion in
  lab coat language. Defenses, by design: the WORK_CHARTER framing; the
  mandatory "what would change the verdict" field; the four honest verdict
  categories (including "science can't say"); and the Investigator prompted to
  *prefer* "the evidence is thin here" over a confident overreach. If a
  reasonable skeptic reading a finished Investigation card would wince, it
  failed.
- **A model can be confidently wrong about science** — worse here than in the
  Academy, because a fake citation *looks* like rigor. Defenses: ground every
  finding in a *real* shelved text or a *really fetched* paper (the Caravan is
  the door — no invented DOIs); teach the Investigator to say "I don't have a
  source for that on the shelf — this should go to the Request Board" rather
  than fabricate one; and mark clearly when it's reasoning from general
  knowledge vs. from a cited text.
- **Not real accreditation** — this is a study aid for thinking carefully, not
  a peer-review journal or a substitute for medical/scientific advice. Say so
  plainly, like every other honest wall in this project. Any health-adjacent
  claim (meditation and blood pressure, say) carries that caution on the card.
- **Effectiveness before personality / no background polling / local-first** —
  the three standing rules apply unchanged: a reliable plain answer beats a
  profound one that times out; investigations run only when you ask; it all
  runs on your own model, any cloud reach opt-in and labeled ☁.
- **Respect, both directions.** The Hall must not condescend to the tradition
  *or* to science. A visitor who is devout and a visitor who is skeptical
  should both find it fair. That is a high bar and it is the correct one.

---

## Phases — each with a first honest slice, smallest safe path

**Phase 0 — Seed a handful of real Investigations (mostly content).**
Hand-write 3–4 exemplary Investigation cards spanning both tracks and every
verdict type, drawn from books already shelved — e.g. a "Supported (modest
version)" on meditation & attention, a "Beyond what science can say" on a
first-person scriptural claim, a "Mixed" on a popular wellness headline. These
*are* the spec: they show the tone and the honesty bar before any AI writes
one. Deliverable: a readable panel of example investigations, zero model
dependence.

**Phase 1 — The Investigator mode (reuses the whole chat stack).**
Give the Steward a second grounded prompt under `WORK_CHARTER`, reached from a
new **Science & Research Hall** entry point (start as a panel off the Research
Desk; a real room comes when it earns one). It can *discuss* an Investigation,
help *phrase a question testably*, and always cite what it draws from. No new
plumbing — a new grounding + a new door. First usable slice.

**Phase 2 — Create & keep Investigations.**
The structured record becomes real data (question / source / evidence /
verdict / falsifier), created with the Investigator's help, saved, and
accumulating — the Hall's own growing "shelf" of questions. Ties to the
Science and Hindu shelves so a book can spawn an investigation directly.

**Phase 3 — Self-experiments (the meditation tie-in).**
The n-of-1 loop: define a practice + measure, Sebastian schedules the daily
block, the bell reminds, you log, and the Investigator reads the data honestly
with you (including how it might be fooling you). This is the payoff phase —
where meditation, calendar, streaks, and method converge.

**Phase 4 — Fetch real evidence in-line.**
Wire the Caravan's paper connectors (arXiv / Semantic Scholar / OpenAlex,
already built) so an Investigation can pull a *real* paper as evidence, same
provenance discipline as the Library. Unreachable-from-browser sources route
to the Request Board, honestly, like everything else.

**Phase 5 — A real room.**
Give the Hall its own building on the Grounds (or claim the Workshop's
unfinished floor). Instruments and a lab-notebook aesthetic, the Steward
keeping it. Opens alongside — and pairs naturally with — the Academy's Round
Table: one place learns answers that exist, the other tests answers that
don't yet.

---

## The fork, and how the user settled it

There was a real fork here: a Hall built for **inquiry** (willing to find a
claim unsupported, or unmeasurable, and say so) versus a Hall built for
**vindication** (setting out to *demonstrate the harmony* between scripture and
science — a "look how much the ancient texts anticipated" reading room). They
can't be the same room: they need different verdict categories, a different
charter, and a different stance.

**The user settled it: inquiry.** "So we *can* test things, not that we *have
to* in the spiritual sense." That's a clean answer to both halves of the fork
at once — the Hall is a general testing instrument (not a spirituality-proving
one), and the scriptural claims are simply *available* to test, entirely
optionally, judged the same honest way as anything else. Build the honest
laboratory; let any harmony be something a visitor *discovers* where it's real,
never something the room is built to sell. Everything above is written to that
decision.

---

## Cross-references

- `AI-INTEGRATION-NOTES.md` — WORK_CHARTER vs CHARTER, and the
  effectiveness-before-personality rule the Investigator lives under.
- `PAVILION-ACADEMY-PLAN.md` — the sibling: the Academy teaches known
  answers, the Hall tests open questions; both are grounded-chat modes over
  the same stack, both WORK_CHARTER, both aimed at "knowledge into use." They
  share the Round Table as an eventual home.
- `LIBRARY-GROWTH-PLAN.md` — the Science shelf and the Caravan paper
  connectors this draws its evidence from.
- `HOPES-AND-DREAMS-ROADS.md` — Road 7 (higher education together): the Hall
  is the *research* half of a school, as the Academy is the *teaching* half.
- README "AI residents" — the Steward's current café role, which this extends
  rather than replaces; and the Monk-holds-meaning boundary the Investigator
  hands off to.

**One line to hold onto:** a Library holds what's known; a laboratory asks
what's true — and a tradition brave enough to build the second, honestly, has
nothing to fear from the first.

---

# THE LAB — the basement room, and making things real (2026-07-27)

At direct request: *"I have some ideas for the Science and Research Hall... make
it interactive as we can, maybe a whole room in the basement. I have a 3D
printer so tools for that would be dope, and also learning physics and
electronics should be interactive."*

This is Phase 5 ("a real room") grown into its own wing. Three strands, and they
belong together because they are the same loop at three scales: **predict →
build → measure → be wrong → write it down.**

## Why the basement, and why that's the right instinct

The Library already has a basement reached by walking into a bookshelf — the
Pavilion's one existing secret. A lab underneath the Workshop or the Hall reads
correctly for a different reason: **a lab is where you are allowed to break
things.** Upstairs is where claims are appraised carefully; downstairs is where
you burn out a resistor to find out what "too much current" means. Keeping those
physically apart is honest about their different standards of care.

**Room shape:** a workbench along one wall, a bench-supply/meter station, a
printer in the corner, a scrap bin, and a board on the wall where a running
experiment's numbers live. Reached by a stair from the Workshop ground floor
(the Workshop is already the making building; the Hall is already the appraising
one, and it lives off the Research Desk).

## Strand A — electronics you can actually poke

**The honest bar:** this must not become a toy that teaches wrong intuitions. A
circuit sim that is *approximately* right is worse than none, because a learner
cannot tell where it lied.

So: **a DC circuit sandbox with exact, checkable maths.** Battery, resistors,
LED, switch, wire. Series and parallel. It solves by nodal analysis — real
linear algebra on a handful of nodes, which is a page of code and is *exact* for
DC. Show V, I and R on every element, live, as you drag values.

- **The teaching move:** make the visitor **predict before revealing**. Type
  what you think the current will be, *then* it solves. Being wrong on the
  screen is the entire pedagogy, and it's the same falsifier discipline the Hall
  already runs on papers.
- **Burn things out.** Exceed an LED's forward current and it visibly dies, with
  the number that killed it. Cheap to implement, unforgettable to learn.
- **Deliberately NOT:** AC, transistors, op-amps, or a full SPICE. The moment it
  needs a solver we can't verify by hand, it stops being honest. Ohm's law,
  Kirchhoff, series/parallel, power dissipation — that's the whole scope, and
  it's most of what a beginner actually needs.

## Strand B — physics you can measure

Same rule: **only simulate what has a closed-form answer we can check.**

- **Projectiles** (gravity, no drag, then with linear drag — both exact).
- **Pendulum** (small-angle exact; large-angle numerically integrated and
  *labelled as approximate*, which is itself a lesson).
- **Springs, inclines, collisions** — all analytically solvable.
- Each one is a **self-experiment in the Hall's existing sense**: state a
  prediction, run it, record the number, and let the Investigator read your
  results honestly. That reuses `data.hall.experiments` rather than inventing a
  parallel store.

**The bridge to the real world, which is the actual point:** every sandbox ends
with *"now do it with a real object and a phone timer, and log THAT."* A
simulation you can't check against reality is a video game; a simulation you
then falsify with a stopwatch is science.

## Strand C — the 3D printer bench

The most *immediately* useful strand, because there's a real printer in the room.

- **A print log** — what you printed, filament, nozzle/bed temp, layer height,
  speed, result, and what you'd change. This is a lab notebook for printing, and
  it's the thing almost nobody keeps and everybody wishes they had.
- **Failure triage** — a checklist keyed to the symptom (warping, stringing,
  elephant's foot, layer shift, under-extrusion), each pointing at the two or
  three causes worth checking first, in order. Grounded in the log: *"the last
  three times you saw stringing, dropping the temp 5° fixed it."*
- **A material sheet** — PLA / PETG / ABS / TPU with real temperature ranges,
  bed adhesion, and what each is actually good and bad for.
- **The AI's honest role:** read your log and your symptom and suggest what to
  change next. It must never assert a temperature as fact — it proposes, you
  test, the log records what actually happened. Same evidence discipline as
  everywhere else here.
- **Later, if wanted:** parse a sliced G-code header for the real settings
  instead of typing them (a small, purely local file read), and a "calibration
  ladder" course in the Learning Tree — first layer, temp tower, retraction,
  flow — as a real progression.

## Phasing, smallest useful first

- **L0 — the print log. ✅ BUILT 2026-08-02, as *the Bench*.** Generalised past
  3D printing on the way in, because the first real occupant turned out to be a
  universal TV remote (`UNIVERSAL-REMOTE-PROJECT.md`) rather than a print — and
  a circuit, a print, a repair and a recipe all log identically. `data.hall.builds`,
  in the Hall beneath self-experiments.

  The shape that made it worth building separately: a self-experiment is
  `a practice + one 1–5 measure, daily` — right for meditation, wrong for making
  a thing. A build step is **what I expected → what I did → what actually
  happened**, and it is deliberately **two-phase**: the prediction saves on its
  own, and only then is the result half reachable. You cannot backfill a guess
  once you know the answer. That constraint is this plan's creed made structural,
  the same trick as the investigation form's required falsifier — and it is
  guarded by `test/live/bench.mjs` (12 checks) precisely because it could rot
  into a single form with all the fields at once and still look fine.

  The Investigator reads a build log under a `buildContext` branch, aimed at the
  one thing he's uniquely good for: the pattern across steps you're too close to
  see — the same wrong assumption showing up three times.
- **L1 — the room. ✅ BUILT 2026-08-02, and NOT in a basement.** The instinct
  below was right about *why* (a lab is where you're allowed to break things, and
  that belongs apart from where claims get appraised carefully) and wrong about
  *where*. The Workshop's Unfinished Floor already carried a **MAKER'S BENCH**
  placeholder whose sign read *"a home for real-world physical projects — a build,
  a repair. Not open yet"* — which is exactly what the Bench turned out to be. So
  the placeholder **opened** rather than a basement being dug beside it: a promise
  kept beats a promise added, and that floor is one room less unfinished.
  `openLab()`, and it doubles as `RESEARCH-ROOM-PLAN.md`'s Phase 1 "My Research"
  home — the gathering view for builds, datasheets, the paper shelf,
  investigations and experiments. It owns nothing; every count is read live.
- **L2 — the DC circuit sandbox**, predict-first, with exact maths.
- **L3 — the physics benches**, each wired into a self-experiment.
- **L4 — G-code parsing and the calibration progression.**

**The tie back to the Hall's creed:** every one of these produces a number you
predicted and a number you measured. That gap is the only thing the Hall has
ever cared about.
