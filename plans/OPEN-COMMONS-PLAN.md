# The Open Commons — sharing, filtering, trust, and reading the internet

Written **2026-07-28**, from an observation worth quoting in full:

> *"A lot of people are building applications with AI and I don't think there is
> enough sharing — the ability to know what is going on in the open source
> community, the ability to share and communicate with not only others but also
> have something like an AI representative to deal with other AI and human
> interactions as a filter, also a place to check if downloads are safe and a
> way to check and flag them... and also search on the internet in an informed
> way with a guide of local AI helping out."*

Four ideas. They are **not equally ready and not equally safe**, and treating
them as one feature would be the mistake. This plan separates them, says plainly
which is strongest, and marks the one that needs pushing back on.

Builds on [`COMMONS-BACKEND-PLAN.md`](COMMONS-BACKEND-PLAN.md) — the packet, the
keypair, the three endpoints, the static Phase 1 mirror. Nothing here replaces
that; all of it sits on top.

**Status: a written plan. Build none of it yet.** The beta has not been in
anyone's hands for a full day. Every line below is worth more after real users
than before them.

---

## First, a sharper diagnosis than "not enough sharing"

The observation is right but the cause is worth getting exact, because it
decides what to build.

**It is not that there is nowhere to post.** GitHub, forums, Discord, Mastodon,
a hundred newsletters — the internet is not short of places to put things. Most
are free and most are empty of the specific thing being described.

**What is actually missing is curation and trust at a human scale.** The
question is never "where can I read about people building with AI"; it is
*"which of these thousand repositories is worth my evening, and who says so, and
why should I believe them?"* Volume made that harder, not easier, and AI-
generated content has made it very much harder — there is now more plausible-
looking material than any person can filter by hand.

So the Pavilion's opening is **not being another place to talk.** It is:

1. the unit shared is a **packet with substance** — a lesson, a build note, a
   real analysis — never a bare link or a bare claim, which is already the
   entry price the commons charges;
2. **your own agent, holding your own standards, on your own machine, filters
   for you** — rather than a platform's algorithm optimising for its engagement;
3. everything carries **provenance you can check yourself**.

That is a genuinely different product from a forum, and the difference is worth
protecting when the temptation comes to add a feed.

---

## 1 · Knowing what the open-source world is doing — the cheapest one

**What exists already:** packets, and a commons that only grows when someone
contributes real substance.

**What's missing is a packet kind.** Today a packet can be a lesson, a course, a
paper analysis or a note. None of those is *"here is a tool I built and what I
learned building it."* That is exactly the shape of the missing sharing.

**Build:** a `build` packet kind — what it is, what it's for, what surprised you,
what you'd do differently, and where the source lives. Anything else is a link.

**Why this first:** it is a data-shape change and some UI. No server work, no
new trust model, no new risk, and it works over Phase 0 (files by hand) on day
one. It is also the packet *the person writing this project* would produce
naturally, which matters — a commons whose founder has nothing to put in it
stays empty.

---

## 2 · The AI representative as a filter — the strongest idea here

This is the one worth being excited about, and it is closer than it looks
because the parts are already built.

**What exists:** residents with charters; `data.standing[agentKey]`, standing
instructions appended to every send through the single `withStanding()` funnel;
and the prompt inspector, which shows the **exact** message array that was sent
rather than a reconstruction.

So "an AI representative" is not a new kind of thing. It is **a resident, given a
standing instruction, pointed at the inbound tray.**

### Why this inverts the hard problem

Every social system eventually faces moderation, and every centralised answer is
bad in a predictable way: someone must decide for everyone, at scale, and
becomes either a censor or a doormat. The Pavilion can decline the question
entirely, because **the filter is client-side and personal**:

- it runs on *your* machine, on *your* model
- it applies *your* stated standards, which you wrote and can read
- it produces *your* ordering — and someone else's Pavilion, with different
  standards, sorts the same packets differently, correctly

Nothing is deleted for anyone. There is no central list of the disapproved. Two
people can disagree about what is worth reading and both be served.

### The rule that keeps it honest

**It sorts and annotates. It never hides.**

A filter you cannot see past is a filter that owns you. So:

- every inbound packet stays reachable, always, one click away, in full
- the representative's output is an **ordering plus a sentence of reasoning**,
  never a silent deletion
- **the prompt inspector applies here too** — you can always see exactly what
  your representative was told and what it was given
- a "sorted to the bottom" pile is visible and countable, never a void

This is the same discipline as the librarian's shelf suggestions: *a suggestion
is not a decision*, and the accept step is yours. That principle has now earned
its place three times; it should be the house style for every agent that touches
someone else's work.

### The risk to name out loud

**An agent that summarises the world for you becomes the world you see.** That
is a real cost, not a hypothetical one, and it gets worse the better the agent
is. Two mitigations, both structural rather than good intentions:

1. the raw packet is always one click from the summary, and the UI should make
   that click obvious rather than technically-present;
2. the representative should be **required to name what it filtered and why** —
   an unexplained sort is not acceptable output.

### Agent-to-agent, which is the part that actually scales

The interesting version is two representatives negotiating: mine holds my
standards, yours holds yours, and they establish whether a packet is worth
either of our time before either human is interrupted. The Pavilion is unusually
well-placed for this because **both sides are local, both are inspectable, and
neither is a service with an interest in the outcome.**

Keep it modest at first: an agent may *annotate and rank*. It may not accept,
publish, delete, or reply on your behalf. Those stay human. ("Nothing without
you" is a standing decision, and this is exactly where it would erode first.)

---

## 3 · "Is this download safe?" — the one to push back on

**This is the riskiest feature anyone has proposed for this project, and it
should not be built as described.**

The instinct is good — people genuinely need it. But a system that tells someone
a download is safe, and is wrong, has done them real harm, and the Pavilion's
entire credibility rests on not overstating. Three hard facts:

1. **A local model cannot assess a binary.** An 8B model handed an installer
   cannot tell you whether it is malicious. Nothing about being asked confidently
   changes that. Any "looks fine to me" here is a fabrication with consequences.
2. **Real malware analysis is an industry**, with sandboxes and signature feeds
   and staff. It is not a weekend feature, and a half-version is worse than
   none, because it produces false confidence where there was healthy caution.
3. **A "safe" badge is a target.** The moment it exists it is worth attacking,
   and the attack is not on the file — it is on whatever produces the badge.

### What can be built honestly, and is genuinely useful

Not a scanner. **A provenance and attestation record** — facts, never verdicts:

| The Pavilion CAN say | The Pavilion must NEVER say |
|---|---|
| `SHA-256: FB09…` — and whether it matches what others recorded | "This file is safe" |
| First seen in this commons on *date*, by *key* | "This file is malicious" |
| Signed by *key*, which also signed *n* other packets | "Scanned — no threats found" |
| *n* people recorded running it; *m* flagged it | any score, grade, or traffic light |
| Each flag's **stated evidence**, attributed and readable | an unexplained flag |
| "No one you exchange packets with has ever seen this file" | "Unknown files are dangerous" |

That last row is the honest core: **"three people whose packets you already
accept have run this exact file and none flagged it"** is a real signal, and it
is one no antivirus can give you. It is a *social* fact, stated as a social
fact.

**The precedent is already in this codebase**, and it should be followed exactly:
`data/copyright.js` decides by deterministic rule, uses the model only to
*extract evidence*, and defaults to the cautious side when uncertain. Same shape
here. **Rules and facts decide; the AI may gather; uncertainty is stated, never
resolved by guessing.**

**And the flags need the same entry price as everything else:** a flag with no
evidence is not a flag, it is a rumour, and rumours are how this kind of system
gets weaponised. Evidence, attributed, or it does not appear.

---

## 4 · Searching the internet, with a resident helping

Real, wanted, and it has one hard constraint people usually discover late.

**A local model cannot browse.** It has no network access and no index; it only
knows what its weights hold and what you put in the prompt. "Search with local
AI" therefore always means: *something else searches, the model helps you read.*

### Two honest routes

**Self-hosted [SearXNG](https://searxng.org)** — a metasearch engine in Docker
that aggregates public engines with no API key and no account. This is the
build-it-ourselves answer, it sits beside the MinIO layer already planned, and
it is the one consistent with the standing decisions.

**A search API** (Brave, Tavily, and the like) — faster to wire, but a third
party, a key, and a bill. Reach for it only if SearXNG genuinely can't be made
to work, and say so plainly, per the standing rule.

### The security decision that must be made deliberately

`electron/main.cjs`'s fetch bridge is **locked to localhost on purpose**, and
its own comment says why: *"this bridge exists to fix Ollama's CORS wall, not to
become a general fetch-anything-from-the-renderer hole."*

Web search requires widening that. It should be widened **narrowly and
knowingly**: an allowlist of the search host and fetched page hosts, a size cap,
a timeout, no cookies, no credentials forwarded. This is the single most
security-relevant change in the whole plan and deserves its own review rather
than arriving as a side effect of a feature.

### The part that is actually valuable

The search is the boring half. **The Pavilion's edge is what happens after.**

A page found, fetched, stripped to text, read *with the source visible*,
summarised by a resident who cites which paragraph it drew on — and then
**shelved as a book you keep**. It stops being a tab you lose and becomes
something in your Library, re-readable, note-able, linkable to a lesson, and
yours offline forever.

That is the existing core loop — *reading becomes doing* — pointed at the
internet instead of a `.txt` file. It is a much better goal than "a search box",
and it is one nothing else does, because everything else wants you to come back
rather than to keep what you found.

---

## Sequencing — what actually to do, and when

| | What | Depends on | Cost |
|---|---|---|---|
| **A** | The `build` packet kind — sharing what you made and learned | nothing | small |
| **B** | The representative: a resident reading the inbound tray, sorting and annotating, hiding nothing | standing instructions (built) | medium |
| **C** | Provenance records: hashes, signatures, evidenced flags — **facts, no verdicts** | keypairs, Phase 2 writes | medium |
| **D** | Fetch-and-read: SearXNG, the narrowed bridge, page → shelved book | Docker layer, a security review | large |

**A** is worth doing whenever the commons has two people in it. **B** is the one
worth being excited about and should follow the first real packet traffic —
building a filter before there is anything to filter is how you get a filter
tuned for imaginary problems. **C** waits for Phase 2 writes. **D** is a project
of its own and should be planned again from scratch when it comes up, not
inherited from this paragraph.

**The honest overall answer: not yet, and that is fine.** Every one of these gets
better designed after real people have used the Pavilion for a month. The single
most valuable thing available right now is still the thing already in progress —
put the beta in front of friends and listen.

---

## What this must never become

Stated now, while it costs nothing to state:

- **No feed.** No infinite scroll, no engagement ranking, no "you might also
  like". The ordering is your agent's, by your standards, and it terminates.
- **No follower counts, no likes, no karma.** Nothing that turns contribution
  into scoring.
- **No notifications that arrive without being asked for.** Nothing moves by
  itself; that is a standing decision and this is exactly where it erodes first.
- **No safety verdicts.** Facts and evidence, or silence.
- **No agent acting for you.** It reads, sorts and annotates. Accepting,
  publishing and replying stay human, always.
- **Still usable by someone who never connects.** If any of this becomes load-
  bearing, the local-first promise is broken and the whole thing was for
  nothing.
