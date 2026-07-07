# API & AI Integration — A Desktop-Focused Learning Plan for Work

`LEARNING-PATH.md` is scoped to this one project. This document has a
different job: taking what you've actually built here — a real
localhost API call, a real deployed app, a real database with real
security rules — and naming the *general* version of each idea, the
one that shows up in any job that touches APIs or AI, not just a game
about a Library. Every stage below points back at real code you've
already touched, because that's what's actually worked so far.

Same rule as `LEARNING-PATH.md`: go at your own pace, skip what's
already obvious, come back and ask for this to be adjusted at any time.

## Where you are (updated 2026-07-07)

- [ ] Stage A — what an API actually is, outside this one game
- [ ] Stage B — secrets and authentication, done properly
- [ ] Stage C — local AI vs. cloud AI: the real tradeoffs
- [ ] Stage D — robustness: timeouts, retries, rate limits
- [ ] Stage E — structured output & tool use — AI that *does* things
- [ ] Stage F — a desktop app, for real this time
- [ ] Stage G — security specifically for AI-integrated software
- [ ] Stage H — testing something that isn't deterministic

Nothing checked yet — this is a fresh document. `LEARNING-PATH.md`'s
Stage 4 (API basics) and Stage 14 (deploying/debugging) are real
prerequisites for this one; if either feels shaky, that's the better
place to start.

## Stage A — what an API actually is, outside this one game

**Concept:** every API you'll ever touch at work is the same shape as
`src/game/ai/provider.js`'s call to Ollama: send some data to an
address, get some data back, in an agreed-upon format (almost always
JSON). The *only* things that change job to job are: the address, what
data goes in, what data comes back, and how you prove you're allowed to
ask. Once you've watched one real API call in DevTools, you've watched
the shape of all of them — Slack's API, Stripe's API, your company's
internal API, an AI provider's API, all the same shape underneath.

**Try this:** open a job posting or a tool you use at work that has
"API" in its docs somewhere. Find its docs page and look at one example
request. Before reading the explanation, try to answer: what's the
address, what goes in, what comes back? You already know how to read
this.

**You're ready for Stage B when:** an unfamiliar API's docs page stops
looking like a wall of text and starts looking like "oh, address, in,
out, same as always."

## Stage B — secrets and authentication, done properly

**Concept:** you already did the *right* thing here without necessarily
naming it — `.env.local` (never committed), `.env.example` (committed,
values blank) is the real, professional pattern, not a beginner
workaround. The word for what you built: **secrets management**. The
one upgrade from what you've done to what a real company does: they use
a dedicated secrets manager (AWS Secrets Manager, 1Password, Vault) so
a secret can be *rotated* (changed) without every developer needing a
new `.env` file by hand — same idea, less manual.

**The other real concept from today, worth naming precisely:**
**publishable/anon keys vs. service-role keys** aren't a Supabase
quirk — every API-key system in the world draws this same line between
"safe to expose in a browser" and "must never leave a server you
control." Learn to ask this question about *any* new API key you're
handed: which side of that line is this one on?

**Try this:** find `promote-draft.py`'s docstring — reread why it
insists on the service-role key specifically, never the publishable
one. That's the whole concept, already explained, in your own project.

**You're ready for Stage C when:** handed a new API key at work, your
first question is "which kind is this, and where am I allowed to put
it" — not "does it work."

## Stage C — local AI vs. cloud AI: the real tradeoffs

**Concept:** you've now used both — Ollama (local) and, through
Supabase's infrastructure, cloud-hosted services. The real tradeoffs,
worth having crisp:

|              | Local (Ollama)                | Cloud (OpenAI/Anthropic/etc.) |
|--------------|--------------------------------|--------------------------------|
| Privacy      | Nothing leaves your machine    | Your data reaches someone else's server |
| Cost         | Free after setup, uses your hardware | Pay per request/token |
| Capability   | Limited by your own hardware   | Access to much larger, stronger models |
| Availability | Only while your machine's on   | Always on, no setup for the user |
| Latency      | Depends on your hardware       | Depends on their infrastructure + your connection |

**Why this matters at work specifically:** a company handling anything
sensitive (health data, legal documents, unreleased code) often *can't*
send it to a third-party cloud API at all — this is exactly why local
models are a real, growing professional category, not a hobbyist
curiosity. You've already built the NoProvider-style fallback pattern
(`AIProvider`'s contract in this game) that a real product needs to
offer both.

**Try this:** pick one real task you do at work. Would you actually be
allowed to paste that data into ChatGPT? If not, that's the exact
reason local-model tooling exists as a career-relevant skill right now.

**You're ready for Stage D when:** given a new AI feature request at
work, "local or cloud" is one of the first three questions you ask, not
an afterthought.

## Stage D — robustness: timeouts, retries, rate limits

**Concept:** today, in this exact project, you personally hit a real
rate limit (Supabase's email sending) and watched me diagnose it
through actual logs instead of guessing. That's not a side note — rate
limits, timeouts, and retries are *the* daily reality of working with
any external API professionally. The vocabulary worth having:

- **Timeout** — give up waiting after N seconds rather than hanging
  forever (`AI.chat()` already does this).
- **Retry with backoff** — if a request fails, try again, but wait
  longer each time rather than hammering a struggling service.
- **Rate limit** — a cap on how often you're allowed to ask, enforced
  by the *other* side, not something you control.
- **Circuit breaker** — after enough failures, stop trying for a while
  automatically, so one struggling dependency doesn't take down
  everything that depends on it.

**Try this:** find `AI.chat()` in `src/game/ai/provider.js` and locate
its timeout value. Then imagine: what should happen if Ollama takes 3x
longer than usual just once? What if it's down for an hour? Different
answers, different mechanisms — that's the actual design skill.

**You're ready for Stage E when:** you can explain why "just try again"
is not a complete answer to "the API call failed."

## Stage E — structured output & tool use — AI that *does* things

**Concept:** every AI feature in this game so far has been "send text,
get text back" (Quill's chat, the Steward, the Research Desk). The
professional next step — and the thing most real work AI-integration
jobs actually need — is **structured output**: asking a model to
return data in a specific shape (JSON matching a schema) instead of
free text, so your code can reliably use the answer without parsing
prose. One level past that is **tool use / function calling**: the
model doesn't just answer, it says "call this function with these
arguments," and your code actually runs it. This is the real mechanism
behind "an AI agent that does things," not a special kind of magic.

**Try this:** imagine giving the Research Desk's assistant a tool
called `add_note(text)` instead of just chatting — the model decides
*when* to call it based on the conversation, rather than you clicking
"save reply as a note" by hand. That's the entire conceptual leap from
where this project is today to a genuine agent. Sketch what the tool
definition would need (name, description, what arguments it takes) —
you don't need to build it, just see the shape.

**You're ready for Stage F when:** you can describe the difference
between "an AI that answers" and "an AI that acts" in one sentence,
using this project's own Research Desk as the example.

## Stage F — a desktop app, for real this time

**Concept:** this was sketched (Tauri vs. Electron) in an earlier
session and archived, not built. Worth revisiting now with intent,
since "AI integration on a desktop, for work" is your actual stated
goal. The real shape of a modern AI-integrated desktop app: a normal
web frontend (exactly what this game already is) wrapped in a native
shell, talking to either a local model (Ollama-style, same pattern
you've already built) or a cloud API through a small backend that
holds the real API key (never the browser — see Stage B).

**Try this, when you're ready to build rather than just read:**
`npm install --save-dev electron`, a `BrowserWindow` loading this
game's own `dist/index.html`. You'd be running the exact thing you
already built, in a real window with no browser chrome — the smallest
possible proof that "desktop app" isn't a different codebase, just a
different wrapper.

**You're ready for Stage G when:** you can explain, to someone else,
why a desktop AI app and a website AI app are usually *the same code*
with a different shell around it.

## Stage G — security specifically for AI-integrated software

**Concept:** this project already has a real example of the general
rule — `safeUrl()` in `ui/overlays.js` strips anything that isn't a
genuine `http(s)://` link before it ever becomes a clickable `href`,
because *user-supplied text becoming code* is a real attack shape
(a pasted `javascript:...` "URL"). AI-generated text needs the exact
same suspicion: never treat a model's output as automatically safe to
insert into HTML, run as a command, or execute as code, just because it
came from "the AI" instead of "a user." The AI-specific version of this
problem has a name: **prompt injection** — text (in a document, a web
page, a tool result) that's crafted to manipulate the model into doing
something it wasn't asked to. You've actually seen defenses against
this already, from the other side: the `<untrusted-data>` boundaries
wrapped around SQL query results in this very conversation are exactly
this protection in action.

**Try this:** find every place in `ui/overlays.js` where an AI reply
gets inserted into the page (`esc()` calls). Notice it's escaped the
same way user-typed text is — the code doesn't trust the model any more
than it trusts a stranger typing into a form.

**You're ready for Stage H when:** you'd instinctively ask "what if the
document I'm feeding this model contains hidden instructions" before
shipping any feature that reads external content into a prompt.

## Stage H — testing something that isn't deterministic

**Concept:** a normal function returns the same output for the same
input, every time — easy to test. An AI call can return something
different each time, even with an identical prompt. This is a real,
open problem in the industry, not something you're missing a trick on.
The practical answers worth knowing: **mock the AI in most tests**
(fake a canned response, test that your code handles it correctly —
this is what "does it show a loading state, does it handle an error"
tests actually need, not a real model call); **golden-response /
snapshot tests** for the rarer cases where you genuinely need to check
real model behavior, accepting that these are slower and flakier by
nature; and **human review in the loop** for anything where correctness
actually matters (exactly the Steward Review Queue's whole reason to
exist — this project already chose "a human checks" over "trust the
model" as its answer, on purpose, for the one thing where the stakes
were real).

**Try this:** think back to today's Research Desk test — I didn't
assert the AI's reply *said* anything specific, only that a reply
came back, mentioned the right subject, and the UI updated correctly.
That's the actual professional pattern: test what your code does with
the answer, not what the exact words of the answer are.

**You're ready to call this plan "in progress, forever" when:** you can
walk into a work conversation about "adding AI to X" and immediately
be asking about local-vs-cloud, rate limits, structured output, prompt
injection, and how it'll be tested — the whole shape, not just "can it
answer a question."

---

*Like `LEARNING-PATH.md`, this is meant to be revisited and rewritten —
ask any time to add a stage, adjust the pace, or fold in whatever
you're actually running into at work.*
