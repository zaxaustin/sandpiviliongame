# The Phone as an App Launcher — tools unlocked by walking there

Captured 2026-07-27, the user's idea, so it isn't forgotten. A strong one: it ties
together three things the project already wants — quick daily tools, the pocket
"phone," and discovery through the world.

## The idea, in the user's words

"I want to really digest books quickly in the notes … having the notes on the
phone. For the seed we can **unlock those apps on the phone when they visit the
physical location**."

So the **phone becomes a launcher of little apps** (Notes, Lesson plans, The Log,
the daily plan, maybe a resident quick-chat), and each app **unlocks the first
time you visit the room it belongs to**. A stranger doesn't get a wall of buttons
on turn one; they *discover* their tools by walking the grounds — and once found,
a tool is one tap away from anywhere, no walking back.

## Why it's good

- **Onboarding by discovery, not a manual.** The physical visit teaches what the
  tool is (you're standing in the Library when 🗒 Notes unlocks); the phone then
  keeps it at hand. This is the "first-arrival orientation" gate (BETA-BUILD-PLAN
  §6.5) solved as *play*, not a tutorial popup.
- **Quick daily digestion.** The user's north star here: read a book, jot/di­gest
  it in Notes fast, from anywhere. A phone Notes app makes the loop tight — open
  phone → Notes → new note / link the book you're holding, without leaving the map.
- **It reuses what exists.** The pocket phone (`#chatPhone`/`#bookPhone`) already
  floats a tap-to-open card; the overlays (Notes, Lesson plans, The Log, planner)
  already exist. This is a *launcher + an unlock flag*, not new tools.

## Shape (a sketch, to design properly when we build it)

- **A phone button / HUD tap** opens a small "home screen" of app icons — only the
  **unlocked** ones lit; locked ones shown faint with a hint ("Visit the Study").
- **Unlock flags** on the save (e.g. `data.appsUnlocked = { notes, lessons, log,
  plan, … }`), set when the player first enters/interacts at the matching place:
  - 🗒 Notes → the Library (or the Writing Desk)
  - 🌳 Lesson plans → the Study / Course Board
  - 📓 The Log → anywhere, or the café notice board
  - 🗓 Today's plan → the Writing Desk
  - 💬 a resident → after first meeting them
- **Migration-safe:** older saves default every flag based on what they've already
  done (e.g. if they have notes, Notes is unlocked), so no one loses access.
- **The world stays primary** (the soul: nothing happens without you). The phone is
  convenience *after* discovery, never a replacement for the place.

## Open questions for when we build it

- Does the phone launcher replace or sit beside the pause menu? (Likely: the phone
  is the *daily-tools* subset; the pause menu stays the full system list.)
- Touch + keyboard affordance for opening it.
- How loud the "you unlocked an app" moment is (a quiet toast, matching the badge
  toast — never a blocking popup, per the automation-philosophy rule).

## Status

Idea captured, not built. Fits after the beta-prep push. Cross-refs:
`BETA-BUILD-PLAN.md` (§6.5 orientation), the pocket-phone code in
`src/game/ui/overlays.js`, and the daily-loop tools it would launch.
