# The Pavilion Academy — a place to actually learn, with a tutor who helps

Written 2026-07-12, at direct request: turn the Pavilion into somewhere you
**learn a subject an hour a day** — real courses, an AI that *makes tests,
reviews your work, and gives counsel when you're stuck*, "as much help as
digitally possible," with voice to make it smooth. First subject: the coding
you need to learn. **This is a written plan, not code yet** — the shape
agreed before anything is built.

**The honest framing the user gave:** this doubles as beta testing. You are
student zero; the course you take first *is* the test of the system, and what
grates goes into `plans/BETA-TESTING-FEEDBACK.md` like every other round.

**The measure (from the north star):** knowledge into use. A course here
isn't finished when you've read it — it's finished when you can *do* the
thing. Every feature below is judged against "did it help them actually
learn," not "is it a clever AI trick."

---

## What already exists to build on (so we don't reinvent)

This is further along than a blank page — four real pieces already fit:

- **The Course Board** (`COURSE-BOARD-PLAN.md`, Stage 1 built): pinning,
  categories (**Study** and **Skill** already exist), search, archive, and
  **AI-drafted courses** — a conversation already becomes a saved course.
- **`LEARNING-PATH.md`**: a real 17-stage coding curriculum built around this
  exact project — the terminal, HTML/CSS/JS, how files talk, git, local AI,
  Docker, databases, deploying. **Several stages already end with a "paste
  this into the Course Board" block.** This is the first subject's content,
  already written.
- **The chat stack**: grounded residents, live streaming, per-resident
  memory, read-aloud. A tutor is a new *use* of this, not new plumbing.
- **The day-spine we just built**: Sebastian's calendar + the reminder bell
  (2026-07-11) is exactly the "an hour a day" scaffold — a recurring study
  block that pings you.

**The eventual home:** the **Round Table** room (Workshop attic, sketched)
was always meant for "a free place to pursue higher education together"
(`HOPES-AND-DREAMS-ROADS.md` Road 7). The Academy is what opens that room.
Near-term, it lives at the **Course Board** in the Study, where courses
already live.

---

## The four things the tutor does (the heart of the ask)

One resident — **the Tutor** — grounded in the *specific lesson you're on*,
does four jobs. Each is a grounded prompt mode over the existing chat stack,
not new infrastructure:

1. **Teach** — presents the lesson (from LEARNING-PATH, or AI-expanded from
   it), answers questions about it, read-aloud on. Grounded in the lesson
   text so it stays on-topic instead of wandering.
2. **Test** — generates a short quiz *from the lesson just covered* (a few
   questions, or a small coding exercise), then **grades your answer** with
   real feedback, not just right/wrong. Saved as a lesson result.
3. **Review your work** — you paste what you wrote (code, an answer, an
   essay); it gives structured feedback: what's right, what to fix, and
   *why* — the "why" is the part that teaches.
4. **Counsel when stuck** — an "I'm stuck" button hands the tutor the exact
   lesson **and your last attempt**, so the help is specific ("your loop
   never updates `i`") not generic. As much help as digitally possible,
   pointed at *this* wall.

**Charter note (load-bearing):** the Tutor uses **`WORK_CHARTER`** (neutral,
secular, goal-agnostic), **not** the residents' devotional `CHARTER`. Coding
is not the dharma; a course must serve the subject on its own terms. This is
the same rule the Computer and the work desks already follow.

---

## Voice — the smoothing the user wants

- **Out** already exists: read the lesson and the tutor's replies aloud
  (`tts.js`). Turn it on by default in a lesson — you can listen while you
  type code.
- **In** is the gap (`HOPES-AND-DREAMS-ROADS.md` Road 5): the browser's free
  `SpeechRecognition` API, a 🎤 on the tutor input, desktop-app first. Ask a
  question or answer a quiz *out loud* — hands stay on the keyboard for code,
  voice handles the conversation. Same "no paid cloud API" rule as TTS.

Voice makes an hour-a-day sustainable: it turns "read a wall of text" into
"a conversation while you work."

---

## The honest risks (named so they're designed around, not discovered)

- **A tutor can be confidently wrong.** This is the real danger of AI
  teaching. Three defenses, by design: (a) ground every lesson in the *real*
  LEARNING-PATH text or a shelved book, so the tutor cites truth it didn't
  invent; (b) for coding, **the code either runs or it doesn't** — an
  exercise you can actually execute is a truth-check no model can fake; (c)
  the tutor is taught to say "I'm not sure — let's check the lesson" rather
  than bluff (a prompt stance, and it must survive testing).
- **Effectiveness before personality** (standing rule): a tutor that hangs or
  blanks is worse than no tutor. Model choice matters — Protocol 2's tiered
  guide is part of this feature, not separate. A reliable plain answer beats
  a profound one that times out mid-lesson.
- **No background polling**: tests and reviews fire only when you ask. The
  daily reminder is Sebastian's opt-in bell, never a nag.
- **Local-first**: it all runs on your own model. Any "phone a bigger cloud
  model when truly stuck" is opt-in and labeled ☁, same as everywhere.
- **Honesty about what it is**: this is a study aid with a patient tutor, not
  an accredited teacher. Say so plainly to a new student, like every other
  honest wall in this project.

---

## Phases — each with a first honest slice, smallest safe path

**Phase 0 — Seed the courses (mostly content, little code).**
Port the LEARNING-PATH coding stages into real Course Board entries — several
already have paste-ready blocks. Deliverable: you can pin "The terminal,"
"HTML/CSS/JS," "How the files talk," "git," as real courses today, with their
lessons as steps. This alone makes the Board a curriculum, before any tutor
work.

**Phase 1 — The Tutor mode (reuses the whole chat stack).**
A "Study with the tutor" button on a pinned course opens a chat grounded in
the *current lesson*, WORK_CHARTER, read-aloud on. It teaches and it counsels
("I'm stuck" passes the lesson + your last message). No new plumbing — a new
grounding + a new entry point. First real usable slice of the whole idea.

**Phase 2 — Test & Review.**
Two grounded modes on the Tutor: "Quiz me on this lesson" (generate → you
answer → it grades with feedback) and "Review my work" (paste → structured
feedback). Save a lesson result so progress is real, not vibes. Lesson-level
progress tracking gets added to the course data here.

**Phase 3 — Voice in.**
🎤 on the tutor input (`SpeechRecognition`), desktop-first. The hands-free
half of the loop. Small and self-contained.

**Phase 4 — The daily rhythm.**
"Study an hour a day" made real: a recurring calendar block (Sebastian
schedules it, the bell reminds you), a simple streak/progress view, and the
morning briefing surfacing today's lesson. Ties the calendar, reminders, and
courses — three things now built — into one habit. The **Round Table** room
can open here as the Academy's physical home.

**Phase 5 — Beyond coding.**
The same machine generalizes: any subject where you have real source material
(the Library's books become the ground truth a tutor cites). Coding proves
the pattern because code is checkable; the Library extends it to everything
else the shelves hold.

---

## The first real test (what "beta testing" means here)

**You, learning the coding you need, an hour a day, starting with
LEARNING-PATH Stages 1–6** (terminal → HTML/CSS/JS → how files talk → local
& API → git → make a real change). That run *is* Phase 0–1's test. Every
place the tutor is vague, wrong, slow, or unhelpful is a real finding for
`BETA-TESTING-FEEDBACK.md` — and because the curriculum is built around *this
codebase*, the change you "make a real change yourself" in Stage 6 can be a
real Pavilion improvement. The student improves the school. That loop is the
whole hope of the place, pointed inward first.

---

## Cross-references

- `COURSE-BOARD-PLAN.md` — the Board this builds on; Stage 2 (sharing) is how
  a course becomes shareable, which is the Academy going multi-student.
- `LEARNING-PATH.md` — the first subject's actual content, already written.
- `DAILY-HEAVY-LIFTING-PLAN.md` — the Academy is Phase 2's "learn with it"
  made into its own room; the daily hour is that plan's rhythm.
- `HOPES-AND-DREAMS-ROADS.md` — Road 7 (Round Table / higher ed together) and
  Road 5 (voice in) both feed this.
- `AI-INTEGRATION-NOTES.md` — the effectiveness-before-personality rule the
  Tutor lives under; WORK_CHARTER vs CHARTER.

**One line to hold onto:** the Pavilion already teaches by being read; the
Academy makes it teach by *answering back, testing you, and helping when you
are stuck* — the difference between a library and a school.
