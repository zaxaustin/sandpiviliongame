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
work happens*. The gateways say *what may leave*. The colours are how a person
sees which is which — and without them, the gateways would quietly erode the
whole promise.

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

## 4 · The traffic light — the idea is good, with one correction

This is the piece that makes the rest safe, and it is worth getting exactly
right, because **a vague trust indicator is worse than none** — it produces
confidence without grounds.

### The correction: that's two axes, not one

As proposed, green/yellow measure *where data goes* and red measures *whether
things are working*. Those are independent. A perfectly private, fully local
setup can also be broken; a working cloud setup is not "less broken" than a
broken local one. One colour trying to say both will eventually lie.

**The fix — the colour answers exactly one question:**

> **What leaves this machine when I do this?**

That is checkable, honest, and never ambiguous. Health gets its own indicator.

### What each colour means

**🟢 GREEN — nothing leaves this machine.**
A local model, or no model at all. Everything the Pavilion is *for* — the
Library, reading, read-aloud, notes, the day, lessons, the Hall — is green,
always, permanently. This is the default and the reason the project exists.
The badge is not a reassurance; it is a **statement of fact that can be
verified**: green means zero network requests, which `test/live/preflight.mjs`
already proves and `verify-beta-build.mjs` already enforces at build time.

**🟡 YELLOW — this text goes to a named third party.**
Not a warning. A **label with a name on it**: *"This will send 4,200 words to
Anthropic."* And, crucially, **press to read exactly what** — the prompt
inspector already holds the real message array, not a reconstruction. Yellow is
fine. Most people will want it for the heavy jobs. The point is never to
discourage it, only to ensure nobody is ever surprised by it.

**🔴 RED — the promise cannot currently be kept.**
And here is the honest part: **the app cannot detect that it has been
compromised.** Nothing can, from the inside. Claiming otherwise would be exactly
the "safe download" mistake from `OPEN-COMMONS-PLAN.md` — a verdict where only
facts are available.

So red must mean something real and detectable:

- a cloud connection is enabled but a resident is about to use it *unlabelled*
- a send failed **part-way**, so what arrived at the other end is unknown
- the build did not pass `verify-beta-build.mjs` — it may carry keys or a cloud
  host
- a connection points somewhere unexpected (an `ollama` kind at a remote URL)
- a key is stored somewhere the person did not choose

**Red is "we cannot honestly tell you this is green or yellow" — a state to be
resolved, not an alarm.** Every red should come with the specific reason and the
specific fix, which is what *"compromised in a way that can be fixed"* really
describes.

### On encryption, honestly

Worth offering; worth being precise about, because "encrypted" is the easiest
word in software to hide behind.

Encrypting the save at rest with a passphrase protects against **one thing**:
someone with access to your disk or a copy of your backup. That is a real threat
for a shared or portable machine — and it pairs naturally with the drive build
above.

It does **not** protect anything sent to a cloud model, it does not make yellow
into green, and losing the passphrase loses everything with no recovery.

**So: offer it, never default it, and never let it colour the badge.** The
colour answers where data goes. Encryption answers who can read what stays. Two
different questions, and conflating them is how "secure" becomes meaningless.

---

## What to build first

Nothing here is urgent, and the ordering matters more than the speed.

1. **The colour vocabulary, before the gateways.** Three badges and one honest
   sentence each, on every surface that already carries 🏠/☁. Cheap, and it must
   exist *before* cloud use becomes convenient — otherwise convenience arrives
   first and the labelling is retrofitted onto habits already formed.
2. **"Read exactly what will be sent"** wired to the existing prompt inspector.
   This is the single most trust-building thing available and the machinery is
   already built.
3. **Gateway presets** — Claude, OpenAI, Grok, Ollama Cloud — as one-click
   setups over the three connection kinds that already exist.
4. **The heavy-lifting connection**, opt-in per task, on the two jobs that
   actually want it: bulk shelf sorting, and drafting a full course.
5. **Red-state detection**, as a specific, fixable list rather than a mood.
6. **The portable build**, whenever carrying it somewhere becomes a real want.

---

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
