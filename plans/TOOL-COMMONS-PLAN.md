# The Tool Commons — a long-term vision, written down, not started

Not started, and not meant to be yet — written down 2026-07-10 as the
actual long-term shape of where the Sand Pavilion is heading, past beta.
**Timing, decided directly the same day:** not a full build now — this
becomes the real framework once the Pavilion actually launches its
beta test for other people, not before. Everything below stays written
down and ready, not something to start pulling threads on today. Every
other plan in this folder is a scoped feature; this one is different on
purpose: it's the thing that gives the rest of them a reason to exist
together instead of being a pile of separate desks. Asked for directly,
kept close to how it was actually said, since it's a real vision, not a
vibe:

> I don't want to overwhelm a new user with a thousand little gadgets.
> We should really make our own app store for local programs people can
> run or make themselves — a mini practical GitHub for small apps... if
> people are not building their own tools, or at the very least don't
> have the knowledge pathways to build some cool features they can use
> in daily life — like if my friend is a full-time teacher but wants to
> get back into making some side money from real estate, he can set up
> his own CRM and have the foundation needed to save himself time and
> energy. This should be the missing link — customizability. I don't
> want to build these features for him, but have the Sand Pavilion be a
> place where he can find the knowledge and tools needed for himself.

## The split this actually depends on: bare-bones foundation vs. Zac's own additions

Raised directly while writing this plan, and it changes how to read
everything below it: **the Sand Pavilion should split cleanly into two
layers, not stay one undifferentiated pile.**

1. **The bare-bones foundation** — the engine and the core mechanics
   anyone forking this project actually gets: the `scenes.js`/
   `entities.js`/`render.js`/`main.js` pattern, save/export/import, the
   AI-provider seam, the desktop app shell, the Caravan *pattern* (how
   to write a connector), the Tool Commons mechanism itself once it
   exists. Neutral, not tied to any one person's specific content.
2. **Zac's own customizations and additions** — everything actually
   personal to *this* Pavilion: the specific 44 curated Library texts,
   the Buddhist/Hindu framing of the Keep (the Buddha and Ganesha
   shrines, the Monk's own tradition), the charter's exact wording, the
   NPC identities (Quill, Moss, Cobalt), the cultivation-sect aesthetic.
   Real, and worth keeping — just labeled honestly as *one* Pavilion's
   own shape, not the only correct one.

This is the concrete mechanism behind a hope the README's own "Hopes and
dreams" section already names but never operationalized: "a Pavilion,
not *the* Pavilion... anyone able to stand up their own instance." Right
now that's true in theory (MIT license, a clean git history) but not in
practice — there's no actual seam between "the engine" and "Zac's
Pavilion," so forking this today means forking *both*, tradition and
all. This split is what would let someone else's fork keep the
foundation and swap in their own tradition, their own charter, their own
curated shelf — the same way the Tool Commons above lets someone add
their own tool without it being mistaken for a canonical one.

**A real open question this raises, worth answering directly, not
assumed:** is the Eightfold Path Temple (`EIGHTFOLD-PATH-TEMPLE-PLAN.md`,
written this same session) bare-bones or a Zac addition? It's grounded in
a real, shelved, public-domain text (the Dhammapada) the same way
anything else here is — but it's still one specific tradition's
framework, the same category as the Monk's own teaching. Worth deciding
alongside that plan, not silently defaulted either way.

**Not a repo restructure today** — matches this project's own "long path
is the shortest path" discipline: the honest first step is labeling, not
a folder split or a second repo. A short doc noting which existing
pieces are foundation versus personal (this section is a start) costs
nothing and can be acted on later; physically separating them (a real
`core/` vs `zac/` split, or eventually a genuine two-repo/theme
architecture) is a later, bigger decision once there's an actual second
Pavilion wanting to fork just the foundation — not before.

**That labeling has now actually started** —
[`FOUNDATION-AND-EXTRAS.md`](FOUNDATION-AND-EXTRAS.md) is the working
inventory this section called for: every feature that exists today sorted
into foundation / opt-in extra / later, anchored on the fixed mission
(set intentions in the Temple's Eightfold Path; act on them via the
Library and the working rooms) and the two things that stay in every
tier of every Pavilion — the Temple and the Library. It's a first pass
meant to be walked through and revised, not a final call.

## The test every design decision here should pass

**The teacher's CRM.** Not a hypothetical — the actual bar. Nobody
building the Sand Pavilion is ever going to sit down and build a
real-estate CRM as a Workshop room; that's not this project's job, and
trying would mean building forever and still missing the next person's
actual need. The Pavilion's job is narrower and more honest: be the
place that already has the *foundation* — local storage, a local AI that
can help, a working example of a small tool built the right way, and
real instructions — so that a motivated, non-expert person can build
*their own* thing on top of it, for their own real need, without anyone
here having to have anticipated it.

## Why this is the missing link, not just another feature

Everything already in the Pavilion is either a fixed built-in room
(Writing Desk, Research Desk, Grant Desk) or a fixed idea for one
(the Ledger, the Maker's Bench). Both are still the Pavilion deciding
what tools exist. The actual gap this plan names: **there's no path from
"I have a real need this doesn't cover" to "I built the thing myself,
using what's already here."** Customization (a color, a robe) makes each
Pavilion feel different. This is the deeper version of that same idea —
each Pavilion actually *does* different things, because the person
running it built what they needed.

## What already exists that this is really an extension of

Not starting from zero — three things already in this codebase are
early, unnamed versions of exactly this idea:

- **The Caravan (`tools/caravan/`)** — eight small, real, hand-picked
  local programs, each doing one honest job (`gutenberg.py`,
  `openalex.py`, `pdf-to-text.py`...), living in the open, in this repo,
  runnable by anyone who clones it. This is already "a small local
  program someone made and other people can run" — it just isn't framed
  as a commons of tools, and nobody but this project's own sessions has
  ever added one.
- **`LEARNING-PATH.md`** — the self-paced curriculum already teaching
  terminal/APIs/Docker/databases *around this exact project*, already
  including "how to actually go find and add real books yourself." The
  natural spine for teaching "how to actually go build your own tool"
  too — same shape, new capstone.
- **The Library's own trust discipline** — every shelved text answers
  three questions at the door: what is it, where's it from, what license
  does it travel under. A tool commons needs the exact same discipline,
  aimed at code instead of text: what does it do, who made it, what can
  you do with it. Nothing here needs a new ethic invented — the existing
  one just needs to point at a second kind of thing.

## The actual shape, sketched

**A local, file-based registry of small tools — not a hosted app store.**
Matches the "no paid cloud API, build it ourselves" rule already
governing everything else here. Concretely, something like a
`tools/commons/` folder (or its own lightweight repo, the way
`tools/caravan/` already is): each tool is a small, self-contained thing
— a script, or a real Workshop-style panel following the existing
`overlays.js` pattern — with the same three answers the Library already
requires: what it does, who built it, what it's licensed under. "Browse"
is just looking at that folder with a real in-game panel over it, the
same way the Index panel already browses the Library; "install" is
copying it in or wiring it into your own save; "publish" is the same
git-based sharing this whole project already trusts (the way this
repo itself is the actual proof a Pavilion can be cloned and stood up
fresh, per `DESKTOP-APP-PLAN.md`).

**The building half is the teaching path, not a builder UI.** Given
what's realistic soon versus genuinely far out, the honest first version
is *not* an in-game visual tool-builder (a real low-code engine — UI
schema, storage, AI wiring, all new — is its own, much bigger, later
project, if ever). The first real version is `LEARNING-PATH.md` gaining
a real capstone stage: teach someone to actually add one small tool to
their own Pavilion, using the exact pattern the Caravan and the Workshop
desks already prove works, ending with them having actually built and
run something real for their own life — the teacher's CRM, or whatever
their own version of it is.

**Local AI as the actual assist, once the pattern's learned.** The same
local model already answering questions in the Library can plausibly
help someone adapt a tool template to their specific need — "help me
turn this note-tracking panel into a client tracker" — once the
foundation and the pattern both already exist. Not a code-generation
platform on day one; a real, scoped later phase once the teaching path
and the registry both exist to generate *into*.

## What's realistic soon versus genuinely long-term

**Soon, if picked up (still a real chunk of work, not a "fix"):**
- A `tools/commons/` folder convention + a short `README.md` inside it
  laying out the same what/who/license discipline the Library uses,
  seeded with the Caravan scripts reframed as its first real entries.
- A `LEARNING-PATH.md` capstone stage: build one small tool of your own,
  end to end, using the existing `overlays.js` panel pattern.
- A simple in-game "Browse the Tool Commons" panel — read-only at
  first, same shape as the Index panel, just pointed at this new folder
  instead of the Library.

**Genuinely long-term, named so it isn't lost, not promised:**
- Actual publish-from-inside-the-game (today: publish means a real git
  commit/PR, same as everything else in this repo — matches the
  project's existing "build it ourselves" discipline, not a gap to
  rush).
- Local-AI-assisted tool generation from a plain description.
- A real in-game no-code builder, if the teaching-path version ever
  turns out not to be enough for people who want to go further than
  reading and editing code by hand.
- Tying this to **The Commons** (the existing Supabase-backed shared
  layer, currently dormant by choice) once it comes back off pause —
  the natural place a tool commons would eventually federate across
  more than one person's own Pavilion, the same way the café's boards
  already do for text.

## What this explicitly is not

Not a promise to build a CRM, or any other specific vertical tool — the
whole point is the Pavilion stops being the one building those. Not the
in-game no-code builder considered and set aside earlier this session —
that's still a real, later idea, just not the first real version. Not a
replacement for the Workshop rooms (`README`'s "What's next" #8) or the
Eightfold Path Temple (`EIGHTFOLD-PATH-TEMPLE-PLAN.md`) — those keep
building on their own tracks; this is the layer underneath all of them
that eventually lets someone add a room of their own that was never on
anyone's list.
