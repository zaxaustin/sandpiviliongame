# The Research Room — keeping papers & ideas, and private-before-release

Written 2026-07-12, from the steward's questions: *where do papers and ideas
actually live in the Pavilion? what's the plan for the research room? should we
add a floor to the library? — and Docker as the private place to keep things
before releasing them.* And a concrete beta test attached: **learn electronics
in the lab, and let that shake out what's missing.**

---

## Where papers & ideas live TODAY (the honest inventory)

They already have homes — but **scattered across several, with no single "my
research" place.** That scatter *is* the gap:

- **The Research Desk** (Workshop) — freeform projects, timestamped notes, and a
  **paste-a-paper summarizer** (paste a chapter/paper → study notes, kept
  private). This is the main "think it through and keep notes" room today.
- **The Science & Research Hall — the lab** (off the Research Desk) — **dissect a
  paper** (critical appraisal), keep **investigations** (a claim + evidence +
  verdict), and run **self-experiments**. This is "test it / pull it apart."
- **The Library's Science shelf** — where a *finished, provenance-checked* paper
  gets shelved (via the arXiv / OpenAlex / Semantic Scholar Caravan connectors).
- **The Idea Jar** — one-click quick thoughts. **Notes / sparks** — the
  cross-app note layer (the Notes Log already unifies these).

So: **thinking → Research Desk; testing/dissecting → the Hall/lab; finished &
shared → the Library; quick ideas → the Idea Jar.** The machinery exists. What's
missing is (a) *one place to see your research material together*, and (b) a
clear *private-before-release* path.

---

## The Docker insight, made into the plan: private workbench → public release

The steward's point is the key organizing idea: **local storage (Docker/MinIO,
your own machine) is the private workbench.** You draft, test, and keep things
there — nothing shared, nothing certified — until *you* decide to release them to
the commons. This isn't new plumbing; it's naming a workflow the pieces already
support:

1. **Private (yours, local):** Research Desk notes, Hall investigations/
   experiments, pasted papers, personal library files — all local, none shared.
2. **Release (a deliberate act):** promote a Research Desk project into an
   Archive Desk entry; submit a book/paper to the **Steward Review Queue** for
   the certified Library; (later) publish an investigation to a shared Hall.

The rule stays the project's oldest one: **provenance at the door** — private
notes can be anything; anything *released* carries real license/source. Docker/
MinIO is where the "big private stuff" (full texts, datasets) sits before that
gate. This is the same private→public seam as `SELF-HOSTED-STACK-PLAN.md`, viewed
from the *research* side.

---

## Should we add a floor to the library? (my honest recommendation: not yet)

Tempting, but **build the flow before the room.** The physical world should grow
from a proven need, not decorate an unproven one (the project's own habit — the
Hall shipped as a *panel* first; it earns a real room in its Phase 5 only once
walked and wanted). Concretely:

- **First (cheap, high-value): a "My Research" home** — one view that gathers
  what's scattered: your investigations, pasted/kept papers, research projects,
  and ideas, in one place, with the private/released state visible. This is the
  same move the Notes Log already made for notes. It answers "where are my papers
  and ideas?" without building a room.
- **Then, when it's earned:** give research a real *place*. The two honest
  candidates are **the Science Hall as a real room** (its Phase 5) or **a Library
  floor / annex for papers** (the Library already has a basement; a papers floor
  is a natural sibling). Decide *which* once the "My Research" flow shows how you
  actually work — the electronics beta test below is exactly how we find out.

So: **no new floor this pass.** Weave the existing rooms into one research flow,
add the "My Research" home when we build it, and let real use pick the room.

---

## The beta test: teach yourself electronics in the lab

> **UPDATE 2026-08-02 — the beta test now has a real subject: a universal TV
> remote, built from scratch.** See **`UNIVERSAL-REMOTE-PROJECT.md`** for the
> reading list (the free/shelvable textbooks, the datasheets and app notes that
> are the actual primary sources, and the ~$30 of parts), the six-stage ladder,
> and the five investigations it will naturally produce. The first "where do I
> put this?" it surfaced has already been answered: **a build had no home**, so
> the Bench was built (see the Hall plan's L0). Four gaps remain, listed at the
> end of that file — the next one is Phase 1 below.

Electronics is a *great* test subject because it exercises **every** part of the
research room at once, and it's checkable (a circuit works or it doesn't — the
same honesty the Hall loves):

- **Learn it** — an **Electronics track in the Learning Tree** (Electronics 101
  seeded now; see below). Self-first, with a no-hardware path (a free circuit
  simulator) so you can start today.
- **Test it in the lab** — the Hall is your electronics lab: open a real
  **investigation** ("does doubling the resistor roughly halve the LED
  brightness?") or a **self-experiment**, and let the evidence settle it.
- **Keep the papers & ideas** — datasheets, a component's notes, a circuit idea
  → the **Research Desk** (paste a datasheet → summary; keep project notes),
  private until you want to share a build.

**What this beta test will surface (the point):** every place you go "where do I
put this?" or "I wish these were together" is a real finding for the "My
Research" home and the room decision. You're student zero for the research room,
exactly as you were for the Academy.

---

## Phases

**Phase 0 — Electronics track (now).** Seed Electronics 101 in the Learning Tree
(real, self-directed, hardware-optional), pointing you to use the Hall to test
and the Research Desk to keep notes. The beta test starts here.

**Phase 1 — The "My Research" home. ✅ BUILT 2026-08-02, as *the Lab*.** Exactly
as this plan asked: built from what the electronics run actually showed was
needed (builds, datasheets, the paper shelf, investigations, experiments), rather
than from a guess made in advance. `openLab()`. It **owns nothing** — every count
is read live from where the thing already lives and every button walks you there,
so there is no second copy to drift.

**And Phase 3 answered itself, cheaper than either option.** This plan said the
room should be decided from real use, between "the Hall as a real room" and "a
Library papers floor." Real use picked a third door nobody had listed: the
Workshop's Unfinished Floor has carried a **MAKER'S BENCH** placeholder since it
was built, whose sign read *"a home for real-world physical projects — a build, a
repair. Not open yet."* That is precisely what got built. So the placeholder
**opened** instead of a new room appearing beside it — a promise kept beats a
promise added, and the floor is one room less unfinished. Note this supersedes
`SCIENCE-RESEARCH-HALL-PLAN.md`'s basement instinct; the reasoning there (a lab
is where you're allowed to break things, kept apart from where claims are
appraised carefully) survives intact, just one floor up instead of one down.

**Phase 2 — The private→release path, made explicit.** A clear "keep private" vs
"release to the commons" action on research items, backed by the review queue and
(for big files) local MinIO as the private store.

**Phase 3 — A real place (only when earned).** The Hall as a room, or a Library
papers floor — decided from real use, not guessed now.

## Cross-references
- `SCIENCE-RESEARCH-HALL-PLAN.md` — the lab (dissect/investigate/experiment) and
  its own Phase 5 "real room."
- `WEB-VESSEL-PLAN.md` — pulling papers/pages in from the web to process here.
- `SELF-HOSTED-STACK-PLAN.md` / `CAPACITY-AND-PIPELINES.md` — Docker/MinIO as the
  private local store, and the private→public seam.
- `COURSE-PROGRESSION-PLAN.md` — the Learning Tree the electronics track rides.

**One line to hold onto:** the research room already exists as parts — think
(Research Desk), test (the Hall/lab), keep (notes/ideas), release (the commons);
the work now is weaving them into one flow, with Docker as the private workbench,
and letting a real subject (electronics) show us the room before we build it.
