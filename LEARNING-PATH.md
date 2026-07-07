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

**What you can actually do in the Pavilion today:**
- Run `tools/caravan/gutenberg.py <book id>` (see its own docstring for
  usage) to pull a public-domain book into a JSON file, then paste that
  file into your **own** Archive Desk via "+ Bulk import." This is
  completely automatic, and completely fine — it's your device, your
  data, no one else is affected.
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

**You're ready for Stage 10 (whenever it exists) when:** you can look at
any "fetch data from the internet" idea and immediately ask two separate
questions — "can this technically be done" and "has the source actually
said this kind of use is okay" — instead of only asking the first one.

---

*This document is meant to be revisited and rewritten as you progress —
just ask, at any point, to update it, add a stage, or start from wherever
you actually are rather than the top.*
