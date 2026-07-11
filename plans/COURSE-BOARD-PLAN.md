# Course Board Plan — three real stages, not one big jump

**Stage 1 built 2026-07-10** (categories, search/filter chips, real archive
state, AI-suggested categories). Stages 2-3 (sharing standards, the free
course site) deliberately not started — Stage 2 becomes real when the beta
actually has other people in it. Written down 2026-07-10, a direct answer to `BETA-TESTING-FEEDBACK.md` #18 ("the
Course Board should scale like a real site, and support importing
plans") — that raw ask turned out to actually be three separate,
sequential asks, not one feature, and staging them explicitly is the
real plan here, not a single build.

## The actual shape, given directly

1. **Now** — course-making that works well for one person. Small on
   purpose.
2. **Getting ready for other people** — real standards and requirements,
   so a course can honestly leave this one Pavilion.
3. **A full course site** — a real, free replacement for the parts of
   college that are actually about learning together, not the parts
   that are about paying for a credential.

Each stage is a real prerequisite for the next, not a rename of the
same feature three times — Stage 2 doesn't make sense without Stage 1
already being solid, and Stage 3 doesn't make sense without Stage 2's
standards already being real and tested by actual sharing.

## Stage 1 — now, small, for one person — ✅ BUILT 2026-07-10

All three gaps below are now closed, verified by static check (syntax,
smoke, handler wiring, the AI category-parse logic unit-tested):
- **Categories** — a `COURSE_CATEGORIES` axis (Practice / Study / Skill /
  Work / Health / Personal), an orthogonal label like the Library's own,
  chosen in the new-course form and editable in a course's detail view.
  Old courses with no category read as Personal; nothing had to migrate.
- **Search + category chips** on the list view, mirroring the Index
  panel's exact pattern (a search box with caret-preserving re-render,
  category chips with live counts). The search box only appears past four
  courses, so a small board stays uncluttered.
- **Archive, distinct from delete** — `archiveCourse()` toggles a real
  `archived` flag (kept, not erased); the board's default view shows
  active courses with a "🗄 Archived (N)" entry, and `upcomingItems()`
  now skips archived courses so a set-aside path stops nagging the due
  badge. "Take down" was renamed "Delete" to make the permanent one
  clearly the permanent one, beside the new non-destructive Archive.

Below is the original scoping, kept for the record.

**Already mostly built, checked against the actual code:** `data.courses`
is already personal, local-only, self-graded — "the board confers
nothing, the walking is the credential," stated directly in the panel's
own copy. A course is `{title, why, due, steps:[{title,practice,url,done}]}`,
pinnable by hand or AI-drafted (`draftCourseFromGoal()`, the same engine
Quill's "draft a plan from this conversation" already reuses). This part
of #18's own ask is real and current even at today's small scale: *"as
more courses get made, the board needs a website-like feel instead of
what will otherwise become a flat, discombobulated list."*

**What Stage 1 still actually needs, scoped to personal use only, no
sharing concept yet:**
- **Categories or tags on courses** — the same `CATEGORIES` axis the
  Library already uses (orthogonal to whatever the course is *about*),
  so five courses stays fine and twenty stays browsable.
- **Search/filter on the list view** — the Index panel's own pattern
  (search box, category chips) is the closest existing precedent,
  already proven at Library scale; reusing it here instead of inventing
  a second search UI.
- **Archiving, not just "take down"** — today `removeCourse()` deletes
  permanently. A finished or abandoned course is real personal history
  (matches this project's own instinct that a save's activity log,
  reading notes, and planner days are all worth keeping) — a real
  "archive" state, separate from deletion, is a small, honest gap.

Nothing here touches sharing, standards, or anyone else's course. This
stage is finished when the board still feels calm with thirty pinned
courses, not five.

## Stage 2 — getting ready for other people

**The real question this stage answers: what does a course need before
it can honestly leave one person's own Pavilion?** Not built, not fully
designed yet either — real open questions to answer before code, the
same discipline `TOOL-COMMONS-PLAN.md` already holds itself to:

- **A license/attribution discipline, same shape as the Library's own.**
  Every shelved text already answers three questions at the door: what
  is it, where's it from, what license does it travel under. A
  shareable course needs the exact same three answers — who actually
  wrote it, and under what terms someone else may use, adapt, or teach
  from it. Not optional, not assumed, the same rule the Library has
  never once bent.
- **A real, human review step before anything's actually shared** — the
  Steward Review Queue is the direct precedent: nothing reaches a
  shared shelf unreviewed, and a shared course shouldn't either. Worth
  deciding whether this reuses that exact queue or needs its own,
  structurally identical one.
- **A real course format worth importing, not just exporting.** The
  other half of #18's original ask — "support importing course plans
  from elsewhere" — only makes sense once Stage 2's own format exists;
  a real file shape (closer to the Library's own `{title, license,
  source, sections}` shape than a proprietary blob) that this Pavilion
  could both export to and read back in, so a course made here is
  actually portable, not trapped.
- **Where this actually lives.** `TOOL-COMMONS-PLAN.md`'s bare-bones-
  foundation-vs-personal-addition split matters here directly: is course
  sharing part of the foundation every Pavilion gets, or this Pavilion's
  own addition? A real call, not assumed either way.

**Explicitly not this stage's job:** building a hosted, multi-user
sharing backend. This stage is the *standards* — what a shareable course
actually looks like and what it's honestly allowed to claim — not the
infrastructure to serve it to strangers. That's Stage 3's problem, and
only worth solving once Stage 2's shape has actually been tested by real
sharing between a small number of real people, not designed in the
abstract for an audience that doesn't exist yet.

## Stage 3 — a full course site, a real college replacement

**The actual long-term vision, already half-stated in README's own
"Hopes and dreams":** *"a free place to pursue higher education
together... anyone able to walk in, read anything on the shelves, study
alongside residents actually grounded in the material, and leave having
actually learned something, for free, for as long as they want to
stay."* Stage 3 is that hope, pointed specifically at courses instead of
just the Library's own texts — a real replacement for the *learning*
parts of college, deliberately not the parts that are actually about
paying for a credential a stranger will recognize.

**What this genuinely implies, named honestly rather than hand-waved:**
- **Real cohorts or co-study, not just solo paths** — the already-
  sketched **Round Table** Workshop room is the natural physical home
  for this; a course becomes something walked *with* other people, not
  just pinned alone. The Five Animals practice track is the already-
  named first real occupant of exactly this idea.
- **No certificates that pretend to be official ones.** The Course
  Board's own founding line — "the board confers nothing, the walking
  is the credential" — has to survive scaling, not get quietly dropped
  once there's an audience. Whatever "finished" looks like at this
  scale, it should still be honest about what it actually is and isn't.
- **Federation, not one central site.** README's own "a Pavilion, not
  *the* Pavilion" hope applies directly here — a real course site in
  the singular, one company's platform by another name, is exactly the
  thing this project has already said it doesn't want to become. The
  actual shape: many Pavilions, each able to host and teach their own
  courses, optionally reachable from each other — not one server
  everyone's account lives on.
- **Real instructors, not just AI residents.** A course taught by an
  actual person (human or AI, grounded and accountable the way the
  Monk and Quill already are, never a black box) is a different, bigger
  thing than a self-paced path — worth naming as its own real design
  question, not assumed to fall out of Stage 2's standards for free.

**Not scoped or scheduled** — the same "attic, not load-bearing" framing
README already gives its own furthest-out hopes. Worth keeping written
down so it isn't lost, not a promise about when.

## What ties this to the rest of what's already written down

`TOOL-COMMONS-PLAN.md`'s bare-bones-foundation-vs-personal-addition
split is the same real question Stage 2 has to answer for courses
specifically. The Library's own license-first discipline is the direct
model for Stage 2's own standards — nothing here invents a new ethic,
it applies the one this project has already held itself to since the
first shelf went up. Stage 3 isn't a new hope — it's README's own
"Hopes and dreams" section, given a real, staged path to actually get
there instead of staying a paragraph.
