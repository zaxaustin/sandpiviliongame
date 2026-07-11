# The Phone — from a minimize button to a real in-world device

## What exists now (built 2026-07-10) — a display function, nothing more

Talking to a resident opens a full-screen conversation. A local model can
take 30–180 seconds to answer, and standing at a "…" is dead time. So the
chat now has a **📱 pocket button**: it closes the full view, drops a small
floating card in the corner (the resident's face + a status line), and
frees you to walk the grounds or read a book while the reply cooks. When
the answer lands the card buzzes ("✓ replied · tap to read"); tap it and
you're back in the exact same conversation, transcript and notes intact.

That is *all* it is today: a **minimize-to-a-card display trick** that
happens to look like pocketing a phone. There is no device, no home
screen, no apps — `state.dialog` simply stays alive while its overlay is
hidden. It's in `overlays.js` (`minimizeChat` / `restoreChat` /
`renderChatPhone`), `#chatPhone` in `index.html`, and the `#chatPhone`
styles in `style.css`. Deliberately small, on purpose — see the standing
"the long path is the shortest path" decision in CLAUDE.md before growing
it past what's actually needed.

## The real phone, later — an actual in-world device

The pocket card is the seed of a real thing: a **phone you carry in the
Pavilion**, opened from anywhere (a hotkey or a HUD button), whose "home
screen" is just already-built Pavilion features surfaced as small, calm,
glanceable widgets. Not new features wearing a phone costume — the phone as
*one place* the things you already have come together, the way the Records
Hall gathered the timeline and the Study gathered planning.

Candidate "apps," every one of them already real elsewhere in the game:

- **Messages** — the pocketed conversations, now plural: more than one
  resident in flight at once, a real inbox instead of a single card.
- **Upcoming** — the due-soon badge (`dueSoon`, already in the HUD) as a
  full glance: what's due, what's overdue, tap to jump to it.
- **Still Open** — the spark list (`openStillOpen`) as a phone screen: the
  intentions you set that haven't been acted on yet.
- **Waypoints** — the external-links feature that currently lives orphaned
  in the pause menu with no home in the world. This is the obvious first
  real occupant, and it's the same feature the **Mailroom** placeholder on
  Workshop floor 3 is reserved for — the phone and the Mailroom should be
  designed together, not twice.
- **Notepad** — quick idea capture (`openIdeaCapture`), already built,
  reachable without walking to a desk.

## The rule the real phone must not break

**No background polling.** The pocket card only updates because a reply the
*user* asked for finished — never a timer. A real phone must keep that: no
app that wakes a model, fetches, or checks anything on a clock. A glance is
a glance because *you* opened it. This is the same no-background-AI line
drawn in `AI-INTEGRATION-NOTES.md` and `AGENT-EMBODIMENT-PLAN.md`, applied
to the device. A phone that buzzes on its own is a notification machine;
this one only ever reflects state that already changed because you acted.

## Why this waits

It's genuinely useful but it isn't urgent, and effectiveness-first says the
reply pipeline's reliability comes before new surfaces for it. The pocket
card already solves the real problem the user named ("don't make me stand
around with nothing to do"). The device is the nice version of a need
that's already met — so it's written down here and left for when the core
is boringly dependable, not built ahead of it.
