# Building the Sand Pavilion for macOS

**For whoever has the Mac.** You don't need to know anything about this project
to do this — it's about twenty minutes, most of it waiting. Everything you need
is in this file; nothing here assumes you've read the rest of the repo.

The situation: the app is [Electron](https://electronjs.org), so it runs on macOS
fine, but **a `.dmg` can only be built on a Mac** — Apple's packaging and signing
tools don't exist elsewhere. The main development machine is a Windows box, so
this one step needs you.

---

## What you need

- A Mac (Apple Silicon or Intel — both work, see below)
- **Node.js 20 or newer** — `node --version` to check, [nodejs.org](https://nodejs.org)
  if not
- Git
- About 2 GB of free disk

No Xcode, no Apple Developer account, no certificates. We're deliberately not
signing this.

---

## The build

```bash
git clone https://github.com/zaxaustin/sandpiviliongame.git
cd sandpiviliongame

npm install                  # a few minutes
npm test                     # should print "smoke test passed" — stop if it doesn't

node scripts/make-icon.mjs   # draws the app icon (no dependencies, instant)
npm run electron:build:beta  # the actual build — 5-10 minutes
```

The results land in `release/`:

```
Sand Pavilion 0.1.0-beta.3 arm64.dmg     ← Apple Silicon (M1/M2/M3/M4)
Sand Pavilion 0.1.0-beta.3 x64.dmg       ← Intel Macs
```

**Use `electron:build:beta`, never the plain `electron:build`.** The `:beta`
script reads `.env.beta`, which blanks every external-service variable so the
build ships fully local — and a verifier runs inside it that *fails the build*
if any cloud host or anything key-shaped ends up in the bundle. You should see
this line go past:

```
✓ beta build verified — no cloud host, no keys, local-only.
```

If the build stops with **"THIS BUILD MUST NOT BE SHIPPED"**, that's the
verifier doing its job. Don't work around it — say what it printed.

---

## Then check it actually works

Two minutes, and worth it. The Windows build silently shipped a completely dead
app for weeks because nobody opened the packaged version — the window appeared,
the button did nothing, and no error was ever shown. Don't inherit that.

1. Open the `.dmg`, drag **Sand Pavilion** to Applications, launch it.
2. **macOS will refuse the first time** — see below.
3. You should get a dark title screen. Click **Enter the Grounds**.
4. Walk with the arrow keys. Press **E** facing a bookshelf. A book should open
   and be readable.
5. Press **Esc** — a menu should appear.

If you get a *white or unstyled* window, or a title screen whose button does
nothing, **that's the failure mode to report**, and it means the asset paths
broke. Open the window and press `⌥⌘I` for the console; whatever's red there is
the answer.

There's also an automated version of this check:

```bash
npm run build:beta
./node_modules/.bin/electron test/live/packaged-boot.cjs
```

Exit code 0 means it boots, starts, and opens panels.

---

## macOS will say the app is "damaged". It isn't.

Because the app isn't signed with a paid Apple Developer certificate, Gatekeeper
blocks it — and on recent macOS the message is **"Sand Pavilion is damaged and
can't be opened. You should move it to the Trash."**

That message is simply wrong. macOS says it about *every* unsigned app. Nothing
is damaged.

**To open it:**

Right-click (or Control-click) the app → **Open** → **Open** again in the dialog
that appears. Only needed once.

If macOS still refuses — common on Apple Silicon with a downloaded `.dmg` —
strip the quarantine flag:

```bash
xattr -dr com.apple.quarantine "/Applications/Sand Pavilion.app"
```

Anyone you pass the `.dmg` to will hit exactly the same thing, so send those
instructions *with* the file rather than after they panic.

*(The permanent fix is Apple's Developer Program — $99/year — plus notarising
each build. Worth it for a public release; not for a handful of friends.)*

---

## Sending it back

Attach both `.dmg` files to the GitHub Release, or just send them over — they're
about 100 MB each.

Please also mention:
- which Mac and which macOS version you built and tested on
- anything that looked wrong, however small

If you'd rather not deal with `git`, the whole thing can also run in CI on
GitHub's own Macs: push a tag (`git tag v0.1.0-beta.3 && git push --tags`) and
`.github/workflows/build-installers.yml` builds both platforms. Doing it by hand
on a real Mac is more useful the first time, though, because you can actually
*use* the result.

---

## If you want to poke at it in an editor

```bash
npm run electron:dev     # the desktop app, live-reloading
npm run dev              # or just the browser version, at localhost:5173
```

The code is plain JavaScript with no framework and no build step beyond Vite.
Roughly:

| Where | What |
|---|---|
| `src/game/main.js` | the loop, input, and what pressing **E** does |
| `src/game/scenes.js` | the rooms, as literal tile grids |
| `src/game/ui/overlays.js` | every panel (it's the big one) |
| `src/game/render.js` | the canvas drawing |
| `electron/main.cjs` | the desktop wrapper |
| `test/smoke.mjs` | `npm test` — fast, no browser needed |

`MAINTAINING.md` is the full technical tour if you get curious. If you change
anything, `npm test` before committing — it catches the specific mistakes this
codebase has actually made before.

**Thank you.** This is the one piece that genuinely can't be done from a
Windows machine.
