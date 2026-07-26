# Cybersecurity — see what's going on, then learn it properly (via Hack The Box)

Written 2026-07-12, at the steward's ask: a cybersecurity track — *"at least get
to a point where we can see what's going on,"* plus a real **Hack The Box
progression.** A plan; build later.

## The ethic first (non-negotiable, and it's the project's own)

This is **defensive and educational**, full stop. The goal is to *understand*
systems so you can protect the ones you own and build (your machine, your
self-hosted stack), and to learn on **authorized, legal practice targets only.**
Hack The Box is exactly that by design — you attack *their* deliberately-
vulnerable machines, with their permission, on their infrastructure. That's the
whole point of a CTF/lab platform: real skills, zero real harm. This fits the
Pavilion's oldest rule — the "restricted section" is atmosphere; the *real*
learning here always survives open scrutiny and never targets anyone. **Nothing
in this track is about attacking systems you don't own or aren't invited to.**

## Two halves to the ask

### 1. "See what's going on" — the foundation, and it starts at home
Before any offense-flavored learning, the first real security skill is
**visibility**: knowing what your own computer is doing. This is genuinely rung
one of the ladder *and* it dovetails with the Pavilion's own transparency ethos.

- **On your own machine (the skill):** what processes are running, what's using
  the network, what's listening on which ports. On Windows: Task Manager, Resource
  Monitor, `netstat`. This is where a defender starts, and it's a calm, safe,
  hands-on first lesson.
- **In the Pavilion (the mirror):** the app already leans transparent — the
  **activity log** (what you and the residents did), the **🧠 Local-AI panel**
  (what model is loaded, in RAM/GPU), and the **memory management** you now have
  (see and prune what residents remember). The security mindset extends that: a
  clear answer to "what is this program doing, and what does it touch?" The
  honest answer here is already strong — it's local-first, no background process,
  nothing phones home — and *saying that precisely* is itself a security lesson.

### 2. The Hack The Box progression (the real ladder)
A concrete, legal path from zero to capable, as a Learning Tree track:

1. **Fundamentals** — Linux command line, networking (ports/protocols/how
   machines talk), and how the web actually works. (HTB Academy has structured
   modules for each; free tiers exist.)
2. **HTB Starting Point** — HTB's own guided first machines, hand-held, designed
   to teach the loop: enumerate → find a foothold → escalate. The gentlest
   authorized on-ramp.
3. **Easy boxes + a methodology** — a repeatable process (recon, enumeration,
   exploitation of *known* issues, privilege escalation, and — the defender's
   habit — writing up what you found and how to fix it).
4. **Specialize** — web security, Active Directory, etc., as interest pulls. Each
   is a branch off the same trunk.

The measure stays the project's north star: **knowledge into use** — and here,
"use" is understanding and defending real systems, including your own Pavilion
and its self-hosted stack.

## How it lives in the Pavilion (reuses what exists)

- **Learn it** — a **Cybersecurity track in the Learning Tree** (Security 101
  seeded as a *planned* node now; self-first, HTB-based when built).
- **Test/understand in the Lab** — the Science Hall is a natural home for a
  **CTF write-up as an investigation** (what was the claim/vuln, what was the
  evidence, what fixes it) — the same honest structure, pointed at security.
- **Keep notes & writeups** — the Research Desk, private until you choose to
  share (the private-before-release workflow in `RESEARCH-ROOM-PLAN.md`).
- **Practice safely** — HTB's platform is the target range; the Pavilion is where
  you *learn, plan, and keep the writeups*, never a tool that attacks anything.

## Phases

**Phase 0 — Seed the track + "see what's going on."** Write Security 101 for
real: the visibility fundamentals (your own machine + the Pavilion's own
transparency), safe and hands-on, no attacking anything. This alone delivers the
"see what's going on" half.

**Phase 1 — The HTB fundamentals ladder.** Turn the fundamentals (Linux,
networking, web) into real tree nodes, pointing at HTB Academy / free resources,
self-first.

**Phase 2 — Starting Point → easy boxes, with writeups.** The guided authorized
practice, with each box kept as a Hall investigation / Research Desk writeup —
enumerate, foothold, escalate, *and how you'd defend against it.*

**Phase 3 — Branches.** Web, AD, etc., as interest leads.

## The honest notes
- **Authorized only, always.** Every practical step targets HTB's own machines or
  your own systems. The plan says so at every rung; a lesson that drifted toward
  unauthorized targets would violate the project's ethic and won't be written.
- **Defender's framing throughout.** Every "how it's broken" pairs with "how it's
  fixed" — that's what makes it education, not a how-to for harm.
- **It doubles as securing the Pavilion itself.** As the self-hosted stack grows
  (`SELF-HOSTED-STACK-PLAN.md`), these exact skills — visibility, networking,
  web basics — are what keep *your own* instance safe. The learner secures their
  own village.

## Cross-references
- `RESEARCH-ROOM-PLAN.md` — writeups/notes and the private-before-release path.
- `SCIENCE-RESEARCH-HALL-PLAN.md` — the lab; a CTF writeup as an investigation.
- `COURSE-PROGRESSION-PLAN.md` — the Learning Tree this track rides.
- `SELF-HOSTED-STACK-PLAN.md` — the very system these skills help you secure.

**One line to hold onto:** start by *seeing* what your own machine does, learn to
break only what you're invited to break (Hack The Box), and always pair it with
how to defend — cybersecurity as understanding, so your own village stays yours.
