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
10. **The Pavilion Academy** (`PAVILION-ACADEMY-PLAN.md`, 2026-07-12) —
    "learn with it" grown into its own system: real courses from
    `LEARNING-PATH.md`, a Tutor who tests you, reviews your work, and
    counsels when you're stuck, voice to smooth it, an hour a day on the
    calendar. First subject: the coding the user needs. Doubles as beta
    testing (student zero improving the school). This is arguably the
    truest expression of the north star — knowledge into use — and may
    well jump ahead of the research walk once the daily loop is proven.

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

---

## Three practical asks, 2026-07-27 — notes, a resume, and reading with Quill

All three are the same shape: *the Pavilion already holds the raw material, and
does nothing with it.*

### 1 · "Help me take notes and have the AI expand on them and make them good"

**What exists:** notes save and link to a book; the Reader's ✨ analysis writes
into book notes; a note can become an AI lesson plan.
**What doesn't:** taking a rough note and asking the model to *make it good* —
the single most common thing anyone actually wants from an AI and a notebook.

**The build (small):** an **✨ Expand this** action on any note, offering three
honest modes rather than one vague "improve":
- **Tidy** — same content, readable. No new claims.
- **Expand** — fill out the thinking that's implied but unwritten.
- **Question it** — what this note assumes, and what would show it's wrong.

**The rule that keeps it trustworthy:** the expansion is written *underneath*
your own words, marked ✨ as the AI's, never replacing what you wrote. Same
discipline the book-note analysis already follows. Your sentence stays yours.

### 2 · "If I want to make a resume with Sebastian that would be nice"

Genuinely good, and the Pavilion is unusually well placed for it: it already
knows what you've actually *done* — courses walked, lessons written, Learning
Tree nodes finished, Archive Desk documents, Research and Grant projects,
investigations and self-experiments, books read.

**The build:** a **Résumé** view at Sebastian's desk that drafts from those real
records under `BUTLER_CHARTER`, then lets you edit every line. Export as
Markdown, and as plain text for pasting into a form.

**Two rules, both non-negotiable:**
- **It may never invent a credential.** Everything it drafts must trace to
  something actually in your save, and the draft says which. An AI-embellished
  CV is a way to get someone caught lying.
- **It is not a certificate.** The Pavilion confers nothing — Moss says so on
  the Grounds already. A résumé here is *your own record of your own work*,
  which is the honest and still useful version.

### 3 · "It would be nice to review chapters and things with Quill"

**The real gap, and it's a role mix-up we made:** the Reader's "Ask about this
book" talks to **Sebastian** — but the standing role split is *Quill teaches,
Sebastian runs the day*. Discussing a chapter is teaching. It should have been
Quill from the start.

**The build:**
- Point the Reader's book/page conversation at **Quill**, with Sebastian
  remaining available for "how does this fit in my week."
- Add **"Review this chapter with Quill"** — grounded in the pages you've
  actually read, not the whole book: what it argued, what you seemed to skim,
  and one question to check you got it. That turns the Reader from a display
  into a study session, which is the whole difference between a library and a
  school.
- Chapter marks already exist for the ⏮/⏭ jump added 2026-07-27, so "this
  chapter" is already a thing the code can name.

**Order:** #3 first (smallest, and fixes a genuine inconsistency), then #1, then
#2 — none before the beta ships.
