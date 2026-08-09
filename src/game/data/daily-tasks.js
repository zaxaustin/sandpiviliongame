/* ================================================================
   [DAILY TASKS] — what you sat down to do TODAY, at a size you can
   actually finish.

   Named by the steward, 2026-08-08, and the word is the design:

     "we can call it daily tasks instead of missions, you cant do
      missions unless you graduate lol"

   A mission is something you earn. A task is what you do this
   afternoon. `mission` stays unclaimed in KINDS for the graduated
   thing, whenever that arrives.

   WHAT THIS IS FOR, and it is not a to-do list:

     "the expiry is for the user to see so he knows that this is for
      today, so make a plan for today and what you are able to digest
      today. this also lets people taclke bigger goals like learning
      eletroinics one step at a time rather than getting over welmed."

   So the day boundary is a FRAMING DEVICE, not a stick. There is no
   countdown here, nothing turns red, and the word "overdue" does not
   appear. The only thing the date does is make you scope the work to
   a real day — and let a big goal (learn electronics) be eaten one
   sitting at a time through `source`.

   ⚠ ONE EXCEPTION, AND IT IS DELIBERATE — THE STREAK (2026-08-09).
   The paragraph above is the design and it stays the design, but the
   UI shows `🔥 N in a row · best N`, and a running tally of consecutive
   days is a stick however gently it is drawn. A day you miss makes a
   number go down; nothing else in this file can do that.

   It was put to the steward as a thing to remove and the answer was to
   KEEP IT. So this is a stated exception rather than a contradiction —
   which matters, because a document asserting something the code does
   not do is this project's oldest and most expensive failure, and the
   pace audit that found this found ten other things by looking for
   exactly that shape.

   NO GUARD IS WRITTEN FOR IT. A rule with an exception the size of the
   rule is not a rule, and a test asserting "nothing here judges you,
   except this" would be theatre. What holds it is this paragraph and
   the argument in CLAUDE.md rule 9. If the streak ever grows teeth —
   a broken-streak notice, a red number, a nag — that is the line, and
   this note is where to come back to.

   THE PAVILION SUPPORTS A REAL STUDY SESSION; IT DOES NOT SIMULATE
   ONE. The steward again, and it is why `world` exists below:

     "the tesla chain is for the user to go and do not the ai ... to
      mantian privacy and to ground the user more in what he is doing"

   The AI does no legwork. You get the book, you read it, you wire the
   circuit. This file holds the plan and names the door.

   Pure: no DOM, no imports, no reaching for `data`. The caller owns
   the store and hands it in — so npm test can hold every rule above
   rather than trusting it, the same reason carrying.js and
   the-day.js are pure.
   ================================================================ */

/* WHERE A STEP IS DONE. One table drives everything — the carrying.js
   KINDS pattern, and for the same reason: a surface that keeps its own
   list of what it accepts drifts from the list of what exists.

   `door` is a window.* opener that MUST already exist. npm test checks
   every one of them against the export block, because a step pointing
   at a door nobody wired is the dead-drop this whole feature was born
   from — `mission` sat in KINDS.places for a day with no surface at
   all, and nothing noticed. */
export const STEP_WHERE = {
  library: { icon: '📚', label: 'get a text',    door: 'openRequests' },
  read:    { icon: '📖', label: 'read it here',    door: 'openReader',   needsRef: true },
  plan:    { icon: '🌱', label: 'draft a lesson', door: 'writeLessonOnThisBook', needsRef: true },
  learn:   { icon: '🎓', label: 'on the path',   door: 'openLearningTree' },
  /* The Study Table is a TOOL INSIDE the Writing Desk, not a room with its own
     opener — `openStudyTable` does not exist and the guard below caught the
     first draft naming it. The honest door is the desk it lives on. */
  work:    { icon: '🔨', label: 'at the desk',   door: 'openPlanner' },
  build:   { icon: '⚙', label: 'at the bench',  door: 'openLab' },
  ask:     { icon: '💬', label: 'ask someone',   door: 'talkTo',       needsRef: true },
  note:    { icon: '🗒', label: 'write a note',  door: 'openNotesLog' },
  /* OUT THERE, AND IT HAS NO DOOR ON PURPOSE. "Go to the town
     library." "Wire the 555 timer." "Read pages 40-60 on paper."
     This is the step that makes the Pavilion a support for real study
     rather than a replacement for it, and giving it a button would be
     pretending the app can do it for you. */
  world:   { icon: '🌍', label: 'out there',     door: null },
};
export const WHERE_KEYS = Object.keys(STEP_WHERE);

/* Every door a step can name, derived rather than listed — so npm test
   can hold them against the window exports without a second list. */
export const STEP_DOORS = [...new Set(
  WHERE_KEYS.map(k => STEP_WHERE[k].door).filter(Boolean))].sort();

export function stepDoor(where) {
  const w = STEP_WHERE[where];
  return w ? w.door : null;
}

/* ---- IS THIS TODAY'S? --------------------------------------------------

   COMPUTED ON READ, NEVER A TIMER. No background polling, nothing moves
   by itself — the same way due dates have always worked here. A task
   does not "expire" at midnight by any mechanism; it simply stops being
   today's the moment today is a different string.                        */
export function isToday(task, today) {
  return !!task && !task.closed && task.taken === today;
}
export function activeTask(tasks, today) {
  return (tasks || []).find(t => isToday(t, today)) || null;
}
/* THE TWO LOWER HALVES, AND THEY ARE NOT THE SAME THING.

   Found by reading the screenshot, 2026-08-08: work FINISHED TODAY was
   appearing under a heading that said "Before today", because a closed task is
   not `isToday` (isToday requires !closed) and everything not-today fell into
   one bucket. The date was right there on the card, contradicting the heading
   above it. Small, and exactly the kind of quiet lie this project keeps
   finding by looking rather than by asserting.

   So: what you already did today, and what you did before today. */
export function earlierToday(tasks, today) {
  return (tasks || []).filter(t => t && t.closed && t.taken === today);
}
export function beforeToday(tasks, today) {
  return (tasks || []).filter(t => t && t.taken && t.taken < today)
    .slice().sort((a, b) => String(b.taken || '').localeCompare(String(a.taken || '')));
}

export function stepsDone(task) {
  return ((task && task.steps) || []).filter(s => s && s.done).length;
}
export function allDone(task) {
  const steps = (task && task.steps) || [];
  return steps.length > 0 && steps.every(s => s && s.done);
}

/* ---- ONE AT A TIME ----------------------------------------------------

   data.study settled this already and wrote down the reason: "a list of
   active lessons is a second to-do list", and the-day.js is blunter — "a
   list of everything outstanding is a guilt inventory".

   Refused with a SENTENCE, never a silent no-op, because a button that
   does nothing is the house failure mode.                               */
export function canTake(tasks, today) {
  const live = activeTask(tasks, today);
  if (live) {
    return { ok: false,
      reason: 'You already have today\'s tasks — "' + (live.title || 'untitled')
            + '". Finish it, set it down, or take it up again tomorrow.' };
  }
  return { ok: true };
}

/* ---- CLOSING OUT A DAY THAT HAS PASSED --------------------------------

   Returns the log entries to write, and the tasks with `closed` set. PURE:
   the caller writes them, so this can be tested without a save.

   IDEMPOTENT, and that is the first thing to break on purpose. Opening
   the app twice on Tuesday must not write Monday's record twice — the
   guard is `closed`, set in the same pass that produces the entry.

   BOTH HALVES ARE RECORDED. What you did AND what you did not, because a
   record that only lists failures is the guilt inventory again, and one
   that only lists wins is a lie. A day where you did two of four things
   is a day you did two things.                                          */
export function closeOut(tasks, today) {
  const list = Array.isArray(tasks) ? tasks : [];
  const entries = [], next = [];
  let changed = false;
  for (const t of list) {
    if (!t || t.closed || !t.taken || t.taken >= today) { next.push(t); continue; }
    const steps = t.steps || [];
    const did = steps.filter(s => s && s.done).length;
    const left = steps.length - did;
    /* One line, in the bullet-journal shape the day's log already uses.
       `done` is true only when the whole thing was finished, so an
       unticked box in an old day is honest rather than accusing. */
    entries.push({
      dayKey: t.taken,
      entry: {
        text: '📋 ' + (t.title || 'Today\'s tasks') + ' — ' + did + ' of ' + steps.length + ' done'
            + (left ? ' (' + left + ' left)' : ''),
        kind: 'task',
        done: left === 0 && steps.length > 0,
      },
    });
    next.push({ ...t, closed: true });
    changed = true;
  }
  return { tasks: next, entries, changed };
}

/* ---- THE STREAK -------------------------------------------------------

   Days in a row with a task finished, from `lastDone` alone. No stored
   calendar: a list of dates is a thing that can disagree with itself, and
   this is one subtraction.

   FINISHING TWICE IN A DAY DOES NOT COUNT TWICE. That is the second
   sabotage case, and it is the difference between a streak and a score. */
export function streakAfter(stats, today) {
  const s = stats || {};
  const prev = s.lastDone || '';
  const done = (s.done || 0) + 1;
  if (prev === today) return { ...s, done: s.done || 0, sameDay: true };   // already counted
  const gap = prev ? daysApart(prev, today) : null;
  const streak = gap === 1 ? (s.streak || 0) + 1 : 1;
  return {
    done,
    streak,
    best: Math.max(s.best || 0, streak),
    lastDone: today,
  };
}
/* Whole days between two YYYY-MM-DD keys. the-day.js has daysBetween()
   for the same job; this file is pure and importless by design, and one
   subtraction is cheaper than a dependency that would make it otherwise. */
export function daysApart(a, b) {
  const pa = Date.parse(a + 'T00:00:00'), pb = Date.parse(b + 'T00:00:00');
  if (isNaN(pa) || isNaN(pb)) return null;
  return Math.round((pb - pa) / 86400000);
}

/* WHAT THE VISITOR IS TOLD, at the top of the board. The framing, in one
   sentence, because the date is the whole point and it is not a threat. */
/* The word "late" does not appear, and neither does "overdue" — not even to
   deny them. Denying a thing plants it, and the test below fails on either
   word precisely so a future edit cannot reintroduce the framing by being
   reassuring about it. */
export const TASKS_NOTICE =
  'Today\'s tasks — sized to what you can actually finish today. Tomorrow starts empty, '
  + 'on purpose: this is a plan for one day, not a list that follows you around.';
