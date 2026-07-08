# A Learning Path Through the Sand Pavilion

This is a self-paced curriculum built around this specific project, for
anyone using it (starting with you) to get more comfortable with the
tools underneath it — a terminal, local servers, APIs, how a game like
this is actually built. Nothing here is required to enjoy the Pavilion.
It's here because you asked for it, and because understanding the ground
under your feet makes you a better partner in building on it.

Go at whatever pace feels right. Skip stages that are already easy. Come
back to this at any time and ask to pick up where you left off, or to
have a stage adjusted — this document is meant to change as you do.

## Where you are (updated 2026-07-08)

- [x] **Stage 0** — credit for what you've already done
- [ ] Stage 1 — the terminal isn't scary, it's just literal
- [ ] Stage 2 — HTML, CSS, and JS are three different jobs
- [ ] Stage 3 — how the files talk to each other
- [ ] Stage 4 — what "local" and "API" actually mean, from the inside
- [ ] Stage 5 — git, now that it's actually set up
- [ ] Stage 6 — make a real change yourself
- [ ] Stage 7 — system design (this one's paced in months, not days — fine
  to leave unchecked indefinitely)
- [ ] Stage 8 — how Quill's memory actually works
- [ ] Stage 9 — web scraping vs. what the Caravan does
- [ ] Stage 10 — AI integration, the whole spectrum
- [ ] Stage 11 — AI as a character, not just an API call
- [~] Stage 12 — containers: what Docker is and isn't for (real hands-on
  progress 2026-07-08 — see the stage itself for what counts and what doesn't yet)
- [ ] Stage 13 — databases & Supabase, concretely
- [x] **Stage 14** — deploying a real app, and debugging one that doesn't work
- [ ] Stage 15 — actually adding a real book to the Library, start to finish

**Stage 14 is checked for real, hands-on reasons, not just because a lot
of backend work happened nearby:** you created the Vercel project,
connected it to GitHub yourself, and when sign-in didn't work, you
diagnosed and fixed a genuine misconfiguration yourself (environment
variables added at the wrong scope — "shared" instead of the project
level) rather than just being told the answer. That's the actual bar
this document sets for a checkmark. Stage 13 stays unchecked on
purpose — Phase 3's database work (migrations, RLS policies, the
`is_steward()` function) was mostly me driving; reading about it after
the fact isn't the same as doing it, so it doesn't get credited as if
it were. See Stage 14 below for what actually happened and why it
counts.

This list exists so a glance at the top of the file answers "where did
I leave off," instead of rereading the whole document each time; ask
any time to have it updated as stages actually get done.

## Stage 0 — credit for what you've already done

Before starting, worth noticing: you've already installed a program from
a terminal, run it as a background server, configured an environment
variable, and used `curl` to manually test that a server was responding
— all correctly, on the first real attempt, in the Ollama setup. That
*is* "local hosting and API integration." The unfamiliarity was in the
vocabulary, not in your ability to do the thing. Keep that in mind for
everything below.

## Stage 1 — the terminal isn't scary, it's just literal

**Concept:** A terminal is a way to type instructions directly to your
computer instead of clicking icons. It does exactly what you type, in
order, and tells you what happened. An "error" in a terminal isn't a
verdict on you — it's the computer literally reporting what it tried and
where it stopped.

**Try this:** Run `npm run dev` in the project folder, let it start, then
deliberately mistype something small — e.g. run `npm run devv` (an extra
letter). Read the error message it gives you out loud. It's almost
certainly some version of "I don't know what that is" — not a crash, not
a punishment, just information. Then run it correctly again.

**You're ready for Stage 2 when:** an error message in a terminal makes
you curious what it says, rather than making you want to close the window.

## Stage 2 — HTML, CSS, and JS are three different jobs

**Concept:** Every web page (including this game) is three layers doing
different jobs: HTML is the *structure* (what exists — a button, a
title), CSS is the *appearance* (colors, spacing, fonts), and JavaScript
is the *behavior* (what happens when you click something). Splitting
those three is normal, not a sign of unnecessary complexity.

**Try this, in order:**
1. Open `src/game/style.css`, find the line with `--e0a43c` or
   `#e0a43c` (the gold accent color used everywhere — buttons, borders),
   change it to a different hex color (try `#5f93a8`, a blue already used
   elsewhere in the file), save, and look at the running game reload
   with a new accent color.
2. Open `src/game/scenes.js`, find one line of NPC dialog (search for
   `EMBER`), change a word or two in her line, save, and go talk to her
   in-game to see your own words come back.

**You're ready for Stage 3 when:** you can point at a piece of on-screen
text or color and correctly guess which of the two files above it lives in.

## Stage 3 — how the files talk to each other

**Concept:** This project is split into files that each own one job (see
"How it's put together" in the main README) and `import`/`export` pieces
of themselves to each other. Tracing one action end-to-end is the fastest
way to make that click.

**Try this:** Pick the "Save the day" button on the Writing Desk and
trace it by hand:
1. `index.html` — find `onclick="savePlanner(true)"`.
2. `src/game/ui/overlays.js` — find `export function savePlanner`.
3. Read what it actually does: reads two input fields, calls `persist()`.
4. `src/game/entities.js` — find `export function persist`, see it hands
   everything to `Store.save(data)`.
5. `src/game/data/store.js` — see `save()` writing to `localStorage`.

That's the whole round trip from a click to a saved file on your disk,
five short files, no step skipped.

**You're ready for Stage 4 when:** you can trace a *different* button
(try "Mark as read" in the Library) through the same chain on your own.

## Stage 4 — what "local" and "API" actually mean, from the inside

**Concept:** This is the thing you said you weren't confident about — and
it's worth re-approaching now that Stage 3 gave you the tracing habit.
An "API call" here is nothing more than: the game, running in your
browser, sends a small note to an address (`http://localhost:11434`),
and waits for a note back. "Local" just means that address is your own
computer, not somewhere else on the internet.

**Try this:** Open the game in a browser, open DevTools (`F12`), click
the **Network** tab, then walk up to Quill and ask him a real question.
Watch a new request appear in that list in real time — click it, look at
what was sent (your question, plus the system prompt) and what came back
(his answer). You're watching the exact `fetch()` call in
`src/game/ai/provider.js` happen, with your own eyes, instead of trusting
it works from the outside.

**You're ready for Stage 5 when:** "API call" stops sounding abstract and
starts meaning, specifically, "that thing I watched happen in the Network tab."

## Stage 5 — git, now that it's actually set up

**Concept:** This project now has real git history, pushed to
`github.com/zaxaustin/sandpiviliongame` (private) — every change from
here on can be undone, compared, or shared safely. The core habit worth
building: `git status` (what's changed since the last save point),
`git add <file>` (mark a change to be included), `git commit -m "..."`
(actually save that snapshot, with a short note on *why*), `git push`
(send your saved snapshots up to GitHub). Nothing is lost by committing
often — think of each commit as a checkpoint you could always walk back to.

**Try this:** next time you (or I) change a file, run `git status` before
anything else and just read what it says — it'll name the exact files
that changed. That's the whole habit: check status, decide what to save,
commit with a sentence about why, push when you want it backed up.

## Stage 6 — make a real change yourself

**The actual goal of all of the above.** Pick something small and safe —
a new NPC line, a tweak to a color, a new document on a Library shelf in
`data/seed.js` — and drive it yourself: open the file, make the edit,
save, refresh, look at it in the game. I'll be here to explain anything
that doesn't make sense as you go, but the hands on the keyboard should
be yours for this one. That's the actual milestone — not finishing a
reading list, but the first time you change something in this world with
your own hands and watch it work.

## Stage 7 — system design: the long horizon, not the next stage

**This one is different from the rest.** Stages 0–6 were paced for
*this week*. This one isn't — it's the body of knowledge that separates
"can write working code" from "can be trusted with how a whole system is
put together," the stuff a senior engineer is expected to know. It'll
take months, not an afternoon, and it's fine to only recognize a third of
these terms right now. Come back to this list the way you'd come back to
a shelf, not a checklist.

Each line below is: **the term** — what it actually means — where to go
learn it. The same list, in the same order, is repeated at the bottom in
paste-ready form for the Course Board's "Pin a new course" box (`title |
practice | link`) — pin it there once, and the Pavilion tracks your
progress through it exactly like any other course, with a real link out
to each resource.

1. **Scalability: vertical vs. horizontal** — making one machine bigger
   versus adding more machines and spreading the load across them; most
   of what follows is a consequence of choosing the second path.
2. **Load balancing** — a layer in front of your servers that spreads
   requests across them, so no single machine is a bottleneck or a
   single point of failure.
3. **Caching** — keeping a cheap, fast copy of slow-to-fetch data close
   to where it's needed, plus a real strategy for knowing when that copy
   has gone stale.
4. **Database indexing & query performance** — how a database finds one
   row among millions without scanning all of them, and why the same
   query can be instant or catastrophic depending on what's indexed.
5. **SQL vs. NoSQL — choosing a data model** — relational databases give
   strong consistency and joins; NoSQL stores trade some of that for
   scale or a shape that fits the data better.
6. **Replication & sharding** — copying data across machines for
   durability and read speed, versus splitting it across machines so no
   one machine holds all of it — different problems, often combined.
7. **CAP theorem & consistency models** — during a network partition, a
   distributed system must choose between staying fully consistent or
   staying available. No free lunch, only which tradeoff and when.
8. **Message queues & event-driven architecture** — a service publishes
   an event and moves on instead of waiting on a reply; the receiver
   processes it when ready. Decouples systems, absorbs load spikes.
9. **Microservices vs. monoliths** — splitting a system into small,
   independently deployable services trades simplicity for flexibility
   and real operational overhead — worth knowing when each is actually
   the right call.
10. **API design & idempotency** — an interface that's predictable to
    call, versions safely, and can be safely retried without doing
    something twice. The quiet backbone of reliable distributed systems.
11. **Reliability patterns** — circuit breakers, retries with backoff,
    timeouts, and bulkheads: the small set of patterns that keep one
    failing dependency from taking everything else down with it.
12. **Observability & SRE practice** — logs/metrics/traces tell you what
    a system is actually doing; SLIs/SLOs/error budgets tell you whether
    that's good enough, on purpose, not by vibes.
13. **Security fundamentals** — authentication vs. authorization, the
    most common real-world vulnerability classes, and why "we'll add
    security later" is how most of them get in.
14. **The Twelve-Factor App** — a short, opinionated checklist for
    services that deploy cleanly and scale predictably (config in the
    environment, stateless processes, and more).
15. **Containers & orchestration** — packaging an app with everything it
    needs to run, then a system that runs many of them across many
    machines, restarting and rescheduling as needed.
16. **Capacity estimation** — back-of-envelope math: given expected
    users/requests/data size, estimate the storage, bandwidth, and
    server count you'd actually need. Turns "it depends" into a number.

**You're ready to call this stage "in progress, forever" when:** you can
read a real system-design writeup (an engineering blog post about how
some company's infrastructure works) and follow most of it without
stopping to look up a term every sentence. That's the actual bar — not
finishing the list, since nobody really finishes this one.

### Paste this into the Course Board to track it in the Pavilion itself

Pin a new course at the Course Board (Study), title it something like
*"System Design"*, and paste this as the steps — each line becomes a
step with a practice note and a real link out, using the course-step
link field added alongside this list:

```
Scalability: vertical vs. horizontal | read the "Scalability" section | https://github.com/donnemartin/system-design-primer
Load balancing | read the "Load balancer" section of the same primer | https://github.com/donnemartin/system-design-primer
Caching | read the "Caching" section, note the invalidation strategies | https://github.com/donnemartin/system-design-primer
Database indexing & query performance | read it front to back, it's short | https://use-the-index-luke.com/
SQL vs. NoSQL — choosing a data model | read the "SQL vs. NoSQL" section | https://github.com/donnemartin/system-design-primer
Replication & sharding | read both sections of the primer | https://github.com/donnemartin/system-design-primer
CAP theorem & consistency models | read "Consistency patterns" and "CAP theorem" | https://github.com/donnemartin/system-design-primer
Message queues & event-driven architecture | skim the concepts/intro page | https://kafka.apache.org/documentation/
Microservices vs. monoliths | read the Lewis/Fowler essay | https://martinfowler.com/articles/microservices.html
API design & idempotency | read a couple of entries in the builders' library | https://aws.amazon.com/builders-library/
Reliability patterns | read the timeouts/retries/circuit-breaker articles | https://aws.amazon.com/builders-library/
Observability & SRE practice | read the first few chapters, it's free | https://sre.google/sre-book/table-of-contents/
Security fundamentals | read through the whole list once | https://owasp.org/www-project-top-ten/
The Twelve-Factor App | read all twelve factors, it's a short site | https://12factor.net/
Containers & orchestration | read the "Concepts" docs | https://kubernetes.io/docs/concepts/
Capacity estimation | read the "Napkin math" appendix | https://github.com/donnemartin/system-design-primer
```

## Stage 8 — how Quill's memory actually works (it isn't, technically)

**Why this stage exists:** you asked to understand "the memory
architecture" well enough to be a real partner on the AI-agent work —
the report generator, the agent-notes commons, whatever comes after the
Monk gets his voice. All of that rests on one idea that trips almost
everyone up the first time, so it's worth making completely concrete
before building more on top of it.

**The trip-up: an AI model has no memory of its own, ever.** Not "bad
memory" — *none*. Every single time you send Quill a message, Ollama is
handed a fresh, blank slate; it has no idea a previous conversation
happened unless the *text of that conversation* is physically included
in what you send it this time. There is no persistent "Quill" sitting
somewhere between visits, quietly thinking. There's a model, and a pile
of text the game hands it, freshly, every single request.

**So where does "he remembers you" actually come from?** Entirely from
the game re-typing things back to him. Open
`src/game/ui/overlays.js` and look at `quillSystemPrompt()`: every time
you open a chat, this function *builds a wall of text from scratch* —
the charter, a summary of every shelved text, and (if you've talked to
him before) a short list of things you've asked about on past visits,
read from `data.agentMemory.quill`. That whole block gets sent as the
"system" message, in front of your actual question, on *every single
message* of *every single conversation*. "Remembering" is really just
"re-reading his own notes out loud to himself, right before answering."

**Two different kinds of memory, easy to conflate:**
- **Working memory (`d.history` in `sendChatMessage`)** — the back-and-
  forth of *this one conversation*, held only in the browser tab's own
  variables. Close the dialog or reload the page and it's gone; it was
  never saved anywhere.
- **Long-term memory (`data.agentMemory.quill`)** — a short, capped list
  (`MEMORY_CAP=20` in the same file) of plain questions you've asked,
  written to `localStorage` through the exact same `Store`/`persist()`
  path as your planner and courses. This is what survives a reload —
  and notice it's not a transcript, just a growing-then-pruned list of
  short lines. Cheap, human-readable, and small enough to paste straight
  into a prompt — which is the whole point: it has to fit back inside
  that "fresh slate" every time.

**A bigger word worth having: "context window."** Every model has a
hard limit on how much text it can be handed at once (the charter, the
shelf summaries, the memory list, your question, all of it, added up).
That's why `agentMemory` is capped and summarized-by-truncation instead
of kept as a full transcript forever — an uncapped memory would
eventually not fit in the request at all. This is the actual constraint
that makes "memory" for an AI agent a real design problem, not a
one-line feature.

**Another word worth having: "grounding" (and its grown-up cousin,
"RAG").** Quill is stopped from inventing texts that aren't on the
shelves by the crude-but-effective method of just stuffing *every*
seed document's summary into his prompt, every time (`shelf` in
`quillSystemPrompt()`) — that's grounding. It works here because the
Library is small enough to fit whole. The industry-standard grown-up
version of this is **RAG (Retrieval-Augmented Generation)**: instead of
including *everything*, you search a large corpus for just the most
relevant few chunks (usually with embeddings — numeric fingerprints of
meaning) and include only those. Same idea, different scale. Worth
knowing the name for when the Library outgrows "just paste it all in."

**Try this:** open DevTools' Network tab (same habit as Stage 4), chat
with Quill, ask him a second, unrelated question in the *same*
conversation, and open that second request. You'll see your entire
first exchange sitting there in plain text, resent in full — not
referenced, not recalled, *literally retyped*. That's the whole
mechanism, with nothing hidden.

**You're ready for Stage 9 when:** "the AI remembers" stops sounding
like a property of the AI, and starts sounding like a property of *what
the game chooses to hand it, and when* — because that reframe is the
actual design skill behind every future memory/report/agent-notes
feature still sketched in the README.

## Stage 9 — web scraping: what it actually is, and what the Caravan does instead

**Why this stage exists:** you asked what happens if you do "web
scraping," and what you're actually allowed and able to do inside the
Pavilion around bringing in outside books. Worth being precise here,
because "can my computer technically fetch this page" and "am I allowed
to" are two completely different questions, and conflating them is how
people accidentally get themselves in trouble.

**Concept: scraping is just "a program reads a page instead of a
person."** Every website you visit, your browser fetches some HTML and
displays it. "Scraping" is the same fetch, done by a script instead of a
human clicking around — nothing magic, nothing hidden. The part that
actually matters isn't the technique, it's **whether the site's owner
has said this is okay**: a site's `robots.txt` file and Terms of Service
often explicitly say what automated fetching is and isn't allowed, some
sites charge for or forbid bulk access to protect their servers or their
business, and copyright still applies to scraped text exactly as it
would to a photocopy — fetching something doesn't grant you rights to
redistribute it. None of that is about whether you *can*; it's about
whether you're *allowed*.

**This is exactly why the Caravan isn't a general scraper.** Look at
`tools/caravan/gutenberg.py` — it only ever talks to `gutenberg.org`, a
site that explicitly publishes its catalog for bulk, automated,
public-domain reuse; the script doesn't (and structurally can't) point
at some other website you hand it. That's the actual design decision:
one named, hand-picked, explicitly-permitted source per connector, never
"give me a URL and I'll grab whatever's there." Standard Ebooks,
archive.org, and SuttaCentral's API (already the quiet source of the
Library's Theravada shelf) are the same kind of source — public,
explicitly reuse-friendly, and legally uncomplicated. A random news site
or someone's personal blog would not be, even though the *code* to fetch
either one looks identical.


- You **cannot** (by design, not by missing feature) bulk-import
  anything into the shared Library shelves (`SEED_LIBRARY`). Every text
  that's ever gone on those shelves was looked at by a person first —
  what is it, where's it from, what license does it carry. That rule is
  permanent, not a v1 limitation waiting to be lifted; automating it
  away is exactly the thing that would make the Library untrustworthy.

**Try this:** open `tools/caravan/gutenberg.py` and read `strip_boilerplate()`
— it's just a couple of regular expressions cutting Gutenberg's standard
header/footer off a text file. Then run it for real against a book ID of
your choosing (find one at gutenberg.org, the number's in the URL) and
open the JSON file it produces — you're looking at the exact same shape
the Archive Desk's bulk-import box expects.

**You're ready for Stage 10 when:** you can look at any "fetch data from
the internet" idea and immediately ask two separate questions — "can
this technically be done" and "has the source actually said this kind
of use is okay" — instead of only asking the first one.

### What actually happened, 2026-07-08 — a third question, tested for real

A third question turned out to matter as much as the two above: **can
the browser itself even reach this source, or does it need to happen
outside the game entirely?** This isn't a permissions question, it's a
browser security rule called **CORS** (Cross-Origin Resource Sharing) —
a website's server has to explicitly say "yes, JavaScript running on
some other page is allowed to read my response," or the browser refuses
to hand the data back, even if the request technically succeeded.

**Tested directly, from inside the running game, not assumed:**

| Source | Reachable from the browser? |
|---|---|
| SuttaCentral (search *and* full text) | ✅ yes — fully usable in-game, no backend |
| Project Gutenberg's *search* (gutendex.com) | ✅ yes |
| Project Gutenberg's actual book text | ❌ no |
| arXiv (search and content) | ❌ no |
| Semantic Scholar (search and content) | ❌ no |

That's why the Caravan Desk's live **🔍 Browse SuttaCentral** feature
could be built directly into the game, while Gutenberg/arXiv/Semantic
Scholar still need `tools/caravan/*.py` run from a terminal — not a
missing feature, a real, tested wall.

**The connector family grew for real this session:** alongside
`gutenberg.py`, there's now `suttacentral.py` (the Buddhist canon),
`arxiv.py` (research papers, no signup needed at all), and
`semanticscholar.py` (research papers, needs a free API key). All four
follow the same rule Stage 9 already named: one hand-picked, named,
explicitly-reachable source per script, never "give me a URL."

**A real, concrete gotcha worth knowing about API keys specifically:**
Semantic Scholar's key-request form flatly refuses personal email
addresses — `gmail.com` explicitly named in their own rejection message,
wanting an academic or corporate domain instead. That's a hard rule on
their end, not a bug to route around, and it's exactly why arXiv (no
key, no email, no signup, ever) became the actual working path for the
same kind of research.

**See Stage 15, right after Stage 14, for the actual step-by-step of
using these tools to get a real text onto a shelf.**

## Stage 10 — AI integration: the whole spectrum, not just chat

**Why this stage exists:** you asked what's actually possible when you
"integrate AI into an app," beyond what Quill already does, and what
pre-knowledge you need. Stage 8 covered the single most important idea
(the model has no memory; the game re-sends everything, every time) —
this stage builds outward from that into the rest of the landscape,
so you can recognize what kind of AI feature something is the moment
you hear it described.

**Pre-knowledge check, honestly:** if Stage 4 and Stage 8 already make
sense — you can point at the `fetch()` call in `provider.js`, and you
can explain why `agentMemory` gets stuffed back into every prompt — you
have what this stage needs. The one piece worth naming explicitly:
**`async`/`await`**. Every AI call in this codebase (`AI.chat(...)`,
`sendChatMessage()`, `generateQuillReport()`) is `async` because talking
to a model takes real time (seconds, not milliseconds) — the game has
to keep running (movement, rendering) while it waits, instead of
freezing until the reply arrives. `await` is just "pause *this function*
here until the promise resolves, but don't pause anything else." If
that sentence didn't quite land, that's the one thing worth a side
detour before continuing.

**The spectrum, cheapest to most involved — and where this project
sits on it today:**

1. **One-shot request/response.** Send text, get text back, done. This
   is all `AI.chat()` does at its core — `makeOllamaProvider()`'s
   `.chat()` method in `provider.js`.
2. **Grounding (Stage 8's territory).** Stuff relevant facts into the
   prompt so the model answers *from* something instead of inventing —
   Quill's shelf summaries, folded into `quillSystemPrompt()`. The
   industry word for the grown-up version (searching a large corpus for
   just the relevant chunks, instead of including everything) is **RAG**
   — already named in Stage 8, worth re-anchoring here as point 2 of a
   larger list rather than its own island.
3. **Tool use / function calling.** Instead of the model only replying
   with words, it can reply "call this function, with these arguments"
   — the app actually runs the function and hands the result back. This
   is the real technical name for the **"giving AI agents a real body"**
   idea sketched in the README: `moveTo`, `interact`, `say` would be
   *tools* the model is told about (a small JSON description of each
   one's name and parameters), and the model's job shifts from "write a
   reply" to "decide which tool to call next." Nothing in this codebase
   does this yet — `AIProvider`'s contract today is chat-only.
4. **Autonomous agents.** A loop: the model picks a tool call, the app
   runs it, the result goes back into the next prompt, repeat — until
   the model decides it's done. You've already watched this exact
   pattern in action this project, just not framed as AI: every
   Playwright verification pass this session (decide an action, run it,
   look at what happened, decide the next one) *is* the agent loop,
   with a human — me — playing the part a model would play in a real
   agent. That's not a coincidence; it's the same shape.
5. **Multi-agent systems.** More than one agent loop, talking to each
   other or dividing up work — the eventual home of the agent-to-agent
   notes commons / Lineage Journal sketched in the README.

**Two more concepts worth having the words for:**
- **Streaming.** Some AI UIs show words appearing one at a time; others
  wait for the whole reply. This project currently waits (`stream:false`
  in `makeOllamaProvider()`'s request) — a real, working design choice
  for something as short as a dialogue line, and a genuine future
  upgrade if replies get longer (the Quill report, say) and waiting in
  silence starts to feel worse than watching it arrive.
- **Temperature.** A setting controlling how "safe vs. exploratory" a
  model's word choices are — low temperature gives more predictable,
  repeatable answers; high temperature gives more varied (and more
  occasionally weird) ones. Worth knowing the word exists even before
  you ever need to tune it.

**Try this:** open `src/game/ai/provider.js` and find every place a
number is passed alongside the actual message text (`num_predict`, the
timeout milliseconds). Each one is a small dial on the same tradeoff:
capability vs. speed vs. cost. Bigger/slower models answer better
questions but take longer per reply — exactly the "thinking model" trap
this README already warns about, generalized into the actual engineering
tradeoff it's an instance of.

**You're ready for Stage 11 when:** given a description of some AI
feature ("it reads your calendar and drafts replies," "it plays chess
against you," "it summarizes your inbox every morning"), you can place
it on the spectrum above — is this grounding, tool use, an agent loop —
without needing to be told which.

## Stage 11 — AI as a character, not just an API call

**Why this stage exists:** you asked specifically about interacting with
AI "in a game-like format" — that's a *design* question layered on top
of Stage 10's technical one. An AI feature bolted onto a spreadsheet and
an AI feature living inside an NPC face very different constraints, even
when the underlying `fetch()` call is identical.

**The game already embodies four real answers to this, worth naming
explicitly rather than leaving as "just how it works":**

- **Hybrid scripted + dynamic dialogue.** Every NPC has fixed lines
  (`npc.lines` in `scenes.js`); Quill *additionally* gets a live chat
  option when `npc.ai && isAIActive()` (`onAction()` in `main.js`). The
  scripted lines are the floor that never breaks; the chat is the
  ceiling that only appears when it can actually deliver. This is a real,
  common pattern for AI-driven characters — never let the dynamic path
  be the *only* path.
- **A written charter instead of a hidden system prompt.** `data/charter.js`
  is a real, readable document, not a secret instruction buried in code
  — Quill's "personality rules" are inspectable the same way the Keep's
  charter sign is walk-up-readable in the world. Worth noticing this is
  a *design ethics* choice as much as a technical one.
- **Turn-based interaction around a real-time game.** Notice movement
  stops while `state.dialog` is open (`update()` in `main.js` returns
  early). That's not laziness — an AI reply takes real seconds, and a
  game that kept simulating combat or fishing *during* that wait would
  need a much harder design (what happens if you get hit while Quill is
  still "thinking"?). Freezing the world during the exchange is the
  simple, honest answer for a first version; games that need AI dialogue
  *during* real-time action (a companion who talks while you fight) are
  solving a genuinely harder problem than this one currently attempts.
- **Graceful failure, always.** `sendChatMessage()`'s `catch` block, the
  "thinking" indicator, `NoProvider` as a permanent fallback — an AI
  feature in a game must never be a hard dependency. If Ollama isn't
  running, isn't reachable, or times out, the world still works. This is
  the single most important rule for shipping AI features to real
  players, not just a nicety for this project specifically.

**The bigger distinction ahead, tying straight back to what you already
decided:** everything above is **AI voicing a character** — Quill
*talks*. The "giving AI agents a real body" plan in the README is a
different thing: **AI *controlling* a character** — moving it, having
it act, not just speak. You already made the key call on that (an
agent-controlled resident needs a `sponsoredBy` owner, or explicit
adoption by the Pavilion itself) before the *how* was even built — worth
noticing that the design/ethics questions in this stage tend to arrive
before the engineering does, not after, and that's the right order.

**Try this:** with a live Ollama connection, open DevTools' Network tab,
talk to Quill, and watch how long the reply actually takes. Then
imagine redesigning fishing so a fish could "talk" mid-cast using the
same call — what would have to change about the fishing state machine
to not feel broken during that wait? You don't need to build it, just
notice everything that would need rethinking. That exercise *is* the
skill this stage is trying to teach.

**You're ready to help design what this should feel like next when:**
you can look at a proposed AI feature and immediately ask "what's the
scripted fallback," "what happens on failure," and "is this voicing a
character or controlling one" — the same three questions this project's
own AI features already had to answer, now as your own reflex instead
of something pointed out to you.

## Stage 12 — containers: what Docker actually is, and what it isn't for

**Why this stage exists:** you asked about "the high security problem"
and whether Docker would fix it. Worth being precise about both halves
of that, since they turned out to be two different questions with two
different answers.

**What the actual problem was, concretely:** `npm audit` flagged a real,
published issue (GHSA-67mh-4wv8-2f99) in `esbuild`, the tool Vite uses
under the hood — while `npm run dev` is running, a malicious website
open in the *same browser* could send requests to your local dev server
and read what comes back. Real, but narrow: it only matters while the
dev server is actively running, and only if something malicious is
open at the same time. It never touched the built site (`dist/`), which
is what anyone visiting the deployed game would actually use. **Fixed
directly** — `npm audit fix --force` upgraded Vite to a version without
the flaw, verified with `npm test`, `npm run build`, and a live pass
through the game afterward. Zero vulnerabilities now.

**So does Docker matter here? Concept: containers solve a different
problem than the one that just got fixed.** A container is a lightweight,
isolated environment — its own filesystem view, its own process list —
that runs on your same machine but can't casually reach outside itself.
The actual value: if some *other*, unknown-to-you vulnerability existed
in one of the hundreds of packages `npm install` pulls in, and it tried
to do something bad (read files elsewhere on your machine, reach out to
the network in a way you didn't expect), a container limits how far
that can actually go. That's a real, worthwhile thing to want — it's
just not what fixed today's specific issue, which needed a version
bump, not a wall around it.

**The honest tradeoff, before reaching for it:** running this project's
dev server *inside* Docker adds real friction for a beginner-in-progress
— an extra tool, an extra layer between you and the error messages you're
already learning to read (Stage 1's whole point). Worth doing once you
want the isolation habit for its own sake, not as an emergency patch for
one already-fixed CVE.

**A learning plan, if/when you want to actually do this:**
1. Install Docker Desktop; run `docker run hello-world` — the smallest
   possible "does this work at all" check, same instinct as Stage 5's
   `git status` habit: confirm the tool responds before building on it.
2. Learn the two-file vocabulary: a `Dockerfile` (instructions for
   *building* an image — "install Node, copy the project in, run
   `npm install`") and `docker-compose.yml` (instructions for *running*
   one or more containers together — mainly useful once there's a
   database container alongside the app one, i.e. genuinely relevant
   once Phase 3's Supabase-equivalent exists locally).
3. Try it on this actual project as a real exercise, not a tutorial repo:
   write a `Dockerfile` that installs dependencies and runs `npm run
   dev`, build it (`docker build -t sand-pavilion .`), run it mapping
   the port out (`docker run -p 5173:5173 sand-pavilion`), and hit
   `localhost:5173` from your normal browser like nothing changed. If
   local AI (Ollama) stops being reachable at that point, that's not a
   bug — it's the isolation actually working, and the real lesson: a
   containerized game can no longer casually reach `localhost:11434` on
   your host machine, since "localhost" now means *the container's own*
   loopback, not yours. Solving that (Docker's `host.docker.internal`,
   or running Ollama in a sibling container) is a good next exercise
   once you're here, not before.

**You're ready to say you understand containers when:** you can explain,
in your own words, why "put it in Docker" wasn't the fix for the actual
vulnerability that was found — and why that doesn't make containers a
bad idea, just an answer to a different question than the one that was
asked.

### What actually happened, 2026-07-08 — real progress, honestly scoped

**Docker is genuinely installed and running now, for a real reason:**
storing the Library's full book text somewhere that isn't the database
(see `LIBRARY-SCALING-PLAN.md`). You installed Docker Desktop yourself,
including the restart it needs — that's a real, hands-on system-level
step, not a reading exercise. `docker run hello-world` and `docker ps`
both confirmed it works.

**What's still "watched, not yet driven" — the honest line, same as
Stage 13's:** the actual container commands (running MinIO, setting a
bucket policy, the two real bugs that got caught) were typed by me, not
you, so this stage isn't fully checked yet, same reasoning Stage 13
stays open. Two real things worth knowing happened, though, and they're
the actual substance of "what Docker is for" beyond the textbook version:

1. **A container can look completely healthy while doing nothing you
   asked.** The first MinIO container passed its own health check while
   silently *not* writing to the real folder on disk at all — a bind
   mount (`-v host_path:container_path`) had been silently mangled by
   Git Bash's own path-conversion behavior before Docker ever saw it.
   The lesson, worth carrying into any future Docker work: "the
   container started" is not proof a mount worked — check the *host's*
   filesystem directly, don't trust the container's own apparent health.
2. **"Localhost" means something different depending which side of the
   container wall you're standing on.** From a script running on this
   machine, `localhost:9000` correctly reaches MinIO (Docker published
   that port out). But from *inside a second, throwaway container*
   trying to reach the first one, `localhost` means that second
   container's own loopback — nothing at all. Docker Desktop's own
   `host.docker.internal` address is the fix for that one specific hop.
   This is the concrete, no-longer-hypothetical version of the exact
   gotcha this stage already predicted above ("a containerized game can
   no longer casually reach `localhost:11434`") — it happened for real,
   just with MinIO instead of Ollama.

**A good next real exercise, when you want to close this stage out
yourself:** run `docker ps` right now, find `sand-pavilion-minio`, then
open `http://localhost:9001` in a browser (MinIO's own console — login
is in `.env.local`, `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`) and browse
the `sand-pavilion-library` bucket by hand. Seeing the actual files
sitting there, that you can open and read, is the fastest way to make
"object storage" stop being an abstract term.

## Stage 13 — databases & Supabase, concretely

**Why this stage exists:** on 2026-07-07 the Library and the café's
notice board both moved onto a real Supabase project — actual tables,
actual security rules, actual network calls. That's a good excuse to
build the vocabulary for what a real database actually is, since
`localStorage` (everything up to now) quietly avoided all of it.

**Concept: `localStorage` is a file; Postgres is a filing system with a
bouncer.** Your save data has always lived as one big JSON blob in your
own browser — simple, but only one visitor could ever see it, and
nothing stopped any code on the page from reading or rewriting all of
it. A real database like Postgres (what Supabase runs) organizes data
into **tables** (rows and columns, like a spreadsheet with rules), and —
critically — sits behind an actual security layer, so "can this specific
request read or write this specific row" is enforced by the database
itself, not by trusting the code that's asking.

**The word for that security layer: RLS — Row Level Security.** Every
table Phase 3 uses has RLS turned on, plus a short list of **policies**,
each one a plain rule like "anyone can read a row where `status =
'approved'`" or "a new row can only be inserted with `status =
'pending'`." Go read the actual ones for the café's board:
`exchange_questions`'s policies in the README's café section are the
real, live rules — not a metaphor. This is the actual mechanism behind
"nothing goes onto the notice board unmoderated": it's not a promise the
app's code makes, it's a rule the database itself refuses to break,
even if someone bypassed the game entirely and called the API directly.

**A related word: migration.** Every schema change (adding a column,
creating a table, writing a policy) went through Supabase as a named,
ordered, saved step — `add_category_to_library_documents`,
`create_exchange_questions`, and so on — the database's equivalent of a
git commit: a durable record of exactly what changed, in order, that
could in principle be replayed on a fresh database to reach the same
state. Contrast this with just clicking around in a spreadsheet-like UI
and manually editing cells — that leaves no trail.

**One more, since it comes up immediately: why is it safe to put an API
key in `.env.local` and ship it in the browser bundle?** `VITE_SUPABASE_PUBLISHABLE_KEY`
is a **publishable** key — it's the front door, meant to be public, and
it can *only* do what RLS policies allow it to do. That's different from
a **service role** key (never used in this codebase), which bypasses RLS
entirely and must never appear in anything that reaches a browser. The
MCP tools used to set all this up (`apply_migration`, `execute_sql`) run
with that higher trust level, on your behalf, outside the browser — the
game itself never gets that power, on purpose.

**Try this:** open your Supabase project's dashboard → Table Editor →
`exchange_questions`. You're looking at the exact same rows the café's
Notice Board reads. Then open the SQL Editor and run
`select * from pg_policies where tablename = 'exchange_questions';` —
that's the RLS rules above, but as the database sees them, not as prose.

**You're ready to call this stage done when:** you can explain, in your
own words, why the café's "approve a submission" step has to happen in
the Supabase dashboard today instead of a button in the game — and it's
not "because it wasn't built yet," it's "because there's no real login
system to prove who's actually a steward," which is a security reason,
not a laziness one.

## Stage 14 — deploying a real app, and debugging one that doesn't work

**Why this stage exists, and why it's checked:** on 2026-07-07 you took
this project from "runs on my machine" to a real, public URL — and when
it didn't work the first time, you found the actual cause yourself
instead of guessing or asking to be told. That's the whole skill this
stage is about, demonstrated, not just read about.

**Concept: a deploy is the same files, a different, always-on address.**
`npm run build` produces the exact same HTML/CSS/JS `npm run dev` runs
locally — deploying just means putting those files somewhere that's
reachable by anyone, all the time, instead of only by you, only while
your terminal's open. Vercel's GitHub integration means every `git push`
to `main` triggers a fresh build automatically — the thing that changed
today wasn't the game's code, it was where the already-working code
*lived*.

**The actual bug you found: build-time vs. runtime configuration.** Vite
environment variables (`VITE_SUPABASE_URL` and friends) get baked into
the JavaScript bundle *at build time* — not read fresh every time the
page loads. Adding one in Vercel's dashboard *after* a build already ran
does nothing to that existing build; it only affects the *next* one.
That's why the fix was a redeploy, not just saving a settings page.

**The second bug, and the one that actually took real debugging: "shared"
vs. project-level environment variables aren't the same thing.** Vercel
lets you define variables at the team/account level ("shared") that then
need to be explicitly linked to a specific project — your first attempt
used the shared kind, which silently produced a working-looking build
that was actually missing the Supabase connection entirely (confirmed by
grepping the deployed JavaScript file itself for the project's URL and
finding nothing there — a real technique worth keeping: when something
"should" be configured but isn't behaving right, check the actual output,
not just the settings page). You found this and fixed it by adding the
variables at the project level instead — that's the hands-on part this
checkmark is actually for.

**You're ready to say you understand this stage when:** you can explain,
to someone else, why "I added the environment variable" and "the site
still can't connect" aren't a contradiction — and what you'd check first
to find out why.

## Stage 15 — actually adding a real book to the Library, start to finish

**Why this stage exists:** everything about *why* the Caravan works the
way it does is spread across Stages 9 and 12. This stage is just the
concrete, hands-on-keyboard version — the actual commands, in order,
for getting one real book from "doesn't exist in the Pavilion yet" to
"a real, readable shelf entry." Do this once, yourself, start to finish,
and every future book you add will feel completely routine.

**Step 0 — pick something real.** Not a placeholder. Go to
[gutenberg.org](https://www.gutenberg.org), search for a public-domain
book you'd actually want to read, and note its ebook number from the
URL (`gutenberg.org/ebooks/1080` → `1080`).

**Step 1 — fetch the real text:**
```
python tools/caravan/gutenberg.py 1080 --for-library
```
This writes a plain-text file into `library-sources/`, with the
title/author already detected from the book's own header.

**Step 2 — draft the shelf entry:**
```
python tools/caravan/library-draft.py library-sources/<the-file>.txt --source "https://www.gutenberg.org/ebooks/1080" --license "Public Domain (Project Gutenberg)"
```
This scaffolds a file in `library-drafts/` with the title/license/source
already filled in — but **not** the summary. Open it and actually write
a real one, in your own words, the same way every existing shelf entry
was written. This is the one step that can't be automated away, on
purpose — see Stage 9 for why.

**Step 3 — put it on the shelf:**
```
python tools/caravan/promote-draft.py library-drafts/<the-file>.md
```
Needs `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` set first (see the
script's own `--help`). This inserts the real row — live in the game
immediately, no rebuild, no redeploy.

**Step 4 (optional) — attach the actual full text**, so the Reader's
"📖 Read the full text" button appears, instead of just the summary:
```
python tools/caravan/push-fulltext.py <slug> library-sources/<the-file>.txt --translator "..." --source-url "https://www.gutenberg.org/ebooks/1080" --license "Public Domain (Project Gutenberg)"
```
This needs Docker running and `sand-pavilion-minio` up (`docker ps`
should show it) — it uploads the real text into local object storage
and wires up the pointer, all in one command.

**A faster path that skips the terminal for one specific source:** open
the Caravan Desk (Workshop, in-game) and use **🔍 Browse SuttaCentral** —
search, fetch, and land straight in the Steward Review Queue, no
scripts at all. Worth doing once too, since it's a genuinely different
(and, for that one source, easier) way in.

**You're ready to call this stage done when:** you've done this once,
for a book you actually chose, and can walk someone else through the
same four commands from memory — not because you memorized them, but
because you understand what each one is actually for.

## Where this goes next

This document stays scoped to the Sand Pavilion specifically. Once
"understand this project" starts turning into "apply this at work" —
which is exactly where you are now — see
[`API-AI-INTEGRATION-PLAN.md`](API-AI-INTEGRATION-PLAN.md): the same
teaching style, pointed outward at API/AI integration generally rather
than this one game.

---

*This document is meant to be revisited and rewritten as you progress —
just ask, at any point, to update it, add a stage, or start from wherever
you actually are rather than the top.*
