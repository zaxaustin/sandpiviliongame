/* ================================================================
   [BADGES] — a first-time-actions checklist doubling as a soft
   tutorial. Each one fires once, the first time a core mechanic is
   actually used, with a short toast that names the mechanic. The
   Badges panel (pause menu) lists locked ones with their trigger still
   visible, so it works as "things to try" without a forced walkthrough.
   ================================================================ */
export const BADGES = [
  { id:'first-steps',    icon:'🚶', name:'First Steps',        desc:'Walk anywhere on the Grounds (Arrows or WASD).' },
  { id:'first-menu',     icon:'☰',  name:'Knowing the Way Out', desc:'Open the pause menu (Esc, or the ☰ button).' },
  { id:'first-word',     icon:'💬', name:'First Words',        desc:'Talk to a resident (face them, press E).' },
  /* "from any Library shelf" was never what fired this. openReader() is reached
     from Your Library, the Index, the Stacks, a daily task, a note, the carried
     book — twenty places. Corrected 2026-08-09 rather than narrowed: inventing a
     shelf-only choke point would be a bigger change than the tutorial that
     needed the description to be true. */
  { id:'first-page',     icon:'📖', name:'First Page',         desc:'Open any book in the Reader.' },
  { id:'first-cast',     icon:'🎣', name:'First Cast',         desc:'Cast a line at the pond (face the water, press E).' },
  /* THE DESCRIPTION MOVED, NOT THE CALL. This only ever fired from
     savePlanner(announce) with announce true — the ✓ button — never from the
     autosave, so "save an intention" was earnable by pressing a thing and not
     by doing the thing. The fix is NOT to award from the autosave: a badge
     toast firing while someone is mid-sentence is a machine congratulating them
     for typing, which is the wrong side of rule 9 even if it passes its letter. */
  { id:'first-plan',     icon:'🖋️', name:'A Day Planned',      desc:'Press ✓ Mark today reviewed at the Writing Desk.' },
  { id:'first-course',   icon:'🗺️', name:'A Path Pinned',      desc:'Pin a course on the Course Board.' },
  { id:'first-entry',    icon:'📔', name:'Your Own Words',     desc:'Write an entry at the Archive Desk.' },
  { id:'first-waypoint', icon:'🔗', name:'A Trail Marked',     desc:'Add a link to your Waypoints list.' },
  { id:'first-carry',    icon:'🎒', name:'Packed for the Road', desc:'Take a book with you from the Reader.' },
  /* THIS ONE WAS QUADRUPLE-BOOKED AND ONE FIRING WAS SIMPLY WRONG. It said
     "add a note to a book in the Reader" and was awarded from four places,
     including planting a bequest in the Inheritance Hall — a different act in a
     different room. Found 2026-08-09 while building the tutorial on top of
     badges: a stage that asks you to note a book could be ticked in advance by
     planting a seed three doors away.

     The planting call is gone and the description now covers the three that are
     left. Nothing is ever revoked, so anyone who already earned it keeps it. */
  { id:'first-note',     icon:'📝', name:'A Thought Kept',     desc:'Write a note — at the Writing Desk, in Your Notes, or beside a book.' },
  /* AND THE PRECISE ONE THE TUTORIAL NEEDS. ONE call site, inside
     writeBookNote(), which is already the single path both the Reader and the
     Writing Desk's book-note button take. A guard pins it there. */
  { id:'first-book-note',icon:'📑', name:'In the Margin',      desc:'Write a note beside a book while you are reading it.' },
  /* Nothing awarded authoring a lesson until 2026-08-09 — ui/lesson-tree.js
     imported awardBadge and never called it, and "you wrote something of your
     own" is the whole hinge of the tutorial's fourth stage. */
  { id:'first-lesson',   icon:'✍',  name:'A Lesson of Your Own', desc:'Write your own lesson in the Learning Tree.' },
  /* THE FIRST BADGES THAT COUNT. Everything above fires once, the first time a
     mechanic is used, which is right for a soft tutorial and wrong for the
     thing daily tasks are for: showing up again. These six are awarded from
     data.taskStats by ui/daily-tasks.js, and only on a day where EVERYTHING
     was ticked — a half-finished day is honestly recorded and does not count,
     or the streak means nothing. */
  { id:'first-task',     icon:'📋', name:'A Day\'s Work',      desc:'Finish everything you set out to do in one day.' },
  { id:'five-tasks',     icon:'📗', name:'Five Days\' Work',   desc:'Finish five days of work, whenever they fall.' },
  { id:'twentyfive-tasks', icon:'📚', name:'A Habit',          desc:'Finish twenty-five days of work.' },
  { id:'streak-3',       icon:'🔥', name:'Three in a Row',     desc:'Finish what you set out to do three days running.' },
  { id:'streak-7',       icon:'🔥', name:'A Full Week',        desc:'Seven days running.' },
  { id:'streak-30',      icon:'🏔', name:'A Month of Mornings', desc:'Thirty days running.' },
];
