# Installing the Sand Pavilion, from nothing

**Written 2026-08-13 for `0.1.0-beta.7.2`.** Every path in it was measured on a
real packaged build rather than reasoned from Electron's defaults — see the
note at the end of *Where your things live*, because the answer is not the one
you would guess.

Two audiences, and they need different things:

- **A tester** wants §1–§4: get it on, know what to expect, know it isn't
  malware, know nothing is uploaded.
- **The steward testing a clean install** wants §6, which is the only way to
  see what a stranger sees on a machine that already has your library on it.

---

## 1 · Windows

**Download** `Sand Pavilion Setup 0.1.0-beta.7.2.exe` (116 MB).

**Optional, if you're the checking sort.** In PowerShell:

```powershell
Get-FileHash "Sand Pavilion Setup 0.1.0-beta.7.2.exe" -Algorithm SHA256
```

It must print:

```
195725783D9E602C092DF840080E133711D44081DD70AD81715F9B6525F12ECC
```

**Run it.** Windows will show a blue box:

> **Windows protected your PC** — Microsoft Defender SmartScreen prevented an
> unrecognised app from starting.

The default button is **Don't run**. Click **More info → Run anyway**. This
happens because the installer is **not code-signed** — a certificate is a few
hundred dollars a year and isn't worth it for a handful of testers. It is not a
judgement about the file.

It is a **one-click installer**: no options, no admin password, installs for
your user only, and puts *Sand Pavilion* in the Start menu. It opens by itself
when it finishes.

**Nothing else is required.** No Node, no npm, no Docker, no Ollama, no
account, no key. The database it uses for search comes inside the app.

## 2 · macOS

Two files, and **they are not interchangeable**:

| file | for |
|---|---|
| `Sand Pavilion 0.1.0-beta.7.2 arm64.dmg` | Apple Silicon — M1, M2, M3, M4 |
| `Sand Pavilion 0.1.0-beta.7.2 x64.dmg` | Intel Macs |

Not sure which you have?  → *(Apple menu) → About This Mac*. If it says **Apple
M-something**, take arm64.

Open the `.dmg`, drag *Sand Pavilion* to Applications. Then, the first time
only:

> **macOS will probably say "Sand Pavilion is damaged and can't be opened. You
> should move it to the Trash."**

**It is not damaged.** That is what macOS says about *every* app that hasn't
paid Apple's $99/year notarisation, and it is a much harsher lie than the
Windows warning. The fix:

**Right-click (or Control-click) the app → Open → Open** in the dialog that
follows. Only needed once.

If it still refuses, in Terminal:

```bash
xattr -dr com.apple.quarantine "/Applications/Sand Pavilion.app"
```

## 3 · Neither — just a browser

[**sandpiviliongame.vercel.app**](https://sandpiviliongame.vercel.app) is the
same Pavilion in a tab. Nothing to install, nothing to approve, no scary box.
It always matches the latest code.

What a tab gives up, honestly:

- **About nine average books** instead of 500 (measured 2026-08-19: the ninth
  563 KB book fills a ~5 MB store), because the text goes into browser
  storage rather than files on disk.
- No native save dialog.
- Reaching a local AI needs `OLLAMA_ORIGINS` set (the desktop app doesn't).
- **Its save is per-address.** A tab and the installed app are two different
  Pavilions that cannot see each other — use *Export* / *Import* to move
  between them.

Reading, notes, read-aloud, the planner and the lessons are all the same.

## 4 · The first ten minutes

1. **The title screen has two doors.** *Enter the Grounds*, and **🧭 New here?
   Start here**. First time, take the second.
2. **Stage 1 gives you something of yours.** It walks you to the intake, you
   drag in a `.txt` or `.epub` **you chose**, read a little, write one note in
   your own words, and put it in your backpack.
3. **The shelf starts empty on purpose.** Nobody's list is on it. If you have no
   book to hand, [Standard Ebooks](https://standardebooks.org) and
   [Project Gutenberg](https://gutenberg.org) are free and plain text; grab any
   `.txt` or `.epub` and drag it onto the window.
4. **Stages 2–5** walk the rooms — the Writing Desk, the Library, the
   residents — and the last one says plainly which things are *not* built.

Press **🔊** on any book and it reads aloud, with no setup at all. That works
before you have installed anything else, and it is the shortest way to see
whether the place suits you.

## 5 · Waking the residents (optional)

The Library, reader, read-aloud, notes, planner and lessons all work with no AI
whatsoever. The residents need a model.

**Don't go looking up your specifications.** *Esc → ⚙ Manage AI connections →
**Check this computer***. It reads the machine you are on and tells you which
model to get, with the one line to copy.

**If it tells you not to run one locally**, it now offers the other door in the
same breath — Ollama can run the model on its own machines:

```
ollama signin                 # a free account at ollama.com
ollama pull gpt-oss:20b-cloud # instant; there are no weights to download
```

...then **Detect** in the app and pick it from the list. **Sign in first** — the
other order fails with an auth error that looks exactly like a broken install.

**What that costs you, plainly:** what you type to a resident is sent to
Ollama's servers and answered there. Your library, your notes, your day and
your whole save never leave your computer. The chat header says
`☁ leaves this device` on every message so you are never guessing, and a hosted
model is **offered but never chosen for you**.

---

## 5b · The two things a new tester will not find on their own

Both are **opt-in and easy to miss**, so they are named here rather than left to
discovery.

**A voice that reads like a person.** Pause menu → **🔊 Voice settings**, scroll
to the bottom. The desktop app offers **Kokoro**, a small neural voice that runs
on your own processor. It is an **88 MB download on first enable** — nothing is
bundled in the installer — and after that it never touches the network again,
including offline. Four voices; *Michael* is the steady one for long chapters.

⚠ **It is CPU-only, so a thin laptop may not keep up.** Press
**⏱ Check this computer**: it reads a sentence, times it, and says plainly
whether this machine is comfortable, tight, or slower than speech. If it says
slower, believe it and stay on the system voice — the feature is not broken,
that machine is just not fast enough. **This is the single most useful thing to
report back from a laptop.**

**The residents will text you.** After you pin a course, a small card appears in
the bottom-right corner — the same one a pocketed conversation uses. Sebastian,
Quill and the Mountain Monk leave notes when they notice something. It is
one-way, nothing is sent anywhere, and none of it needs an AI. Also reachable
from the pause menu as **✉ Messages**.

---

## 6 · A genuinely fresh install — for testing

**This section is the reason the file exists.** Uninstalling does **not** remove
your data, so reinstalling on a machine that has used the Pavilion shows you
your own library, not what a stranger sees. Which means the most important test
there is — *does Stage 1 work for someone starting from nothing* — silently
cannot be run here without one extra step.

### Where your things live

Measured on the packaged `0.1.0-beta.7.2`, by asking the app itself:

```
%APPDATA%\sand-pavilion\
   library\        the .txt of every book you added   (68 MB / 59 files here today)
   db\             the embedded Postgres, if no Docker container is running
   Local Storage\  your save — days, notes, shelves, progress, settings
```

That is `C:\Users\<you>\AppData\Roaming\sand-pavilion`. Paste it into the
Explorer address bar.

> ⚠ **The folder is `sand-pavilion`, not `Sand Pavilion`** — lowercase, hyphen.
> `productName` lives in the `build` block of `package.json`, which
> electron-builder does **not** copy into the packaged app, so Electron falls
> back to `name`. This was measured rather than assumed, and the guess would
> have been wrong.
>
> One consequence worth knowing: **the installed app and `npm run electron:dev`
> share that folder.** On this machine, the packaged build opens onto the
> steward's real 59-book library.

### The reset — move it aside, never delete it

With **Sand Pavilion closed**, in PowerShell:

```powershell
Rename-Item "$env:APPDATA\sand-pavilion" "sand-pavilion.backup-$(Get-Date -f yyyyMMdd-HHmm)"
```

Open the app. It is now a first-ever visitor: empty shelf, no save, the welcome
panel, the walk unstarted. **This is the state to test.**

To put your own Pavilion back, close the app, delete the new empty
`sand-pavilion` folder and rename the backup to `sand-pavilion`.

> **If Docker is running, the container database is NOT in that folder** and
> survives the reset — books hydrate back from it on boot, and your "empty
> shelf" will not be empty. Stop the container first
> (`docker compose stop`) if you want the true first-run case. This is the
> same trap `test/live/resident-reach.cjs` documents: it asserts
> `allDocs() === 0` before testing the empty-shelf case, because a check that
> refuses to run against the wrong fixture is worth more than the check itself.

### What to look at, in this order

1. Does the title screen make you press **🧭 New here? Start here**, or do you
   walk past it? If you walk past it, nothing after this matters.
2. Do you get a book in during Stage 1? **If you stall because you have no file
   to hand, that is the finding** — it means the welcome packet stops being
   optional.
3. How long did it take? It is meant to be about ten minutes.
4. Where did you stop? Wherever that is, is the next piece of work.

Write it into `plans/BETA-TESTING-FEEDBACK.md`, or use **Esc → ✍ Tell them what
happened**, which asks the four useful questions and attaches the build number.
It sends nothing anywhere — it writes a note and you decide what to do with it.

### Uninstalling

**Settings → Apps → Sand Pavilion → Uninstall.**

That removes the program and leaves `%APPDATA%\sand-pavilion` exactly where it
is, on purpose — an uninstall that silently ate your library would be
unforgivable. Delete that folder by hand if you truly want no trace.

---

## 7 · Things that are true and worth saying once

- **Nothing is uploaded, ever** — not what you read, not what you write, not a
  word you say to a resident. There is no account and no server, and the app
  makes **zero** network requests on startup. The one exception is a hosted AI
  model, which you have to choose deliberately and which is labelled on every
  message.
- **There is no updater yet.** A new version means a new link. It is on the
  list, and most of the machinery for it already exists.
- **Installing over an older Sand Pavilion is safe.** Your library, notes and
  save carry across untouched.
- **Nothing here breaks by clicking around.** Open everything.
