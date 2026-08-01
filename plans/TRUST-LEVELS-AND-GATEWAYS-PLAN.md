# Green, yellow, red — trust levels, cloud gateways, and the website/app split

Written **2026-07-28**, from three connected ideas raised together:

> *"A webpage will solve our problems, but I want to really use that as like the
> common library and have the local pavilion be the game — that way we have more
> control over what is going on and a person builds a sense of ownership."*
>
> *"There need to be gateways for people with Claude subscriptions or OpenAI or
> even Grok and Ollama cloud models, so they can handle the hard sorting tasks
> and other high work tasks like making a full college course."*
>
> *"We just need to be clear and have it be different security levels: green is
> fully offline and local, maybe encrypted; then yellow that uses a cloud model,
> maybe no encryption, good for most things; then red where something is wrong
> and not working right or is compromised in a way that can be fixed."*

They belong in one plan because they answer one another. The split says *where
work happens*. The gateways say *what a person can plug in*. The colours say
*what it costs them*.

**The colour scheme was revised later the same day** (§4) and the revision is
the better idea: **the badge is about money, not privacy.** Egress already has a
mark — the 🏠/☁ badge that has been on every connection since cloud AI was added
— and making the colour say the same thing twice was the original mistake. Cost
is the harm that actually lands on the person this is for: someone on a laptop
with no local AI, who should never be surprised by a bill.

§5 is the half that matters most and applies whether or not money is involved:
**token thrift** — only ask a model for what Python cannot do.

---

## 1 · The split: the website is the commons, the app is your Pavilion

This is a **positioning decision**, and a clarifying one. It settles a question
that has been sitting unasked: *is the web build a lite version of the app?*

If it is, the project is in trouble — two codebases, permanent feature envy, and
a browser version that is always the disappointing one.

**It isn't. They are different things with different jobs:**

| | The website | The installed Pavilion |
|---|---|---|
| **Is** | the commons — shared, public, browsable | your place — private, local, yours |
| **Holds** | what people chose to hand on: guides, classes, packets, the shared library | your library, your notes, your day, your agents, your work |
| **Needs** | nothing. A browser. | one download |
| **Feels like** | a library you visit | a house you live in |
| **Ownership** | nobody's, or everyone's | unambiguously **yours** |

**Ownership is the real point**, and it is why the game shape matters. A person
who has walked their own Library, named their own shelves, and planted something
in their own Hall has *built* something. That feeling is not available from a
webpage, and it is the thing that makes someone care enough to keep going.

It also fits what is already planned: `COMMONS-BACKEND-PLAN.md` Phase 1½ puts
`index.json` and `index.html` in the same folder — **the commons served to
machines and to people from one artifact.** This split is that idea, named.

### The honest caution about sequencing

**Today the web build is the full game**, and it is currently the *only* answer
for Mac and for anyone who won't install software. So:

> The commons website is **additional, never a replacement.** Do not remove the
> playable browser build to make this split clean — certainly not before Mac
> installers exist.

They coexist without conflict: the commons site carries the guides, the shared
library and the download, *and* a "try it right here" link to the same web
build. One is the front door; the other is the house. Nothing is lost.

---

## 2 · The Pavilion on a drive — closer than it looks

> *"If we were further along I would make this an external hard drive build as
> an extension, so you can bring your library anywhere."*

Worth recording now because **it is a small change, not a big one**, and knowing
that changes when it is worth doing.

Two pieces, both modest:

1. **A portable build target.** electron-builder already supports `portable` for
   Windows — a single `.exe` that runs without installing.
2. **Data beside the executable.** Today everything lands in
   `app.getPath('userData')` (`%APPDATA%\sand-pavilion\`). A portable build calls
   `app.setPath('userData', path.join(path.dirname(process.execPath), 'pavilion-data'))`
   before the app is ready, and the whole Pavilion — save, personal book files,
   everything — lives on the drive.

That is roughly twenty lines plus a build target. Everything else already works,
because every path in `electron/main.cjs` already goes through `app.getPath` and
`path.join` (verified in the macOS audit).

**The honest limit, stated up front so it doesn't disappoint later:** the
*library and the work* travel. The *AI* does not. Ollama is installed per
machine, and a model is several gigabytes of host-specific setup. So a portable
Pavilion on someone else's computer is fully usable — read, write, plan, study —
and the residents wake only if that machine happens to have a local AI, or if a
cloud gateway is configured.

That is an acceptable and even honest split. It is worth saying in the UI rather
than discovering.

---

## 3 · Gateways — the plumbing is mostly built

**Already in `ai/provider.js`:** three connection kinds —

- `ollama` — local, and the same code path works against **Ollama Cloud** with a
  remote base URL and a key
- `openai-compatible` — which covers OpenAI, **Grok/xAI**, Together, Groq,
  OpenRouter, LM Studio, and most of the field
- `anthropic` — **Claude**, with its own header shape

So "gateways for people with subscriptions" is largely a **UI and presets**
problem, not a protocol one. What is genuinely missing is the interesting part.

### What's actually missing: routing by *task*, not by resident

Today `detectAI()` picks one connection and everyone uses it. The request is
different and sharper:

> *"...so they can handle the hard sorting tasks and other high work tasks like
> making a full college course."*

Both examples share a shape: **occasional, batch, high-value, and painful
locally.** Sorting 128 books. Drafting a whole course rather than one lesson.
Reviewing a long paper. These are exactly the jobs worth spending a paid token
budget on — and exactly the jobs where an 8B model on a laptop struggles.

So the feature is a **heavy-lifting connection**: a second, optional, clearly
marked outlet used *only when a task explicitly asks for it*, never by default,
never for ordinary conversation.

**Design constraints, each with a reason:**

- **Opt-in per task, not global.** A button that says *"Do this one with the big
  model"* — never a setting that silently reroutes everything.
- **Show the bill before it is paid.** Roughly how much text is about to be
  sent. People with subscriptions still deserve to know.
- **Show the payload, not a promise.** The prompt inspector already captures the
  exact message array at every call site. Before anything leaves the machine, a
  person can *read literally what will be sent.* This is the feature that makes
  cloud use honest rather than merely disclosed.
- **Local stays the default and the point.** The standing decision is *"no paid
  cloud API **required**"* — not "no cloud." A gateway is a power tool you may
  plug in, never a dependency. If the Pavilion ever needs one to be good, we
  took a wrong turn.
- **The Monk is exempt.** He takes the largest **local** model by standing rule.
  His whole character is that he thinks with what is actually yours. Routing him
  through someone else's datacentre would be a category error.

---

## 4 · The traffic light — revised 2026-07-28, and it is now about money

> *"I think yellow should be for subscription connections like Claude Pro, and
> red should be for money-burning API which I am not installing at this time.
> This should be more for laptop users who can get some use out of this app
> without having local AI capabilities, but I don't want anyone wasting tokens."*

**This is a better axis than the one first proposed here, and it fixes an
objection this plan raised against itself.** The earlier draft argued the colour
must answer exactly one question, then picked *"what leaves this machine"* — but
egress **already has a mark**: the 🏠/☁ badge on every connection, which has been
there since cloud AI was added. Making the colour say the same thing twice was
the real mistake.

So: two orthogonal marks, each answering one question, neither pretending to
answer the other.

| Mark | Answers | Already exists? |
|---|---|---|
| 🏠 / ☁ | **where do my words go?** | yes — keep it, everywhere |
| 🟢 🟡 🔴 | **what does this cost me?** | new |

Cost is the right thing to make loud, because it is the harm that actually
lands. A laptop user who cannot run a local model is the exact person this is
for, and an unexpected bill is the thing that would make them regret trying.

### The three levels

**🟢 GREEN — free. Costs nothing but electricity.**
A local model, or no model at all. Everything the Pavilion is *for* is green and
stays green: the Library, reading, read-aloud, notes, the day, lessons, the
Hall. This is the default and the point.

**🟡 YELLOW — a flat fee you already pay.**
Using it more this month costs no more than using it less. Nothing to meter,
nothing to fear, nothing to watch. **This is the tier for the audience actually
being described** — someone on a laptop with no local AI who wants the Pavilion
to be genuinely useful anyway.

**🔴 RED — metered. Every request spends money.**
Pay-per-token API keys. Not being installed now, and the badge exists precisely
so that stays a deliberate choice rather than a thing that happens. Red is not
"forbidden" — it is *"this is a taxi with the meter running."* If it is ever
enabled, it wants a visible estimate before each send and a running total.

### The hard fact about subscriptions, before any preset gets built

**A Claude Pro or ChatGPT Plus subscription cannot be connected to this app.**
Those subscriptions buy access to *their* chat products — claude.ai, the ChatGPT
app — and deliberately do not expose a general API. Programmatic access from a
third-party application requires an **API key**, which is metered: red, by the
scheme above.

This matters now rather than later, because building a "Claude Pro" preset that
cannot possibly work would waste the effort and disappoint precisely the person
it was meant to serve.

**So yellow is a real and worthwhile tier — but the examples need checking, not
assuming.** The clearest genuine case today is **Ollama Cloud**, which sells a
flat monthly plan that includes API-style access to hosted models — a true
yellow, and a natural fit since the Pavilion already speaks the Ollama protocol.
Some other providers sell flat-rate plans with real API access too; these change
often enough that **each one must be verified against its current terms before a
preset ships**, and the badge must reflect what is actually true rather than
what would be convenient.

Where a provider only offers metered keys, say so plainly in the picker rather
than letting someone discover it after wiring up a key.

---

## 5 · Token thrift — the doctrine, and it is the more important half

> *"Let's make sure we are only having the units do the sorting, or the things
> we can't do with Python or with Python assistance."*

This is the same principle as `CAPTURE-PATHWAYS-PLAN.md` — *don't give a model
work that deterministic code does better* — promoted from a parsing decision to
a **standing budget rule**. It should apply whether the model is free or not,
because on a laptop the currency is heat and minutes even when it is not money.

### The ladder — try each rung before the next

1. **Deterministic code.** Is there a right answer a function can compute?
   Sorting by date, deduplicating by title, parsing a file, arithmetic on a
   schedule, matching a title against a catalogue. **Never ask a model.**
2. **Heuristics with a confidence threshold.** Keyword and metadata matching
   gets most of the way with no model at all. Take the confident ones; keep the
   rest.
3. **The model, on the remainder only.** Genuine ambiguity is what a model is
   *for*. Send it the leftovers, not the pile.
4. **The model on everything** — last resort, and it should feel like one.

### The worked example: the librarian, today

`suggestShelvesWithAI()` currently sends **every** selected book to the model in
batches of eight. For the 128-book import that prompted the feature, that is
**sixteen model calls** — and most of those books are not ambiguous at all.

A pre-sort pass would file, with no model whatsoever:

- an exact or near-exact title match against a shelf name
- a title containing an unambiguous keyword for an existing shelf
  (*"Electronics"*, *"Cookbook"*, *"Sutta"*)
- anything whose author or source already appears on exactly one shelf
- an exact duplicate of a book already filed

Then the model is asked only about what is genuinely unclear. If rules confidently
place even half, that is **eight calls instead of sixteen** — faster, cheaper,
more reliable (deterministic rules do not hallucinate a shelf), and it degrades
gracefully to *"here is what I could sort without any AI at all"* for someone
with no connection.

**The same shape applies to the other heavy job named.** Drafting a full course:
Python can lay out the weeks, space the sessions, order by prerequisite and
build the scaffold. The model writes prose into a structure it did not have to
invent — which is both cheaper and, as this project learned this morning, *more
reliable*, because a smaller ask is an ask a model can actually meet.

### Make the saving visible

When a run finishes, say what was avoided: *"Filed 74 by rule, asked the model
about 12."* It teaches the habit, it proves the app is not wasting anyone's
money, and it makes the thrift a feature rather than an invisible virtue.

---

## What to build first

Nothing here is urgent, and the ordering matters more than the speed.

1. **Token thrift, starting with the librarian's pre-sort.** The only item here
   that pays off immediately, needs no new UI, no gateway and no decisions —
   and it makes every future connection cheaper by default. File what rules can
   file; ask the model only about the remainder; show the count of what was
   avoided.
2. **The cost badge vocabulary** — 🟢 free / 🟡 flat fee / 🔴 metered, three
   badges and one honest sentence each, sitting beside the existing 🏠/☁.
   **Before** any gateway becomes convenient, so the labelling is not retrofitted
   onto habits already formed.
3. **Verify which providers actually sell flat-rate API access**, and build
   presets only for those. Ollama Cloud is the clearest real yellow today.
   Anything metered-only should say so in the picker, not after a key is wired.
4. **"Read exactly what will be sent"**, wired to the prompt inspector that
   already captures the real message array. The single most trust-building thing
   available, and the machinery exists.
5. **The heavy-lifting outlet**, opt-in per task, on the two jobs that want it:
   bulk shelf sorting and drafting a full course — both *after* the pre-sort has
   already reduced what they need to ask.
6. **The portable build**, whenever carrying it somewhere becomes a real want.

## The line that must not move

The website may become the commons. Gateways may bring in models a laptop could
never run. A Pavilion may travel on a drive. None of that is allowed to change
this:

> **The Pavilion must stay completely usable by someone who never connects to
> anything — no cloud, no commons, no account, forever.**

Everything above is an *outlet*. Outlets are how a place grows. But a house
whose lights only work when it is plugged into someone else's grid was never
really yours, and ownership is the whole point of the split this plan starts
with.
