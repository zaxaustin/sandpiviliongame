# The Daily Heavy-Lifting Plan — making the Pavilion carry a real day

Written 2026-07-11, at direct request: *"the goal is to get the Sand
Pavilion to be a good interface to do the heavy lifting for the things
someone will need in their daily life."* This is the comprehensive
what-next, ordered — it gathers the scattered ideas into one sequence and
replaces nothing; every item links to where its real plan lives.

**The measure for everything here** is the north star, verbatim
(2026-07-08): *"I want my day to be at ease where this place can help me
find direction and the tools needed to make use of the knowledge
provided."* Heavy lifting = the Pavilion doing the carrying: reading the
day's shape, holding the plans, turning what's read into what's done —
so the person spends their attention on living the day, not managing it.

---

## Phase 0 — Prove what's built (days, not weeks; mostly the user's own runs)

1. **The live click-through** — Sebastian's calendar and scheduler, the
   Caravan → Your Shelf → Reader path, the welcome panel, the two guide
   books now on the Practice shelf. Play it; note what grates in
   `BETA-TESTING-FEEDBACK.md`, same as every round.
2. **The clean-machine install test** — the installer on hardware that
   never built it. The one genuinely unknown thing left.
3. ~~Book pipeline holes~~ — **closed 2026-07-11:** all 41 non-essay
   texts read in full; export/import carries personal books; the guide
   books are shelved and visible live.

## Phase 1 — The daily loop, closed end to end (the actual heavy lifting)

The pieces exist; what makes them *carry* the day is the loop between
them, walked daily until it's smooth:

4. **Live the loop for a week, as the test:** arrive → Sebastian reads
   the day → schedule lands on the calendar → work at the desks → notes
   become sparks → evening: Still Open + the journal. Every rough seam
   found this way outranks every feature idea. (This is also what makes
   the beta *worth* testing for strangers.)
5. **The morning briefing — opt-in and passive** (from the "best home
   office" list, README Hopes): one "here's your day" read, generated
   when you first open the Study, sitting there to read or ignore.
   Bounded by the standing automation rule — never a popup, never a
   timer ([[feedback_automation_philosophy]]). Sebastian already
   computes the advisory; this is his read given one fixed, quiet home.
6. **The weekly review** — the Steward/Sebastian drafting a real
   look-back from a stretch of planner days and sparks. The journal
   already holds the raw material; nothing reads it back at range yet.
7. **The Ledger** (Workshop's sketched room, README longer-term #9) —
   real budget tracking is the biggest *daily-life* gap in the current
   toolset: money is a thing someone needs carried every single day.
   First real candidate among the five sketched rooms, on purpose.

## Phase 2 — Knowledge into use: the research path (Protocol 3)

8. **Walk one real question through the whole method** — question →
   Caravan (arXiv/OpenAlex/Semantic Scholar) → `pdf-to-text.py` →
   shelve → read + note → sparks → Research Desk next steps → a written
   conclusion. The user brings the question; the walk *is* the test of
   the scientific method inside the Pavilion, and writing it down as it
   happens becomes **PROTOCOLS.md Protocol 3**, earned the way
   Protocols 1–2 were.
9. **What the walk will surface** (expected, fix as found): the paper
   reading experience (abstracts, figures, citations read differently
   than books), and the case for a **PubMed Central open-access
   connector** — the biggest legitimately-free source not yet in the
   Caravan.

## Phase 3 — Open the doors (beta proper)

10. **The welcome-packet decision** — seed(22) vs live(51). Recommend:
    backport a curated dozen of the strongest full-text classics into
    the seed so a tester's first shelf feels real, keep the rest as
    "yours to fetch" (the protocol book teaches exactly that hunt).
11. **Two or three real testers** — the installer + MANUAL.md +
    the in-world guides. Their confusion becomes Round 5 of
    `BETA-TESTING-FEEDBACK.md`; their days, not ours, decide Phase 4.
12. **Visual polish within the sleeper-car bar** (BETA-BUILD §7a) —
    palette/UI/title charm passes, welcome but never at the expense of
    the resource budget. Fits naturally right before testers arrive.

## Deliberately later (recorded, not scheduled)

- The hosted shared Library (backend decided: Supabase now, hybrid VPS
  when outgrown — BETA-BUILD-PLAN §5).
- Voice in (SpeechRecognition), same free-and-local rule as TTS out.
- Agent embodiment (`AGENT-EMBODIMENT-PLAN.md`) — the big one, after
  the daily loop is proven, because a resident who *acts* only matters
  in a Pavilion someone already lives in.
- Character customization, the remaining Workshop rooms, the Tool
  Commons "soon" slice — each has its own plan doc; none gate the above.

**The order's logic, in one line:** prove it (0) → live it (1) → use it
to actually learn something (2) → open it (3) — ease first, direction
second, knowledge-into-use third, and only then more world.
