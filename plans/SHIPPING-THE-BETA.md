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
SHA256  FB0948071A6009D3FEADFE8EED7019D8613870348113DF6A6E39180565FF670B
```

One file. It's a one-click NSIS installer: no options, installs per-user
(no admin password), and puts *Sand Pavilion* in the Start menu. Everything
it needs is inside — Electron, the game, the seed library. **No Node, no
npm, no Docker, no Ollama required to open it.**

Rebuild it with `npm run electron:build:beta`. Never plain `electron:build`
— that one bakes this machine's own Supabase keys into the installer, and
`scripts/verify-beta-build.mjs` will stop you.

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

**But the repo is currently private, and 109 commits behind.** A release
asset on a private repo is only downloadable by collaborators, so testers
would need GitHub accounts and invitations. Three ways out:

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
git push origin main               # 109 commits behind right now
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
