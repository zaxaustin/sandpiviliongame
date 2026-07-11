# User Data Management Plan

**Status, 2026-07-09: steps 1-3 done.** Step 4 (cloud-side management)
stays deferred on purpose, per its own reasoning below. See README's
"What's next" for the current state of the rest of the list.

## What already exists — checked directly, not assumed

More is already built than expected. In the pause menu right now:
`⬇ Export save (.json)`, `⬆ Import save…` (replaces the current save
wholesale, confirmed first), and `⚠ Reset all progress` (also
confirmed first) — all real, all wired up, all working. `data` is one
JSON object serialized straight to a downloadable file; import is the
same operation in reverse. No account, no backend involved in any of
it — genuinely local, genuinely portable.

**The two real gaps, not "no data management exists":**

1. **No visibility.** There's no way to see what's actually in your
   save — how big it is, how many planner days/book notes/courses/
   badges have piled up — before deciding whether export or reset is
   even worth doing. You'd have to open the exported JSON by hand to
   find out.
2. **No granularity.** The only controls are "export everything,"
   "replace everything," or "delete everything." There's no way to
   clear just the planner days from three months ago, or remove a
   single stale research project, without nuking the whole save or
   hand-editing an exported JSON file and re-importing it.

Cloud-side (`player_saves`, `profiles` in Supabase) is a separate,
currently **dormant** concern — 0 rows in both, confirmed directly.
Nothing below touches that; it's out of scope until the Commons comes
back off pause (see `LIBRARY-SCALING-PLAN.md`'s own priority note on
why that's sequenced last on purpose).

## The plan — in order, each step small and shippable alone

1. **[x] A "Data" panel, read-only first.** "📊 Your Data" in the pause
   menu, next to export/import/reset. Shows total save size (a real
   `Blob` byte count, not an estimate) and counts — planner days, book
   notes, Research Desk projects, Grant Desk projects, courses, badges
   earned, activity log entries.
2. **[x] Selective pruning, opt-in, confirmed each time — never
   automatic.** "Clear old planner days" (a date input + confirm,
   `pruneOldPlannerDays()` in `overlays.js`) is the one piece that was
   actually missing. **Turned out already built, checked before writing
   anything:** "remove one research/grant project" already has a real
   "Delete project" button on each project's own page
   (`deleteResearchProject()` / `deleteGrantProject()`) — the Data panel
   points there instead of duplicating it.
3. **[x] Confirm import handles partial/older saves gracefully —
   verified live, not just read.** Built a synthetic old-shaped save
   (missing `settings`, `ttsSettings`, `activityLog`, `badges`,
   `workshop.research`, `grantProjects`, and more; a spark with no
   `done` field at all) and ran it through the actual Import Save button
   in a real browser. Confirmed: no errors, every missing field fell
   back to its `freshData()` default (the existing `Object.assign(freshData(), loaded)`
   merge order already does this correctly for any wholly-absent key —
   only a key that's *present but incomplete*, like the old `workshop`
   shape, ever needed an explicit patch, and those already existed).
   This step really was verification, not new code, exactly as
   predicted.
4. **Deferred, on purpose: real account-linked data management** — view/
   export/delete a cloud-synced save, once `player_saves`/`profiles`
   actually have real rows in them. Building this now, against zero
   real users, would be effort spent well ahead of need. Revisit this
   step specifically once the Commons reactivates.

## What this deliberately does not include

No automatic pruning, no background cleanup job, no "we noticed your
save is large" nudge — matches the standing automation-philosophy rule
in memory exactly: passive, opt-in, never something that fires without
being asked. This plan is about giving the player visibility and
control over their own data, not the Pavilion managing it for them.
