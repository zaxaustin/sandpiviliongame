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
  { id:'first-page',     icon:'📖', name:'First Page',         desc:'Open a text from any Library shelf.' },
  { id:'first-cast',     icon:'🎣', name:'First Cast',         desc:'Cast a line at the pond (face the water, press E).' },
  { id:'first-plan',     icon:'🖋️', name:'A Day Planned',      desc:'Save an intention at the Writing Desk.' },
  { id:'first-course',   icon:'🗺️', name:'A Path Pinned',      desc:'Pin a course on the Course Board.' },
  { id:'first-entry',    icon:'📔', name:'Your Own Words',     desc:'Write an entry at the Archive Desk.' },
  { id:'first-waypoint', icon:'🔗', name:'A Trail Marked',     desc:'Add a link to your Waypoints list.' },
  { id:'first-carry',    icon:'🎒', name:'Packed for the Road', desc:'Take a book with you from the Reader.' },
  { id:'first-note',     icon:'📝', name:'A Thought Kept',     desc:'Add a note to a book in the Reader.' },
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
