# After the beta — the testing to do now, and the work waiting behind it

**Written 2026-08-13, the day `0.1.0-beta.6` was cut**, at the steward's
instruction: *"let's make sure that we are prepared to handle the work that we
need to do after this beta as well as the testing we need to do now."*

Its job is to be the file that stops the week after a release being improvised.
It is deliberately split into **what a person does**, **what the machine can
never answer**, and **what is already known to be missing** — because those
three have completely different owners and the first one blocks the others.

The honest state of the build itself is [`docs/BETA-READINESS.md`](../docs/BETA-READINESS.md).
How to hand the file to someone is [`plans/SHIPPING-THE-BETA.md`](SHIPPING-THE-BETA.md).
This is what happens next.

---

## Part 1 · The testing to do NOW, in order

Nothing here needs code. Everything here needs a person, which is exactly why
it kept being deferred.

### 1 · The steward's taste pass (an hour, alone, on the installed app)

Install `Sand Pavilion Setup 0.1.0-beta.6.exe` on this machine and use it as a
visitor rather than as its author. **Three questions only taste settles**, and
every one of them passed its test suite while remaining genuinely open:

| question | why no test can answer it |
|---|---|
| Does **34 cps** feel like the Monk *speaking*, or like a slow computer? | `speaking-pace.mjs` proves the rate is constant. Constant is not the same as right |
| Does the **⏸ hold** sit where a hand reaches for it? | The guard proves it holds. It cannot see the button |
| Reading normally, can you tell **your note from the model's**? | The guard proves the label exists and that a model is never handed its own words as yours. Whether a human notices while reading is a different claim |

Write what you find into `plans/BETA-TESTING-FEEDBACK.md`, the same as any
tester. **Your own findings are findings.**

### 2 · A person who is not the steward walks Stage 1 cold

**The gate.** Not substitutable by anything.

Give them the installer and the message from `SHIPPING-THE-BETA.md`, then **say
nothing else and watch.** The temptation to help is the thing that ruins this
test — every sentence of guidance you give is a sentence the app failed to
give.

What to watch for, in order of how much it would matter:

1. **Do they press 🧭 New here? Start here, or Enter the Grounds?** If they walk
   past the walk, the title screen is wrong and nothing downstream matters.
2. **Do they get a book in?** Stage 1 asks for a `.txt` or `.epub` they choose.
   If they have no file to hand and stall there, **that is the welcome packet
   becoming necessary** rather than optional — and it is the single most
   valuable thing this test can tell us.
3. **How long does it take?** It is supposed to be about ten minutes.
4. **Where do they stop?** Wherever that is, is the next piece of work.

### 3 · A clean-machine install

A computer that never built this project — different Windows, no Node, no
Visual C++ runtimes, possibly a different GPU. Named as the last unverified
thing since `BETA-PREFLIGHT.md` and still true.

### 4 · The Mac path, end to end

> **⚠ The first tag push failed CI, and not for the reason the error said.**
> `npm test` scrapes source text to find the residents, a CRLF checkout made
> the pattern match nothing, and "nothing found" was reported as *seven
> residents missing from `CHAT_AGENTS`* — a table that was complete. Fixed
> 2026-08-13 (`.gitattributes` + a normalising reader in `smoke.mjs`), proved
> against a `core.autocrlf=true` clone.
>
> **The tag was deliberately left where it is** — nothing shipped has changed
> since it — so **re-run the build from the Actions tab** (*Build installers →
> Run workflow*, on `main`), not by moving the tag. Moving a published tag is
> the "same tag, two binaries" fault `verify-release-docs.mjs` exists because of.

Pushing the tag builds `arm64` and `x64` `.dmg`s on GitHub's Macs. **Nothing on
this Windows machine can test either of them**, so the CI log is all the
evidence there is until a Mac opens one.

- **Ask which Mac** before sending — an `arm64` build will not open on an Intel
  Mac, and the failure is confusing rather than obvious.
- **Warn about Gatekeeper first.** An unsigned app on modern macOS says *"Sand
  Pavilion is damaged and can't be opened"*, which is a lie macOS tells about
  every unsigned app and frightens people far more than SmartScreen does.
  Right-click → Open → Open.
- **Check the database survived the pack.** PGlite's WASM is `asarUnpack`ed and
  that has only ever been verified on Windows. If it did not, the app still
  runs and search does not — which is exactly the quiet failure rule 5 is about.

### 5 · The hosted-model path, on a machine that cannot run local

New on 2026-08-13 and **never exercised by a person who needed it**. On the
friend's laptop: *Check this computer* → the ☁ card → `ollama signin` →
`ollama pull gpt-oss:20b-cloud` → **Detect** → choose it from the list.

Two specific things to confirm, because both are guesses until someone tries:

- **Does the free tier actually answer?** Measured at 0.64s on this machine on
  2026-08-03, on this account. A brand-new free account is not the same thing.
- **Does the header say `☁ leaves this device`** on his machine, in the room
  where he is talking? That labelling is the whole basis on which the Monk was
  allowed to be cloud at all.

---

## Part 2 · What is known to be missing, and what each one costs

Ordered by *what a tester is most likely to hit*, not by what is most
interesting to build.

### The near list

1. **The welcome packet** — the steward's own to write, and Part 1 §2 decides
   whether it is urgent or optional. Stage 1 beat one is the seam: **one
   function body**, nothing else changes when it lands.
   `plans/THE-WELCOME-PACKET.md`, `docs/BOOKS-TO-SOURCE.md`.
2. **No way to update the game from inside the game.** Named by the steward the
   same day and correctly parked. Worth recording that **most of it already
   exists**: `electron-builder` emits `latest.yml` beside every installer, which
   *is* the update feed. What is missing is a **public** place to serve it from
   and `electron-updater` wired into `main.cjs`. It is not a research problem;
   it is a decision about repo visibility (see `SHIPPING-THE-BETA.md`) plus an
   afternoon. **Until then, an update means sending a new link** — say so when
   you send this one.
3. **Course authoring steps 2–4** — the 7-step protocol, the `.course.md` drop
   path, and merging the Course Board's step shape with the Tree's. Step 1
   landed and is guarded end to end. `plans/COURSE-AUTHORING-AND-IMPORT.md`.
4. **The eleven open tester items** of 72 in `plans/BETA-TESTING-FEEDBACK.md`
   (51 fixed, 10 partial, 1 open, 10 noted-never-built). The partial-and-open
   set is what a new tester could plausibly hit again.

### The structural list

5. **`overlays.js` is 13,694 lines — half of all game source**, and its own
   plan says *"the split is losing the race."* Deliberately off the critical
   path for this beta. `plans/OVERLAYS-SPLIT-PLAN.md` names the next region
   (`ui/computer.js`, ~430 lines, `termRun` alone is 380) and the rule that
   replaced the one that failed: **one region per session that touches
   `overlays.js` at all.**
6. **Missions, ranks, the Outer→Inner door** — unbuilt drafts. Stage 5 says so
   plainly rather than implying a door, and that is the correct state until
   somebody decides they are worth building.
7. **The two Café boards** — dormant, waiting on a Commons server that does not
   exist. `plans/COMMONS-BACKEND-PLAN.md`.
8. **The profile / sign-in.** `currentUser()` returns `user 1` and is the single
   seam a real name arrives through. Every note authored since 2026-08-09
   carries it, so this is a rename rather than a migration.

### The machine

9. **The Arc A770.** Parked at the steward's request and worth un-parking when
   there is appetite: flash attention plus a `q8_0` KV cache is the untried fix
   for the 12B spill. The measured facts are in
   `archive/dev-log-2026-08-13.txt`. **Not a beta blocker** — the beta's stated
   ceiling is 9B, one at a time, and everything ships within it.

---

## Part 3 · The rule this release taught, so the next one keeps it

> **Never let a release gate depend on something only a person can do while the
> thing they would do it to does not exist.**

For three days both `MAINTAINING.md` and `docs/BETA-READINESS.md` listed *"a
human who is not the steward walks Stage 1 cold"* as gate one, with the build at
step four — underneath the human steps that depended on it. Every sentence was
true and the ordering made the whole thing unattemptable.

**So: the artifact is step one, always.** The human step is then the only step,
which is what Part 1 of this document is.
