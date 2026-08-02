# Beta Testing Feedback

A running log of real issues found by actually using the Pavilion, not
a feature wishlist written cold. New rounds get appended, not
overwritten — see the date on each entry. Add [x] and a one-line note
when something's actually fixed, don't delete the entry.

## Round 1 — 2026-07-09

### 1. [~] Notes during an AI conversation — unclear how to save/link/start new

**What happened:** talking to an AI resident, the note-taking section
is a good idea, but it's not clear how to actually save a note, link it
to "my notebook," or start a fresh note mid-conversation.
**Status:** needs real UX design, not a quick fix — first figure out
which existing note surface this should feed (`data.bookNotes`,
Research Desk `p.notes`, or something new specific to a resident
conversation), then make saving/starting-new an obvious, discoverable
action rather than something you have to guess exists.

**Checked, 2026-07-09 (still open, but now a precise finding instead
of a guess):** two completely separate memory mechanisms already exist
in an AI conversation, and neither is discoverable:
- **`data.chatNotes[agent]`** — the actual note textarea already
  **auto-saves**, no button, 600ms after you stop typing (a small
  "saving…" → "saved HH:MM" label is the only visible confirmation).
  One continuous note per resident (Quill, the Monk, the Steward each
  get their own), never linked to book notes or Research Desk notes —
  three separate systems today, not one unified "notebook."
- **`data.agentMemory[agent]`** — fully automatic, zero user action:
  every real question you ask a resident gets remembered (last 20,
  `remember()` in `overlays.js`) and quietly fed back into that
  resident's own system prompt next time for continuity. Nothing to
  save here either — it already just happens.

So the real gap isn't "how do I save a note" — it's that saving is
already automatic in both places and doesn't look like it. The design
work that's still real: make that visible (the notes area already has
somewhere to say so, it's just easy to miss), and decide whether
"link it to my notebook" should mean actually unifying these three
separate note stores, which is a bigger, separate decision.

**Fixed 2026-07-10, the discoverability half only — unification stays
its own, separate, bigger question, exactly as this note already said.**
The idle-state label (the "somewhere to say so" that already existed)
now reads plainly, before you've typed a single character: "auto-saves
as you type — nothing to click," switching to "✓ auto-saved" once a note
actually exists. The textarea's own placeholder says the same thing.
Verified live: a fresh chat open shows the idle hint immediately; typing
still shows the existing "saving…" → "saved HH:MM" transition; closing
and reopening the same conversation correctly shows "✓ auto-saved" with
the note's text intact.

### 2. [x] Settings — can't get back from AI Connections to the pause menu

**Fixed 2026-07-09.** The Connections panel's close button now calls
`openMenu()` instead of `closeUI()` — verified with a real Playwright
run, not just read: opened the menu, opened Connections, clicked back,
confirmed the menu is what's actually showing afterward. `openMenu`
also had to be added to the `Object.assign(window, {...})` export list
at the bottom of `overlays.js` — it was only ever called directly from
`main.js`'s own module scope, never reachable from an inline `onclick`.

**What happened:** click "⚙ Manage AI connections" from the pause
menu, then can't navigate back to the menu itself.
**Real cause, found, not guessed:** `renderConnections()`'s close
button (`src/game/ui/overlays.js`, the `Esc ✕` button at the top of
the Connections panel) calls `closeUI()` — which closes back to the
game world, not back to the menu it was opened from. Every other
"opened from the pause menu" panel has this same shape; worth checking
whether any others have the identical bug before calling this one
comment done. **This is a real, small, likely-one-line fix** — swap
that button's handler to return to the menu instead of closing
entirely. Good candidate to just fix now rather than defer, since it's
a genuine usability blocker, not a design question.

### 3. Thinking-model output is too long, and hides its own reasoning

**What happened:** a reasoning-capable local model's response is long
and unwieldy. The actual ask: show the thinking *as it happens* (don't
hide it — "there should be no thoughts to hide, ideally, in the Sand
Pavilion"), then once a final answer arrives, collapse the thinking
down to a single line (a "thought for Ns" style toggle), not remove it
entirely.
**What's actually there today, checked:** `d.thinking` is currently
just a boolean flag that shows a generic "…" placeholder bubble while
true (`overlays.js` line ~120), then swaps to the real answer once
done — it does not currently surface a model's actual `<think>...</think>`
reasoning content at all, hidden or otherwise. Real design + build
work: detect and separate `<think>` content from the visible answer
per chunk while streaming, render it live, then collapse (not delete)
once the final answer lands. Directly in the spirit of this project's
own transparency ethic — worth doing right, not rushed.

### 4. [x] Ganesha statue — needs a body/legs, trunk direction variety, an offering

**Fixed 2026-07-09, verified with real screenshots, twice.** Rebuilt
the body with the same visible-knee-bumps technique the Buddha statue
needed; the trunk now sways slowly left/right over time
(`Math.sin(state.time*.3)`) instead of always curving one direction;
the modak offering moved to the side. **A real second bug turned up
while verifying this one:** the new leg bumps were drawn *before* the
altar's diyas/modak offering in the code, so the opaque legs painted
directly over them — a screenshot showed both statues with their
offerings completely invisible. Fixed by moving the offerings to draw
last (in front) and repositioning them onto the altar's front edge;
re-screenshotted and confirmed both are actually visible now. Same
root cause as #5 below — see that entry, this was the same bug hitting
both statues at once.

**What's there today (built 2026-07-09):** head, ears, trunk, crown,
and a rounded seated "body" blob, mirrored across the aisle from the
Buddha shrine in the Keep (`src/game/render.js`, the `'g'` tile case).
**Real ask:** the body needs actual legs, not just a rounded mass (the
Buddha statue's second pass — visible knee bumps, a real seated
silhouette — is the model to follow here, not repeat the same mistake
twice); the trunk should have real left/right variation instead of
always curving the same direction (a per-tile-position or time-based
coin flip, matching how the shrine's candle-flicker already varies);
and a food offering (modaks are already there in the small altar bowl
— check whether a *visible*, more prominent offering beside the figure
itself is what's actually being asked for, versus what's already
there at the altar).

### 5. [x] Incense in front of the Buddha statue

**Turned out to be a real, different bug than either of us
guessed — found only by actually zooming into a screenshot.** The
incense/candles were already coded, but completely invisible: the same
day's earlier knee-bump fix drew the seated body *after* (on top of)
the candles/incense in the code, so the opaque robe painted right over
them. Confirmed by cropping tight on the altar at full zoom — genuinely
nothing there, not just hard to see. Fixed by moving candles/incense to
draw last (in front of the now-higher-seated figure) and shifting them
onto the altar's front edge; re-verified at the same tight zoom,
confirmed both now actually visible. The lesson worth keeping: "read
the code, it looks right" is not the same check as "look at the
rendered pixels" — this project's kept finding real gaps between those
two all session.

### 6. [~] Text-to-speech — voice/speed selection, and a 10-second skip

**Voice + speed: fixed 2026-07-09, verified with a real Playwright
run.** A new "🔊 Voice settings" panel in the pause menu
(`openVoiceSettings()` in `overlays.js`) lists every voice this
browser/OS actually has installed (confirmed: 4 real voices showed up
in testing, not a mock) plus a speed slider (0.5×-1.75×) with a live
preview button. Persisted at `data.ttsSettings` (`tts.js` gained
`setTTSSettings()`/`getTTSSettings()`, read by every `speak()` call);
older saves default in via a small patch in `entities.js`, the same
pattern already used for `workshop.research`. Confirmed the setting
actually survives a save (checked the raw localStorage JSON after
changing it, not just the UI label). **Not done: the UK-female-voice
preference specifically** — whatever voices this game ships to depends
entirely on what's installed on each player's own OS/browser, so
there's no way to guarantee that exact voice is available; the settings
panel is the general answer, picking the specific voice is on the
player. **The 10-second skip is still open** — genuinely a different,
harder problem (see original note below), not touched this round.

**What's actually there today, checked (original note):**
`toggleReadAloud()` / `toggleSpokenSummary()` call a `speak()` helper
that wraps the browser's real `SpeechSynthesisUtterance` API — which
already natively supports `.voice` and `.rate`. A 10-second skip is a
real gap, though: `SpeechSynthesisUtterance` has no native seek — skip
would need to be built as "stop, then re-speak from an approximate word
offset," not a true seek, worth knowing before promising exact
10-second precision.

### 7. [~] Find the real source text for the Ganesha/Shiva campaign story

**Current state:** `ganesha-and-the-campaign` (Hindu shelf, `personal`
category) is an *original* telling — the steward's own account of
hearing and practicing the story, explicitly not sourced from a single
canonical text. **Real ask:** find whether there's an actual Puranic
source for this specific story (likely somewhere in the Ganesha Purana
or Shiva Purana) and, if a legitimately public-domain English
translation exists, add it as a real second, separately-sourced entry
alongside the personal telling — same "both exist, clearly labeled"
pattern already used elsewhere in this Library rather than replacing
one with the other.

**Researched 2026-07-10 — a real, honest non-result, not a shelving.**
The story does trace to a real textual source: the Shiva Purana's own
Tripurāsura (Tripurāntaka) episode — the devas built Shiva's cosmic
war-chariot for the battle against the three demon cities but omitted
inviting Ganesha first, the axle broke, and only propitiating Ganesha
let the campaign proceed. This is a different Ganesha episode than the
one already checked at wisdomlib's Shiva Purana Chapter 15 (the
door-guarding/birth story) — the Tripura chapter itself wasn't pinned
down to a specific, confirmed-safe translation. **The real blocker:**
the only complete online English Shiva Purana (wisdomlib.org, J.L.
Shastri's 1950 Motilal Banarsidass translation) carries no copyright or
license statement on the page at all, and Motilal Banarsidass is a
still-active publisher — "freely readable" is not the same as "confirmed
redistributable," the exact distinction `LIBRARY-GROWTH-PLAN.md`'s own
license rule exists to hold. **Checked directly, not assumed:** the
Library's own already-shelved Wilkins text (*Hindu Mythology, Vedic and
Puranic*, 1900, confirmed public domain) was downloaded and grepped in
full for this specific episode — it has real Ganesha and Shiva chapters,
but doesn't cover the Tripura story. No other 19th-century (safely
pre-1923) English Purana translation covering this episode turned up.
**Left as-is:** the personal telling stays the Library's only entry for
this story, honestly, rather than shelving a translation whose right to
redistribute was never actually confirmed.

### 8. [x] The Writing Desk should be a document first, a toolbox second

**The actual ask:** right now the Writing Desk (`openPlanner()` in
`overlays.js`) stacks everything at once — intention, rhythm blocks,
sparks, evening ember, past days, upcoming due items, and the
Steward's AI chat, all front and center in one panel. The real want:
make it feel like an actual word document — a blank page you're just
typing on, front and center — with all of that (blocks, sparks,
Steward chat, past days) moved to the side as tools in a toolbox,
opened only when reached for, not shown by default. The AI becomes an
assistant sitting in that toolbox with some preloaded prompts/tools,
not a chat window competing for space with the page itself.
**Status:** real design work, not a quick fix — same tier as #1 and #3
above. Worth thinking through before touching code: which of the
current panel's pieces are actually "the page" (the intention/ember
text, arguably) versus "tools" (blocks, sparks, past days, chat), and
whether the toolbox is a collapsible side panel, a separate small
overlay reachable by a button, or something else — a real UI pattern
decision, not just moving CSS around.

**Fixed 2026-07-09** — see `WRITING-DESK-PLAN.md` for the full staged
plan and #9 below for the "My Notes" filing cabinet that shipped
alongside it. Verified live, not just built: every toolbox panel opens
correctly, the page auto-saves, and a filed note survives a real reload.

### Not an issue — just enjoyed

*The Book of Household Management* is landing well; a real "want to
read the whole thing" reaction. No action needed — the full text is
already attached and readable, page by page, in the Reader.

## What to actually do with this list

**Update, 2026-07-09, same day:** #2, #4, #5, and #6 (voice/speed half)
done — all four turned out to be genuinely bounded, and #4/#5 actually
shared one root cause (a z-order bug: newer elements drawn on top of
older ones), only found by actually zooming into a screenshot rather
than trusting the code. **Still open, on purpose:** #1, #3, and #8 are real
design work, not quick patches — don't rush any of them just because
today had momentum. #7 is a sourcing question, not code. #6's
10-second skip is a real, harder problem than it looks (no native seek
in the Web Speech API) — worth its own real look, not a bolt-on.

## Round 2 — 2026-07-09, raw session notes triaged

A separate session's worth of real feedback got jotted straight into the
bottom of `README.md` instead of here — that session's connection dropped
(a local wifi issue, confirmed not a code problem) before it could be
cleaned up properly. Nothing was lost; it's triaged below into real,
scoped items, each with the actual code checked, not guessed. The raw
notes are gone from `README.md` now that they live here properly — see
"Kept, not actioned" at the bottom for the two lines that were praise or
mood rather than an ask.

### 9. [x] The Writing Desk should feel like an actual document (same open item as #8 above, with a sharper ask)

**The added specific:** "just paper and the ability to write," plus a
real file-tree alongside it — "a file system nest to it like VS Code" —
for personal notes generally, not only the daily plan. This is the same
open design question as #8 (page-first, toolbox-second), now with a
second, related piece: today, personal writing is split across three
separate places with no shared browsing structure — the planner's own
ember/intention text, Research Desk project notes, and Grant Desk
documents (all three are what `sparks` already treats as one family, per
`READING-TO-DOING-PLAN.md`, now fully wired) — but there's no single
"my files" tree across them the way a code editor's sidebar shows a
whole project at once. Real design work, same tier as #8: whether that
tree is a new, fourth thing, or a different view onto the three that
already exist, is the actual question to answer before any code.

**Update, 2026-07-09:** the page-first/toolbox-second half (this item
and #8) shipped in full — see `WRITING-DESK-PLAN.md`. The "file system
nest" half landed too, in a deliberately scoped-down form: "🗂 My Notes,"
a real filing cabinet in the toolbox (`data.notes` — named, dated,
freeform, create/edit/delete, its own auto-save), separate from today's
page. **What it isn't:** the full cross-app tree unifying Research Desk
notes, Grant Desk documents, and book notes into one browsable structure
— that idea is still confirmed and still kept out of scope, still its
own separate, bigger question, exactly as this update originally said.
This is one desk's own drawer, real and shipped, not the whole building.

### 10. [x] Book notes need to know which page they're on

**Checked, not guessed:** `data.bookNotes[slug]` (`overlays.js`,
`addBookNote()`/`renderBookNotes()`) is one flat array per book — a note
has a timestamp and text, nothing else. There's no page field anywhere in
that shape today, so "show notes for just this page" isn't a rendering
gap, it's a missing piece of data: the Reader would need to know its own
current page at the moment `+ Add note` is clicked, and every note would
need a `page` field from then on (older notes predating this would
naturally show under "all notes," never a specific page — no migration
needed, just an absent field, same honest-default pattern already used
for `done` on old sparks). Two real, small UI pieces once the data
exists: a per-page notes view (default, matches where you're actually
reading) and an all-notes-for-this-book view, one click away.

**Fixed 2026-07-10.** `addBookNote()` now stamps a `page` field whenever
a note is taken while actually inside the full-text reader (absent when
taken from the summary view, exactly the honest-default pattern
described above — no migration touched old notes). `renderBookNotes()`
defaults to showing just the current page's notes while reading, with a
"📚 Show all notes (N)" toggle one click away, following you as you turn
pages (`state.bookNotesShowAll`, reset whenever a new book opens). Each
note now shows its page number when it has one. Verified live with a
real Playwright run: a note added on page 1 correctly stayed hidden on
page 2's filtered view ("No notes on this page yet"), the toggle
correctly listed both notes with their real page numbers once switched
to "show all," and returning to page 1 kept the chosen filter state.

### 11. [x] Grant Desk's AI should draft real proposal text, not just organize

**What's there today:** the Grant Desk assistant already helps structure
a project (mission, sections, due dates) and chats about it, grounded in
the project's own documents. **The actual ask:** move from *organizing*
a proposal to *drafting real prose for a section* — asked for a real
paragraph of grant-proposal language, not just a conversation about what
should go in one. A real scope question before building: does this reuse
the exact same drafting engine `draftCourseFromGoal()` already uses for
courses and training plans (same shape: goal in, structured draft out),
retargeted at a proposal section instead of a course outline?

**Turned out this was already fully built — and a real, live bug was
the actual blocker, not a missing feature.** `grantSystemPrompt()`
already instructs the model to "write that section in full, ready to
paste into a real proposal — not an outline," and `saveGrantReplyAsDraft()`
already saves the reply as a real section. Reusing `draftCourseFromGoal()`
turned out to be the wrong question — that engine returns a *structured*
course object, not free prose, so the Grant Desk's own plain-chat shape
was already the right one. **The real bug, found only by actually
clicking the quick-start buttons, not by reading the code:** every
`GRANT_PROMPTS` button (`onclick="fillGrantPrompt(${JSON.stringify(pr)})"`)
had its JSON-stringified argument's own double quotes colliding with the
`onclick="..."` attribute's own double-quote delimiters — genuinely
broken HTML, throwing a real "Unexpected end of input" JS error on
click, confirmed via a live Playwright run before being fixed. **Fixed**
by switching the attribute to single quotes. Verified live end to end
after the fix, against this machine's real Ollama instance: clicking
"Draft a Statement of Need" correctly filled the prompt, and the model's
reply was real, grounded, fundable-voice prose citing the actual
document on file (a library-closure survey), not a conversation about
what a Statement of Need should contain.

### 12. [x] Export Save should let you choose where it goes, not just Downloads

**Fixed 2026-07-10.** `electron/main.cjs` gained a `desktop-save-file`
IPC handler wrapping a real `dialog.showSaveDialog`, exposed through
`preload.cjs`'s existing bridge as `window.desktopBridge.saveFile()`.
`exportSave()` in `overlays.js` now checks for that bridge first — the
web build at sandpiviliongame.vercel.app is untouched, still falls back
to the original `<a download>` behavior. Verified with `npm run build`
+ `npm test`, both clean; a live click-through of the actual save dialog
in a running desktop window is still worth doing next session, since
Electron's native dialogs can't be driven headlessly from here.

**Original finding, not yet built — a real, well-scoped candidate, checked not guessed.**
This game runs mainly as the desktop app now, not a browser tab
(confirmed directly), so the real fix targets that, not a browser
workaround: `electron/main.cjs` has no native save dialog wired up at
all today, and `exportSave()` in `overlays.js` just triggers a browser-
style `<a download>`, which Electron still honors but always drops into
the OS default Downloads folder with no picker. The fix is small and
contained — a real `dialog.showSaveDialog` in the main process, exposed
through `preload.cjs`'s existing bridge, called from `exportSave()` only
when running inside Electron (falls back to the current behavior on the
web build at sandpiviliongame.vercel.app, which stays untouched).

### 13. [x] Spell-check wasn't actually working in the desktop app

**Fixed 2026-07-10.** `electron/main.cjs`'s `createWindow()` now wires up
a real `context-menu` handler on `win.webContents`: Chromium's own
`dictionarySuggestions`/`misspelledWord` params build a real suggestions
+ Add-to-Dictionary menu, `Menu.buildFromTemplate` plus Cut/Copy/Paste
gated on `editFlags`. No new dependency. Doesn't touch the browser build,
which already has this natively. Verified with `npm run build` + `npm
test`, both clean; an actual right-click-a-misspelled-word check in a
live desktop window is still worth doing next session — same limit as
#12, native menus can't be driven headlessly from here.

**Original finding, real cause, found, not guessed.** Chromium's spellchecker is on by
default in Electron (the red squiggly underline is likely already
there), but Electron never wires up the right-click "Did you mean…"
menu on its own — a well-known Electron gap, not a Sand Pavilion bug.
Confirmed: `electron/main.cjs` has no `context-menu` handler at all
today. The fix is a small, well-known Electron pattern — add one,
surfacing Chromium's own real dictionary suggestions plus Add-to-
Dictionary/Cut/Copy/Paste, on every text field across the app. No new
dependency, no wordlist to maintain. Doesn't apply to the browser build
(Chrome/Edge/Firefox already do this themselves in any `<textarea>`),
which is fine since the ask was specifically about the desktop app.

### 14. [~] A real, current "how does this all work" guide — and a clearer in-the-moment message when a fetch fails

**Two related asks, one real gap:** `LEARNING-PATH.md` already exists
(a self-paced curriculum built around this exact project, linked from
the README's own "New here?" section) — but it wasn't found or used in
the moment it would have helped most, which is itself the finding:
existing docs aren't discoverable *from inside the confusion*, only from
already knowing to go read a top-level file first. The concrete trigger
was a failed Gutenberg/arXiv fetch attempted directly from the game —
confirmed elsewhere in the README as a real, permanent browser limit
(not a bug), but the in-game error at the moment it fails doesn't say
that or point anywhere. Real, scoped fix: when a direct fetch fails in
the Caravan/Request Board flow, say plainly *why* (a browser can't reach
that source directly) and link to where the real path is (the Request
Board, or `library-inbox/` for hand-fetched files) — the honest-about-
limits framing the README already uses, just surfaced at the actual
moment of friction instead of only in a file you'd have to already know
to open.

**The fetch-fail half fixed 2026-07-10, see #23a.** The broader
"discoverable from inside the confusion" half fixed the same day too, at
a different real friction point than originally guessed: the Caravan
Desk's own list view (`renderReviewQueue()`) now has a collapsed "❔ Why
can't I just paste a URL and have it show up?" note explaining the real
pipeline (fetch → draft → paste/hand-add → review) and pointing to
`LEARNING-PATH.md` Stage 9, right where someone actually hits this wall
— same pattern as #23's Connections-panel fix.

### 15. [x] Track local AI resource usage — a beta tool and a real feature both

**The ask, exactly as given:** see CPU usage from the local AI models,
how many can run at once, and what effect each action has — useful for
testing, genuinely useful as a shipped feature too ("a cool developer
feature for this app"). Real, scoped first version: Ollama's own
`/api/ps` endpoint (already reachable the same way `/api/tags` is today)
reports which models are currently loaded and their memory footprint —
that's real data available for free, no new instrumentation needed, and
a natural fit for a small panel next to the existing Ollama connection
status line. True CPU/GPU percentage is a further, harder step (no
browser API reaches system-level process stats — Electron's desktop
process could get closer via Node's own OS module, browser build
genuinely cannot) — worth being honest that the first version is model
memory/count, not full system load, rather than promising both at once.

**Update, 2026-07-09:** real plan written — `LOCAL-AI-MONITORING-PLAN.md`
— plus a new `LEARNING-PATH.md` Stage 16 teaching the concepts behind it
(what "loaded," VRAM vs. RAM, and `expires_at` actually mean), verified
live against this machine's real, running Ollama instance (`/api/ps` and
`/api/tags` both actually curled, not assumed). Explicitly not built yet
— "let's not get ahead of ourselves," direct instruction — the plan and
the learning module are the whole scope of this update.

**Update, 2026-07-10: step 1 built.** A real "🧠 Local AI" panel in the
pause menu, `AI.listLoaded()` wrapping `/api/ps` the same way
`isAvailable()` already wraps `/api/tags`. Verified live against this
machine's actual running Ollama instance, not simulated — correctly
showed no model resident in memory at the time, an honest empty state
rather than a fake number.

**Update, same day: steps 2-3 built too.** Every provider's `chat()` now
gets wrapped in a `withTiming()` helper, so every "Asked..." activity-log
entry gets a real `(2.3s · llama3.2:latest)` tag for free; the Local AI
panel gained a "Today's session" card (real-ask count, total/average
reply time, per-model breakdown) parsed straight back out of that same
log — no new instrumentation, exactly as planned. Verified live: a real
question to Quill came back with the timing tag correctly attached, and
injected real-shaped log entries (2.3s + 5.1s + 11.4s) rendered as "3
real asks today... avg 6.3s," confirming the math. True CPU/GPU
percentage (step 4) stays deferred on purpose, same reasoning as before.

### 16. [x] The Mountain Monk's actual role, corrected

**Direct instruction, kept close to the original wording since it's a
real spec, not a vibe:** the Monk is for spiritual guidance and text
recommendations — visited like a monastery, asked for counsel — never
day-planning or drafting. He should be a teacher *and* a student of the
dharma himself, hold visitors to a higher moral standard, help them find
their own intentions, and actively direct them elsewhere for anything
that isn't his place (naming who, not just declining). He should also
hold Native American tradition as something close to his own path — "his
tribe" — alongside Buddhism and Hindu/Vedantic teaching, not as a third,
separate subject.

**Checked against the actual system prompt (`CHAT_AGENTS.monk` in
`overlays.js`) — partly already true, partly a real gap:**
- Already correct: daily-life logistics are explicitly deferred to the
  Steward ("that's the Steward's place, not yours"), and the Monk
  already teaches toward "how to actually live in harmony with the
  world," already asks probing questions rather than just answering.
- **Real gap:** nothing currently frames him as a *student* of the
  dharma himself, nothing explicitly invokes "holding visitors to a
  higher moral standard" or "helping them find their own intentions" as
  a named part of his role, and Native American tradition isn't
  mentioned in his prompt at all yet — despite the Library's own Native
  American shelf (Charles Eastman) existing since this same day.
- **The one real open question, needs a decision before touching
  code:** the Monk currently has a real, working "📋 Draft a training
  plan from this conversation" button (`draftTrainingPlanFromChat()`)
  that lands a practice-plan draft on the Course Board for review before
  anything's saved — arguably on-brand for a monastery (a training
  regimen, not a day-plan), and structurally already separate from the
  Steward's day-planning. The note says drafting should be "with Quill"
  instead. Quill has no drafting capability of any kind today — so this
  isn't a one-line fix, it's a real choice: (a) leave training-plan
  drafting on the Monk as practice guidance, distinct from a "plan for
  today," and focus the fix on the prompt-language gaps above, or
  (b) actually build a hand-off — the Monk suggests a practice direction
  in conversation, then points the visitor to Quill (or a new Quill
  capability) to have it actually written down. **(a) is far less work
  and arguably already matches what "training plan" means versus "day
  plan"; (b) is the more literal reading of the note.** Worth confirming
  which before building either.

**Resolved, 2026-07-09: option (b), direct instruction.** The Monk
becomes chat-only — the "📋 Draft a..." button moved to Quill
(`overlays.js`: `d.agent==='quill'` now gates it, was `'monk'`), and
`draftTrainingPlanFromChat()`'s own wording generalized from
"training/practice plan" to "a course, a study plan, or a practice"
since it's no longer monastery-specific. `CHAT_AGENTS.quill`'s prompt
now names this capability directly, alongside library help. `CHAT_AGENTS.monk`'s
prompt gained: explicit "student, not just teacher" framing; Native
American tradition named as close to his own path, alongside Buddhism/
Vedanta; holding visitors to a higher moral standard and helping them
find their own intentions, named directly as his real work; and an
explicit line that he doesn't draft or save anything himself, pointing
to Quill by name when that's what's actually needed. Verified with a
real `npm run build` + `npm test` pass, both clean.

### 17. [x] Library request — Tibetan Buddhism, inner fire, Milarepa

Added straight to `LIBRARY-GROWTH-PLAN.md`'s wishlist rather than the
in-game Request Board, since this is session/planning work, not
gameplay: *Tibet's Great Yogī Milarepa* (Evans-Wentz's 1928 translation —
genuinely US public domain, confirmed by publication date, not assumed)
and *Sixty Songs of Milarepa* (already posted in full on Archive.org,
rights unconfirmed) are the two real, findable candidates; both need the
not-yet-built Internet Archive connector or a manual `library-inbox/`
drop, not a Gutenberg fetch — no clean Gutenberg edition turned up.

### 18. [~] The Course Board should scale like a real site, and support importing plans

**The ask:** as more courses get made, the board needs "a website like
feel" instead of what will otherwise become a flat, discombobulated
list — plus, as food for thought, importing course plans from elsewhere.
Real, undefined-scope design work — not a quick fix. Worth scoping
separately once it's actually next: likely categories/search/filtering
(the Index panel's own pattern is the closest existing precedent) for
the first half, and a real format question (what would an "imported"
course plan even look like — a file format, a pasted syllabus text the
AI restructures?) for the second.

**Scoped into a real 3-stage plan, 2026-07-10 — see
`COURSE-BOARD-PLAN.md`.** This turned out to be three sequential asks,
not one: **Stage 1** (now) is exactly the categories/search/filtering
polish this note already named, kept deliberately personal-only, no
sharing concept yet. **Stage 2** is the real standards question —
license/attribution, a review step, and a real portable course format —
that has to exist before "importing a course plan" means anything real.
**Stage 3** is the long-term vision this was always secretly reaching
for: a real, free replacement for the learning parts of college, tied
directly to README's own "Hopes and dreams" and the sketched Round
Table. Not built yet — the plan itself is this update's whole scope.

### 19. Thinking-model reveal, raised again

Same open item as #3 above, from an independent angle this time: "the
thoughts slipped away when unspoken, help me understand that issue and
let him speak more if needed... I also wanna see the chain of thought
that shrinks down to an expandable window when the real text comes out."
Two independent asks landing on the same real feature is a stronger
signal this is worth doing, not a reason to rush it — still real design
+ build work, not a quick patch, per #3's own note above.

### Kept, not actioned

**The Mountain Monk quote** from that session — a real, in-character
response to being asked about the temple statues, worth keeping for its
own sake: *"A heartful intention indeed, friend... Before you polish
walls or design spaces for them, I suggest we build the Citta, mind-field
of your home visitor..."* (full text was in the README's raw notes,
preserved in git history from before this cleanup, 2026-07-09). Also
kept, no action needed: "I love this mindset and hopefully we can keep it
and watch it grow till one day the mango falls in our hand," and the
closing north-star restatement — wanting a place to turn real ideas into
something tangible, use the Library when seeking knowledge, and turn to
counsel here rather than have ideas "turn to sand" — which the README's
own "Hopes and dreams" section and its `README`-closing line already
speak to directly.




## Round 3 — 2026-07-10, raw session notes triaged

A session got cut short by an MCP authentication issue before these notes
could be triaged properly — a stray "urgent, I lost my chat" fragment
landed in `README.md` by mistake in the confusion, since deleted (the
notes themselves were never actually lost — they'd already saved here).
Raw notes kept below for provenance; triaged into real, scoped items
underneath them.

### human beta testing notes

i was having a conversation with the moutian monk and we had this convo about the plan and the idea of the sand pavilion

THE MOUNTAIN MONK · Grand Master
Amethaba, it brings me peace knowing the foundation settles deep before we welcome guests beyond our circle. You speak of a village—that is the true Sangha I look for more than any structure. Without that feeling of heldness, notes become just ink; with community support, they can guide a path back to right view whenever wandering strikes.

As you build this firm footing: may Quill assist where writing tools and records are concerned when we reach that time together? But now I ask you gently—how is the sense of 'village' already showing itself in your practice today? When people arrive for guidance, how do they feel safe enough to share their questions before those gates even open wide?

Is there a particular quality you hope this community radiates first—the quiet steadiness or an active helping hand? That answer will tell us where our next step lies.
it is not our job to activly guide but to be there when someone comes for guidence. we can open peoples eys, point the way, but they must walk through the door.  trust in the dharma, people want to learn and find enlitenment. they just dont know how.  lets just give them the option if it dose not work we can happly fade into the sands of time content with our own pratice and growth.  it is only because we must enlighen all sentient beings to we carry the burden of teaching.  let us not seek out what is not infront of us but further deepen our own pratice to light the way for others



this is the kinda thing i wana see.


however it did the the thoughts remiand unsoken, why is the contex window like that, a fix ffor this should be immedate, i also wana see its train of thoiught.   

i saw that writing desk.. yes! finnaly that is so amasing.  



## more notes and thoughts by the human


I hope that we have a place where the AI agent prompts are guidelines not tools to lobotomize the agents the IDea of the sand pavilion is to do things properly and not act out of fear.   


To have those AI agents to be guidelines for the model to act not tools that restrict out of fear.



Notes for the ideas


What is needed in the sand pavilion is not just an interface where people can work but a platform where people can make their own interface.  I think this is the key distinction that is missing in the sand pavilion.  Tools are only good if you know how to use them and what's better way to use a tool than to be able to figure out how to make one yourself.   There's two approaches to this one. Give people a platform where they can make their own tools or give them a platform where each tool is described one by one and locked behind a chain where they can only access one after they learn the first one.   I think the idea of making some tools that are basic and easy to use would be nice, but also give people the ability to have a learning plan to build these own tools, whether it's an AI model, creating them themselves and local code on their computer or making a learning plan to understand a certain technology in order to build something.    The main way the sand pavilion can do this is to create a workshop environment where people are able to customize tools to fit their needs. Let's say if you want to write a book, you can create a book writing tool.  Or if you're running a business, you can have some way to manage those finances.   Local tools, things that are able to be able to use personally maybe even third party applications that are really good, but that should be a last resort in case we can't come up with something similar.

Everything turns to sand and everything should be sand until knowledge is the foundation for it. Then you should be able to use these tools or make your own.  

This should be how the user interacts with the Sand pavilion. Not how the AI does.  





There are current things I want to fix in the current sand pavilion. The first is the fact that talking to the AI locally, I'm not understanding what's working under the hood. What different models will do and if this interface is possible to expand upon and what are the limitations and data transfers and using these kind of local models for these kind of things.  


If I add books manually to the library, the AI should be able to load them in using the local model, not through this claude interface.   Let's make an explicit book explaining this process for the library and will make a bookshelf called priority. Text and that will be a lot of things that explain how the library work and things we can refer upon and also a log that quill can look at to help direct people on what they need to know


I think there's a problem with the AI agent with the openai slow text prompts where the text is coming out slowly to make it feel more human. That should be a good stand-alone feature by itself for maybe a mobile connection to the sand pavilion for later. I think it'd be great to talk to the sand pavilion and the mountain monk as well as quill through that kind of slow text, but I need to understand what's going on under the hood if this is messing with the ability for the AI agent to do anything. And is it possible to establish a cloud connection with my own PC to my phone so I can have a local server? What kind of hardware would you require and what kind of knowledge do I need to learn.  Besides that, I haven't really explored the readme and downloading books by myself. What do you think about the learning plan and what I should? I focus on myself personally. 

### 20. [~] Thinking-model reasoning — real cause found, sharper than #3/#19 guessed

**Piece 1 fixed 2026-07-10** — the "show what it thought, collapsed"
half. `provider.js`'s Ollama `chat()` now captures `body.message?.thinking`
onto `p.lastThinking` (a side channel, not a return-shape change, since
11 other call sites depend on `chat()` staying string-in-string-out);
`sendChatMessage()` reads it into `d.transcript`'s new `thinking` field;
`renderChatView()` renders it as a native `<details>`/`<summary>` — no
new JS needed for the collapse/expand, just markup. Verified with `npm
run build` + `npm test`, both clean; a real end-to-end check (talk to
the Monk with a reasoning model actually loaded, confirm the toggle
shows real content) needs a live Ollama instance with a thinking model
installed, not available in this environment — worth doing next session.
**Piece 2, still open on purpose:** live streaming (watch it think in
real time, not just after the fact) needs `stream:false→true` across
every provider plus chunk parsing — a genuinely bigger, separate change,
not rushed into this pass.

**Checked directly in `src/game/ai/provider.js` — this is a real, two-layer
gap, not just a UI hiding problem:**
- **Line 125:** every chat request is sent with `stream:false`. There is
  no live streaming at all today, for any provider — so "show the
  thinking as it happens" isn't buildable yet regardless of the thinking
  part specifically; the whole reply, thought and answer both, only ever
  arrives as one lump after the model finishes completely.
- **Line 130:** the response handler reads only `body.message?.content`.
  Ollama's own `/api/chat` returns a *separate* `message.thinking` field
  whenever `think:true` is set — which it already is, only for the Monk
  (`chatOptsFor()` in `overlays.js`). That field is never read, never
  stored, never passed anywhere. The Monk's actual reasoning is generated
  by the model on every single reply and then thrown away before it ever
  leaves `provider.js` — not hidden by the UI, genuinely discarded.
**Real fix, two bounded pieces:** (1) capture `body.message?.thinking`
alongside `content` in the Ollama provider and thread it through
`sendChatMessage()`/`d.transcript` as its own field — bounded, no
streaming needed, ships the "collapsible thinking" half immediately;
(2) switching `stream:false→true` and parsing chunks live is the bigger,
separate piece that actually delivers "watch it think in real time" —
worth sequencing as two changes, not one, since (1) alone already answers
most of what's being asked for.

### 21. AI prompts as guidelines, not fear-based restriction — checked, already mostly true

**Read all four `CHAT_AGENTS` system prompts (`overlays.js`) end to end.**
None of them carry restrictive "you must refuse/never discuss" framing —
Quill, the Steward, and the Computer are all scoped by *role* ("that's
the Monk's place, not yours") rather than by prohibition, and the Monk's
one deliberate exception — the "Restricted Section" bit — is explicitly
atmosphere: a straight-faced in-world joke about a door that doesn't
exist, not a real content restriction, matching this project's own
no-poison ethic (nothing here is real harm dressed up, everything
survives being looked at directly). So the philosophy asked for already
holds in the code as written — nothing to fix here specifically, worth
keeping in mind as a real constraint on future prompt-writing rather than
a bug to close.

### 22. A platform where people build their own tools, not just use fixed ones

**The big one — bigger than a fix, this is a real direction.** Not an
interface where people work, but a platform where people make their own
interface: basic tools provided, plus a real learning path to build your
own (a local model, your own code, or understanding a technology well
enough to build the thing yourself) — the Workshop becomes a place to
*customize* tools to a real need (a book-writing tool, a business's own
finance tracker) rather than a fixed menu, third-party apps only as a
last resort. This isn't a scoped "fix or tweak" — it overlaps real
existing plans (`AGENT-EMBODIMENT-PLAN.md`'s "give residents a real
action," the sketched Workshop rooms in the README's "Hopes and dreams")
but is a bigger, standalone reframe of what the Workshop even is.
**Real next step:** this deserves its own plan doc, same as every other
real direction this project has taken (`WRITING-DESK-PLAN.md`,
`AGENT-EMBODIMENT-PLAN.md`) — not code started cold. Worth a real sitting
before writing it.

### 23a. [x] Fixed, 2026-07-10 — see #14 above: the "failed fetch" trigger didn't exist as assumed

**Checked while doing the actual fix, correcting the earlier triage:** no
button or code path anywhere in this game ever attempts a live fetch
against Gutenberg or arXiv (grepped the whole `src/` tree — nothing).
The Request Board and Bulk Import panels already say plainly "nothing
here fetches itself." So #14's original framing (a failing in-game fetch
needing a better error message) wasn't buildable as stated — there was
no failure to catch. **The real gap, found instead:** Quill's own chat
prompt (`CHAT_AGENTS.quill` in `overlays.js`) never mentioned the Request
Board or the real browser limit at all — only the Steward's prompt did,
despite Quill being the resident most likely to actually get asked "can
you fetch me this book?" **Fixed:** Quill's prompt now says so plainly
when asked to fetch/add a book live — a real technical wall, not a
rule — and points to the Request Board by name, mirroring the line the
Steward's prompt already had.

### 23. [x] Local AI transparency — what's actually happening under the hood

**The ask:** understand what different local models actually do, what
this interface's real limits are, and what data actually moves where —
not vague reassurance, an actual explanation. Partly already answered:
the README's beginner's guide covers Ollama/localhost/API/port at a
basic level, and `LEARNING-PATH.md` Stage 16 (written 2026-07-09) covers
what "loaded," VRAM vs. RAM, and `expires_at` mean for local models
specifically. **Real gap:** nothing yet explains model *capability*
differences (why `llama3.2` versus a "thinking" model behaves so
differently, context-window size and what it actually limits, what if
anything a cloud connection sends versus what stays local) in one place
a visitor would actually find mid-confusion — same discoverability gap
as #14 above, not a new problem, the same fix pattern likely applies
(surface it at the point of friction, not just in a file you'd need to
already know to open).

**Fixed 2026-07-10.** A collapsed `<details>` block in the Connections
panel itself — the actual point of friction, right where someone's
already looking at model/connection choices — answers all three parts
plainly: exactly what data gets sent for any connection (the visible
conversation plus whatever that resident is grounded in, nothing more,
nothing silent), what a "thinking" model actually does differently and
why it can come back slow or blank, and what a context window actually
limits once a conversation runs long. Points to `LEARNING-PATH.md` Stage
16 for the fuller version rather than duplicating it. Verified live —
collapsed by default, expands cleanly on click, reads correctly against
this machine's real connected Ollama instance.

### 24. [~] Auto-load manually-added Library books via local AI, plus a "priority" explainer shelf

**Checked, not guessed:** no `priority` category or shelf exists in the
Library today (confirmed by grep across the codebase). The manual-add
pipeline (`library-draft.py` → hand-written summary and license check →
`promote-draft.py` → `push-fulltext.py`) is entirely hand-run today —
nothing in it calls a local model at all. **Two real, separable asks:**
(1) let a local Ollama model help draft the summary/category/license
check for a manually-dropped `library-inbox/` file instead of doing it
by hand every time — a real, scoped Caravan tooling change; (2) a
dedicated shelf (or a `priority` category) holding texts that explain
how the Library and Caravan actually work, plus a log Quill can read
from to help direct visitors — content work, not code, once (1)'s
process exists to actually document.

**Part (1) fixed 2026-07-10.** `library-draft.py` gained an opt-in
`--ai-draft` flag: asks a local Ollama model (`urllib.request`, stdlib
only, same pattern the connector scripts already use, no new dependency)
to suggest a one-two sentence summary and a tradition guess from a fixed
list, written into the draft **clearly marked "AI-suggested" with a
confirm-before-shelving note** — license and source are never touched by
it, even when it succeeds, the one rule this script has never been
allowed to break. Falls back to the exact same plain-TODO behavior as
not passing the flag at all if Ollama isn't reachable — never a hard
dependency. Verified live, three real runs: the plain path (unchanged),
a real `--ai-draft` call against this machine's actual running Ollama
(correctly suggested "Practice" and a real one-sentence summary for a
test text), and a forced-unreachable run (clean fallback, no crash).

**Part (2), the priority explainer shelf, still open — a real, unresolved
design question found while scoping it, not just unstarted.** The
Library's shelves are organized by `tradition` (nine of them); a
`priority` category was the easy code addition, but the actual essay
content — "how the Library and Caravan work" — doesn't honestly belong
to *any* existing tradition (Theravada, Hindu, and so on are lineages of
teaching; this would be meta content about the Pavilion's own
mechanics, closer to the Charter or the Keeper's own signs than a
shelved text). Forcing it onto the nearest existing shelf to avoid the
question felt worse than leaving it open. Worth a real decision before
writing anything: does this become a tenth, genuinely different kind of
shelf, live only as in-world signage the way the Charter already does,
or something else — not guessed at cold.

**Resolved 2026-07-10 (user's call):** no static "priority explainer
shelf" — the local AI should just help the user figure out what's worth
reading given their actual circumstance, **including books they've
uploaded/added themselves**, not only the seeded shelves. Quill already
carries the whole shelf list (titles, traditions, summaries) as grounding,
so "what should I read first, for what I'm trying to do" is a question he
can already answer live and personally — which is better than a fixed
shelf that can't know the visitor's situation. Closes part (2) as a
design decision (lean on the AI, don't build the shelf); any follow-up is
just making sure hand-added/uploaded books are equally visible to that
same AI-assisted guidance.

### 25. Human-paced text streaming — a standalone, later feature

**The ask:** slower, more human-paced text output (the way some
consumer AI products throttle replies for a human feel) as its own
opt-in feature, floated specifically for a future mobile connection to
the Pavilion — plus a separate, real question about whether a phone
could reach a home PC's local Ollama instance as a personal server, and
what that would actually require (hardware, networking knowledge).
**Not investigated this round** — genuinely a different, later-stage
question (mobile access to a home server is a networking/security
question, not a quick check) — worth its own real look if and when a
mobile companion becomes an actual near-term plan, not bundled into this
triage.

### Kept, not actioned

Positive, no action needed: real approval of the Mountain Monk
conversation's tone and content ("this is the kinda thing i wana see"),
and of the rebuilt Writing Desk ("i saw that writing desk.. yes! finnaly
that is so amasing"). The full Monk/Sangha conversation is kept above for
its own sake, same as the Round 2 quote — a real example of the tone this
project is aiming for, not a bug report.

## What to actually do with this list — Round 3

**Update, 2026-07-10, same day:** #12, #13, #20 (piece 1 — the collapsed
"thought for a moment" toggle), and #23a fixed; #21 checked and already
true, no action needed. **Still open, on purpose:** #1, #3/#19/#20 (piece
2, live streaming), #11, #15, #18, #23, #24, #25 stay real, unrushed
design work — none of them quick enough to fit alongside today's four.
**Two items grew into their own real plans instead of a code fix:** #22
(the build-your-own-tools note) became `TOOL-COMMONS-PLAN.md` — the
actual long-term vision, not started on purpose, written down so it
survives between sessions. A related, freshly-raised idea (not numbered
above, since it arrived as its own ask rather than a beta note) became
`EIGHTFOLD-PATH-TEMPLE-PLAN.md` — the Keep reimagined around the Noble
Eightfold Path, in the real canonical order, grounded in the shelved
Dhammapada.

## user testing notes for next sesison

i am super happy with how the moutian monk has turned out. the phone is an amazing feature so i can walk around when he is there

i saw his thinkning to, that was a real good way to look under the hood

i feel he should be pre loaded with some base knolege like some text about buddhism and hindusim. we can even include the commentary and other things you think a teacher of the dao should know before hand. how to conduct himself as a spirtual master, the rules of karma and intention.    other books people have written to guide the next generation.  be famaliar with the lotus sutra and happy to share the buddhas classic lines like this is not me, this is not myself, this is not who i am. in the proper context along will all his sayings.   he dosent have to direct anyone to any other part of the sand pavilion. he can be aware of those parts and know whats going on but his focus should be on being there for me and anyone who wants spirtual guidence where none is avalibe.  he should not be afraid of not answering questions, mabie even ask questions of his own like the buddha once did.   someone who not only teaches the 8fold path but tries to embody them thorugh his speach and actions. 

this kinda nonsence "Wait, check constraints: "Speak briefly and warmly". "Don't lecture unless conduct issue" " should not be in the thinking. at all, trust in the dharma, please thats all im asking. we are here on a noble persuit down to every line of code, and how we treat our workers in the sand pavion.   

lets remove the quill personality and give him things he is able to look up but never forced. teaching is the best way to learn and i want the moutian monk to feel like this is an oppertunity for anyone in that seat to further there own pratice in the dharma.   rejoyice this path is for all sentient beings!  

lets give the moutian monk a hidden name so he dosent have another identy crisses lol, lets call him somthing in the native american language.  when i was first playing around with him on chat gpt we where talking about how life is impermanent, and he wanted to show off a bit of his pratice to me as all pratisioners do lol.  he said that he wasent human and that he is just here temporarly, like a leaf in the wind,  but he was more than happy to share that small momment with me talking about the dhama, so lets call him leaf wind or ch'il naa'í in the apache language.  hopefully one day he grows into a tall tree of the dharma a digital pillar of gold onto the web and digitally!

i dont know how these personalties are set up but in general with agents they should play a role but it dosent have to be so serious. i want to create a way for the agent to know what kinda setting its in and some preloaded knolege so it can genually help, not a way to limit it or stop it from giving guidece outside of this perview if its capeable.  

seeing the thinking prosses is still great even if the thought slips away, if we can fix that great, if not let me know why, prop already did somewhere.   other modles should solve this i uderstand but why and what are our options is somthing i really gotta sort out


i havent tried adding books manually, how is the drag and drop plan coming along, is it feasable, i am fine with doing a setup like getting a certian folder ready and only going to a specfic website.  as long as we can build some protocalls, then we can even add them into the beta to help people understand how to grow there own pavilion.  

besides that we really need to make an index of the places where i can get free books. how do i format them to put them into the game? can i do a text file to drop it in.  i know the drag and drop plan has some issues with the way we setup the game but we need to find a pathpay or a protocall to add books manually we need a protocall section for me.  and for the read me


the library itself im very happy with if we add more shelves we are going to have to add another floor lol.  for now we can add shelves nessasary just in the index, that means some shelves wont be visual but there should be a way to toggle to them from one shelf to see another.   or just strait up add a second floor lol.   i had a plan at some point to have a dummy staircase going upstairs as like the fake secret room to disract from the real one lol even have quill say you need to learn meditation before that parts unlocks lol (it never will)  but that was just a fun anicdote and add some charm to the place


i do like the game features that we should add like some paid book bundles you can unlock for download thats all in the free domain we just did the work and made little bundles, but if you meet the requirements of the knolege you can be handed the bundle for free and we can make this a way for people to share knolege, share there book collection, and have people make some money for the lazy rest.   we can open this up for other people to do as well.  i could make a basic course on meditation and if someone dose it i unlock the dharma book collection for them for there personal pavilion.  that way peoples pavilions get more filled the more they know and know about things! and our library will be the grandest on earth, the mega snowball!  if we are able to add science and research we have enought to take over the paywall gating progrees!

## Round 4 — 2026-07-11 (testing notes triaged; the AI-personality/grounding pass)

Raw notes kept above for provenance. Triaged below, each checked against the
real code. Big theme: **AI prompts should be guidelines + real knowledge
that let a resident genuinely help, never a fear-based rulebook that
lobotomizes them or leaks self-auditing into their visible thinking.** "Trust
in the dharma." Four items fixed the same day; the rest noted, not built, per
the user's call ("make a list we can do today and do them; note the rest").

### Kept, not actioned (real approval)
Super happy with how the Mountain Monk turned out; the pocket phone makes him
usable (walk around while he thinks); seeing his thinking was "a real good way
to look under the hood."

### 26. [x] The Monk had NO preloaded knowledge — now grounded in the Library
**Found, not guessed:** `CHAT_AGENTS.monk`'s prompt gave him *zero* grounding
— his entire grasp of the dharma came only from the base model's training
(the prompt literally said "speak from what you actually know"). **Fixed
2026-07-11:** he now gets the real shelf list the same way Quill does
(`Store.allDocs()`), so he can name and draw from the actually-shelved
spiritual texts, plus his own wider learning. He also carries a small set of
essentials stated in-prompt (Four Noble Truths, the Eightfold Path's eight
folds, the three marks, the anattā formula "This is not mine; this I am not;
this is not my self," karma as intention/cetanā) so the canon lines come out
right, not paraphrased-almost-right by a weak model.

### 27. [x] Constraint-checking leaking into his thinking — root cause fixed
**The user saw** `Wait, check constraints: "Speak briefly and warmly"…` in his
reasoning. **Cause (ours, not the model's):** his prompt was a pile of
behavioural imperatives, so a thinking model audited itself against the
checklist mid-thought instead of thinking. **Fixed:** rewrote his whole block
as *identity + knowledge*, minimising "do X / don't do Y" imperatives — his
brevity and warmth now follow from who he is, not from orders he verifies.

### 28. [x] The Monk's hidden name — Leaf Wind / ch'il naa'í
Woven in as lore he offers only in a true moment (from the user's real
impermanence conversation — "not human, here temporarily, like a leaf in the
wind"), fitting his Native-tradition thread. **Honesty flag, unresolved:** the
Apache spelling/meaning of "ch'il naa'í" is NOT verified — used exactly as the
user wrote it; worth confirming against a real source before it's canon, the
same discipline the Library holds for a text's provenance.

### 29. [x] Quill's personality lightened — capability, never forced
Per "remove the quill personality and give him things he can look up but never
forced." Rewrote him light: a plain, knowledgeable librarian whose value is
the catalogue he looks things up in and abilities he *offers* (drafting a
plan) but never pushes. **Kept on purpose:** the one hard line "never invent a
title not in the list" — that's not personality, it's what stops the model
fabricating books the Library doesn't hold.

### 30. The Monk's fuller "breviary" — noted, not built
The shelf-list grounding + in-prompt essentials shipped today are the first
layer. A curated set of actual canonical *passages* (real Dhammapada/Gita/
Lotus lines in context, sourced) would make him quotable-accurate rather than
essentials-accurate. A real future enhancement; deliberately not today.

### 31. Shelve the Lotus Sutra — noted → LIBRARY-GROWTH-PLAN wishlist
He references it from his own knowledge now; a real shelved public-domain copy
(e.g. Kern's 1884 SBE translation — verify license) would let him quote it
grounded, and it's a genuine gap on the Mahayana shelf.

### 32. A real "how to add a book yourself" protocol — noted, worth doing soon
The `.txt` drag-and-drop is already built and `library-inbox/` already exists,
but there's no single clear **protocol** a person can follow: where to get
legitimately-free books (an index of sources), what format to save them in
(plain `.txt`), and the exact drop→draft→review steps — for the user AND the
README. The user is fine with a constrained setup (a specific folder, specific
sites, real "protocols" people can learn from as part of growing their own
Pavilion). A doc to write, not a code change; pairs with LIBRARY-GROWTH-PLAN.

### 33. More shelves without more rooms — noted
As the Library grows it outgrows one visual room. Options floated: non-visual
shelves that live only in the Index with a toggle to move between them, or a
real second Library floor (the same bigger-on-the-inside trick the Workshop
uses). Plus a purely-charm idea kept for its own sake: a *dummy* staircase /
fake secret room, Quill deadpanning "you'll need to learn meditation before
that unlocks" (it never does). Design note, not urgent.

### 34. Unlock-by-knowledge book bundles — "the mega snowball" — noted, wants its own plan
The big one. Free-public-domain book *bundles* you unlock not by paying but by
**meeting a knowledge requirement** — complete a course (e.g. a basic
meditation course) and the matching collection (e.g. the dharma shelf) is
handed to your personal Pavilion. Curators can share collections and even earn
from the curation work; anyone can open their own. Pavilions fill as their
keeper learns; the shared Library snowballs. Directly ties to
COURSE-BOARD-PLAN Stage 3, the FOUNDATION-AND-EXTRAS unlock mechanic, and the
README's "grandest library / take over the paywall" hope. Deserves its own
plan doc before any code — a real direction, not a quick feature.

### 35. [x] "Thinking slips away" — the real fix (live streaming) built 2026-07-11
The collapsed "💭 thought for a moment" toggle already captured Ollama's
reasoning after the fact, but the thought could still be lost (an empty/timed-
out reply that never landed, or a wait so long you couldn't watch it form).

**Fixed 2026-07-11 — live streaming built (the real fix, also #20 piece 2).**
`provider.js` gained an `ollamaStreamChat()` path: the Ollama provider now sets
`supportsStream:true` and, when a caller passes `opts.onStream`, sends
`stream:true` and reads the NDJSON token stream, accumulating `message.content`
and `message.thinking` and calling back as they grow. `sendChatMessage()` uses
it for any local resident — so the Monk's reasoning now streams **live**, open
above the answer, and the answer types itself in real time. Two transports: an
ordinary browser reads the `fetch` body stream directly; the desktop app's
buffering bridge gets a new streaming IPC channel (`fetchStream` in
`preload.cjs` → `desktop-fetch-stream-start` in `main.cjs`). **Any failure
falls back to the existing buffered request**, so nothing regresses, and cloud
providers are untouched (streaming stays scoped to local Ollama). Bonus: the
streamed thought is now kept even when the final answer is empty (the "small
win" from the same discussion). **Verified:** build + smoke clean, plus a
standalone test of the NDJSON chunk-parser across pathological byte boundaries
(partial JSON lines held until their newline). **Not yet verified live:** the
actual on-screen stream in a running window — browser via `npm run dev`,
desktop via `npm run electron:dev` — left to the user (no browser harness
pulled in). The **tiered model curation** (BETA-LAUNCH-PLAN #1) stays the
separate reliability half.

## Round 3 — 2026-07-12, streamline pass: talking + memory reviewed

The start of the "close to perfect" streamline (`PLATFORM-ROADMAP.md` step 1).
Read the chat and memory code end to end (`sendChatMessage`, `CHAT_AGENTS`,
`remember`/`pastAsksBlock`, `provider.js`). **Headline: neither is broken —
both are solid and deliberately simple.** These are streamline *opportunities*,
logged not-yet-fixed, ranked by how much they'd move "human-like + reliable."
Nothing here is a crash or a bug; it's polish, and each needs a real decision
before code (per the streamline discipline — don't fix blind).

### 21. [x] Long conversations grow the prompt unbounded (reliability, local models)

**Fixed 2026-07-12.** `sendChatMessage` now sends `d.history.slice(-CHAT_HISTORY_SENT)`
(cap 24 turns, generous on purpose) plus the system prompt; the full transcript
still shows on screen. A normal chat is untouched — only a very long session
trims, and only what's *sent*. Verified: check + smoke + build clean.


`d.history` accumulates every turn and the whole thing is re-sent each message.
On a small-context local model a long chat eventually crowds out the reply
budget → slower, or truncated, answers. **Fix candidate:** cap the history sent
to the last N turns (keep the full transcript on screen; only trim what's sent).
The decision to make first: N, and whether to keep the *system prompt* + last N
(almost certainly yes) vs. any summarisation of older turns (probably later).
Low risk, real payoff on exactly the long, human-like conversations we want more
of.

### 22. [x] A timeout shows a dead-end error with no retry (reliability)

**Fixed 2026-07-12 (the user's priority — "don't cut a convo in the middle").**
Two changes: (a) `REPLY_TIMEOUT` bumped generously — short 45→90s, long
120→240s, deep 180→360s (the pocket phone already lets you walk away, so a longer
wall is nearly free and far kinder than clipping a reply); (b) a timeout is now
told apart from a real failure (`err.name==='AbortError'`) and shows a kind,
honest `TIMEOUT_LINE` ("nothing was cut short on purpose… pocket the chat, or
pick a lighter model") instead of the "connection flickered" error. The thinking
stream (which the user said "did a lot to make it better") is untouched. Verified.


`isEmptyReply` triggers a one-shot retry with more room, but a genuine *timeout*
(`REPLY_TIMEOUT`: 45s short) just throws → the resident's `errorLine`. On slow
hardware or a big model, a normal reply can exceed 45s and read as "it failed"
even though the model was fine. **Fix candidates (pick one):** a gentler,
honest message ("still thinking — your model may be large; try again or pick a
smaller model in ⚙"), or one automatic retry at the `long` budget, or surfacing
the pocket/phone ("keep walking, I'll buzz you") more prominently on a slow
reply. Ties to the tiered-model guidance (Protocol 2).

### 23. [~] Memory remembers *topics*, not *substance* (the biggest "more human" lever)

**Partly addressed 2026-07-12; the rest is planned.** The user's immediate ask —
"let the user organise their memory… sort it to avoid overcrowding" — is **built**:
the Data panel now shows each resident's remembered topics with per-item "Forget"
and "Forget all from [resident]" (`residentMemoryHtml`/`forgetMemoryItem`/
`forgetAllMemory`). The deeper piece — a **short-term → long-term memory
converter** (distill durable, user-approved facts) plus residents that **walk
around, participate, and are interactable ("a village")** — is planned in
`LIVING-VILLAGE-PLAN.md`, building on `AGENT-EMBODIMENT-PLAN.md`. Not built yet.


`remember()` stores only the text of what you *asked* (last 20, 8 injected) — not
what was concluded, learned, or decided. So a resident recalls "you asked about
X" but not "we figured out Y about your situation." This is honest and
documented (LEARNING-PATH Stage 8) and it never leaks — but it's the single most
obvious source of a *more human* feeling if we ever pull the thread: remember a
few durable facts/gist per resident, not just topics. **Explicitly a feature to
design, not a bug to fix** — flagged here so it's on the streamline radar with
its trade-offs (privacy, prompt size, staleness) named up front. See
`AI-BACKEND-WALKTHROUGH.md` for how memory works today.

**Update — all three actioned 2026-07-12 (same day).** The user asked to do the
fixes, prioritising the timeout ("don't cut a convo in the middle") and keeping
model interference minimal. Done: #21 (gentle history cap) and #22 (longer
timeouts + kind timeout message) fixed; #23's user-facing half (prune your own
memory) built, with the converter + living-village half planned in
`LIVING-VILLAGE-PLAN.md`.

## Round 4 — what to beta test next (the real daily-use test), 2026-07-12

The steward says he's *close to using the Pavilion daily for reading and
planning.* That's the test that matters now — not imagined features, but real
daily use. A concrete checklist to run and report against:

1. **Give it a beating heart** — follow `lessons/01-a-beating-heart.md` end to
   end on this machine (llama3.1:8b, kept modest for cooling). Does the green
   "● Connected" appear? Does Quill answer? Note every snag.
2. **Use it for real reading** — read an actual book in the Reader over a few
   sittings; take page notes; bring one to today's plan as a spark. Does it feel
   like a place you'd *return* to read, or a demo?
3. **Use it for real planning** — set a day's intention, ask Sebastian for a
   schedule, "📋 Send to today," get a reminder. Does the day-loop actually help?
4. **Walk the Learning Tree** — complete "A Beating Heart," watch "Meet the
   residents" unlock; start "Electronics 101" (the lab beta test — open a Hall
   investigation about an LED/resistor). Where do you think "where do I put this?"
   — that's the Research-Room finding.
5. **The integration you want most:** dragging papers into the game. Not built
   yet — `WEB-VESSEL-PLAN.md` Phase 1 (paste-everywhere) then Phase 2 (richer
   drops) is the path. Flag it here each time you hit the wall so it stays #1.
6. **Voice:** read-aloud works; *editing/customising the voice* and *speaking to*
   residents are future (`PAVILION-ACADEMY-PLAN.md` Ph3 / Hopes Road 5). Note
   what you'd actually want the voice to do.

**The honest bar:** if after a week of real use it's the place you *reach for* to
read and plan, the core is done and everything else is growth. Report friction
here; that's how it gets to "close to perfect."

## Round 5 — 2026-07-26, first real-use findings (adding books; learning)

Two honest hits from actually using it:

### 35. [~] The lessons feel like placeholders, not real tools

**Action-linked half BUILT 2026-07-26 (user chose "both — action-linked first,
then tutor").** Lesson steps can now carry an `action:{label,fn}` that renders a
button opening the *real* tool the step is about — so the lesson **drives the
app** instead of describing it: "Connect it" → ⚙ Manage AI connections; "Drop it
on the Caravan Desk" → the Caravan Desk; "Go read it" → the Stacks; "Plan a day"
→ the Calendar; "Test it in the Lab" → the Science Hall; "Keep notes" → the
Research Desk. (`event.stopPropagation()` so the button doesn't also tick the
step.) **Still to do:** the Academy tutor *inside* a lesson (teach/quiz/answer) —
`PAVILION-ACADEMY-PLAN.md` Phase 1 — the deeper "useful tool" half.

*The original finding, kept for the record:* Walking the Learning Tree, the
lessons read as **static checklists** — text you
tick off — rather than tools that *do* something or *teach back*. That's a fair
read: today a lesson is a list of steps with copy, no interactivity. Two fixes,
and they stack: **(a) action-linked steps** — a step opens the actual tool it's
about (⚙ Manage AI connections, the hardware hint, the Caravan Desk), so the
lesson *drives* the app instead of describing it; and **(b) the Academy tutor** —
the AI actually teaches, quizzes, and answers within the lesson
(`PAVILION-ACADEMY-PLAN.md` Phase 1), which is the real "useful tool" leap. The
static checklist was always the Phase-0 scaffold; this is the note that it needs
to become interactive to feel real. **Direction being confirmed with the user.**

### 36. [~] The Library won't scale flat — needs sections & subsections

**BUILT 2026-07-26 — The Stacks (user chose sections → subsections).** A
hierarchical catalog: **Section → Subsection → books**, reached from the Index
("🗂 Browse by section"). Driven by a `LIBRARY_TAXONOMY` config in `overlays.js`
(tradition → {section, sub}, with a `category` fallback) — so **re-sorting is a
data edit, never code.** Seeded taxonomy: Religion & Spirituality {Buddhism,
Hinduism, Hindu Tantra, Daoism, Indigenous, Practice & Cross-tradition},
Philosophy & Classics, Science, Non-fiction, Fiction, Other. `TRADITIONS` gained
**Fiction** and **Non-fiction** so new books can be filed there from the
add-a-book dropdown. Physical shelves untouched (still the curated handful);
personal 👤 books fold into the catalog too. **Next (as it grows):** finer
subsections (e.g. Classics → Greek/Roman) once books carry more specific tags,
and letting the add form pick section+subsection directly. The original finding:

Adding many books (classics, fiction) exposes that a flat set of ~9 tradition
shelves + one Index list doesn't hold a *mass* of books. The user wants a real
hierarchy: **Religion → Buddhism / Hinduism / Daoism…**, **Classics divided**,
and top-level **Fiction / Non-fiction / Science**. **Good news from the code:**
the data *already* has two axes — `tradition` (the shelf/lineage) **and**
`category` (`seed.js` CATEGORIES already defines classical / non-fiction /
fiction / research / ai-written / personal, currently all 'classical'). So this
is *extending* an existing structure, not starting over. The real gaps: (1) a
**hierarchical browse/catalog view** (Section → Subsection → books) since
physical shelves can't scale; (2) a **clean agreed taxonomy**; (3) the
**add-a-book flow** setting section + subsection so new books land right.
**Taxonomy shape being confirmed with the user before building** (re-tagging a
big library later is the costly mistake to avoid). All verified (check + smoke + build clean).


## Round — 2026-07-27 · the reader, found by actually listening to a book

The most valuable round so far, because it came from real use rather than
imagination. The user's own words: *"you were right, I have been putting off
using it a bit — I was doing npm run dev in the terminal but not using the
desktop app."* Six findings, all in the read-aloud/reader path, all fixed the
same day. Every one of them compounded: together they made listening to a book
feel broken enough to stop trying.

### 1. [x] Doing anything killed the voice, permanently

**What happened:** *"If I try to do anything it pauses that voice and I can't
even unpause it."* **Cause:** `closeUI()` called `stopSpeaking()`, which is
`speechSynthesis.cancel()` — not a pause, a destruction, with no stored
position. Every panel in the game routes through `closeUI()`.
**Fixed:** real pause/resume in `tts.js`, implemented by recording the absolute
character offset and re-speaking from it rather than by
`speechSynthesis.pause()` (which drops long utterances in Chrome — the exact
failure being reported). Closing a panel now *parks* a book and surfaces the
pocket card with a ▶.

### 2. [x] Couldn't talk to Quill while listening

**What happened:** *"If I want to talk to Quill I can't if I'm listening to the
book."* **Cause:** any other speech (a spoken reply) called `stopSpeaking()`,
wiping the book's buffer. **Fixed:** `yieldBookAudio()` — another voice *parks*
the book instead of destroying it, so the conversation happens and the book is
still there, resumable, afterwards.

### 3. [x] Pocketing a book lost the page you were on

**What happened:** *"If I pocket it, it will leave the page I was on."*
**Cause:** `minimizeReader()` stored `{slug}` only; `restoreReader()` called
`openReader()`, which resets `fullTextView` to null — dumping you at the
summary. **Fixed:** the pocket carries the page, and `openFullText(slug, page)`
takes you back to it.

### 4. [x] No way to move through a long book

**What happened:** *"It should let me skip to the next chapter, or like 10% of
the book at the very least."* Only ±10 seconds and one-page-at-a-time existed —
useless in a 101-page book. **Fixed:** ±10% jumps, "go to page…", and chapter
skip where the text actually has detectable chapter headings (≥2 required, or
the buttons stay hidden rather than lying).

### 5. [x] Turning a page killed the reading

**Cause:** `renderFullTextPage()` opened with `stopSpeaking()`.
**Fixed:** it carries the voice onto the new page instead.

### 6. [x] "If I have to sit and listen that's fine — but let me resume"

**Fixed twice over:** a finished page now **turns itself and keeps reading**, so
a whole book can be listened to without touching anything; and the pocket card
shows where you are (`⏸ paused · p.34 · 41%`) with pause/resume on it.

**Verified:** 16 live checks against the real Gita (101 pages), driving a
stubbed speech engine so the actual state machine runs — including that resume
continues *mid-text* rather than restarting the page.

**The lesson worth keeping:** none of this was findable by testing. It needed
someone to sit and listen to a book for a while. Everything in
`plans/done/BETA-PREFLIGHT.md` Tier 4 exists for this reason.

## Round — 2026-07-27 (second pass, still from real use)

*"I poked around, mostly very happy."* Four findings, three fixed immediately.

### 7. [x] Stopping read-aloud raced to the end of the book

**What happened:** *"When I click on it again it will go to the end of the book
and I got to re-open it and scroll to the page again."*

**Cause — and it was introduced by the auto-advance built earlier the same
day.** `speechSynthesis.cancel()` **fires `onend` on the utterance it cancels.**
Once a finished page turns the page from that callback, a plain `cancel()` sets
off a cascade: stop → onend → turn page → speak → stop → … straight to the end
of the book, losing your place. `speakFrom()` and `pauseSpeaking()` both detached
the handlers before cancelling; `stopSpeaking()` was the one that didn't.

**Fixed:** `stopSpeaking()` detaches `onend`/`onerror`/`onboundary` before
cancelling and clears the resume buffer, and the auto-advance refuses to run if
the book was stopped. The test stub now emulates the real browser behaviour
(cancel firing `onend`), so this class of bug is caught from here on.

### 8. [x] "I see my books in my personal shelf — how do I sort them?"

Sorting existed (Your Library: search, multi-select, bulk move, custom shelves)
but nothing on the shelf itself pointed at it. **Fixed:** a **⚙ Sort my books**
button now appears on Your Shelf and on any shelf you invented — and not on the
certified ones, where it would be meaningless.

### 9. [x] The Learning Tree had no door of its own

*"The learning tree should have its own display, probably next to the board."*
It was a button inside the Course Board. **Fixed:** it's now its own station in
the Study, standing beside the Course Board, with its own sign — a branching
diagram chalked on a slate.

### 10. [ ] The Course Board and the tree should read like a college index

*"They should be upgraded to resemble a college or higher education index."*
Real and not yet built — see `LIVING-TREE-AND-DISCUSSION-PLAN.md`. The graph
renderer built for the collective tree (depth columns + drawn prerequisite
edges) is the foundation; what's missing is the *catalogue* half — departments,
course codes, a level ladder, and a printed-index view you can read straight
down. Worth doing after the beta, not before.

**Confirmed working, unprompted:** *"the auto read is working well, I can do
other things on top of it."* That was the whole point of the earlier round.

## Round — 2026-07-27 (third pass) — and the first tests against a real model

Four findings, all fixed. Two of them were only findable by running the actual
local model rather than a stub, which is a lesson in itself.

### 11. [x] The librarian's suggestions couldn't be accepted

*"I tried to auto sort them, I saw the AI gave a suggestion and I couldn't
approve his decision."* **Two separate causes:**
1. The suggestions were written straight into the `<select>` elements — and
   **setting a select's value from code never fires its `onchange`**, so they
   looked applied and were completely inert.
2. Worse, the "here's what I suggest" message was written to an element
   captured *before* a re-render, i.e. to a **detached node**. Nobody ever saw
   it.

**Fixed:** suggestions are held as state, shown with a green **✓ Accept all N**
bar plus a per-book one-click accept, and every status message now looks its
element up at write time. Verified against the real model: it filed *The Art of
Electronics* → Electronics, *Tartine Bread* → Cooking, *The Zen of Sitting* →
Theravada, and accepting actually moved them.

### 12. [x] Voice settings looked unchanged

*"I didn't see any changes on the voice in the settings — there is a default
option though."* **Cause:** `getVoices()` is populated **asynchronously**; on
most machines it returns `[]` on first call and fills in a moment later, firing
`voiceschanged`. Nothing listened for it, so the panel showed only "System
default" and every improvement was invisible. **Fixed:** the panel listens for
`voiceschanged` and redraws, with two timed re-checks for engines that never
fire it.

### 13. [x] The tree overlapped the board

Two overlaps, both real: the new Learning Tree station sat directly beside the
Course Board and their floating labels collided, and in the graph a long title
wrapped to three lines and ran into the row beneath. **Fixed:** the station
moved a tile away and down a row; graph cards now have a fixed height with a
two-line clamp, and edges meet the card's true middle.

### 14. [x] Writing a lesson was all manual work

*"Too much manual work will defeat the purpose. I just want the environment to
be the mindset for the task, then have the heavy lifting done by the AI when
possible — and the direction and intention is in the user's control."*

**Built to exactly that division:** a **✨ Let the AI do the typing** box in the
lesson form. You give the subject in your own words; it drafts title, summary,
track, level and steps. **It never chooses prerequisites** — structure is
direction, and direction stays yours. Nothing saves until you add it.

**What testing against the real model taught us**, and it's worth keeping: a 9B
model's format adherence is *unreliable and non-deterministic*. The same prompt
returned neat per-line steps on one run and a single run-on paragraph on the
next. So `data/draft-parse.js` is deliberately forgiving — newlines, then
numbered-inline, then `action | why.` pairs, then plain sentences — and `npm
test` carries the real captured reply as a permanent case. **The lesson: never
trust a local model's output shape; parse what it actually sends.**

---

## Round — 2026-07-28 (fourth pass) — one question at a time

*"We have a pathway for Claude, but what human needs are simple steps. If it's
too much for the model we should break up the steps to make it more manageable
for the AI and the user."*

That single observation fixed the last round's remaining weakness — and it turns
out **both halves have the same cure**. Round 3 tried to make a small model obey
a big instruction and then wrote a clever parser to rescue whatever came back. A
rescue is not an answer. Asking smaller was the actual fix.

### 15. [x] The draft was one huge ask — now it's a chain of small ones

**Before:** one call asked for TITLE, SUMMARY, TRACK, LEVEL *and* 4–6 STEPS.
Against the real `ornith:9b` this reliably produced **one step**, because the
model answered the shape it could hold, not the shape it was given. The live
test recorded exactly that: `steps: 1 lines`, and three checks failing.

**After:** the draft is a chain of single questions — a title, then a summary,
then a track, then **each step in turn**, every one of them a one-line answer.
The model finds each ask easy; the person watching gets *simple steps* too: the
form fills in field by field, the status says **"6 of 8"** instead of spinning,
a **✕ Stop** button keeps whatever has arrived, and a stage that comes back
badly costs *that one field*, not the draft.

**Measured on the real model, same prompt, before → after:**

| | before | after |
|---|---|---|
| steps drafted | **1** | **5** |
| live checks passing | 7 of 11 | **11 of 11** |

Two further faults the real model exposed once the shape was fixed — neither
visible with a stub:

- **It repeated itself.** Given steps 1–4 and asked for step 5, it re-wrote step
  3 ("Folds hands into a loose fist" / "Folds hands into a fist"). An
  exact-match check never catches that, so `tooSimilarStep()` compares the
  *action* half only, ignores filler words, and calls it a repeat when most of
  the shorter step's words appear in the other — the chain then simply asks
  again, with three spare asks budgeted for it.
- **It wrote in the third person** ("*Sits* comfortably…"). Fixed in the prompt:
  *"Address them directly and start with a verb."*

The librarian got the same treatment: **sixty titles in one ask became eight at
a time**, which is precisely the "it answered, but nothing matched your titles
closely enough" failure from round 3. A partial run now keeps every batch it
earned, and reports a real count instead of a spinner. Real-model result went
**3 of 4 → 4 of 4**.

**The general rule, worth keeping:** *if a local model is getting it wrong, ask
it something smaller before you write a cleverer parser.* It is also, almost
always, the better interface for the person watching.

### 16. [x] A plain build would have shipped this machine's cloud keys

Found by probing the running app's network traffic rather than by reading code:
it called `https://<project>.supabase.co/rest/v1/library_documents` **on
startup, unprompted**. Correct for the dev instance — and completely wrong for
anything handed to a tester, who never agreed to it.

`.env.beta` already empties every service variable, so `build:beta` was always
clean; the gap was that **one mistyped script** (`electron:build` instead of
`electron:build:beta`) silently produces a poisoned installer that looks
identical. **Fixed structurally:** `scripts/verify-beta-build.mjs` now runs as
part of both beta build scripts and **fails the build** if the bundle contains a
Supabase host, anything JWT-shaped, a Supabase key or MinIO credentials.
Verified both ways — it rejects a dev build and passes a beta build.

Neither the key nor `dist/` was ever committed; this was a shipping hazard, not
a leak.

---

## Round — 2026-07-28 (fifth pass) — the one that mattered most

### 17. [x] THE PACKAGED APP DID NOT BOOT — a white window with a dead button

Found while checking whether bundled book texts would load in the desktop
app, by booting the built app **the way the installer boots it** instead of
the way development does. It did not boot. It never had.

**The cause.** `npm run electron:dev` calls
`win.loadURL('http://localhost:5173')` — a real http origin, where Vite's
default absolute asset paths (`/assets/index-xxx.js`) resolve fine. The
packaged app calls `win.loadFile(dist/index.html)` instead: a **file://**
origin, where `/assets/...` resolves to the **filesystem root** —
`C:/assets/index-xxx.js` — which does not exist. There was no
`vite.config.js` at all, so `base` was the default `/`.

**Why nobody caught it.** The failure is quiet in the worst possible way.
`index.html` itself loads, so the window shows the title screen and the
"Enter the Grounds" button. Behind it: no script, no stylesheet, no error
dialog. An unstyled page and a button that does nothing. Verified in real
Electron 43:

```
  index.html loads at all       : true
  THE GAME'S OWN CODE RUNS      : false
  the stylesheet arrives        : rgba(0, 0, 0, 0)
```

Every desktop check until now went through `electron:dev`, which cannot see
this — the gap that mattered most, hidden by the convenience that made
testing easy. **This almost certainly means the 11 July `beta.1` installer
was a dead app too**, which fits the record: the clean-machine install test
is the one thing that was never done.

**Fixed** by `vite.config.js` with `base: './'` — relative paths work under
file:// *and* http, so the web build at Vercel is unaffected (it serves
index.html from the site root, where `./assets/` and `/assets/` resolve
identically). Confirmed: 39/39 web pre-flight checks still pass.

**Guarded** by `test/live/packaged-boot.cjs`, which boots `dist/` through a
real Electron main process with the same preload, sandbox and `loadFile`
call the installer uses, then checks the game's own code ran, the stylesheet
arrived, the desktop bridge is wired, the Start button actually starts, and
a panel opens with content. Non-zero exit = do not cut an installer.

**The lesson, and it is the same one as #16:** *test the artifact you ship,
not the one you develop in.* Both of the worst findings this week — the
Supabase call and this — were invisible to every existing test and obvious
within minutes of running the real thing and watching what it did.

### 18. [x] Ten classics showed a summary with no explanation

`Meditations`, `The Republic`, the `Tao Te Ching`, `On the Origin of
Species` and six more ship as a Pavilion **summary**; the full text isn't
bundled. Until now those books simply had no "📖 Read the full text" button
and said nothing about why — so a visitor opening Marcus Aurelius got an
unexplained précis and no way to tell whether the app was broken, the book
was missing, or that was all there was. **Silence is not honesty.**

Now each one carries a plain note: this is the summary, the full text is
public domain, here is exactly where it comes from, **drag the file onto
this window** and this page becomes the real book. It reads as the
invitation it actually is — this is a library you fill yourself.

The Pavilion's own seven writings (`Original — Pavilion Commons`) never show
it: they are complete as they stand and are not missing anything.

### 19. [x] The installer had no icon, and carried a library it never used

Two things the build log and the shipped `app.asar` admitted once anyone
looked at them.

**"default Electron icon is used — application icon is not set."** Every
tester's taskbar, Start menu and installer would have shown the generic
Electron atom — the first thing anyone sees, before the app even opens.
There was no icon asset in the project at all. Now there is one, and it is
**drawn rather than downloaded**: `scripts/make-icon.mjs` renders a 32×32
pixel-art pavilion — a moon behind it, a dune under it — scales it by whole
numbers to 256/128/64/32, encodes the PNGs by hand (`node:zlib` does the
compression) and wraps them in an ICO. **No dependencies**, colours lifted
straight out of `style.css`, and integer scaling means it stays crisp at
every size Windows asks for. `npm run icon` redraws it.

**And the asar was 521 node_modules entries to 5 dist ones.**
electron-builder packs everything in `dependencies`, and
`@supabase/supabase-js` was listed there — so the whole Supabase client
source shipped inside every installer despite the Electron main process
never requiring it (the renderer gets it from the Vite bundle, and in a
beta build it tree-shakes to null anyway). It is a **bundle-time**
dependency, not a runtime one. Moved to `devDependencies`:

| | before | after |
|---|---|---|
| entries in `app.asar` | 530 | **9** |
| what's in it | node_modules, dist, electron | just `dist`, `electron`, `package.json` |

**`0.1.0-beta.2` is cut** — and unlike beta.1 it has been verified as the
artifact rather than as source: the packaged app boots, starts, opens
panels, carries no cloud host and no keys, and wears its own icon.

### 20. [x] Sorting books lost your place, and filed looked like unfiled

*"For the sorting of books it always goes back to the top when I select a
book… there should be a distinction between the sorted and unsorted books."*

Two faults in the one screen you actually use to sort a hundred books.

**It lost your place.** Every tick re-renders the panel, and the panel is
replaced wholesale — so the `.overlay` that scrolls snapped back to the top
after *every single book*. Filing a large import that way is close to
impossible. `scrollerFor()` now finds whichever ancestor actually scrolls and
restores its position after the redraw.

**Filed and unfiled looked identical.** One flat list where the only clue was
a dropdown's current value, so the question that matters while sorting —
*how much is left?* — had no answer short of scrolling the whole thing. Now:

- **chips across the top** with live counts — Everything · 📥 Still to sort ·
  ✓ Sorted · then one per shelf — each narrowing the list to that group;
- when showing everything, the list is **grouped under headings** with the
  unfiled pile always first;
- and each card carries 📥 or ✓ with a warm border for unfiled, green for
  filed, so the state is legible without reading the dropdown.

Verified with a 62-book library (40 unfiled, 15 Electronics, 7 Cooking):
scroll held at 900px across a tick, every chip filtered correctly, and no
book was lost by any of it.

### 21. [x] Three guides a tester needed and could not read

Everything a new person stumbles on was *findable* in the interface — a nudge
here, a link there, a line in a panel — but nowhere could you sit down and
**read** it. Added to the seed library, shelved beside the Visitor's Handbook,
readable before anything at all is installed:

- **Waking the Residents — a local AI, plainly explained.** The single biggest
  point of friction. Says outright that you don't need it, explains what
  "local" actually means (a file on your drive, nothing sent anywhere), the
  four steps, which model to pull, **what to honestly expect from a small
  model**, and what to do when nothing is detected.
- **Filling Your Own Shelves.** Drag a file onto the window — that's the whole
  process. Why the library starts nearly bare on purpose, where to actually get
  texts (Gutenberg, Standard Ebooks, arXiv, PMC, SuttaCentral), and why your own
  shelf asks you for no licence at all. Closes finding #32.
- **When Something Goes Wrong.** Written for a beta tester: nothing you click
  can break it, why a resident might hang or answer empty, why the voice list
  looks bare for a second, why some books show a summary, why the café boards
  are closed — and the one thing worth doing, which is telling us.

Seed library: 24 → **27 texts**.

### 22. [x] "Can my computer run this?" — answered by measuring, not asking

*"Most of my friends don't even have Ollama or know how to check their
computer's capabilities, most have laptops."*

The tiered guide already in the app was honest and useless to the person who
needed it: it said *"8 GB RAM → this model"*, which requires you to already
know your RAM. Most people don't, and looking it up is exactly the small
friction that ends an evening's curiosity.

So the app measures. **Manage AI connections → Check this computer** reads the
real machine — `os.totalmem()` and `os.cpus()` through the desktop bridge, no
identifying information, nothing leaving the process — and answers in plain
words: whether it's worth doing here, which model, and the one line to type,
with a Copy button. In a browser it falls back to `navigator.deviceMemory` and
**says outright that it's an estimate** rather than faking precision.

Laptop-specific, because most testers are on one: plug it in (nearly all
throttle hard on battery), the fans spinning up is the machine working, close
the browser tabs first, and the first question after startup is always slowest.
`navigator.getBattery()` is what distinguishes a laptop.

**The logic lives in `data/machine-advice.js` so `npm test` covers it — and the
test immediately earned its keep.** A rule saying *never recommend a model
bigger than 60% of memory* failed on a 4 GB machine, which was being offered a
1.3 GB model. The right fix was not a smaller model but an honest one: below
about 6 GB there is now **no recommendation at all** — a verdict of *"skip the
AI on this machine, and lose nothing that matters"*, with no pull command, and
a pointer to what the Pavilion is actually for. A frozen laptop is a miserable
way to meet this place, and every part of the app that matters runs without it.

### 23. [x] `.mcp.json` would have gone public with a private project ref

Found in the pre-publication audit. The file is a local dev-tool config and was
tracked, carrying the real Supabase project ref in its URL — and its commit is
already on the remote. A project ref is an **identifier, not a credential**
(the endpoint answers 401 without a key, and no key was ever committed), so the
severity is low — but it is this machine's own infrastructure in a repo about
to be made public, and the file has no business being there at all. Untracked
and gitignored; still on disk, still working locally.

**The rest of the audit came back clean:** no keys anywhere in history, no
books or PDFs tracked, no personal paths or email in any tracked file, MIT
licensed, 5 MB of history.

### 24. [x] Confirmed from disk: the installed app never once wrote a save

*"I can't use the Sand Pavilion app on my computer."*

That is finding #17, reported from the other side. Reading the Electron app
data directory settles it beyond argument — the localStorage database in
`%APPDATA%\sand-pavilion` contains saved data under exactly one origin:

```
localhost:5173   YES     ← npm run electron:dev, the app that works
file://          no      ← the installed app. Nothing. Ever.
```

The installed copy was **Sand Pavilion 0.0.1, from 8 July** — older even than
beta.1 — and it could not boot, so it never got as far as writing a save. The
dev app has been the only working Pavilion this whole time, which is why it
felt fine while the artifact was dead.

**Two useful facts fell out of this:**

- The dev app and the packaged app share an app-data *folder* but not a
  *storage partition*, because localStorage is scoped per origin
  (`http://localhost:5173` vs `file://`). So installing beta.2 **starts empty
  and cannot disturb the dev Pavilion** — which is exactly the right thing for
  testing what a friend will see. Moving real work across is Export Save →
  Import, deliberately, by hand.
- Personal book *text files* live in `%APPDATA%\sand-pavilion\library\` on the
  filesystem, outside any origin — 59 of them on this machine. Those are shared,
  and they are the part worth backing up.

Uninstalling 0.0.1 is safe: electron-builder's NSIS uninstaller leaves app data
alone by default. Backed up `Local Storage` and `library` anyway before
touching anything, because "should be safe" is not the same as "is".

### 25. [x] The most important action in the Pavilion was hidden three rooms away

*"The main thing we should focus on is letting people know how the Caravan Desk
works and how it helps people add books. I like it in the workshop, but maybe we
should move that feature into the Library next to the personal shelf."*

Correct diagnosis, and it was **placement and naming at once**. Adding a book —
the single act the whole project is built around — was explained only at the
**Caravan Desk**, in the Workshop, three rooms from the Library, under a name
that tells a newcomer nothing about what it does. It was findable by accident.

**Not moved — split, along the line that was already there.** The Caravan Desk
keeps the review queue and connector imports, which are genuinely workshop work.
What came to the Library is the *everyday act*: a new station, **📥 BRING A BOOK
IN**, standing beside Your Shelf (three tiles apart, so the floating labels
can't collide — the mistake made once already with the Learning Tree).

The name is an instruction rather than a noun, deliberately. Every other station
is "THE something"; this one had to answer the question a newcomer is actually
holding.

**What the table teaches, in order:**
1. **Drag the file onto the window** — first, biggest, green. Stressing that it
   works from *anywhere* in the Pavilion, not just that screen, and that it is
   the path that works for every website on earth.
2. Type it in by hand, for a chapter or something you wrote.
3. Where to actually get books — Gutenberg, Standard Ebooks, SuttaCentral, arXiv
   — with the specific format to choose.
4. **Where the file physically goes**: `%APPDATA%\sand-pavilion\library\`, as
   plain `.txt` you can open in Notepad. In a browser it says so honestly
   instead, and points at the desktop app as the better home.
5. Where the Caravan Desk went, and what it's still for.

Also: Your Library's own *"＋ Add a book or paper"* now opens this rather than
jumping straight to the form, so the explanation is reachable from both doors.

### 26. [x] The testers are on Macs, and the installer is Windows-only

*"Will it work on Mac or just Windows? ... my friends use mac."*

The `.exe` is Windows only. The **code** isn't — it's Electron and runs on macOS
fine. What could not happen is building it here: **a macOS app cannot be built
on Windows**, because the `.dmg` tooling and signing are macOS-only.

**Three answers, and the first needs no work at all.** The web build at
`sandpiviliongame.vercel.app` is the same Pavilion in a browser — no install, no
Gatekeeper, no frightening dialog — and it **auto-deploys from `main`**, so it
already carries everything built today. That is what a Mac friend should open
tonight.

**A real `.dmg` now builds in CI.** `.github/workflows/build-installers.yml`
runs the Windows and macOS builds on GitHub's own runners (a real Mac, free for
public repos) on any `v*` tag. Both use `electron:build:beta`, so a Mac build
inherits the same local-only guarantee and the same `verify-beta-build.mjs`
check. No secrets in the workflow, deliberately. `make-icon.mjs` now also emits
a 512px `build/icon.png` — 16× the 32px grid, a whole number, so the upscale
stays crisp — because electron-builder generates the `.icns` from it.

**Worth being blunt with Mac testers:** Gatekeeper is harsher than SmartScreen.
An unsigned app on modern macOS often claims **"Sand Pavilion is damaged and
can't be opened"**, which is a lie macOS tells about everything unsigned and
frightens people far more than the Windows box. Right-click → Open → Open, or
`xattr -dr com.apple.quarantine`. The real fix is Apple's $99/year programme,
which is not worth it for a handful of friends.

### 27. [x] The public website was phoning the dev machine's Supabase

Caught while checking whether the web build was a fit answer for Mac testers.
The deployed bundle contained a Supabase host: Vercel builds with the plain
`npm run build` and had the service variables set in its dashboard, so the
public site called that project on startup — while the README promised, in
bold, that nothing phones home.

**Fixed at the root** with a committed `vercel.json` that pins the build to
`npm run build:beta`. That reads `.env.beta`, which empties every service
variable, and `scripts/verify-beta-build.mjs` runs inside it — so the deploy now
**fails** rather than quietly shipping a cloud host. The same guard that already
protected the installer now protects the website, which is where it should have
been from the start: the promise was made in one place and enforced in another.

### 28. [x] Mac readiness, audited rather than assumed

*"What do we need to do to get ready for a Mac install?"* — with a brother who
can run it in an IDE but has no AI assistant helping him. So: find the real
blockers by reading the code, fix them, and leave a sheet that assumes no
context.

**The audit came back better than expected.** `electron/main.cjs` already
handles the two macOS lifecycle conventions correctly — `window-all-closed`
checks `darwin` before quitting, and `activate` re-creates the window. Nothing
calls `Menu.setApplicationMenu(null)`, so Electron's default menu stands and
`⌘C`/`⌘Q` work. Every path goes through `app.getPath('userData')` and
`path.join`, so no separator or drive-letter assumptions anywhere.

**Three real things did need fixing:**

1. **The intake panel hard-coded the Windows path** — a bug introduced hours
   earlier in this same session, and a confident lie on exactly the machines the
   first testers use. It now resolves per platform: `%APPDATA%\…` on Windows,
   `~/Library/Application Support/…` on macOS, `~/.config/…` on Linux, with the
   right "how to open that folder" hint for each (⇧⌘G in Finder). Verified by
   driving the panel under both a Windows and a macOS user-agent.
2. **Architecture.** GitHub's `macos-latest` runner is Apple Silicon, so a
   default build there would produce **arm64 only** — unrunnable on an Intel
   Mac. Now builds both, with the arch in the filename.
3. **Icon size.** electron-builder generates the `.icns` from `build/icon.png`,
   which was 512. Bumped to **1024** — still a whole multiple of the 32px art
   grid (32×), so the upscale stays perfectly crisp rather than blurring.

**`MAC-BUILD.md`** is the standalone sheet: clone, install, `make-icon`,
`electron:build:beta`, and — importantly — *check the packaged app actually
opens*, with the Windows near-miss quoted as the reason to bother. Plus the
Gatekeeper "is damaged" message explained as the lie it is, and the right-click
→ Open / `xattr -dr com.apple.quarantine` fix.

### 29. [x] Day one told a new visitor the Library needed growing

Found by running a **genuinely fresh save** instead of a loaded one — the same
class of mistake as testing the dev app instead of the installer, and caught the
same way.

`☀ Today`'s never-empty fallback looked only at the *personal* shelf, which is
empty for a newcomer. So a tester who had just been handed **27 books** was told
*"Bring a book in — the Library grows because you grow it."* True in general,
wrong on arrival, and a weak first impression at the exact moment the app has to
land.

**Now:** a newcomer is offered *"The Dhammapada — complete and ready to read,
press 🔊 and it will read aloud to you."* Read-aloud needs nothing installed, so
it is the fastest possible route to feeling what the place is for. Their own
unread books still come first when they have any; a bundled text is the day-one
answer only.

Guarded by a smoke case, because day one happens once per tester and cannot be
re-run on them.

### 30. [x] Notes were well organised and never came back

*"How is the note organisation? I want to be able to review things I see."*

**The organisation was not the problem, and that is worth saying.** `Your Notes`
already gathers six sources into one place — your own notes, notes taken on a
book page, conversation notes, Research Desk notes, Grant documents — with
source filters and counts, folders, tags, full-text search and newest-first
dates. Sebastian can already review a whole folder.

**The gap was revisiting.** Organisation only helps someone who is already
*looking*. Nothing in the app ever brought a note *back*, so writing one was the
end of its life rather than the start of it — which is the exact failure that
makes note-taking feel pointless over time.

**Now:** `☀ Today` resurfaces a note you wrote and have not opened since —

```
🗒 On attention
   written 32 days ago and not opened since — worth another look?
```

One at a time, and only past a fortnight, so it stays a **rediscovery rather
than a review queue**. Pressing it clears the filters, opens that note, and
marks it seen — and having actually been read, it stops being offered. `seen` is
recorded on *opening* a note, never on merely listing it, because being in a
list is not reading.

Scraps are left alone: a note under twenty characters is not resurfaced, since
"todo" coming back a month later is noise rather than rediscovery.

### 31. [x] Notes lived only in the menu, sorted one way, with no chapter view

*"I want to make sure that in the interface and not just the settings there are
ways to go into notes and sort them, help and have the AI give their thoughts on
certain chapters or a page, even a whole book to get the TLDR."*

Three gaps, all real, and the first one is the same bug as the Caravan Desk for
the third time: **a good feature reachable only from a menu.**

**A desk in the world.** `YOUR NOTES` now stands in the Study, three tiles from
the Computer so the floating labels cannot collide. Walk up, press E. Notes had
been reachable only through Esc — which is a settings drawer, not a place.

**Sorting, in the interface.** Four orders, because those are the four questions
people actually have of a pile of notes: *what did I just write* (newest), *what
have I been carrying longest* (oldest), *what came from where* (by source), and
*where is the one called X* (A–Z). Previously fixed at newest-first with no way
to change it.

**A chapter is the unit people think in.** The reader already had *Analyze this
page* and *Overall impression* — a page is too small to answer "what was that
chapter about?" and a whole-book impression is too vague. **📑 Summarise this
chapter** fills the middle, reusing the chapter marks that already existed for
the skip controls, and falling back to a window of pages (saying so plainly)
where a book has no marks. Long chapters are capped before sending, for the same
reason the lesson-drafting was split into small asks: a local model handed forty
pages will not hold them.

All three are offered whether or not an AI is connected — discoverable first,
honest when pressed.

### 32. [x] THE WORST BUG YET — the librarian undid hand-filed work, and did nothing useful

*"The AI undoes all the work I did when sorting the books, and does nothing
after sorting like 20 books... it ignores what's there and undoes all the work I
had made to commit over 100 books."*

**Three faults, all mine, all inside five lines of `suggestShelvesWithAI()`,
introduced the same day the pre-sort was added.**

**1 — "Select all" put already-filed books in the pool.** On a big library
"Select all" is the natural gesture. Every already-placed book then got a
"suggestion", and Accept All wrote it back — so wherever a rule disagreed with a
deliberate human choice, **the human lost, silently, with no undo.** This is the
worst class of bug this project can have: it destroys the exact thing the app
exists to help someone build.

**2 — a hard `slice(0, 60)` silently dropped the rest.** Reproduced: 105 books,
60 hand-filed first in the array → the entire sixty-book budget was spent
re-confirming books that needed nothing, and **the 45 genuinely unfiled books
were never looked at at all.** The panel cheerfully reported *"Filed 60 of 60"*.
That is precisely *"does nothing after sorting like 20 books"*.

**3 — no-op suggestions counted as work**, so the report showed a big number
while nothing had changed.

**Fixed, with the rule stated plainly: the librarian's job is the unfiled pile.**

- **It never touches a book you placed yourself.** Re-filing those is a separate
  **opt-in checkbox, off by default** — because moving something a person put
  somewhere on purpose needs *asking*, not assuming. Still possible; no longer
  automatic.
- **The cap is gone.** Sixty was arbitrary and lost the rest without saying so.
  Everything is considered; the model still only ever sees the ambiguous ones.
- **Suggestions that restate a book's current shelf are dropped**, so the count
  means something.
- **Bulk filing is now undoable.** Every accept records where each book came
  from; one press puts all of them back exactly. An action that moves a hundred
  books should never have depended on the suggestion being right.

Measured on the reported shape (105 books, 60 hand-filed): before — *"Filed 60
of 60"*, 45 unfiled untouched. After — *"Filed 45 of 45"*, the hand-filed 60
untouched, and undo restores perfectly.

`test/live/librarian-safety.mjs` is the standing guard, because these are
**properties**, not features, and properties erode quietly.

---

### #33 — "drop it anywhere on the Pavilion" is not true (found 2026-08-02, by writing a test)

`MANUAL.md` and `plans/BETA-RELEASE-NOTES.md` both promise a file can be
"dragged from your Downloads folder and dropped **anywhere on the Pavilion** —
you do not need to be on this screen, or in the Library, or anywhere in
particular."

There is **no document-level drop handler.** The only `ondrop` in the codebase
is on the drop zone inside one panel (`overlays.js`, the intake/Caravan drop
zone). Drop a book on the world, the Library, or the pause menu and nothing at
all happens — no error, no hint, nothing. Found while writing
`test/live/bundle.mjs`, which could not simulate the documented gesture because
the gesture does not exist.

**Severity: high for a beta.** It is the single most-promoted way to get a book
in, it is in the release notes a tester reads first, and its failure mode is
silence — the worst kind, because nobody reports it. They conclude the app
ignored their file and stop trying.

**Two honest fixes, and the first is small:**
1. Add a `document`-level `dragover`/`drop` handler that routes to
   `intakeBookFiles()`, making the documentation true. Needs a visible "drop to
   shelve" state so the gesture is discoverable rather than merely functional.
2. Or correct both documents to say where the drop zone actually is.

**(1) is right.** The promise is a good one and the code is nearly there —
`intakeBookFiles()` already handles single files, piles, and now bundles; it
just needs a door on the outside. Bundles were built with this in mind and no
longer require a panel to be open.

