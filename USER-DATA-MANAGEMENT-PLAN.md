# User Data Management Plan

Not started as code — this is the written plan first, same as
`LIBRARY-GROWTH-PLAN.md` and `READING-TO-DOING-PLAN.md` were written
down before anything got built. See README's "What's next" for how
this fits the rest of the priority list.

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

1. **A "Data" panel, read-only first.** Reachable from the pause menu,
   next to the existing export/import/reset buttons. Shows: total save
   size (bytes, from the same JSON export already generates), and
   counts — planner days, book notes, research/grant projects, courses,
   badges earned, activity log entries. Answers "is this getting big"
   before it's ever a real problem, costs almost nothing to build since
   the export function already walks the whole `data` object.
2. **Selective pruning, opt-in, confirmed each time — never automatic.**
   The most likely real need: "clear planner days before a date" (the
   `data.planner` object is already keyed by day, so this is a filter,
   not a rewrite) and "remove one research/grant project" (both already
   have per-item IDs). Matches the existing automation philosophy
   exactly — nothing fires on its own, everything requires the user to
   ask, same as the due-date badge already does.
3. **Confirm import handles partial/older saves gracefully.** Worth an
   explicit check (not assumed) once the Library and planner schemas
   keep growing: does importing an older export correctly fall back to
   `freshData()` defaults for fields that didn't exist yet, the same
   way a fresh install already does? If this already works, this step
   is verification, not new code — check before building anything here.
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
