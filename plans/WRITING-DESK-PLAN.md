# Writing Desk Plan

**Status, 2026-07-09: steps 1-3 done, step 4 done and then some.** The
page is the desk now — `#planIntent`/`#planEmber` render first, auto-
save the same way `chatNotes` already did, and blocks/sparks/Ask the
Steward/past days all moved into a real collapsible toolbox. Due-soon
items stayed outside it, as planned. **Also built, asked for directly
alongside the redesign:** "My Notes," a real filing cabinet in the
toolbox — freeform, named, dated notes kept across days (`data.notes`),
separate from today's page, with its own list/create/edit/delete flow
and the same auto-save pattern. This is *not* the bigger cross-app
file-tree this document's "What this deliberately does not include"
section keeps out of scope below — it's a smaller, real, Writing-Desk-
only drawer, and it's what actually shipped. Verified live in a real
browser: every toolbox panel renders, the page auto-saves, and a filed
note survives a full page reload.

Originally: not started as code — this is the written plan first, same
as `READING-TO-DOING-PLAN.md` and `USER-DATA-MANAGEMENT-PLAN.md` were
before anything got built, both now closed out. Answers "what's the
current state and how do we fix it," asked directly 2026-07-09 — this
is the analysis plus a real, staged plan, not code yet. See
`BETA-TESTING-FEEDBACK.md` #8 (Round 1) and #9 (Round 2) for the two
original raw asks this consolidates.

## The actual goal

Direct instructions, both rounds: the Writing Desk should feel like an
actual document — "just paper and the ability to write" — with
everything else (blocks, sparks, Steward chat, past days) tucked into a
toolbox, opened only when reached for, not shown by default. A second,
related ask from Round 2: a real file-tree for personal notes generally,
"like VS Code" — bigger, and explicitly flagged there as a separate
question from this one (see "What this deliberately does not include").

## What exists today, precisely — checked directly, not assumed

`openPlanner()` / `index.html`'s `#planOv` render eight sections,
stacked top to bottom, all visible unconditionally the moment the desk
opens (some render empty, but the container and heading are always
there):

1. **Header + date** — static, one line.
2. **`#planUpcoming`** (`renderPlanUpcoming()`) — due-soon courses/grants,
   only actually shows content if something's due within 7 days.
3. **"Today's flame"** (`#planIntent`) — a single-line, 140-character
   intention input.
4. **Rhythm blocks** (`#planBlocks`) — seven fixed, unremovable,
   unaddable named blocks (`DEFAULT_BLOCKS` in `entities.js`), each a
   tap-to-cycle waiting → tended → rested tile.
5. **"Sparks from reading"** (`#planSparks`) — today's sparks (done
   checkboxes, remove), plus, as of the work just shipped, the
   carry-forward toggle and any earlier-day sparks it surfaces.
6. **"Evening ember"** (`#planEmber`) — a 4-row textarea, the only real
   open-ended writing surface on the whole desk. Framed as an
   end-of-day reflection, not something written across the day.
7. **Save button** (`savePlanner(true)`) — manual; nothing here
   auto-saves the way `chatNotes` elsewhere in the app already does.
8. **"Ask the Steward"** (`#planAssist`) — three quick-prompt buttons, a
   full chat history, an input box, and a "use as intention" button.
9. **"Past days"** (`#planPast`) — every previous day, as clickable
   cards.

**The real problem, stated plainly:** there is no "page" here at all —
the closest thing, the ember textarea, is small, framed as an
end-of-day chore, and sits behind six other sections of equal visual
weight before you ever reach it. A visitor opening this desk to just
write something down has to scroll past due-date badges, seven rhythm
tiles, and a sparks list first.

## The plan — in order, each step small and shippable alone

1. **Make the page the page.** Promote the ember textarea to the
   dominant element — large, near the top, auto-focused on open. Reframe
   it from "the day, looked back on" to simply the page you're writing
   on right now; the existing `intention` field becomes a short title
   line above it, not a separate chore. No data-shape change: still the
   same `day.ember` / `day.intention` fields, just different visual
   weight and framing.
2. **Auto-save the page, the same way `chatNotes` already does
   elsewhere in this app** (`tts.js`/`overlays.js` precedent: a debounced
   save ~600ms after typing stops, a small "saving…" → "saved HH:MM"
   label). Removes the need to remember to click "Save the day" just to
   not lose what you wrote — the manual Save button can stay for the
   deliberate, whole-day action (marking it as actually reviewed), but
   losing text to a forgotten click shouldn't be possible anymore. This
   isn't a "nudge" under the standing automation-philosophy rule — it's
   the same category as `chatNotes` already auto-saving, not a reminder
   that fires unprompted.
3. **Move blocks, sparks, Ask the Steward, and past days into a real
   toolbox** — collapsed by default, opened only when reached for. Likely
   shape: a slim side rail or a row of icon buttons along one edge of the
   desk, each opening the section it stands for as a small overlay/
   popover rather than permanent page real estate. This is the one step
   that's a real UI pattern decision, not just moving CSS — worth a
   quick look at how `Still Open`/`Your Data` already work as
   pause-menu-reachable panels before deciding whether the toolbox
   reuses that exact shape or something more inline.
4. **Due-soon items stay visible, not tucked away** — the one section
   that should *not* move into the toolbox: `planUpcoming` already
   follows the passive, glanceable, never-a-popup automation-philosophy
   pattern correctly today, and burying it would work against the whole
   point of it being there in the first place.

Each step ships and is usable alone — step 1 alone already makes the
desk feel like a document; steps 2-4 layer on top without redoing
earlier work.

## What this deliberately does not include

**The VS-Code-style personal file-tree is a separate, bigger question,
not step 5 of this plan.** Today, personal writing lives in four places
with no shared browsing structure: the planner's own daily pages,
Research Desk project notes, Grant Desk documents, and book notes — all
four already share one thing (`sparks`, per `READING-TO-DOING-PLAN.md`,
now fully wired), but nothing lets you browse "all my files" the way a
code editor's sidebar does. Whether that's a genuinely new, fifth thing,
or a different lens on the four that already exist, needs its own real
design pass — building it as an afterthought bolted onto the Writing
Desk specifically would bake in the wrong shape for something that's
actually about the whole app's personal-writing surfaces, not just this
one desk.

No new data fields, no change to what a planner day actually stores —
this plan is entirely about how the existing data is presented and when
each part is reached for, matching the same "connect what already
exists" discipline `READING-TO-DOING-PLAN.md` held itself to.
