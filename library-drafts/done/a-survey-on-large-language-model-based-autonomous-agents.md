# A Survey on Large Language Model Based Autonomous Agents

**Tradition:** Science
**License:** CC-BY
**Source URL:** https://doi.org/10.1007/s11704-024-40231-1
**Attribution:** Lei Wang, Chen Ma, Xueyang Feng, et al. (Renmin University of China) · Frontiers of Computer Science, 2024
**Category:** research

## Summary

A comprehensive 2024 survey of LLM-based autonomous agents — systems that use a large language model as the "brain" directing perception, memory, planning, and action rather than just answering questions. Organizes a fast-moving, scattered research field into one unified framework, directly relevant to a project whose own premise is real AI agents as residents rather than chat responders.

## Section 1 — A unified architecture: profile, memory, plan, act

The survey's central contribution is a shared framework for describing any LLM agent's construction: a profiling module (what role is this agent playing), a memory module (short-term context plus long-term storage it can retrieve from), a planning module (breaking a task into steps, with or without feedback from its own results), and an action module (turning a decision into an actual output). Nearly every specific agent system the survey reviews turns out to be a particular set of choices within this same four-part shape.

## Section 2 — Built to be evaluated, not just built

Past the architecture, the paper is unusually careful about *how agents are actually judged* — subjective evaluation (human or LLM judges rating believability, helpfulness, coherence) versus objective evaluation (task success rate, benchmark scores) — and is candid that the field still lacks settled, comparable standards across papers. For a project building its own AI residents, that's a genuinely useful caution: the same architecture can look very different depending on what you chose to measure.
