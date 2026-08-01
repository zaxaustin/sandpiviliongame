# Handing the Pavilion to someone else

Written **2026-07-28**, from the direct question: *"How do I do a clean
install — do I do it through GitHub, or is there a file to email people?"*

Short answer: **there is one file, and you cannot email it.** It's 95 MB;
Gmail stops at 25 MB and Outlook at 20 MB. So it goes somewhere and they
follow a link.

---

## The file

```
release/Sand Pavilion Setup 0.1.0-beta.2.exe        95.0 MB
SHA256  D3B883A14627A769AD5EC564563EBC458585FC5FD01FCF9A3FF7DBF3111EA0B0
```

One file. It's a one-click NSIS installer: no options, installs per-user
(no admin password), and puts *Sand Pavilion* in the Start menu. Everything
it needs is inside — Electron, the game, the seed library. **No Node, no
npm, no Docker, no Ollama required to open it.**

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

**Before handing over any new build**, run the guard that exists because the
packaged app once silently didn't work at all:

```
npm run build:beta
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs
```

Exit code 0 means it boots, starts and opens panels. Non-zero means do not
send it to anybody.

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
Get-FileHash "Sand Pavilion Setup 0.1.0-beta.2.exe" -Algorithm SHA256
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
gh release create v0.1.0-beta.2 \
  "release/Sand Pavilion Setup 0.1.0-beta.2.exe" \
  --title "Sand Pavilion 0.1.0-beta.2" \
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
> - The Library starts small **on purpose**. You fill it: drag any `.txt` or
>   `.epub` onto the window.
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

### 2. A real Mac build, via GitHub's own Macs

`.github/workflows/build-installers.yml` builds **both** installers — Windows
`.exe` and macOS `.dmg` — on GitHub's runners, which include a real Mac, free
for public repos. Nobody has to own one.

```bash
git tag v0.1.0-beta.3 && git push --tags
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

Locked in 2026-07-28. This is the flow the beta is built around; if a tester
ends up somewhere else, that is a finding worth writing down.

1. **Download, run, click through the SmartScreen warning.** Installs in
   seconds, no admin password, no options to choose.
2. **The title screen → Enter the Grounds.** They are standing in the Pavilion.
   Arrow keys to walk, **E** for whatever is in front of them, **Esc** for the
   menu. That is the entire control scheme and the welcome screen says so.
3. **The welcome panel** tells them two things that matter more than any
   feature: *nothing here breaks by clicking around*, and *nothing here phones
   home.* Both are literally true and both change how someone explores.
4. **They wander into the Library** — south — and open a book. It reads like a
   book. They press 🔊 and it reads aloud to them, with no setup at all. **This
   is the moment the app has to land**, because it is the first thing that
   works with zero effort and needs nothing installed.
5. **They hit a summary-only classic** and it tells them plainly: this is a
   summary, here is where the real text lives, drag it onto this window. Ideally
   they go and do it — that is the core loop of the whole project in one motion.
6. **Somewhere in here they meet a resident and get the "connect a local AI"
   nudge.** They press ⚙ Manage AI connections → **Check this computer**, and
   the app tells them whether their laptop should even try. Either they install
   Ollama, or they are told honestly not to bother — **and both are fine
   endings**, because everything above this line worked without it.
7. **The Study, if they get that far** — the Writing Desk plans a day, a book
   note becomes a task. That is the "reading turns into doing" claim, and it is
   the thing most likely to bring them back tomorrow.

**Everything past step 4 is optional.** A tester who reads one book aloud and
closes it has had the app work exactly as intended. That is the bar the beta is
actually being held to.

### Is it ready?

Yes, with one caveat that is about to resolve itself. Verified: the packaged
app boots, starts and works (6/6); old saves survive (39/39); every panel opens
with no AI, no Docker and no cloud; not one external network request; no keys
in the bundle. **The only thing never done is a human clicking the installer** —
and that is the very next thing that happens.

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
