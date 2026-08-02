# The Universal Remote — the Science Hall's first real build

Written **2026-08-02**, at direct request: *"I want to make a universal
remote for my TV from scratch... I am learning about electronics and how
to put things together. Let me figure out what books and papers to get and
we can start from there and use that to beta test this new building."*

This is the concrete subject `RESEARCH-ROOM-PLAN.md` has been waiting for.
That plan said the way to find out what the research room actually needs is
to *use* it on a real subject, and named electronics. It didn't have a
project. Now it does, and the project is a good one for reasons worth
stating.

---

## Why this is the right first build (not just a fun one)

**It is checkable.** The TV changes channel or it doesn't. There is no
interpretive wiggle room, no "well, it depends how you read the study."
The Hall's whole creed is *predict → measure → be wrong → write it down*,
and its four seed investigations are all soft-science claims where being
wrong is arguable. Electronics is nothing but falsifiable. This subject
tests the Hall the way the Hall is supposed to work.

**It has a real idea at its heart, not just wiring.** Remotes don't send
plain on/off light — they send light *chopped at about 38,000 times a
second*. The reason is genuinely interesting: sunlight, incandescent bulbs
and fluorescent tubes all pour out infrared, so a plain IR flash is a
whisper in a shouting room. Chopping the beam at a known frequency and
band-pass filtering for exactly that frequency at the far end throws away
everything that isn't the signal. That is amplitude modulation and noise
rejection — the same idea underneath radio — met at a scale you can build on
a breadboard for eight dollars. **This one concept is the spine of the whole
project**, and it is the sort of thing you learn permanently by measuring
rather than reading.

**Its primary literature is free and legitimately shelvable.** Unlike most
subjects, the actual working documents here — datasheets and manufacturer
application notes — are published free by the companies that make the parts,
and the two best textbooks are public domain or Design Science License. The
Pavilion's provenance-at-the-door rule doesn't have to bend at all. See the
reading list below: almost everything you *need* is free, and the things
worth buying are cheap.

**It ends in an object.** A remote sitting on the table that you made. The
3D printer in the room prints the case. That is a different kind of finish
than a note in a log.

---

## The one thing to buy before any book: a multimeter

Around $15–40. Everything below is easier with one and frustrating without.
Half of learning electronics is *not guessing* — a meter is the difference
between "I think there's power there" and knowing. If you buy one thing this
week, buy this.

**The optional purchase that would change this project most:** a cheap
8-channel logic analyzer (~$10–15, the little blue clones). It lets you
*see* the actual pulse timings coming out of the receiver, on screen, in
microseconds. Without it, "it doesn't work" is a mystery. With it, "it
doesn't work" becomes "the mark is 560 µs and I'm sending 600." It turns
this project from guessing into measuring, which is the Hall's entire point.

---

## The reading list

Sorted the way this project sorts everything: what's free and can go
straight onto a shelf with real provenance, then what's worth money, then
the actual working documents for this specific build.

### Free, open license, genuinely shelvable

These can go on the Science shelf properly — real license, real source, no
compromise. `tools/caravan/pdf-to-text.py` converts the PDFs.

| Text | License | Where | Why |
|---|---|---|---|
| **Lessons In Electric Circuits** — Tony R. Kuphaldt, 6 vols | Design Science License (free to copy, redistribute, modify) | `allaboutcircuits.com/textbook/` · `ibiblio.org/kuphaldt/electricCircuits/` | The best free electronics textbook that exists. **Vol I (DC)** is your foundation; **Vol III (Semiconductors)** covers the LED and transistor; **Vol IV (Digital)** covers the logic side. Start here. |
| **NEETS** — Navy Electricity & Electronics Training Series, 24 modules | Public domain (US Government work) | Widely mirrored; search "NEETS module PDF" | Written to teach sailors from zero, and it shows — patient, thorough, no assumed background. **Module 1** (matter, energy, DC), **Module 2** (AC), **Module 7** (solid-state devices), and **Module 12 (Modulation Principles)** — module 12 is *directly* the 38 kHz carrier idea. |
| **Wikibooks: Electronics** | CC BY-SA 3.0 | `en.wikibooks.org/wiki/Electronics` | Uneven, but free and fine for looking one thing up. |

**Start with Kuphaldt Volume I, chapters 1–3.** Voltage, current,
resistance, Ohm's law, series and parallel. That is genuinely most of what
this build needs from theory, and it's maybe two evenings of reading.

### Worth buying (cheap first, reference later)

| Book | ~Cost | Why |
|---|---|---|
| **Getting Started in Electronics** — Forrest M. Mims III | ~$15 | 128 hand-lettered pages, drawn not typeset. Still the best cheap first book anyone has written, forty years on. Buy this one first. |
| **Engineer's Mini-Notebook: Optoelectronics Circuits** — Mims | ~$10 | Same hand-lettered format, and it has actual working infrared link circuits in it. Directly on this project. |
| **Make: Electronics (3rd ed.)** — Charles Platt | ~$35 | Learn-by-destroying: it opens by having you deliberately burn out components to feel where the limits are. Exactly the pedagogy `SCIENCE-RESEARCH-HALL-PLAN.md` describes for the lab. The best hands-on beginner book. |
| **Practical Electronics for Inventors (4th ed.)** — Scherz & Monk | ~$35 | The one you keep on the desk and look things up in for years. Buy after the first two, not before. |
| **The Art of Electronics (3rd ed.)** — Horowitz & Hill | ~$100 | The professional reference. Genuinely great, genuinely *not* a first book. Later, if the interest holds. |

**Do not buy all of these.** Mims' *Getting Started* plus Kuphaldt Vol I
free online will carry you through the entire build. Add Platt if you find
you learn better with your hands.

### The working documents — the "papers" for this build

This is the part that makes it a research project rather than a
kit-following exercise. These are the actual primary sources, all free PDFs,
and **reading a datasheet properly is the skill** — more than any book here.

1. **Vishay — "Data Formats for IR Remote Control"** (application note).
   The single best document on how remote protocols actually encode bits:
   NEC, RC-5, RC-6, and others, with real timing diagrams. If you read one
   thing, read this.
2. **Vishay TSOP38238 datasheet** (the IR receiver module). Carrier
   frequency, sensitivity curve, minimum burst length, and — importantly —
   its section on what disturbs it. This is the part that will confuse you
   at 11pm; the answer is in here.
3. **Vishay TSAL6200 / TSAL6400 datasheet** (940 nm IR emitter). Forward
   voltage, forward current, radiant intensity, half-angle. This is where
   "how far will it reach and how wide a beam" gets answered with numbers
   instead of hope.
4. **2N3904 datasheet** (the NPN transistor driving the LED). You need this
   because an Arduino pin cannot supply enough current for real range — the
   transistor is what makes the difference between across-the-desk and
   across-the-room.
5. **SB-Projects IR knowledge base** — `sbprojects.net/knowledge/ir/`. San
   Bergmans' protocol writeups are what the entire hobbyist world actually
   cites. NEC, RC-5, Sony SIRC, each with exact timings.
6. **The IRremote library documentation** (Arduino) — `github.com/
   Arduino-IRremote/Arduino-IRremote`. Read the source eventually; it is a
   very readable implementation of everything above.
7. **LIRC's remote database** (`lirc.org`) and the open **IRDB** — thousands
   of real captured remotes. This is the "universal" half: the corpus of
   what actual devices actually send.

**Reference — the NEC protocol, since it's what most TVs use.** Kept here
so a decoded capture has something to check against:

```
Leader:      9.0 ms burst  +  4.5 ms space
Then 32 bits, each a 560 µs burst followed by a space:
   logical 0 ->  560 µs space
   logical 1 -> 1690 µs space
Bit order:  8-bit address, 8-bit address INVERTED,
            8-bit command, 8-bit command INVERTED
Trailer:     560 µs burst
Repeat code: 9.0 ms burst + 2.25 ms space (held button)
```

The inverted copies are a checksum — if address and ~address don't
complement, you misread the frame. Verifying that by hand on your own
capture is a genuinely satisfying moment.

Typical carriers: **NEC 38 kHz · Philips RC-5 36 kHz · Sony SIRC 40 kHz ·
Panasonic ~37 kHz.** Buy the 38 kHz receiver first; it tolerates the others
with reduced range, which is itself a measurable investigation.

### The parts (~$25–35 all in)

- **Arduino Uno R3 or Nano** (a clone is fine) — $10–28
- **TSOP38238** IR receiver ×3 — ~$2 each *(buy spares; they're the part you'll cook)*
- **TSAL6200** 940 nm IR LED ×5 — ~$1
- **2N3904** NPN transistor ×5 — pennies
- **Resistors** — an assortment; you specifically need ~220 Ω, ~1 kΩ, ~10 kΩ
- **Breadboard + jumper wires** — $10
- Later: tactile buttons for the keypad, a battery holder, and the printed case

---

## The ladder — six stages, each ending in something that works

Deliberately shaped like the project's own one-step-at-a-time rule. Each
stage is a real stopping point where something demonstrably happens.

**Stage 1 — See the signal.** TSOP38238 + Arduino, print raw pulse timings
from your own TV remote to the serial monitor. Nothing is decoded yet; you
are just looking at the numbers. *First real measurement.*

**Stage 2 — Decode one frame by hand.** Take a capture from Stage 1 and work
out the bits on paper, before letting any library do it. Check the address
against its inverted copy. Confirm against the NEC spec above. *This is the
predict-before-revealing move, and it's the stage most people skip and
shouldn't.*

**Stage 3 — Send one command.** IR LED + transistor, transmit the power
code, watch the TV respond. *The moment it stops being an exercise.*

**Stage 4 — Capture and replay anything.** Store raw timings, play them back.
This alone is a working *learning* remote — the same thing sold in shops.

**Stage 5 — Make it universal.** Decode to protocol + address + command, keep
a table of device codes, add a keypad. Now it's a remote rather than a
recording.

**Stage 6 — Make it an object.** Enclosure off the 3D printer, battery,
real buttons.

---

## The investigations this project will produce

These are the reason it's a good beta test for the Hall. Each is a genuine
question with a genuine falsifier, answerable in one evening, in a room,
with a meter. Open them as real Investigation cards as you hit them:

- **"Does the 38 kHz carrier actually matter, or would any chopping do?"**
  Drive the LED at 30 kHz and 45 kHz and measure the range at which the
  receiver still decodes. *Falsifier: range is unchanged across frequencies.*
- **"How does range depend on LED current?"** Predict the relationship
  first, write the prediction down, then measure. *This is the single best
  card this project can produce, because your prediction will probably be
  wrong in an instructive way.*
- **"Does sunlight actually break it?"** Take it outside. Everyone repeats
  that ambient IR is the problem; find out how much.
- **"Is my TV even NEC?"** Measure. Don't assume — this is where a
  hand-decoded capture beats a library telling you an answer.
- **"Does the transistor really extend range, or is the Arduino pin fine?"**
  Build both. Measure both. A cheap, decisive experiment.

---

## What the Pavilion supports today, honestly

Assessed 2026-08-02 against the actual code, not the plans.

**Already there and will genuinely carry this:**
- **The Research Desk** — projects with timestamped notes, and paste-a-paper
  → study notes. This is your build log and your datasheet digester today.
- **The Science Hall's investigations** — question / origin / evidence /
  verdict / falsifier, with evidence and falsifier *required*. The five
  questions above drop straight in.
- **Dissect a paper** — points at a datasheet perfectly well.
- **The personal shelf** — "Electronics" is already the example shelf name in
  the code. The free textbooks above go here with real provenance.
- **The Request Board** — queue the books; the Caravan fetches by hand.
- **`tools/caravan/pdf-to-text.py`** — datasheets are PDFs. This is the door.
- **Electronics 101** in the Learning Tree — five real steps, LED-level.

**Missing, and it will bite:**
1. **A build has no home.** Self-experiments are shaped `practice + a 1–5
   daily measure + a log` — right for meditation, wrong for a build. A build
   step is *what I predicted / what I did / what I measured / what happened /
   what I'd change next*. This is `SCIENCE-RESEARCH-HALL-PLAN.md`'s own
   **L0 "the print log"**, generalized past 3D printing. **This is the gap
   to close first.**
2. **The Electronics track stops at 101.** 201 is three `(planned)` stubs and
   there is no 301. The ladder above should *be* that track.
3. **Datasheets have nowhere to live as datasheets.** Not a book, not a
   paper — a reference you return to fifty times. `category:'research'`
   exists in `seed.js` and nothing routes to it.
4. **No "My Research" home** — Research Room Phase 1, still unbuilt. Papers,
   investigations, projects and ideas remain scattered across four rooms.
5. **Every seed investigation is soft science.** Nothing in the Hall shows
   what a hard, measured, one-evening investigation looks like. The carrier-
   frequency question would be the best exemplar card in the Hall.

**The recommended first build: the Bench** — a build log with the
predict/do/measure/result shape, in the Hall, alongside self-experiments
rather than pretending to be one. It has no substitute today, everything
else hangs off it, and it's the piece that makes stages 1–6 above livable
inside the Pavilion instead of in a notebook beside it.

---

## Cross-references
- `SCIENCE-RESEARCH-HALL-PLAN.md` — THE LAB section (L0–L4); this project is
  its first real occupant, and the Bench is its L0 generalized.
- `RESEARCH-ROOM-PLAN.md` — named electronics as the beta test; this is the
  concrete subject it was waiting for. Its Phase 1 ("My Research" home) should
  be built from what this run actually shows is missing.
- `COURSE-PROGRESSION-PLAN.md` — the Learning Tree the Electronics track rides.
- `LIBRARY-GROWTH-PLAN.md` — the Science shelf and the Caravan connectors that
  bring the free textbooks in.

**One line to hold onto:** every stage of this ends in a number you predicted
and a number you measured, and the gap between them is the only thing the
Hall has ever cared about.
