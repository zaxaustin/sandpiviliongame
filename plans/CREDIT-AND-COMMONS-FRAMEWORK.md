# Credit, reputation and skill — the framework, and where money is allowed

Written **2026-08-02**, at direct request:

> *"I want to be able to distinguish between things that can be traded freely,
> things I can study for myself and can't share, what's a gray area and what's
> a strict no-no to gather... I do intend to fight the NGOs for big education,
> but I don't have to stoop to their level and I will do things properly."*
>
> *"I want a system in place that focuses more on credit, reputation and skill
> rather than money — which can be used, but only fairly and at the right time."*

Two questions that look separate and are the same question: **what makes a
claim on the commons legitimate?** Once for texts (where did this come from,
what may I do with it) and once for people (why should your word carry weight
here).

---

## Part 0 — the honest state of things, before any new design

**Already built and working:** `src/game/data/copyright.js`. Given a text, it
gathers evidence (a stated licence, a Gutenberg header, a copyright line, a
publication year), runs plain-code rules over it, and returns one of four
verdicts — **open**, **pd**, **copyright**, **unknown** — each with its reasons
attached and a rule that *uncertain always defaults to personal*. An AI never
decides; it only ever helps *find* evidence, and what it found is shown to you
beside the verdict. Covered by `npm test`.

That answers **three** of the four categories asked for:

| Asked for | Already answered by |
|---|---|
| freely traded | `open` / `pd` → **may be shared** |
| study myself, can't share | `copyright` → **keep it personal** |
| gray area | `unknown` → **keep it personal, and say so** |
| **strict no-no to gather** | **nothing. This is the gap.** |

**And the gap is not an oversight — it's a different axis.** Copyright triage
asks *"given that I have this text, what may I do with it?"* The fourth
category asks *"should I have gone and got it in the first place, and from
where?"* Those are independent, and the clearest proof is that the same book
can sit anywhere on the second axis while never moving on the first:

> *Practical Electronics for Inventors* is in copyright no matter what.
> Bought from a shop → **fine to hold**.
> A friend emails you their PDF → **grey**.
> Pulled from a shadow library → **the line**.
>
> The text is identical in all three. The **act** is what differs, and no
> amount of examining the file will tell you which happened.

So one field cannot carry both. There need to be two, and the second one is
about **how it was gathered**.

---

## Part 1 — the gathering axis, four levels

The verdict below is about the **act of acquiring**, never about the file.

### 🤝 Freely given
The rights-holder put it out for anyone. Public domain, Creative Commons,
Gutenberg, Standard Ebooks, arXiv, PubMed Central, government publications
(NEETS, NASA, NIST), a manufacturer's own datasheet, a publisher's free PDF,
an author's own site. **Gather freely. Share freely.**

### 👤 Yours to hold
Legitimately acquired, not yours to pass on. A book you bought. A paper your
library or institution subscribes to. An ebook you own. A copy you made of
something you own. **Gather freely. Keep it personal.** A personal copy needs
no licence from anybody — that is your business and always has been.

### ❔ Ask first
The genuine grey. No stated licence anywhere. Orphan works whose holder cannot
be found. A page you scraped. A YouTube transcript. A PDF someone emailed you.
A forum post. Course material from a university site with no terms attached.
**Usually fine to read. Genuinely unclear to keep or pass on.** The rule:
personal only, and *record where it came from* — because in a year you will not
remember, and "I don't know where I got this" is how a commons ends up holding
something it had no right to.

### ⛔ Not from here
The line. Not a licence question — an **acquisition** question, and the answer
is no regardless of what the text says:

- shadow libraries (Library Genesis, Sci-Hub, Z-Library and their kin)
- circumventing DRM
- getting round a paywall or an access control
- bulk-scraping a site against its stated terms or `robots.txt`
- anything obtained by misrepresenting who you are

**What the Pavilion actually does about it — stated plainly, because the
opposite would be worse:**

- It **will not help you acquire** from here. No connector, no fetcher, no
  "paste the link and I'll grab it." The Caravan's hand-picked connectors are
  already exactly this rule in code, chosen one at a time rather than a general
  scraper — see `LIBRARY-GROWTH-PLAN.md`.
- It **will never certify** anything at this level, or the level above, into a
  shared shelf.
- It **does not police your disk.** It will not scan your files, will not
  refuse to open a book you drag in, and will not lecture you. You are an adult
  in your own house.

That last point matters and is not a hedge. A tool that searched your drive and
withheld your own files would be doing to you precisely what the gatekeepers do,
in the name of stopping them. **The Pavilion is a doorman for the commons, not a
warden for your library.**

### Why this is the *stronger* position, not the timid one

Stated directly, because the request came wrapped in *"I intend to fight the
NGOs for big education, but I don't have to stoop to their level."*

That instinct is correct and it is also **tactically** correct, which is worth
saying out loud. The single most effective move against an institution that
gatekeeps knowledge is to build something openly better whose sourcing is
**completely unimpeachable**. A commons assembled from clean provenance cannot
be dismissed, cannot be shut down on a technicality, and cannot be used to
discredit everyone else doing the same work. A commons with one stolen shelf can
be dismissed *entirely*, and it will be — the theft becomes the story, and every
honest thing beside it is buried.

There is also plenty to fight with that requires no theft at all. Public domain
is enormous and mostly unread. Open-access science is vast and badly indexed.
Government publications are free, excellent, and almost nobody knows they exist
(NEETS is a 24-module electronics education, written to teach from zero, that
costs nothing and is in the public domain). Manufacturers publish their
datasheets. **The material to build a real free education already exists in the
open; the scarce thing is someone organising it and teaching it well.** That is
the actual gap, and it happens to be exactly what this project is for.

So: nothing here is a concession. The clean path is the winning path.

---

## Part 2 — credit, reputation and skill

### The founding move: reputation is a RECORD, not a SCORE

This is the whole design, and everything else follows from it.

A **score** is a single number. Every score, without exception, gets farmed,
optimised, and eventually traded — at which point it has quietly become money,
which is the thing this was supposed to avoid. Karma, follower counts and
star ratings all failed the same way.

A **record** cannot be farmed, because the record *is* the work:

> **Not:** `Zac · 4,850 points`
>
> **But:** *3 courses published · 11 texts brought in, provenance clean ·
> 2 investigations that others cited · 1 bench log someone else reproduced and
> got the same numbers · 1 finding corrected after someone showed it was wrong*

Every line points at a real artifact you can click and check. There is no way
to inflate it except by doing the work, because the work is the entry.

### The three things, kept separate on purpose

**1. CREDIT — who made this.**
Automatic, permanent, and not earned: it is simply recorded. The mechanism
already exists in `COMMONS-BACKEND-PLAN.md` — each Pavilion generates a keypair
on first run, packets are signed, and the public half is the identity. That
gives verifiable authorship and stable credit across everything you make, with
no account, no email and no password anywhere.

**Credit cannot be transferred, sold, or assigned.** You may publish
anonymously; you may not publish as someone else.

**2. REPUTATION — what others did with your work.**
Not likes. Likes measure agreement, and agreement is not correctness. Four
honest signals, in ascending weight:

- **taken** — someone pulled it into their own Pavilion. Weak, but real.
- **built on** — someone's own work names yours as a source. Stronger.
- **reproduced** — someone followed your bench steps and got your numbers.
  **Strongest, and this project can do it when almost nobody else can**, because
  the Bench already records a prediction and a measurement per step. A build log
  someone else independently reproduced is about as good as evidence gets.
- **corrected** — someone showed you were wrong, and **you changed it**.

**Correction must RAISE standing, not lower it.** This is the Hall's creed
applied to people: the form already makes you state what would change your mind,
and actually changing it when that arrives is the highest-integrity act
available here. Any system that punishes visible error produces people who never
admit one — which is precisely the failure mode of the institutions this is
meant to stand against. So the record shows *"1 finding corrected"* as a
credential, in the same list and the same weight as the rest.

**3. SKILL — demonstrated, never claimed.**
Not a badge for reading, and not a certificate. Skill is attested by an
**artifact that works**:

- the Learning Tree ladder completed *and* the thing it was for actually built
- your remote changes the channel
- your code change passes `npm test`
- your bench log reproduces

The Pavilion is unusually well-placed for this because so much of it produces
checkable objects rather than completions. **A claim of skill that cannot be
pointed at is not shown.**

### The five anti-gaming rules, structural rather than moral

1. **No global leaderboard. Ever.** A leaderboard turns every other rule here
   into a farming target within a week. There is no ranking of people.
2. **Reputation is per-domain.** Being trusted on electronics says nothing
   about being trusted on Pali, and the record never merges the two.
3. **Volume is invisible.** Show what was taken up, never how much was posted.
   Posting a hundred things and having one used is not a hundred credentials.
4. **Reputation cannot be transferred, sold, gifted or lent.** The moment it
   can, it is a currency, and everything above was for nothing.
5. **Every claim links to its artifact.** If you cannot click through and check
   it yourself, it does not appear. This is the same rule the investigation form
   already enforces on evidence, pointed at people.

---

## Part 3 — where money is allowed

The request was exact: money *"can be used, but only fairly and at the right
time."* Here is the line, in one sentence:

> **Money follows the work. The work never follows money.**

If you would have made it anyway, being paid afterward is a thank-you. If the
payment decides what gets made, what gets seen, or what gets said, the commons
has become an advertising channel and is worth nothing.

**Money may:**
- **thank someone, after the fact, at the giver's discretion.** A tip jar, never
  a paywall. The work was already free and stays free whether or not anyone pays.
- **pay real costs, named openly with the number shown** — server rent, a code
  signing certificate ($300/yr), a Mac developer account ($99/yr), hardware.
  Honest cost recovery is not commerce.
- **commission work between two people** — *"I'll pay you to write the course I
  need"* — on the condition that **the result lands in the commons free**. This
  is how a lot of genuinely good free work has always been funded.
- **pay for a service around the commons** — someone hosting, teaching live,
  or supporting. Selling your labour is fine. Selling access to the commons is
  not.

**Money may never:**
- buy placement, ranking, visibility, or a badge
- buy reputation, credit, or a skill attestation
- buy a verdict in the Hall, or a text's way past provenance review
- gate a text that is in the commons
- be required to read, learn, take, or contribute

**The one hard rule to hold if everything else is forgotten:** *nothing in the
commons may cost money to read.* Every other question about money is negotiable
between adults. That one is not, because it is the entire point.

---

## What to build, and in what order

Smallest useful first, as always.

**S0 — the gathering axis, as data and as a door.** `sourcing.js`: the four
levels, guidance per level, and recognition of known sources (Gutenberg → freely
given; arXiv → freely given; a shadow library → the line). Surfaced at the
intake, where the question *"should I gather this?"* is actually asked. A
`gathered` field on a shelf entry beside the existing `sharing` one. **This is
the piece that is actionable today and it serves the electronics beta test
directly**, because that project is about to pull in datasheets, textbooks and
scraped pages from a dozen different kinds of source.

**S1 — the receipt.** One small honest object per contributed thing: what it is,
where it came from, who made it, what licence it travels under, and what has
happened to it since. It serves provenance, credit and reputation at once, and
it is the natural unit for the commons protocol already specified.

**S2 — the record view.** Your own record, on your own machine, built from your
receipts. Not a profile — a ledger. Purely local at first; it needs no server to
be useful and no server to be honest.

**S3 — reputation signals**, once a shared server actually exists
(`COMMONS-BACKEND-PLAN.md`). taken / built on / reproduced / corrected, per
domain, each linked to its artifact.

**S4 — money, last and deliberately.** Nothing above requires it. When it comes,
it comes as a tip jar and an openly published cost sheet, and not before there
is something worth thanking anyone for.

---

## Cross-references
- `src/game/data/copyright.js` — the other axis, built and tested. Read the
  header comment first; its reasoning is the model for `sourcing.js`.
- `COMMONS-BACKEND-PLAN.md` — keypair identity, content-addressed packets, and
  the "what travels / what never does" line. The credit mechanism already exists
  there; this document says what it is *for*.
- `OPEN-COMMONS-PLAN.md`, `TOOL-COMMONS-PLAN.md` — the commons this governs.
- `LIBRARY-GROWTH-PLAN.md` — the hand-picked Caravan connectors, which are the
  ⛔ rule already written in code before it had a name.
- `SCIENCE-RESEARCH-HALL-PLAN.md` — the creed this borrows from wholesale: no
  gatekeepers of truth, but a seat at the table costs evidence.

**One line to hold onto:** the commons is not a pile of files, it is a chain of
honest claims — about where a text came from, and about who did the work — and
a single broken link is worth more to your opponents than every good thing
beside it.
