---
title: "Junior Electrical Engineer Path — From First Principles to Motor, Generator & Critical Evaluation"
purpose: "Reach junior-level practical and theoretical competence in electricity and basic electronics. Understand the underlying principles deeply enough to build real devices (including a motor that also generates) and to critically evaluate claims about free or zero-point energy against established physics."
audience: "Motivated adults with no prior formal training who have a real question or project they care about. Assumes zero knowledge. Designed so it can later be offered to others."
outcome: "A working motor that can also act as a generator, a clear written evaluation of free-energy / zero-point claims grounded in the principles learned, and the ability to explain the core ideas from first principles to another person."
license: "CC-BY-SA 4.0"
author: "Sand Pavilion (built with the Theoretical Minimum method and the 7-step Course Authoring protocol)"
source: "Prepared for Sand Pavilion, August 2026. Core materials drawn from open resources (Lessons in Electric Circuits, Ellingson Electromagnetics, Falstad/CircuitJS) and standard practical references."
prerequisites:
  - "A genuine personal question or project that makes the work worth doing"
  - "Willingness to do at least one focused thing most days"
  - "Pen, paper, and access to a browser for free simulation tools"
category: "Skill"
track: "Electrical Engineering / Practical Physics"
level: 201
---

# How to walk this course

This is not a requirement. It is a privilege.

You are choosing to pursue something difficult because it matters to you. The only entrance condition is an honest answer to one question:

**What is the real question or dream that brings you here?**

For some it is "Can we give energy out for free?"
For others it is "I want to understand how the machines around me actually work" or "I want to build things that move and generate."

Write your answer down before you begin. Keep it visible. Every module exists to serve that question. If the question dies, the course can wait. If the question stays alive, do at least one real thing most days — a derivation, a simulation, a measurement, a page of notes, a solder joint, a paragraph of evaluation. Momentum is built in small, honest steps.

The course deliberately trains three modes of thinking that must work together (Successful Intelligence):

- **Analytical** — careful observation, prediction vs actual, diagnosis, clean representation of the problem.
- **Creative** — reframing the question, generating alternative representations, questioning assumptions.
- **Practical** — making something that actually runs or generates, and explaining it so different people can use it.

You will not finish by staying only in the mode that feels easiest. The daily commitment, the project, and the final gate are designed to force all three.

The course is slow on purpose. Pen-and-paper work is required. Simulation is used heavily so you can stay interactive without needing a full physical lab on day one. A real motor/generator build becomes the central project. Free open tools and books are named so you always know where to go.

You may use AI for notes, explanations, and generating extra practice. The thinking and the commitment remain yours.

---

## Module 1 — Charge, Field & Potential from Scratch

**Objective:** Build the four foundational quantities and the idea of a complete circuit from first principles with no prior knowledge.

**Body:**
Electricity begins with charge. Opposite charges attract; like charges repel. When charge is forced to move through a complete path we call the flow current. The "push" that makes charge move is potential difference (voltage). Resistance is the opposition to that flow.

These four ideas — charge, current, voltage, resistance — are not formulas first. They are physical meanings. A circuit is only complete when there is a closed path. Break the path and the current stops. That single fact will save you endless confusion later.

**Primary resources:**
- Lessons in Electric Circuits, Volume I — early chapters on basic concepts of electricity.
- Falstad Circuit Simulator (falstad.com/circuit or FreeCircuitSim) — build the simplest possible circuit and watch the animated current.

**Practice:**
- In Falstad: create a battery, a resistor, and a switch. Close the switch and watch the current. Change voltage and resistance; predict the new current before you look.
- On paper: define charge, current, voltage, and resistance in your own words. Give one everyday analogy for each.
- Write three sentences explaining why an incomplete path means no sustained current.

**Reflection:**
- Where did the animation match or break your intuition?
- What still feels unclear about "potential"?

**Artifact:**
One-page "Four Quantities" note written in your own language + screenshot or description of your first working Falstad circuit.

---

## Module 2 — Current, Resistance, Ohm & Power

**Objective:** Derive and use Ohm's law and the power relations; understand energy flow in a circuit.

**Body:**
Ohm's law is the relationship \( V = IR \). It is not magic; it is the observation that, for many materials, current is proportional to the applied voltage. Power is the rate at which energy is transferred: \( P = IV \). From these two statements the other common forms (\( P = I^2R \) and \( P = V^2/R \)) follow by simple substitution.

You must be able to move in both directions: from numbers to physical expectation, and from a physical situation back to the numbers.

**Primary resources:**
- Lessons in Electric Circuits, Volume I — Ohm's Law and power chapters.
- Practical Electronics for Inventors (if available) — corresponding early sections.
- Falstad for immediate verification.

**Practice:**
- In Falstad: fix a voltage, sweep resistance, and record current. Plot or tabulate the result and confirm it matches \( I = V/R \).
- Calculate power for at least three different resistor values at the same voltage.
- On paper: derive the three forms of the power equation from \( V = IR \) and \( P = IV \). Do it without looking.

**Reflection:**
- Which form of the power equation feels most natural when you think about heat?
- What happens to power if you double both voltage and resistance?

**Artifact:**
Worked problem set (minimum five problems) + one Falstad circuit that clearly demonstrates the Ohm's-law relationship.

---

## Module 3 — Kirchhoff, Series & Parallel

**Objective:** Treat circuits as systems of conservation laws and master the two fundamental topologies.

**Body:**
Kirchhoff's Current Law is conservation of charge at a node. Kirchhoff's Voltage Law is conservation of energy around a loop. Series circuits share the same current; parallel circuits share the same voltage. Almost every practical circuit is a combination of these two patterns.

Diagnosis becomes possible when you stop guessing and start asking which conservation law is being violated by the symptoms you see.

**Primary resources:**
- Lessons in Electric Circuits + James Fiore's DC Electrical Circuit Analysis (free) — series, parallel, and Kirchhoff chapters.
- Falstad for rapid prediction-and-check cycles.

**Practice:**
- Build series, parallel, and mixed circuits in Falstad. Predict every voltage and current before you measure.
- Deliberately introduce a fault (open resistor, shorted branch) and diagnose it using only the conservation laws.
- On paper: solve at least three mixed circuits by hand.

**Reflection:**
- Which conservation law felt more useful for diagnosis?
- Where did your first prediction fail, and what did the failure teach you?

**Artifact:**
Prediction-versus-measurement table for at least two circuits + one diagnosed faulty circuit with written reasoning.

---

## Module 4 — Safety, Tools & Making Contact

**Objective:** Internalize electrical safety, learn to read schematics, and make reliable physical or simulated contact with real components.

**Body:**
Safety is not a chapter you finish; it is a habit. Current through the body, short circuits, and stored energy in capacitors are the usual dangers at this level. A schematic is a language. If you can read it aloud and then rebuild the circuit on a breadboard (real or simulated), you have crossed an important threshold.

**Primary resources:**
- Practical Electronics for Inventors — tools, soldering, safety, breadboarding.
- Lessons in Electric Circuits — safety sections and Volume VI experiments.
- Falstad for schematic practice when physical parts are not yet available.

**Practice:**
- Write your own short safety checklist (one page maximum).
- Translate a simple schematic into a breadboard layout (simulated or physical).
- If you have a soldering iron: make five clean joints and inspect them under good light. If not: practice the motions and the inspection criteria in writing.

**Reflection:**
- What safety habit is easiest to forget when you are excited?
- How does a clear schematic reduce mistakes?

**Artifact:**
Personal safety checklist + one schematic successfully translated into a working layout.

---

## Module 5 — Magnetism & Induction

**Objective:** Understand magnetic fields and Faraday's law so that the link between electricity and mechanical motion becomes clear.

**Body:**
A current produces a magnetic field. A changing magnetic field produces an electric field and therefore a voltage in a nearby conductor. That is Faraday's law. It is the reason a motor can also be a generator: the same physical arrangement works in both directions depending on what you supply (current or motion).

**Primary resources:**
- Lessons in Electric Circuits — magnetism and induction chapters.
- Selected sections of Ellingson Electromagnetics Volume 1 (free) for cleaner field language.
- Practical Electronics for Inventors — motors and generators overview.
- Falstad inductor and transformer examples.

**Practice:**
- In Falstad: explore inductor behavior and simple transformer action. Watch the relationship between changing current and induced voltage.
- On paper: state Faraday's law in plain language and in the simple form \(\mathcal{E} = -N \Delta\Phi / \Delta t\).
- Sketch a simple coil geometry that could later be used in a motor.

**Reflection:**
- Why does a changing field matter more than a static one?
- How does this single idea connect a motor to a generator?

**Artifact:**
Written explanation of induction in your own words + simple coil design note.

---

## Module 6 — Building a Motor that is also a Generator

**Objective:** Design, build (or fully simulate), and measure a simple machine that converts electricity to motion and motion back to electricity. This module forces all three modes at once.

**Body:**
This is the project that forces integration. You will use everything from the earlier modules. Simulation (Falstad, MotorAnalysis, or similar) is the preparation and diagnosis environment. A physical build — kit, scavenged parts, or carefully documented advanced simulation — is the goal. Keep a dated log. Every change and every measurement goes in the log.

Analytical work records expected versus actual. Creative work explores alternative geometries or representations when the first design fails. Practical work is the machine that actually spins and generates measurable output.

**Primary resources:**
- Practical Electronics for Inventors — motors, generators, related circuits.
- Falstad and/or MotorAnalysis for design and diagnosis.
- Lessons in Electric Circuits Volume VI for experimental attitude.

**Practice:**
- Phase A — Simulation (Analytical + Creative): Understand the basic geometry (coils, magnets, commutation or simple brushed arrangement). Predict what should happen when the shaft spins. If the first representation fails, reframe the problem (different coil layout, different question about the field).
- Phase B — Build or advanced simulation (Practical): Get the machine to spin under electrical power.
- Phase C — Generator mode (Practical + Analytical): Remove the electrical input, spin the shaft, and measure whether voltage appears. Record expected vs actual numbers and the implication of any gap.
- Maintain a dated build log in Faraday style: what you expected, what happened, what the discrepancy implies, what you changed next.

**Reflection:**
- What was the single biggest gap between "it should work" and "it actually spun or generated"?
- Which mode (analytical, creative, practical) was weakest for you in this project, and what did that reveal?

**Artifact:**
Working motor/generator (physical or fully documented simulation) + measurements + complete Faraday-style build log.

---

## Module 7 — Energy, Limits & Critical Evaluation

**Objective:** Apply conservation of energy and the principles already learned to evaluate claims about free or zero-point energy devices. This is the main creative + analytical payoff of the course.

**Body:**
Established physics places strong constraints on any device that claims to produce net energy from the vacuum or from "zero-point" fluctuations without an accounting input. The goal of this module is not to believe or disbelieve any particular inventor. The goal is to be able to state clearly what physical principles would have to be violated or extended, and what standard of experimental evidence would be required.

This is the Theoretical Minimum payoff: the ability to see clearly. Creative intelligence appears when you reframe the claim instead of only rebutting it. Analytical intelligence appears when you demand clean evidence and identify hidden assumptions.

**Primary resources:**
- Energy and power chapters from the core books already used.
- Ellingson or equivalent for field energy language.
- Your own motor/generator measurements as a concrete reference for real energy conversion.

**Practice:**
- Choose one public claim about a zero-point or free-energy device.
- Using only principles from Modules 1–6, write:
  (a) what conservation laws it appears to challenge (analytical),
  (b) what experimental evidence would be required to support it (analytical),
  (c) the most common places confusion or measurement error arise,
  (d) how the question itself might be reframed so that a different and more useful conversation becomes possible (creative).
- Compare your evaluation with a second claim.

**Reflection:**
- Where is the boundary between an interesting open question and a claim that contradicts well-tested physics?
- How does having built a real motor/generator change the way you read such claims?
- Did reframing the question open anything that pure rebuttal closed?

**Artifact:**
Short written evaluation (1–2 pages) grounded in the course principles and your own project measurements, including at least one deliberate reframing.

---

## Module 8 — Transmission — Leave the Path for Others

**Objective:** Turn private work into a clean package another person can follow, and thereby complete the Independent Course Graduation spirit. Transmission is a practical-intelligence act.

**Body:**
Knowledge that stays only in one mind is incomplete for the Pavilion. Polish your notes, build log, and evaluation. Remove private shorthand. Make every step understandable without you present. This is how a personal dream becomes a path others can walk.

Practical intelligence here means producing three versions of the core explanation: one precise enough for someone already strong in the material, one clear for a motivated intelligent beginner, and one immediately useful to a person who has a concrete reason to care today.

**Practice:**
- Run the ready-for-others checklist (clarity of purpose, standalone steps, explicit practices and artifacts, safety, attribution).
- Write the three-audience explanation of the most important idea or result from the course.
- Produce a clean export in the portable Markdown format used by the Sand Pavilion.
- Optionally leave the package as a bequest or Commons packet.

**Reflection:**
- What would you tell the next person to do differently on day one?
- Did the original question that brought you here receive an honest answer?
- Where did the "person who needs it today" version break down, and what does that reveal about your practical understanding?

**Artifact:**
Complete portable course package + personal project archive + three-audience explanation ready for the Pavilion.

---

## Closing Intention

You began with a question.
You end with a machine that moves and generates, a clear-eyed evaluation of ambitious energy claims, and the ability to explain the foundations from first principles.

That is junior-level competence.
It is also a privilege you chose to earn one day at a time.

If the question is still alive, keep going.
If a new question has appeared, begin again.

The tools are free.
The standard is high.
The work is yours.
