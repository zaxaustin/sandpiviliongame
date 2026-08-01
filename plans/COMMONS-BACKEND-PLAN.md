# The collective pool — a backend plan that stays small

Written **2026-07-28**, from: *"How can we work on the collective pool of
knowledge? We gotta make a good backend plan eventually. I'm fine with spending
a bit of money to rent a server — this game isn't big and we can minimise what
to communicate."*

That last clause is the whole plan. This document is mostly the consequences of
taking it seriously.

Supersedes the vague Phase 3 sketch in
[`SELF-HOSTED-STACK-PLAN.md`](SELF-HOSTED-STACK-PLAN.md), which assumed the
answer was "rent a box and run the same Postgres + MinIO stack, then solve
accounts." It isn't. Accounts are the expensive part, and we can mostly not
have them.

---

## The reframe: the unit is the packet, not the user

The instinct with a shared anything is to model **people** — accounts,
profiles, sessions, passwords, resets, moderation powers. That is where the
cost, the risk and the liability all live, and it is why most projects like
this stall at exactly this point.

But look at what the Pavilion already built. Sharing here is already a
**packet**: a self-contained file holding one lesson, course, note or paper
analysis, carrying its own title, author name and provenance. People hand them
over today with no server at all.

So the server does not need to know who anyone is. **It needs to hold packets
and list them.** That is a fundamentally smaller problem — and it is small
enough that "build it ourselves" costs a weekend rather than a season.

> **The test for every feature below:** does this require the server to know
> something about a *person*? If yes, it needs an extremely good reason, because
> that is the line where cheap becomes expensive.

---

## What travels, and what never does

`data/visibility.js` already draws this line in the app and `npm test` already
enforces it. The server inherits it unchanged.

**Travels — and only when you press a button:**
- lessons and courses you wrote and chose to publish
- notes and paper analyses you chose to publish
- the name you chose to be credited as (which may be nothing)

**Never travels. Not encrypted-and-sent. Not sent.**
- your save, your position, your day, your plan, your streak
- your notes, unless that individual note is published
- your library, your shelves, what you have read, what you are reading
- every word exchanged with a resident — those never leave the machine at all
- any identifier that follows you: no account, no email, no device ID, no
  analytics, no telemetry, no crash reports

A packet is a few kilobytes of text. **That is the entire payload.** Which is
what makes the rest of this cheap.

---

## The whole protocol, three endpoints

```
GET  /index.json            → [{ id, kind, title, by, tags, bytes, added }]
GET  /packet/<id>           → the packet itself
POST /packet                → publish one (see identity, below)
```

`id` is the **SHA-256 of the packet's own bytes**. Content-addressed, which
gives several things for free: the same packet published twice is one packet;
a packet cannot be altered without changing its id; a client can verify what it
got; and caching becomes trivial and permanent.

Reading requires **no account, no key, no login**. Anyone can pull the index
and any packet. That is the correct default for a commons.

---

## Identity without accounts

Every Pavilion generates a **keypair on first run** and keeps the private half
on that machine forever. Packets are signed with it. The public half is the
identity.

This gives what accounts are actually wanted for:
- **verifiable authorship** — "the same person who wrote that other lesson"
- **stable credit** across many packets
- **revocation of a bad actor** — block a key, not a person

And it avoids all of what makes accounts expensive: no passwords, no email
delivery, no reset flows, no session store, no breach surface, no personal data
held on a server we would then be responsible for.

A visitor's display name is just a label they chose. It is not authenticated
and does not need to be — the key is the identity, the name is a courtesy.

**Write access, first cut:** an allowlist of keys, which is to say you and
whoever you hand a token to. Publishing is rare and deliberate; there is no
reason to open it to the anonymous internet on day one. Widening it later is a
policy change, not a rebuild.

---

## What it costs, really

| | |
|---|---|
| **Hetzner CX22** — 2 vCPU, 4 GB, 40 GB disk | **~€4.5/month** |
| DigitalOcean / Vultr equivalent | $5–6/month |
| A domain, if wanted | ~$12/year |

A packet is a few KB. Forty gigabytes holds **millions** of them. Bandwidth for
a few hundred readers pulling a JSON index and some text files is a rounding
error against any VPS's included transfer.

**This will not outgrow the smallest box available for years**, and the day it
does is the day this project has succeeded beyond anything currently planned.

---

## The phases — and Phase 1 is nearly free

### Phase 0 — where we are. File-based, no server.

Already built and shipping in the beta. Packets are written to disk and handed
over: email, USB, a chat window. The Inheritance Hall and the Commons Table
both work this way. **It has no single point of failure and no running cost**,
and that is worth keeping working forever regardless of what else gets built.

### Phase 1 — a read-only mirror. Static files. Do this first.

An `index.json` and a folder of packets, served by nginx off the VPS. The
Pavilion learns to **pull**: fetch the index, show what is there, download what
you choose.

- **No server-side code at all.** No API, no database, no auth, nothing to
  exploit, nothing to keep patched beyond nginx itself.
- Publishing at this stage means *you* copy a file onto the box. That is a
  perfectly good bottleneck for a commons whose first hundred packets should be
  curated anyway.
- It delivers **most of the actual value** — "find what others have left
  before" — for the price of the box.
- Trivially reversible. If it turns out nobody wants it, delete the droplet.

**Recommendation: build only this, and live on it for a while.** Everything
below is a response to a problem Phase 1 has not caused yet.

### Phase 1½ — the same files, with a front door

Asked for 2026-07-28: *"a web page for people to dump books for the
commonwealth, and have guides and classes in the traditional website format,
and it can be used as a hub for the local pavilions."*

The good news is that this is **not a second thing to build**. Phase 1 already
puts a folder of packets and an `index.json` on a box with nginx in front of
it. Add an `index.html` beside them and the *same artifact* serves both
audiences:

- **For a person:** an ordinary website. Browse the guides, read the classes,
  see what has been contributed, download a packet — in a browser, on a phone,
  with no app installed and nothing to sign up for. It is the front door for
  someone who has heard about this and wants to look before they commit to
  downloading anything.
- **For a Pavilion:** the same directory, read as data. `index.json` is the
  machine-readable view of exactly what the web page shows a human.

One folder, one box, one €4.50/month, two audiences. That is a genuinely nice
property and worth protecting: **anything the website can show, a Pavilion can
pull, because they are reading the same files.**

It also answers "where do people get the app" with something better than a
GitHub link: a page that explains what this is, links the installer, and shows
the commons that already exists — which is a far kinder first impression than a
repository.

**What it must not become.** A website is a gravity well: accounts creep in,
then comments, then a feed, then the thing that was local-first becomes a
site with a downloadable client. The rule that keeps it honest is the one
already in this plan — **the server never knows who anyone is.** No login on
the website. Uploading a book means the same signed-packet path as everything
else, or it means emailing it to the steward, which for the first year is
completely sufficient.

**Sequencing:** after the beta has real users. A hub with nothing in it and
nobody to hub is a landing page for an audience that doesn't exist yet. The
first version can honestly be one page: what this is, the installer, and the
handful of guides already written for the app.

### Phase 2 — writes. A small signed API.

When copying files by hand becomes the bottleneck, add `POST /packet`: verify
the signature, check the key against the allowlist, check the size, store by
content hash, append to the index. **A few hundred lines**, one process, no
framework worth arguing about.

Rate limit by key. Cap packet size. Keep every version — nothing is ever
overwritten, because content addressing makes overwriting meaningless.

### Beyond — people, agents and trust

The four ideas raised 2026-07-28 — sharing what you built, an AI representative
that filters *for you* rather than a platform filtering *at* you, provenance
records on downloads, and reading the internet with a resident's help — have
their own plan: [`OPEN-COMMONS-PLAN.md`](OPEN-COMMONS-PLAN.md). It sits entirely
on top of the packet, the keypair and the static mirror described here, and
changes none of them.

One line from it belongs here too, because it constrains the backend: **the
server never renders a verdict.** Not on safety, not on quality, not on people.
It holds packets, lists them, and records attributed facts. Every judgement
happens on someone's own machine, by their own standards.

### Phase 3 — federation, if it is ever actually wanted.

The index is just a URL. A Pavilion that can pull one can pull several. At that
point there is no central commons — there are pools, and you choose which you
draw from. This is the shape [`TOOL-COMMONS-PLAN.md`](TOOL-COMMONS-PLAN.md)
hopes for, and Phase 1's design does not obstruct it: a static index is the
easiest thing in the world to mirror.

---

## The questions that will actually bite

**Moderation.** Anything published can be withdrawn from the index by the
steward; content addressing means a withdrawn packet simply stops being listed.
There is no takedown of copies already pulled, and pretending otherwise would
be dishonest. The truth-seeking ethic applies as it does everywhere else here:
claims travel with their evidence, and a packet with neither is not censored so
much as uninteresting.

**Copyright.** `data/copyright.js` already exists and already refuses to let an
uncertain text be shared — rules decide, the AI only gathers evidence, and
uncertain always defaults to personal. The server should re-check rather than
trust the client, since a client is a thing a stranger controls.

**Legal exposure.** Hosting other people's writing on a box you rent makes you
the host. Keeping the allowlist small for as long as possible is the honest
mitigation, and is another argument for Phase 1.

**Abandonment.** If the box goes away, every Pavilion still has everything it
pulled, and Phase 0 still works. **Nothing here is ever the only copy.** That
is the property worth protecting above all the others.

---

## What this explicitly is not

- Not a sync service. Your save never leaves your machine. Two Pavilions are
  two places, not two views of one account.
- Not a social network. There is no feed, no follower, no like, no notification.
- Not a backup. If you want your Pavilion elsewhere, export it — one file,
  already built.
- Not required. Every version of this must remain fully usable by someone who
  never connects to it, forever. That is not a courtesy to the offline; it is
  the whole reason the thing is trustworthy.

---

## Where things install, since it came up in the same breath

**On a tester's machine** (from the installer, per-user, no admin):

```
C:\Users\<name>\AppData\Local\Programs\sand-pavilion\     the app
C:\Users\<name>\AppData\Roaming\Sand Pavilion\            saves + personal books
```

Uninstall via Settings → Apps. The `Roaming` folder is the one worth copying if
someone wants to move machines.

**The server**, when there is one: any VPS. Nothing about this needs a specific
provider, which is the point — it is a rented box running nginx, not a platform
with a lock-in story.

**Getting it to people:** GitHub Releases on a public repo — anyone with the
link downloads, no account needed. See
[`SHIPPING-THE-BETA.md`](SHIPPING-THE-BETA.md).
