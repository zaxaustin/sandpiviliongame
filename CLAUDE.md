# Working on the Sand Pavilion

This file orients a fresh session, not a returning one — read it once,
then get oriented for real from the sources below rather than trusting
this summary alone.

## Before anything else (optional, recommended)

Before diving into code, consider reading
[`library-drafts/done/ganesha-and-the-campaign.md`](library-drafts/done/ganesha-and-the-campaign.md)
— the steward's own telling of why Ganesha is invoked before any real
undertaking, kept beside his statue in the Keep as a practice, not just
a myth. Sitting with it for a minute before touching code is never
required, but it's the right mindset for this particular project: it
asks to be built with care, not rushed. Optional every time. Recommended
every time.

## Get oriented, in order

1. **`README.md`** — the actual current-state reference: what's built,
   what works, what's next. Read this first, every time. It stays a
   snapshot of *now*, not a changelog — trust it over your own guesses
   about what exists.
2. **The most recent `archive/dev-log-*.txt`** — the narrative version
   of how the project actually got here, session by session. Worth
   skimming the last one or two for real context a static README can't
   carry (what was tried, what broke, what got learned the hard way).
3. **`plans/*.md`** — every open, real, staged plan for what's next.
   Check here before assuming something needs designing from scratch;
   it may already have a real plan written, sometimes already half
   built. `plans/BETA-TESTING-FEEDBACK.md` is the running log of actual
   issues found by actually using the Pavilion — check it before
   assuming a rough edge is undiscovered.
4. **`LEARNING-PATH.md`** — if the user asks a "why" or "how does this
   work" question, this self-paced curriculum (built around this exact
   project) is where that kind of explanation belongs, calibrated to
   where they've already gotten to.

When you finish a real session of work, add to that day's
`archive/dev-log-YYYY-MM-DD.txt` (create it if the day doesn't have one
yet) and update `README.md`'s "What's next" section to match reality —
future sessions (yours or anyone else's) depend on both staying honest,
not aspirational.

## Two standing decisions, stated plainly so they don't have to be re-derived

**The desktop app is the main focus going forward.** This project runs
mainly as a real Electron app on the user's own machine now, not a
browser tab — see `plans/DESKTOP-APP-PLAN.md`. When a fix or a feature
has a browser-only version and a real desktop-native version (a save
dialog, spell-check, filesystem access), build for the desktop app
first and treat the web build (`sandpiviliongame.vercel.app`) as the
thing that shouldn't regress, not the thing being optimized for.

**Build it ourselves before reaching for a third party.** When
something new is genuinely needed, the default is to build it in this
codebase, in the open, rather than bolt on an external service or a
paid API — the same instinct already behind "no paid cloud API" for
text-to-speech, the hand-picked Caravan connectors instead of a general
scraper, and local-first AI as the whole point of the project, not a
fallback. This is slower up front and that's the actual point: **the
long path is the shortest path** — do it upright and properly the first
time, rather than fast now and rebuilt later. Reach for a third party
only when the alternative is genuinely not buildable in reasonable time
(a browser truly cannot do X), and say so plainly when that's the case,
the same honesty already applied to the Gutenberg/arXiv fetch wall.
