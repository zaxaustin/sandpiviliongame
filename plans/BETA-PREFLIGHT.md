# Beta pre-flight — what to actually test before asking anyone for feedback

Written **2026-07-27**, from the direct question: *"Where are we overall for
beta, and what should we really test before we start asking for feedback?"*

This is a checklist for **the week before you hand the app to a person**, ordered
by what costs most if it's wrong. It is deliberately not "test everything" — most
of this app is verified by `npm test` and 90 live browser checks. What follows is
the part machines can't tell you.

---

## Where we actually are

**The code is a long way ahead of the artifact.**

| | |
|---|---|
| Only installer that exists | `release/Sand Pavilion Setup 0.1.0-beta.1.exe`, **11 July** |
| `package.json` says | `0.1.0-beta.2` |
| Built since that installer | the visual revamp · second Library floor · unified Notes · bulk import · MinIO storage · Learning Tree · Academy Tutor · Paths · Science Hall keepable analyses · **the Inheritance Hall** · **the Commons Table** · **Your Library** · **the Steward's Index** · **copyright triage** · **standing instructions** · **the prompt inspector** · **user-authored lessons** |

So there is nothing on disk to give anyone that resembles the current project.
**Cutting the installer isn't a step in the plan — it's the precondition for the
plan.** Everything below assumes a freshly built `0.1.0-beta.2`.

**What's already proven, and doesn't need re-proving by hand:** scene/warp/station
config, the data-map coverage guard, the inline-handler guard, copyright rules,
seed-library shape (`npm test`); and 90 live browser checks across the Hall, the
Commons Table, Your Library, the Steward's Index, standing instructions, the
inspector and lesson authoring.

**The honest hole in that coverage:** every one of those live checks ran in a
**browser** via `vite preview`. The thing you actually ship is **Electron**. The
desktop bridge — save dialogs, library file writes, MinIO, the Ollama proxy,
streaming — is the shipping path and is the least-tested path.

---

## Tier 0 · Data safety — the only failures you cannot apologise for

A tester who loses a week of notes does not come back, and tells other people.

- [ ] **An old save survives the new build.** *The most important test on this
  page.* **Six new stores landed on 2026-07-27 alone** (`grove`, `commons`,
  `myShelves`, `myLessons`, `standing`, `catalogEdits`). Take a real save from
  before today — ideally one from the beta.1 era — load it in the new build, and
  confirm: nothing lost, every panel opens, no console errors, and the new
  stores initialise empty rather than throwing. Migration is field-safe *by
  construction*; that is not the same as *tested*.
- [ ] **Export → wipe → import.** Full round trip on the desktop app, including
  a personal book's text. Confirm the book still reads afterwards.
- [ ] **The save under load.** Bulk-import ~20 books in a **browser** (where text
  can go inline) and watch for the quota warning. Confirm it warns rather than
  silently failing — the warning path exists; has it ever actually fired?
- [ ] **Two installs don't collide.** The beta installer and a Mode-4 install are
  the same app to Windows. Confirm the caution in `MAINTAINING.md` is still true
  and still accurate.

## Tier 1 · The artifact — the thing you hand over

- [ ] **Cut `0.1.0-beta.2`** — `npm run electron:build:beta`.
- [ ] **Install it on hardware that never built it.** Open since 2026-07-08 and
  still the single genuinely unverified thing in the project. A VM counts.
- [ ] **First run with nothing installed**: no Ollama, no Docker, no internet.
  Open *every* room and *every* panel. The promise is "nothing breaks by
  clicking around" — this is the only test of it that counts.
- [ ] **The desktop-only paths**, none of which a browser could exercise:
  save dialog · `libraryWrite`/`libraryRead` · `minioWrite` with Docker up *and*
  down · the Ollama proxy · live streaming.
- [ ] **Confirm the bundle is still key-free** (grep is in the build routine, but
  look once with your own eyes before shipping).

## Tier 2 · The first hour — where a stranger actually gives up

- [ ] **A cold walkthrough by someone who is not you.** Sit them down, hand them
  the installer, say nothing, and *write down where they hesitate*. Do not help.
  The hesitations are the findings.
- [ ] **Time the AI on-ramp.** Install Ollama → pull `llama3.2` → first reply from
  Quill. This is the biggest cliff in the product. If it takes over 20 minutes or
  needs you to intervene, that is a beta-blocking finding, not a documentation
  gap.
- [ ] **Drag in a messy real pile.** Since intake for beta is drag-and-drop only,
  test it the way it will actually be used: 15–20 files at once, mixed `.txt` and
  `.epub`, some with odd names, at least one that should fail. Confirm one bad
  file never stops the rest.
- [ ] **Then sort that pile** in Your Library — custom shelves, bulk move. This is
  the first thing a person with a real library will do.

## Tier 3 · The new surfaces — built this week, never touched by a human

- [ ] **A bequest between two real installs** (not two browser tabs). Plant →
  write the file → carry it to the other machine → plant it → take it.
- [ ] **A packet between two real installs.** Same shape, via the Commons Table.
- [ ] **Standing instructions with a real model.** The text provably reaches the
  prompt (tested); **whether a small local model actually honours it is unknown.**
  Try "answer in Spanish" and "keep it to three sentences" on `llama3.2` and see.
  If small models ignore it, that's worth knowing before it's advertised.
- [ ] **The copyright check against your own shelves.** Run it on ~10 real books
  you know the status of. Wrong-but-confident verdicts are the failure that
  matters; safe-but-vague ones are fine.
- [ ] **Write a lesson with a prerequisite, then walk it.** Confirm the lock
  releases when the first is finished.

## Tier 4 · The thing no checklist can replace

- [ ] **Use it yourself for one uninterrupted week without changing any code.**

  This is the real test, and it is the one this project has never run. The
  pattern so far has been build → build → build. A week of pure use is the only
  way to find out whether the daily loop holds — whether there's a reason to open
  it on a Tuesday morning when nothing new has been added. Every rough edge you
  hit goes in `BETA-TESTING-FEEDBACK.md` and **nothing gets fixed until the week
  is over**, or it stops being a test and becomes another build session.

---

## What NOT to test

Saying this so the list stays finishable:

- **Anything `npm test` covers.** Re-checking config by hand is wasted time.
- **The Supabase/Commons layer.** It ships disabled and the beta is local-only.
- **Cross-browser.** The artifact is a Windows desktop app.
- **Polish.** Spacing, sprite variety, more serif surfaces — real, and they can
  all wait for feedback rather than precede it.
- **The five unfinished Workshop rooms.** They say they're unfinished. That's an
  honest state, not a bug.

---

## The decision that's still open, and blocks the packet

**Only 6 of 24 seed texts read in full.** The rest are summary-only, and the
first shelf a stranger opens is the first impression the whole project makes.
Three honest options: bundle more full texts as assets, ship a MinIO starter
package for Layer-2 users, or **ship lean and label the summaries plainly**.
Any of the three is fine. Leaving it undecided is not, because it's the one
thing a tester meets in the first two minutes.

---

**One line to hold onto:** the code is in good shape and is not the risk. The
risks are an artifact 16 days stale, a desktop path verified almost entirely in
a browser, six brand-new save stores that have never met an old save, and the
fact that nobody outside this machine has ever opened the thing.

---

## Update, 2026-07-28 — two of these are now automated

Three of the risks below are no longer unknown, because they can be checked by
machine after all:

**Old saves are safe.** A save written in the 11 July beta.1 shape — no
`grove`, `commons`, `myShelves`, `myLessons`, `standing` or
`catalogEdits` — loads clean against today's 43 stores, keeps every note,
book and lesson-progress entry, and round-trips valid after every panel has been
opened on it.

**Nothing is blank without AI or cloud.** All **33** panels a visitor can reach
open on that old save with no Ollama running and a beta bundle: no thrown error,
no empty panel, no page error.

**The beta bundle really is local-only.** Zero external requests on startup.
This one now has teeth beyond a test: `scripts/verify-beta-build.mjs` runs
inside `build:beta` / `electron:build:beta` and **fails the build** if a
Supabase host, a JWT-shaped string, a Supabase key or MinIO credentials survive
into the bundle. A plain `electron:build` would have shipped this machine's
own key; now it cannot silently do so (`BETA-TESTING-FEEDBACK.md` #16).

Run it yourself:  (37 checks — see the header for the
three commands).

**What remains genuinely un-automatable, and still yours to do:** the desktop
app run in Electron rather than a browser tab, ten unbroken minutes listening to
a real book, the copyright triage over your actual 128 books, and the
clean-machine install. Those are the ones a person has to feel.
