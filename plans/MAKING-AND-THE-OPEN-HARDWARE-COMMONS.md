# Making, and the Open Hardware Commons

**The room now. The marketplace much later. The foundations for both, today.**

Written 2026-08-03, from the steward's own framing:

> "lets make more of a compehenive plan for the eletronics room i can use 3ed
> party sofware but a science room where we can hold the builds and one day
> have a community of open sourse techology would be amazing... technology
> should be put up for the face of glory and reputation, they should also be
> able to open a shop and if they did things legally lets give them a platform
> to sell.. small flea market, based on location who you can see in the country
> or zipcode or the world if we can ship things! i want to have a place
> supported by the knolege of humanity!... they dont even have to sell on our
> platform but have a place to advertize and show off, we can just do busniess
> with people actually set up. this is a plan for later after we get some solid
> users."

That last sentence governs the whole document. **Nothing here is scheduled.**
Part 1 is buildable now and worth building for the steward alone. Part 3 must
not be started until real people are using the thing, and the plan says so in
the one place it matters — the trigger.

---

## Part 0 — "is there anything like this already?"

Yes, in pieces. Not one of them is the whole thing, and knowing exactly which
piece each one is stops us rebuilding it badly.

| what exists | what it does | what it does not do |
|---|---|---|
| **Tindie** | marketplace for maker-made hardware; you open a shop and sell | knows nothing about how you learned; a shop, not a commons |
| **Hackaday.io** | project showcase, build logs, followers | shows the finished thing; no verification, no selling |
| **Crowd Supply** | crowdfunding aimed specifically at open hardware | pre-launch only; curated and gatekept |
| **OSHWA certification** | a real registry: certified open-source hardware, unique IDs, a published licence | certification only — no showcase, no trade |
| **CERN Open Hardware Repo + CERN-OHL** | serious licences and a repository for open hardware | institutional, not a community you live in |
| **Thingiverse / Printables / MakerWorld** | file sharing for printable models | files, not projects; no provenance of skill |
| **Instructables** | build guides | no verification that any of it works |
| **itch.io / Bandcamp** | **the best models to copy** — creator-first, your page is yours, tiny take, link out freely | different domain entirely |
| **Fediverse / ActivityPub** | the federation protocol that already works | not a marketplace |

**The gap is real and it is specific.** Every one of these covers *making* or
*selling* or *certifying*. **None of them connects a marketplace to the record
of how the maker learned the thing** — and none of them can tell you whether
anyone reproduced the build.

That is not a marketing angle. It is a thing this codebase can uniquely do,
because the Bench already records **a prediction before each step and a
measurement after**, and `CREDIT-AND-COMMONS-FRAMEWORK.md` already names
**`reproduced`** as the strongest reputation signal there is. In software, "it
builds on my machine" is cheap. **In hardware, "someone else built this and got
my numbers" is close to the strongest evidence available**, and essentially
nobody is capturing it.

**So the differentiator is not the shop. It is the ladder behind the shop.**

The honest counterweight: Tindie has sellers and we have none, and a
marketplace with no sellers is a ghost town that makes the whole project look
abandoned. That is exactly why Part 3 waits.

---

## Part 1 — The electronics room, buildable now

### What already exists (do not rebuild any of it)

- **The Bench** (`data.hall.builds`) — predict → do → measure → next, and the
  prediction cannot be edited after the fact. This is the room's spine.
- **The Lab** — the gathering view: builds, datasheets, paper books, dissections.
- **The Science & Research Hall** — investigations, self-experiments, the
  Investigator.
- **Datasheets** in the Computer (`ds <part>`), and books you own on paper.
- **The Reference Desk** (`ref <term>`, 2026-08-03) — constants, Ohm's law,
  colour codes, the 38 kHz IR carrier. Exact, offline, no AI.
- **`UNIVERSAL-REMOTE-PROJECT.md`** — a real project already driving all of it.

### The principle that scopes everything below

> **The Pavilion is the lab notebook and the shelf. It is never the instrument.**

KiCad draws the schematic. Falstad and ngspice simulate. PlatformIO builds the
firmware. A real multimeter measures. **We will not write any of those**, and
the steward's "i can use 3rd party software" is the right instinct — those
tools are decades deep and free.

What has no good home today is the thing between them: **which schematic
revision went with which prediction, what the meter actually said, which
datasheet page you were looking at when you chose the resistor, and why you
were wrong the first time.** That is a notebook problem, and it is ours.

### What the room is missing, in the order I would build it

**1. The parts drawer.** `data.hall.parts` — what you physically own: part
number, quantity, where it is, and the datasheet it links to (that link already
exists in the Library as `kind:'datasheet'`). Then a build's BOM can say *"you
have 3 of these, you need 5"*, and `ref` gets a sibling: `parts 2n2222`.
Unglamorous, and the single most-used thing in any real workshop.

**2. Files beside the build.** A build step can attach a file — a `.kicad_sch`,
a photo of the breadboard, a `.csv` from the meter, the firmware that was
flashed. **The Pavilion does not open them**; it records that *this* file was
what step 4 actually used, with a hash so a later "was it this version?" has an
answer. Reuses the MinIO storage the books already use.

**3. Calculators that show their work.** Divider, LED resistor, RC, 555 timing,
trace width. Deterministic, no AI, each printing the formula it used from
`reference.js` so the number is checkable rather than magic. This is the
token-thrift ladder applied to arithmetic: **never ask a language model to do
sums it will do confidently and wrongly.**

**4. The measurement log.** A step's result is currently prose. Let it also
carry `{value, unit}` so a build can be *charted* and — the real reason —
**so someone else's reproduction can be compared to yours numerically**. This
is the piece Part 3's whole reputation model rests on, and it is cheap now and
expensive to retrofit later. **Build this early even though its payoff is late.**

**5. The build, as a publishable artifact.** A finished build exports as one
signed packet: goal, steps, predictions, measurements, BOM, files, licence. The
bundle machinery from `BOOK-BUNDLES-AND-THE-POOL.md` already does exactly this
for books. **A build packet is a book bundle wearing a lab coat** — and it is
the unit that Parts 2 and 3 trade in.

### 3rd-party software, handled honestly

Two ways in, both real:

- **The desktop app can shell out.** Electron can launch KiCad on the file the
  build step references. The browser build cannot, and should say so rather
  than hiding the button.
- **A link and a hash is enough.** For anything we cannot launch, record the
  tool, the version and the file hash. *"Simulated in Falstad, this netlist"* is
  a real, checkable claim.

---

## Part 2 — The foundations, to lay NOW

These are cheap today, load-bearing later, and each is worth having even if
Part 3 never happens. **This is the actual answer to "what will we need."**

**1. A stable identity.** Already designed in `COMMONS-BACKEND-PLAN.md`: a
keypair per Pavilion on first run, packets signed, the public half *is* the
identity. No account, no email, no password. A marketplace with no identity
layer is unbuildable; a marketplace bolted onto accounts we later regret is
worse. **Do this first — everything else hangs off it.**

**2. Signed, self-describing packets.** A build packet must carry its author's
signature, a licence, a provenance record, and content hashes. Books already
do. Extend the same shape rather than inventing a second one.

**3. The reputation record, unchanged.** `CREDIT-AND-COMMONS-FRAMEWORK.md`
settled this and it needs no revision: **a record, never a score.** For hardware
the four signals land unusually well:

- **taken** — someone pulled your build into their Pavilion
- **built on** — someone's build names yours as a source
- **reproduced** — *someone followed your steps and got your numbers*
- **corrected** — someone showed you were wrong and **you fixed it**

**`reproduced` is the one to protect above all others.** It is the reason to
build measurement logging (Part 1, item 4) years before anyone needs it, and it
is the thing no existing hardware marketplace has.

**4. Licence literacy for hardware.** Software licences do not cover a PCB.
**Adopt OSHWA's certification and the CERN-OHL family rather than inventing a
scheme** — the same instinct that made us use real licences for books instead
of a homemade one. "Did things legally" then has a concrete meaning the steward
can point at, set by a body with standing.

**5. A location field, designed privately from the start.** Coarse by default:
country, then region, and *only* an opt-in finer grain. **Never a street
address, never a live location, never a map pin on a private individual.** Easy
now, a migration and an apology later.

**6. Say what a thing IS.** A packet declares whether it is a design, a guide,
a finished object for sale, or a service. The flea market is unusable without
it, and it costs one field today.

---

## Part 3 — The marketplace. Later, and here is the trigger

> **Trigger: do not start this until at least a dozen people are actively using
> the Pavilion and at least one of them has published a build somebody else
> reproduced.**

Not a date. A condition. A marketplace with no sellers is worse than no
marketplace, because an empty shop tells every visitor the project is dead.

### The shape, and the one decision that makes it feasible

**The Pavilion is a showcase and a directory. It is not a till.**

This is the steward's own answer — *"they dont even have to sell on our
platform but have a place to advertize and show off"* — and it happens to be
the only version that is actually buildable by us. Handling money means
payment processing, sales tax and VAT across jurisdictions, consumer-protection
law, dispute resolution and chargebacks, prohibited-goods policy, export
controls, and product-safety marking (**CE/UKCA/FCC apply to electronics you
sell — this is real, not paperwork theatre**). Every one of those is a
full-time job, and none of them is the thing we are good at.

A directory that links out to where the maker *already* sells — Tindie, their
own site, Ko-fi, Etsy, a PayPal link — has almost none of it, and gives makers
something they genuinely lack: **one page that shows the work, the ladder
behind it, and where to buy, all in one place.**

It also keeps faith with the standing rule that money is **a link out, never a
till**, while giving the steward what he asked for: a real platform for someone
who has set their business up properly.

### The three tiers, which are the steward's own three

- **🏅 The Wall of Glory** — published for reputation alone. No commerce. The
  default, and the largest tier by design. Your build, its predictions and
  measurements, and who reproduced it.
- **🏪 The Shop** — a maker's page: what they make, their licence and OSHWA
  status, and **outbound links to wherever they actually sell**. We take
  nothing, because we handle nothing.
- **🧺 The Flea Market** — location-scoped and small: surplus parts, a spare
  board, "I have three of these, who wants one." Filter by **country → region →
  local**, with **worldwide** for anything shippable. Coarse location by
  default; precision strictly opt-in.

### Federated, because the Pavilion already is

There is no central marketplace server, for the same reason there is no central
Library. Each Pavilion holds **the part of the commons that has actually
reached it** — which is exactly how the collective tree already works
(`LIVING-TREE-AND-DISCUSSION-PLAN.md`, built 2026-07-27). A listing is a signed
packet that travels. Two Pavilions that have met see overlapping markets and
neither sees "everything," because there is no everything.

If a shared index is ever genuinely wanted, `SELF-HOSTED-STACK-PLAN.md` already
names the shape: one VPS running the *same* stack, joined voluntarily — not a
platform in the middle.

### The risks, named so they are designed around

- **Scams.** A directory that links out still lends credibility. Mitigation:
  the record travels with the listing, links are marked plainly as leaving the
  Pavilion, and **we never imply we vetted anyone**.
- **A ghost town.** Handled by the trigger above.
- **Reputation becoming currency.** The record-not-score rule exists precisely
  for this, and commerce is the pressure that will test it hardest. **Money
  must never buy a position in the record.** If that ever slips, the whole
  framework is gone.
- **Us becoming the arbiter.** The standing rule holds: *we are not the rule
  makers or enforcers.* We guide, we state our stance, we do not adjudicate
  disputes between strangers — which is another reason not to hold the money.
- **Illegal or dangerous goods.** A directory still needs a stated line. It
  should read like the existing sourcing framework: what we will and will not
  carry a link to, said plainly and in advance.

---

## What to do first, honestly

1. **The parts drawer** (Part 1.1). Small, and useful the day the multimeter
   arrives.
2. **Measurement values on a bench step** (Part 1.4). Cheap now, and the whole
   of `reproduced` depends on it.
3. **The build packet** (Part 1.5). Reuses the bundle machinery; makes a build
   shareable at all.
4. **Identity keypair** (Part 2.1). Everything later hangs off it and it is
   already designed.

Parts 2.4–2.6 are one afternoon of fields and wording. Part 3 waits for people.

## Cross-references

`CREDIT-AND-COMMONS-FRAMEWORK.md` (reputation, and where money is allowed) ·
`SCIENCE-RESEARCH-HALL-PLAN.md` (the Hall and the Lab) ·
`UNIVERSAL-REMOTE-PROJECT.md` (the project driving the room) ·
`BOOK-BUNDLES-AND-THE-POOL.md` (the packet machinery a build packet reuses) ·
`COMMONS-BACKEND-PLAN.md` (keypairs and signing) ·
`TOOL-COMMONS-PLAN.md` (the foundation/additions seam a fork needs) ·
`LIVING-TREE-AND-DISCUSSION-PLAN.md` (federation that already works) ·
`SELF-HOSTED-STACK-PLAN.md` (if a shared index is ever wanted)
