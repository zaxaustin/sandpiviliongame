# Breaking the guards on purpose

CLAUDE.md rule 3: *"Write the check, then break the thing it guards and watch
it fail."*

These runners do exactly that, and they are kept because **the evidence is the
point.** Every one of them found a dead guard on its first run:

| runner | what it found |
|---|---|
| `course-calm.mjs` | A guard allowed 300 chars between `function syllabusOwned(step){` and `shelfMatches(` — and the **next function in the file** calls `shelfMatches()` on its second line. Deleting the real call left the suite green against a completely different function. |
| `desk-reachable.mjs` | Nothing wrong with the guards; wrong with the runner. A literal multi-line search matched nothing against the **CRLF working copy** and reported "the line to break is not there" — the same shape as the 2026-08-13 scrape that found zero residents on a CRLF checkout. |
| `learning-desk.py` | All seven caught first time, which is only believable because the other two were not. |

## How to run them

```bash
node test/sabotage/course-calm.mjs
node test/sabotage/desk-reachable.mjs
python test/sabotage/learning-desk.py
```

Each one edits a source file in place, runs `npm test`, and **puts the file
back** — then re-runs the suite to prove the restore was clean.

## The two rules a runner like this must follow

**1 · VERIFY A GREEN BASELINE FIRST.** On 2026-08-14 a sabotage runner reported
"all 11 caught" while `smoke.mjs` had a syntax error in it: every case failed,
for entirely the wrong reason, and the run read as a triumph. Every runner here
checks the suite is green before it breaks anything, and distinguishes *caught*
from *crashed* by matching the expected failure message.

**2 · MATCH EITHER LINE ENDING.** `.gitattributes` pins the checkout to LF and
the Windows working copy is CRLF anyway. A literal `\n` in a search string is a
runner that quietly tests nothing.

## When to add one

When you write a guard. Not later.
