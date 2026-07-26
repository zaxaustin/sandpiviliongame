# The Pavilion's Lessons

This is where the Sand Pavilion's own **lessons** live — real, followable,
teachable curriculum content, written for someone starting from nothing. It's
the foundation the school is built on: the in-game **Course Board** and the
**Pavilion Academy** tutor draw on these; the long-term shape (101 courses →
a prerequisite tree of higher courses, required reading tied to real books) is
planned in [`../plans/COURSE-PROGRESSION-PLAN.md`](../plans/COURSE-PROGRESSION-PLAN.md).

The rule for a lesson here matches the rule for everything in the Pavilion: **it
has to actually work for a real newcomer, and be honest about every wall.** No
step assumed, nothing hand-waved, and where a real limit exists (a browser can't
do X), it's said plainly.

## The lessons so far

| # | Lesson | What you'll be able to do |
| --- | --- | --- |
| 01 | [A Beating Heart — get your local AI running](01-a-beating-heart.md) | Install Ollama, check what *your* machine can run, pull the right model, and connect it so the residents actually talk back |
| 02 | [Room for a Library — local storage with Docker](02-room-for-a-library.md) | (Optional, advanced) Set up Docker + MinIO to hold the full text of a big, growing library on your own machine — how much space, and how to grow it |

More to come — the next foundations are the Library (finding and shelving real
books yourself) and the first real study course. The aim, stated plainly by the
steward: a free school on your own desktop good enough to make the paywalled ones
look like a joke, with a library to match.

## How a lesson is written

- **Start from zero.** Assume no terminal, no "API," no prior setup.
- **One clear path**, with the honest forks named (desktop app vs. browser, etc.).
- **A real check at the end** — "you did it looks like *this*" — so a learner
  knows they actually succeeded, not just that they read the words.
- **Point outward** to the deeper reference (`../PROTOCOLS.md`, `../README.md`,
  `../LEARNING-PATH.md`) rather than duplicating it, so lessons stay a *path*
  and the reference stays the *map*.
