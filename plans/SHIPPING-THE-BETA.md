# Handing the Pavilion to someone else

Written **2026-07-28**, from the direct question: *"How do I do a clean
install — do I do it through GitHub, or is there a file to email people?"*

Short answer: **there is one file, and you cannot email it.** It's 95 MB;
Gmail stops at 25 MB and Outlook at 20 MB. So it goes somewhere and they
follow a link.

---

## Where it stands (2026-08-13)

`verify:release` is **green**. The block that used to sit here said it was red
on purpose — the installer was `0.1.0-beta.5`, built 2026-08-07, thirty-six
source files behind — and that was true when it was written and stopped being
true the moment `beta.6` was cut. **A doc describing a state the code has left
is this project's oldest failure**, so it is gone rather than amended.

The honest state of everything else is `docs/BETA-READINESS.md`. The one thing
that has never happened, and that decides whether this is a beta or a demo:
**someone who is not the steward installing it and walking Stage 1 cold.** That
is now blocked on nothing but a person — which is the whole point of cutting
this build.

---

## The file

```
release/Sand Pavilion Setup 0.1.0-beta.7.1.exe        101 MB
SHA256  8150529360AE3BB5EE25D53441F2F6858C6D64248238B0FA697B4AFD322603C8
```

One file. It's a one-click NSIS installer: no options, installs per-user
(no admin password), and puts *Sand Pavilion* in the Start menu. Everything
it needs is inside — Electron, the game, and an embedded Postgres so search
and notes work with no container. **No Node, no npm, no Docker, no Ollama
required to open it.** The shelf, on the other hand, is **empty on purpose**;
see the note further down about what to say when you send it.

Rebuild it with `npm run electron:build:beta`. Never plain `electron:build`
— that one bakes this machine's own Supabase keys into the installer, and
`scripts/verify-beta-build.mjs` will stop you.

**If the build fails with `EPERM ... rename win-unpacked.tmp`** (seen
2026-07-28, reproducible): something inside the project folder is holding
`release/` — an editor watcher or an indexer. electron-builder writes ~200 MB
and then renames the directory, and the rename loses. It is not a code problem.
Build outside the project instead, then copy the `.exe` back:

```bash
npm run build:beta
./node_modules/.bin/electron-builder --config.directories.output="$TEMP/sp-build"
cp "$TEMP/sp-build/"*.exe release/
```

Or let CI do it — `.github/workflows/build-installers.yml` runs on clean
runners with nothing watching, and builds both platforms.

**Before handing over any new build**, run *both* artifact guards. They are not
the same check, and 2026-08-13 is when that stopped being a theory:

```
npm run build:beta
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs
env -u ELECTRON_RUN_AS_NODE node test/live/packaged-exe.mjs
```

`packaged-boot.cjs` reproduces the packaged **load path** — same preload, same
`loadFile(dist/index.html)` — using the repo's own electron against the repo's
own `dist/`. It is the check that caught a title screen with nothing behind it.

`packaged-exe.mjs` launches **the actual binary** out of `win-unpacked`, with a
throwaway `--user-data-dir` so it cannot touch your save, and drives it over
CDP. Between `dist/` and the `.exe` sit the asar pack, the `files` glob, the
`asarUnpack` for PGlite's WASM and the signing step — **none of which
`packaged-boot` exercises**. It asserts the app loads out of `app.asar`, that
the database opens and its schema applied *inside the pack*, and that the
`Build:` line a tester reads back to you is the version in `package.json`.

Exit code 0 on both means it boots, starts and opens panels. Non-zero on either
means do not send it to anybody.

⚠ **`ELECTRON_RUN_AS_NODE` must be unset for both.** With it set, the packaged
`.exe` runs as node, rejects `--user-data-dir` with `bad option`, and exits 9 —
which looks exactly like an app that crashes on boot. That cost a detour on the
day `packaged-exe.mjs` was written, so the suite now refuses to run rather than
report a fake failure.

---

## The thing to warn them about first

**The installer is not code-signed** (verified: `Status: NotSigned`). A code
signing certificate costs a few hundred dollars a year, and for a handful of
beta testers that isn't worth it yet.

So on every tester's machine, Windows will show a blue box:

> **Windows protected your PC**
> Microsoft Defender SmartScreen prevented an unrecognised app from starting.

The default button is **Don't run**. If you don't warn them, most people
stop right there and assume the app is malware. Tell them in the same
message as the link:

> Windows will warn you that it doesn't recognise the app — that's because
> I haven't paid for a signing certificate, not because anything's wrong.
> Click **More info**, then **Run anyway**.

Include the SHA-256 above if they're the kind of person who'd check it.
They can verify with:

```powershell
Get-FileHash "Sand Pavilion Setup 0.1.0-beta.7.1.exe" -Algorithm SHA256
```

---

## Where to put it — three real options

### 1. GitHub Releases — the right answer, with one thing to sort out first

A GitHub Release is made for exactly this: a permanent link, no expiry, a
version number, release notes beside it, and no size problem (2 GB limit).

**All commits are pushed and in sync (2026-07-28).** The repo is still
**private**, though, and a release asset on a private repo only downloads for
collaborators — so testers would need GitHub accounts and invitations. Three
ways out:

- **Make the repo public** — simplest, and it fits the project's whole
  disposition. Check first that nothing private is in the history:
  `.env.local` is gitignored and its key was never committed (verified
  2026-07-28), so this looks clean, but look before you leap.
- **Keep it private and add testers as collaborators** — fine for three or
  four people, annoying beyond that.
- **A second, public repo just for releases** — the code stays private, the
  installer is public. More moving parts.

Once that's decided:

```bash
gh auth login                      # you are not logged in yet
gh release create v0.1.0-beta.7.1 \
  "release/Sand Pavilion Setup 0.1.0-beta.7.1.exe" \
  --title "Sand Pavilion 0.1.0-beta.7.1" \
  --notes-file plans/BETA-RELEASE-NOTES.md \
  --prerelease
```

`--prerelease` matters: it marks it clearly as a beta rather than something
finished.

### 2. A shared-drive link — what to do *today*

Google Drive, Dropbox or OneDrive. Upload the `.exe`, set the link to
"anyone with the link", paste it in the message. Takes five minutes and
needs no decisions about repo visibility.

One quirk: **Google Drive will refuse to virus-scan a 95 MB file** and shows
"Google Drive can't scan this file for viruses — Download anyway?" That's
just the size limit, but it's a second scary box on top of SmartScreen, so
mention it too.

### 3. Email — no

95 MB against Gmail's 25 MB cap. Gmail will silently convert the attachment
to a Drive link anyway, which is option 2 with less control.

---

## What to say when you send it

Keep it short. Everything else is in the app.

> This is a beta — expect rough edges, and tell me about them.
>
> - Windows will warn you it doesn't recognise the app. **More info → Run
>   anyway.** It isn't signed, that's all.
> - It works with no setup at all. Nothing is uploaded anywhere, ever;
>   everything lives on your own machine.
> - The AI residents only wake up if you install **Ollama** (ollama.com) and
>   pull a model. Optional — the Library, the notes, the day planner and the
>   lessons all work without it.
> - **If your computer can't run a model** (older laptop, MacBook Air, 8GB),
>   Ollama can run one on its own machines: `ollama signin`, then
>   `ollama pull gpt-oss:20b-cloud`, then **Detect** in the app and choose it.
>   Press **Check this computer** in the AI panel and it walks you through it.
>   What you type to a resident then leaves your machine — your library and
>   notes still don't, and the app labels every conversation either way.
> - **The Library starts empty, on purpose** — it's yours to fill, and the
>   walk's first stage does it with you. Drag any `.txt` or `.epub` onto the
>   window. If you want somewhere to start, Standard Ebooks and Project
>   Gutenberg are both free and both plain text.
> - There's a **🧭 New here? Start here** button on the title screen. Five
>   stages, about ten minutes, and the first one ends with a book you chose and
>   a note you wrote in your own bag.
> - **On a Mac?** Use the website — sandpiviliongame.vercel.app — it's the same
>   thing in a browser, nothing to install. (A real Mac app is coming.)

---

## Mac friends — three answers, in order of what to do tonight

Added 2026-07-28: *"my friends use mac."* The `.exe` is Windows only. The
**code** is not — it's Electron, and it runs on macOS perfectly well. What
couldn't happen is building it here: **a macOS app cannot be built on Windows**,
because the `.dmg` tooling and signing are macOS-only.

### 1. Send them the website. Tonight, with no work at all.

**[sandpiviliongame.vercel.app](https://sandpiviliongame.vercel.app)** — same
code, same Library, same guides, in Safari or Chrome. Nothing to install,
nothing to approve, no Gatekeeper, no scary box. It saves to their own browser
storage on their own Mac.

This deploys automatically from `main`, so it is always current. **This is the
answer for a friend who wants to look at it today.**

What they give up in a browser: book text lives in browser storage rather than
as files they can open; there's no native save dialog; and reaching a local AI
needs `OLLAMA_ORIGINS` set, which the desktop app does not. None of that stops
them reading, taking notes, or planning a day.

### 2. A real Mac build, via GitHub's own Macs — DO THIS ONE

**2026-08-13: asked for directly** — *"let's make sure that there is a Mac
install as well, I wanna make sure my friend can try this on his laptop."* The
workflow already exists and already builds both architectures; nobody had ever
pushed a tag to fire it.

**What actually happens when you push the tag:**

1. `git push origin main --tags` starts *Build installers* on both a Windows
   runner and a real Mac.
2. The Mac job produces **two** files, because `package.json`'s `mac.target`
   asks for both arches:
   `Sand Pavilion 0.1.0-beta.7.1 arm64.dmg` (M1 and later) and
   `Sand Pavilion 0.1.0-beta.7.1 x64.dmg` (Intel). **Ask which Mac your friend
   has**, or send both — an arm64 build will not open on an Intel Mac.
3. Download them from the **Actions tab → the run → Artifacts**, then attach
   them to the Release beside the `.exe`.

**Two things to check before believing it:**

- **The run has to be green.** Nothing on this Windows machine can build or
  test a `.dmg`, so the CI log is the only evidence there is. If the Mac job
  fails, the `.dmg` does not exist and the release notes should not mention one.
- **Private-repo minutes.** macOS runners bill at 10× on private repos. One
  build is minutes, not hours, but it is not free the way the Windows one is.

`.github/workflows/build-installers.yml` builds **both** installers — Windows
`.exe` and macOS `.dmg` — on GitHub's runners, which include a real Mac, free
for public repos. Nobody has to own one.

```bash
git tag v0.1.0-beta.7.1 && git push --tags
```

Then the Actions tab, wait a few minutes, download both artifacts, and attach
them to the Release. It runs `npm test` and `electron:build:beta` on each
platform, so a Mac build gets the same local-only guarantee and the same
verifier.

**Be honest with Mac testers, because Gatekeeper is harsher than SmartScreen.**
An unsigned, un-notarised app on modern macOS does not say "unrecognised
developer" — it often says **"Sand Pavilion is damaged and can't be opened.
You should move it to the Trash."** That is a lie macOS tells about every
unsigned app, and it frightens people far more than the Windows box. The fix:

> Right-click (or Control-click) the app → **Open** → **Open** again in the
> dialog. Only needed the first time.
>
> If macOS still refuses, in Terminal:
> `xattr -dr com.apple.quarantine "/Applications/Sand Pavilion.app"`

Apple's fix is a $99/year Developer Program membership plus notarisation. Worth
it for a real release; not for a handful of friends.

### 3. If Mac becomes the main audience — build the website out properly

The third option they raised, and the best long-term one: the web version *is*
the hub. `COMMONS-BACKEND-PLAN.md` Phase 1½ already describes a site that serves
both people and Pavilions from the same files. If most testers are on Macs, the
browser build stops being a fallback and becomes the front door.

---

## The first ten minutes — the path a new user actually takes

**Rewritten 2026-08-13, and the old version is worth saying out loud because it
had gone false.** It was locked 2026-07-28 and read: *"they wander into the
Library and open a book… they hit a summary-only classic."* `SEED_LIBRARY` is
`[]` now — **there is no book to wander into and open.** A tester following the
old step 4 would have found an empty room, which is precisely the door-onto-
nothing this project keeps promising not to build. The walk is what replaced it.

1. **Download, run, click through the SmartScreen warning.** Installs in
   seconds, no admin password, no options to choose.
2. **The title screen.** Two doors: *Enter the Grounds*, and **🧭 New here?
   Start here**. A first-time visitor should take the second.
3. **Stage 1 — a book, a note, a bag.** It walks them to the real intake, they
   bring in a `.txt` or `.epub` **they chose**, they read a bit, they write one
   note in their own words, and they put it in their backpack. **This is the
   moment the app has to land**, and it lands on something of theirs rather
   than something we shipped. If they have no file to hand,
   `docs/BOOKS-TO-SOURCE.md` is the list, and the stage says where free books
   live.
4. **Stages 2–4 — the rooms.** The Study and the Writing Desk (a day gets
   planned, a book note becomes a task), the Library proper, the residents.
   Reading turning into doing is the claim, and this is where it is made.
5. **Somewhere in here, the "connect a local AI" nudge.** ⚙ Manage AI
   connections → **Check this computer**, and the app tells them whether their
   laptop should even try. Either they install Ollama, or they are told
   honestly not to bother — **and both are fine endings**, because everything
   above this line worked without it.
6. **Stage 5 — graduation**, which says plainly that **Missions are not built**
   rather than implying a door. A tester who reads that and believes it is the
   check on this whole document working.

**Everything past stage 1 is optional.** A tester who brings in one book, reads
a page of it aloud (🔊 needs no setup at all) and closes the app has had it work
exactly as intended. That is the bar the beta is actually held to.

### Is it ready?

**Yes, and it is now the only remaining question that a person answers.**
Verified on this build: the packaged app boots, starts and works; the real
`.exe` opens its own database with its schema applied inside the pack and names
itself `0.1.0-beta.7.1`; old saves survive; every panel opens with no AI, no
Docker and no cloud; not one external network request; no keys in the bundle;
`npm test` plus 33 browser and 9 Electron suites green, and the one that drives
the artifact itself.

**What no suite can answer**: whether Stage 1 *feels* like an invitation,
whether ten minutes is the right length, and whether the app survives a machine
that never built it. Those need the installer in somebody else's hands, which
is what this file is for.

---

## What a "clean install" actually means for testing

The install itself is one file and one click. What has **never** been tested
is that file on a machine that never built the project — different Windows
build, no Node, no Visual C++ runtimes, possibly a different GPU. That is
the last genuinely unverified thing (`BETA-PREFLIGHT.md`), and it can only
be done by installing it somewhere else.

Worth knowing before you do: the app writes its save to that machine's own
browser-storage area inside the app data folder, and personal book files to
the app's data directory. A fresh machine therefore starts genuinely fresh —
which is the point of the test.

To uninstall cleanly: Settings → Apps → Sand Pavilion → Uninstall.
