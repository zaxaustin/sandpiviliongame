# How the AI actually talks to the app (and works with your calendar)

*Written 2026-07-12 for the Pavilion's steward, who wanted to understand the
backend and go on a learning tangent. This is a plain-English walkthrough of two
real journeys through the code — a message becoming a reply, and a local AI
filling your calendar — with the exact files and functions so you can go read
the real thing. It's a companion to `LEARNING-PATH.md`, pointed at one question:
"what actually happens back there?"*

**The one idea to hold the whole time:** the AI never "reaches into" the app.
It only ever does one thing — **turn text into text.** You send it words; it
sends words back. *Everything* else — showing the reply, saving a note, adding a
calendar event — is ordinary code the app runs on that text. The AI is a very
clever text function, nothing more. Once that clicks, the "magic" turns into
plumbing you can actually follow.

---

## Journey 1 — a message becomes a reply (the "API")

### What an "API" is here, concretely
Ollama (the program running models on your machine) starts a tiny **web server**
on your computer at `http://localhost:11434`. An "API call" is just your app
sending an HTTP request to that address — the exact same kind of request your
browser makes to load a web page, except the "page" it asks for is *"here are
some messages, give me the model's reply."* That's it. No magic, just one
program asking another for something over `localhost`.

### The actual steps (files named so you can go look)

1. **You type and hit send.** `sendChatMessage()` in `src/game/ui/overlays.js`
   runs. It adds your line to the on-screen transcript and to `d.history` (the
   running list of the conversation).

2. **The app builds the full request.** It's a list of messages:
   - a **system prompt** — the resident's identity + live grounding (the
     Library shelves, your day, the charter). This is built fresh each time by
     that resident's `systemPrompt()` in the `CHAT_AGENTS` table, which lives in
     **`src/game/ui/residents.js`** (moved out of `overlays.js` on 2026-08-04).
   - then the **conversation history** so far.

3. **The app calls the AI.** `AI.chat(messages, opts)` — `AI` is whichever
   connection was detected (see `src/game/ai/provider.js`). For Ollama,
   `makeOllamaProvider(...).chat()` builds a JSON body like
   `{ model, messages, options:{ num_predict: 450 } }` and POSTs it to
   `http://localhost:11434/api/chat`.

4. **The request physically reaches Ollama.** This is the one genuinely tricky
   bit, and it differs by where the app runs:
   - **Desktop app:** a browser rule called CORS would normally block a page
     from calling `localhost:11434`. So the app doesn't call it from the page —
     it hands the request to Electron's *main process* (real Node.js, no CORS)
     via `window.desktopBridge`. See `localFetch()` in `provider.js`. **This is
     why the desktop app "just works" with no setup.**
   - **Browser tab:** there's no main process to borrow, so you must tell Ollama
     "it's OK for this page to call you" by setting `OLLAMA_ORIGINS` (README).

5. **The reply streams back.** Ollama answers a little at a time (one JSON blob
   per line — "NDJSON"). `ollamaStreamChat()` reads those pieces as they arrive
   and calls `onStream(...)`, which is why you see the reply *typing itself* live
   instead of appearing all at once.

6. **The app does something with the text.** Back in `sendChatMessage()`, the
   finished reply is pushed to the transcript, `remember()` files what you asked
   (see Memory below), and `logActivity()` notes it. **The AI's job ended at step
   5 — it produced a string. Steps 6+ are just the app.**

**The safety nets, worth knowing:** every call has a **timeout** (short replies
45s, long drafts 120s, the Monk's "deep" 180s) so a stuck model never hangs
forever; if a "thinking" model burns its whole budget and returns *empty*, the
app **retries once with more room** (`isEmptyReply`); and if there's no AI at
all, `NoProvider` makes the residents fall back to scripted lines instead of
crashing. That "always has a fallback" pattern is everywhere in this codebase —
it's worth noticing as a design habit.

---

## Journey 2 — a local AI fills your calendar

This is the part people assume is hard ("how does the AI *control* the
calendar?") and it's actually the clearest illustration of the one idea above:
**the AI doesn't touch the calendar at all.** It writes a normal-looking
schedule as text; the app reads that text and creates events. Here's the whole
trick:

1. **You ask Sebastian for a plan.** He's a resident, so this is just Journey 1
   — his `systemPrompt()` (in `CHAT_AGENTS`, `ui/residents.js`) is handed the honest
   shape of your day (`butlerDayRead()` — today's intention, what's due, your
   open sparks, today's existing events) and is *told how to format a schedule*:
   one item per line, and when something has a time, **start the line with the
   clock time** — e.g. `9:00 AM — Morning sit`.

2. **He replies with plain text**, like:
   ```
   9:00 AM — Morning sit
   10:30 AM — Draft the grant intro
   Call the dentist
   ```
   That's just a string. The AI is done.

3. **You click "📋 Send this plan to today."** Now it's pure app code —
   `sendSebastianPlanToToday()` in `overlays.js`. It splits the reply into lines,
   strips bullets/numbering, and for each line asks: *does this start with a
   time?*

4. **`parseScheduleTime()` reads the clock off the front** of each line (it's
   forgiving on purpose — it understands `9:00`, `2pm`, `10:30-11:30`, `9am`,
   because "a butler writes for a person, not a parser"). Then:
   - a line **with** a time → a real **calendar event**
     (`data.calendar.push({ date, start, end, title, remind:true })`), and
     because you set it *with* Sebastian, he'll ring the reminder bell for it.
   - a line **without** a time → a **to-do** ("spark") on today's plan instead.

5. **It's saved and shown.** `persist()` writes it; the calendar and planner now
   show real, timed events you can see, edit, and get reminded about.

**So "a local AI working with your calendar" = the AI writes a schedule in a
shape the app agreed on, and deterministic code turns that shape into events.**
No AI "integration" with the calendar exists or is needed. This pattern —
*prompt the model to output a known shape, then parse it* — is how almost all
"the AI did a thing" features are built, here and in the wider world. It's also
why it's reliable: the parsing is plain code you can test, not a model you have
to trust.

---

## How "memory" actually works (it's simpler than it feels)

When a resident "remembers" you, here's the entire mechanism (`overlays.js`):

- `remember(agent, text)` appends **the topic of what you asked** to a little
  per-resident list, `data.agentMemory[agent]` — capped at 20 entries
  (`MEMORY_CAP`) so it stays a short list, not a growing transcript.
- Next time you talk, `pastAsksBlock()` pastes the **last 8** of those into that
  resident's system prompt: *"things this visitor has asked you about before…"*
- That's it. It's a **note pinned to the prompt**, not a database and not the
  model "learning." Each resident has their own list (Quill doesn't see what you
  told the Monk), and it stores your *topics*, not the answers.

This is deliberately humble (LEARNING-PATH Stage 8 is literally titled "how
Quill's memory actually works (it isn't, technically)"). It's honest and it
never leaks — but it's also the most obvious place a *more human* feeling could
come from later: remembering the **substance** of what was discussed, not just
that a topic came up. Worth knowing that's a *feature waiting to be added*, not a
bug, if you ever want to pull that thread.

---

## Go learn more (your tangent starts here)

Best material, roughly in order of "closest to what you just read":

- **The code itself** — genuinely the best teacher here. Read, in order:
  `src/game/ai/provider.js` (the whole API layer, ~360 lines, heavily
  commented), then `sendChatMessage` and `sendSebastianPlanToToday` in
  `src/game/ui/overlays.js`. You now have the map for both.
- **`LEARNING-PATH.md`** — Stage 4 ("what 'local' and 'API' actually mean, from
  the inside"), Stage 10 ("AI integration: the whole spectrum"), Stage 11 ("AI
  as a character, not just an API call"), and Stage 8 (memory). Built around
  *this* project, at your level.
- **`CAPACITY-AND-PIPELINES.md`** — the same pipeline as a reference, plus where
  it breaks and what it all costs in space/speed.
- **Ollama's own API docs** (`ollama.com`, and its GitHub repo's `docs/api.md`)
  — the exact shape of the `/api/chat` and `/api/tags` calls this app makes. Try
  them yourself: `curl http://localhost:11434/api/tags` lists your models.
- **MDN Web Docs** (`developer.mozilla.org`) — search "fetch API", "HTTP
  request methods", and "JSON" for the web fundamentals every step above rests
  on. And "Web Speech API" when you're ready for the voice tangent (that's the
  free, local way the Pavilion will let you *talk* to residents — the natural
  next thing to learn given where you want this to go).

**One line to hold onto:** the AI only ever turns text into text — everything
that feels like it "did something" is your own app, reading that text and acting
on it. Learn that boundary and the whole backend stops being magic and starts
being yours.
