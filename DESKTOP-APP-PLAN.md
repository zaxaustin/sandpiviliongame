# Desktop App Plan

Not started. This is the plan, written down so it survives between sessions —
see README's "Work still to be done" for how this fits the rest of the
priority list. No drastic moves while things are working well; this gets
picked up deliberately, not accidentally.

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

## Shell: Electron vs. Tauri — undecided, revisit before starting

- **Electron** (leaning this way) — pure JavaScript, same language as
  the entire existing codebase. The Ollama-proxy fix is a few lines in
  Node's main process. Cost: a real installer, ~100–150MB, since it
  bundles Chromium (same category as VS Code, Slack, Discord).
- **Tauri** — much smaller install (~10–20MB, uses the OS's built-in
  WebView instead of bundling one), but the native bridge for the
  Ollama-proxy fix would be Rust — a second language, learned just for
  this one problem. Its WebView is still a real browser context, so it
  needs the same "proxy through native code" trick as Electron, just in
  an unfamiliar language.

Deferred on purpose — pick this when actually starting the work, not now.

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
