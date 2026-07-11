# Desktop App Plan

> **STATUS (2026-07-11):** Phases 1-4 all done and proven live (2026-07-08,
> including running the packaged installer). Since then the bridge grew:
> streaming fetch (07-11), a native save dialog, spell-check menu, and the
> personal-library file storage (`desktop-library-*` handlers). A dedicated
> **shareable beta installer** now exists too — `npm run electron:build:beta`,
> local-only by construction (see `BETA-BUILD-PLAN.md`). **The one remaining
> gap is unchanged: a clean install on hardware that never built it.**

**Phase 1 done and verified live, 2026-07-08.** Electron picked (see
"Shell" below — the undecided-on-purpose choice is now made). See "Local
storage"-style status section near the bottom for the real details.

## Phase 1 — done, 2026-07-08

Electron scaffolded (`electron/main.cjs`, `electron/preload.cjs`), wired
to the existing Vite app with no changes to `index.html`/`src/game/`
beyond `src/game/ai/provider.js`. `npm run electron:dev` runs Vite and
Electron together (`concurrently` + `wait-on`); `npm run electron:build`
(not yet run for real) would produce a Windows installer via
`electron-builder`, config already in `package.json`'s `"build"` block.

**The one thing that had to work before anything else — proven, not
assumed:** launched the real Electron window with a live local Ollama
running and *no* `OLLAMA_ORIGINS` set at all. The main process's
`ipcMain.handle('desktop-fetch', ...)` logged a real round trip —
`GET http://localhost:11434/api/tags -> 200` — meaning the renderer's
`fetch()` never touched Ollama directly; `src/game/ai/provider.js`'s new
`localFetch()` helper routed it through `window.desktopBridge` (exposed
by the preload script via `contextBridge`, `contextIsolation` on,
`nodeIntegration` off) to the main process, which made the actual
request with Node's own `fetch` — never a browser context, never subject
to CORS. This is the permanent fix for the exact failure that silently
broke the Monk's chat in an earlier browser session.

`localFetch()` only intercepts Ollama's two calls (`/api/tags`,
`/api/chat`) for now — the OpenAI-compatible and Anthropic providers
still use a plain `fetch()` unchanged, since those hit public HTTPS APIs
already designed for direct browser access (Anthropic's own
`anthropic-dangerous-direct-browser-access` header says as much). The
bridge only ever proxies to `localhost`/`127.0.0.1` — `main.cjs` checks
this explicitly — so it can't become a general fetch-anything hole for a
compromised renderer.

**A real environment gotcha, hit and fixed live:** the sandboxed shell
used to build this had `ELECTRON_RUN_AS_NODE=1` set, which makes
Electron's own binary run as plain Node instead of launching a real
window — `require('electron')` then returns a path string instead of the
API object, so `ipcMain.handle(...)` throws `Cannot read properties of
undefined`. Not a code bug; cleared for the one launch
(`env -u ELECTRON_RUN_AS_NODE npm run electron:dev`) and the real window
opened immediately. Worth knowing if this ever gets built from a CI
runner or another sandboxed shell — check for this env var first if
Electron mysteriously won't open a window.

**Also proven live, same session:** a real chat message (not just the
`/api/tags` connection check) round-tripped through `POST /api/chat` via
the same `localFetch()` path — `200` back, real JSON body, real IPC
round trip with a POST body. And separately, confirmed by hand: talking
to a resident in the actual running desktop window worked, before the
window was closed.

## Phase 3 — done, 2026-07-08

First-run experience: when no local AI is reachable, the desktop build
now shows a clickable "install Ollama" link (`ollama.com`) instead of
the browser build's "see README" text, which is a dead end in a
standalone app with no repo on disk. `electron/main.cjs` intercepts
`target="_blank"` clicks (`setWindowOpenHandler`) and routes them to the
user's real system browser via `shell.openExternal` — a link inside the
app window would otherwise just try to navigate the app itself, with no
address bar or way back.

## Phase 4 — done, 2026-07-08: a real installer exists

`npm run electron:build` produces
`release/Sand Pavilion Setup 0.0.1.exe` (~100MB, unsigned per the
v1 audience decision — Windows will show an "Unknown Publisher" warning
on first run, expected, not a bug).

**A real build-time gotcha, hit and fixed live, worth knowing if this
ever gets rebuilt:** the first three build attempts all failed with the
same Windows `EPERM` renaming `release\win-unpacked.tmp` into place.
Looked at first like leftover Electron windows or antivirus scanning —
neither was it. The actual cause: **Vite's own dev server was still
running in the background** (from proving Phase 1 earlier in the same
session) and its file watcher picked up the newly-extracted installer
files landing inside `release/`, triggering HMR "page reload" churn on
them — which held a lock that blocked electron-builder's folder rename.
Fix: make sure `npm run electron:dev` (or plain `npm run dev`) isn't
running in the background before `npm run electron:build`.

**Not yet done:** actually running the built installer (only the build
itself is proven, not the resulting install-and-launch experience), and
testing on a machine that isn't the dev machine.

## Remaining phases (from the original rollout list)

5. Run `release\Sand Pavilion Setup 0.0.1.exe` for real — confirm it
   installs, creates a Start Menu shortcut, and the installed app (not
   just the dev-mode window) can still reach Ollama.
6. Test on a machine that isn't the dev machine — see "Rough phases"
   below, step 5.

## A real concern, raised and settled before starting (2026-07-08)

Worth recording, since it's the kind of question that should get asked
*before* committing effort, not after: **does wrapping this in a desktop
shell risk losing AI integration — local or cloud — to "a third-party
app"?** Settled, with real reasoning, not just reassurance:

- **The whole point of this plan is to make local AI more reliable, not
  less** — see "The real problem this has to solve" below. The one
  actual fragility today is a browser CORS rule blocking the page from
  reaching local Ollama; a desktop shell's native-backend proxy fixes
  that permanently. The risk, if anything, runs the other direction.
- **Electron/Tauri are build tools, not services.** Whichever gets
  picked compiles this project into a standalone `.exe` that has zero
  ongoing connection to Electron's or Tauri's own infrastructure once
  built — same relationship VS Code or Discord have to Electron. No new
  runtime dependency gets introduced.
- **Cloud providers (Claude/ChatGPT/Grok) are unaffected either way** —
  those are HTTPS calls to their own APIs, identical whether made from a
  browser tab or a desktop shell's webview.

Conclusion stands: this is, if anything, the more local-first move
available, not a risk to it — a native shell has strictly more access to
the user's own machine than a browser tab, never less.

## The actual goal

Someone else — not just the person who built this — downloads one file,
double-clicks it, and the Pavilion opens as its own window with its own
icon. No `npm install`, no terminal, no editing environment variables.

## The real problem this has to solve (not just packaging)

Today this is a website. `npm run dev` already runs everything locally —
wrapping it in a desktop shell for its own sake wouldn't add much. The
actual friction is that **the browser's CORS rules block the page from
reaching a local Ollama server unless `OLLAMA_ORIGINS` explicitly allows
that exact origin.** This bit us directly during tonight's session (the
Monk's chat silently stopped working, no error, no explanation) and a
first-time user with zero context would have no way to diagnose it.

A proper desktop shell can route the Ollama request through the app's
**native backend** instead of a browser `fetch()` — a server-to-server
request isn't subject to CORS at all. That fixes this permanently, for
every future person who installs the app, without them ever touching an
environment variable. This is the one requirement that actually matters:
**whatever shell we pick, local AI has to keep working (or work better)
than it does in the browser today — not regress.**

## Shell: Electron — decided, 2026-07-08

- **Electron** (chosen) — pure JavaScript, same language as the entire
  existing codebase. The Ollama-proxy fix was a few lines in Node's main
  process, exactly as expected — see "Phase 1" above for the real,
  working result. Cost: a real installer, ~100–150MB, since it bundles
  Chromium (same category as VS Code, Slack, Discord) — accepted
  knowingly, not a surprise later.
- **Tauri** — passed on. Much smaller install (~10–20MB), but the native
  bridge for the same Ollama-proxy fix would have needed Rust — a second
  language nothing else in this project uses, for the one thing that had
  to work first.

## Audience for v1: just the builder + a few people they know directly

This changes real decisions, not just tone:
- **Skip code signing.** An unsigned installer triggers a Windows
  SmartScreen "unknown publisher" warning on first run. Fine for people
  who already trust where the file came from; not fine for a cold
  public download. Revisit if this ever goes wider.
- **Skip an auto-update pipeline.** Manual "here's a new build" is fine
  at this scale.
- **Skip a real release/signing/notarization process** generally —
  all of that is a public-distribution problem, not a v1 problem.

## Explicit non-goals for v1

- **Bundling or auto-installing Ollama itself.** That's its own
  multi-gigabyte installer with its own model downloads, entirely
  outside this app's scope. The realistic bar is a first-run check —
  "Ollama not found — here's the download link" — not making Ollama
  silently appear.
- **A public app-store-style release.** Personal/friends distribution
  only, per the audience decision above.

## Rough phases, once this is actually picked up

1. **Pick the shell** (Electron vs. Tauri, see above) and confirm the
   native-backend Ollama proxy actually works end-to-end before anything
   else — this is the one thing that must not regress, so prove it first
   in isolation, not last.
2. **Wrap the existing Vite build** in that shell — the app itself
   (`index.html` + `src/game/`) doesn't need to change shape, just how
   it's served and how `provider.js`'s Ollama calls are routed (browser
   `fetch()` today → native-backend call, shell-dependent).
3. **First-run experience** — detect whether a local AI is reachable on
   launch; if not, a plain, honest message and a link, not a silent
   fallback to scripted-only dialog with no explanation (the exact
   failure mode that caused tonight's "the Monk is gone" report).
4. **Build an installer** (electron-builder or Tauri's bundler) — a
   Windows `.exe`/`.msi` with a Start Menu shortcut. Unsigned, per the
   audience decision above.
5. **Actually test on a machine that isn't the dev machine** — a clean
   Windows install (or at minimum a fresh user account) with no existing
   Ollama setup, no existing `OLLAMA_ORIGINS` configuration, no Node
   installed. If it doesn't work there, it doesn't work.

## Open questions for whoever picks this up

- Does `Store` (the localStorage-based save layer) need anything
  different inside an Electron/Tauri webview, or does it just work?
  (Likely just works — both shells embed a real browser context with
  real `localStorage` — but confirm, don't assume.)
- Does the Supabase-backed cross-device sync still make sense once
  there's a "real" desktop install, or does local-only become the
  primary mode for the desktop build specifically?

## Could someone else clone this and build their own? — checked, 2026-07-09

Asked directly, not answered from assumption. Checked before saying yes:

- **License:** `LICENSE` is real MIT, already in the repo. Legally
  clear to fork/redistribute/build from, today, no change needed.
- **No secrets leak with the repo.** `.env.local` (the only file
  holding this project's actual Supabase/MinIO credentials) has
  **never once been committed** — confirmed with `git log --all
  --full-history -- .env.local`, empty result, not just trusted to
  `.gitignore`. A repo-wide grep for real-looking API keys or a
  hardcoded service-role key turned up nothing — every match was
  documentation showing the *name* of an env var, never a real value.
  `.env.example` is the actual template a cloner would copy, and it
  ships with every value blank.
- **The zero-config fallback already does the real work here.** A
  fresh clone with an empty (or missing) `.env.local` doesn't error —
  the Library reads from the bundled `src/game/data/seed.js`, full
  text falls back to the inline copy, search falls back to local
  substring matching, and saves are `localStorage`-only. This was
  built for a different reason (graceful degradation if Supabase/MinIO
  aren't running) but it's the exact same mechanism that makes a
  stranger's clone work at all: `npm install` → `npm run
  electron:build` gets them a real, working desktop app off the seed
  Library, no account, no Supabase project, no MinIO, nothing of
  this project's own infrastructure required.

**What a cloner does *not* get for free, on purpose:** this project's
own 44-text grown Library, or the Commons (shared accounts, café
boards) — those live in this specific Supabase project. Someone
wanting the full experience would set up their own Supabase project
and MinIO instance and follow the same setup docs already written
(`README.md`'s setup section, `LIBRARY-SCALING-PLAN.md`) — real work,
but nothing currently undocumented or held back.

**Also checked, not assumed:** the *entire* git history, not just
current file contents — every commit message, and every diff ever
made against `.env`/`.env.local`/`*.pem`/`*.key`, plus a pattern scan
for real-looking `MINIO_ROOT_PASSWORD`/`SUPABASE_SERVICE_ROLE_KEY`
values across all commits. Clean. Nothing sensitive has ever entered
this repo's history, at any point, not just in the current tree.

**Real open items before actually flipping the repo to public,** none
of them blockers, all worth a pass first: whether the desktop app's
unsigned-installer status (see "Explicitly out of scope" above) needs
a clearer warning for a stranger installing it, versus a friend who
already trusts the source; and whether `library-sources/`/
`library-inbox/` being gitignored (so a cloner's own Caravan runs
start from zero raw material) is worth a line explaining explicitly,
rather than a newcomer wondering where the "raw sources" folder they
read about went.

**The actual answer to "can someone download this and build their own
desktop app": yes, today, as-is, with no changes needed.** The MIT
license, the clean history, and the zero-config fallback were already
enough — this session's check was verifying that claim, not making it
true.
