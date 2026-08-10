/* ================================================================
   [THE TUTORIAL] — five stages, and every one of them leaves you
   holding something.

   Designed 2026-08-07 in plans/THE-TUTORIAL-AND-SIGNING-IN.md §2, in
   the steward's own order, and built 2026-08-09 with Stage 1 rewritten
   by him:

     "stage one should be add your own books to the library and leave
      a note. then we can put in it your backpack"

   THAT REWRITE FIXED A HOLE NOBODY HAD SEEN. The original Stage 1 was
   "put a book in your backpack", written when 27 seed books shipped.
   SEED_LIBRARY is [] and that is the finished position — so on a
   genuinely fresh save there was nothing to put in it. The first beat
   is now the thing a newcomer has to learn anyway, and Stage 2 is
   stronger for it: a resident with a carried book can quote it with
   page numbers, and with a note of yours it has something to search.

   FOUR RULES, ALL FROM THE PLAN, ALL LOAD-BEARING:

   1 · IT TEACHES BY PRODUCING SOMETHING KEPT. Never a
       highlight-and-arrow tour. Every beat below ends with a real
       artifact in the save.
   2 · ONE NEXT THING AT A TIME — "im loosing track at this rate lol".
       A stage that is not reached yet is not described. What IS shown
       is a completed stage, collapsed, with the evidence that finished
       it; only the current one is open. That is a reading of the rule
       about what is EXPANDED, and it is a reading rather than the
       letter, said out loud here so nobody thinks it was slipped past.
   3 · NOTHING IS EVER LOCKED. The gate is on the claim, never on the
       learning. Every room stays reachable whether or not any of this
       is done; the tutorial only ever POINTS.
   4 · NOTHING IS STORED THAT CAN BE DERIVED. Which stage you are on is
       computed from badges, tasks, lessons and the shelf — never
       written down. Two progress systems that must agree is rule 4's
       exact shape and this file refuses to be the second one.

   Pure: no DOM, no imports from entities.js, no reaching for `data`.
   The caller hands in a plain store. Same contract as
   data/daily-tasks.js and data/carrying.js, and for the same reason —
   npm test can then hold every rule above rather than trusting it.
   ================================================================ */

/* WHAT A CALLER MUST HAND IN. Named here so the shape is one thing
   rather than an argument list that drifts:

     { catalogueCount, badges, dailyTasks, myLessons, commons,
       lessonsDone:[id], tutorial:{started,ready,graduated} }

   `lessonsDone` is an array of ids rather than a function, because
   lessonDone() lives in ui/lesson-tree.js and touches data.curriculum
   — importing it here would end this file's purity for one boolean. */

const has = (b, id) => !!(b && b[id]);
const count = a => (Array.isArray(a) ? a.length : 0);

/* ---------- the five ----------
   `prove` is the ONLY thing that completes a beat, and every one of
   them is a fact that already exists for its own reasons. Nothing here
   writes anything. */
export const STAGES = [
  {
    n: 1,
    icon: '📚',
    title: 'The first loop',
    why: 'At the end of this you have a book you chose, a note you wrote, and it is in your bag. '
       + 'That is the whole Pavilion in miniature.',
    /* Orientation lives here rather than in a stage of its own. A whole
       stage spent walking around ends with nothing kept, which breaks
       rule 1 — so the promises are told while you are on your way
       somewhere. Wording from archive/seed-texts-2026-08-10/, which
       docs/BOOKS-TO-SOURCE.md says belongs "in the Welcome panel, on a
       sign, or in MANUAL.md" rather than shelved as literature. */
    asides: [
      { text: 'Esc closes anything. With nothing open, it is the pause menu.' },
      { text: 'Nothing here breaks by clicking around — every panel closes, every door reopens, '
            + 'and the worst mistake costs a moment.' },
      { text: 'The shelves start empty on purpose. A library here is one you built, not one you '
            + 'were handed — which is why the first thing below is a book you pick.' },
    ],
    beats: [
      { id: 'book',
        text: 'Bring one book in',
        note: 'A .txt or .epub, dragged onto the window. Nothing is uploaded and no licence is needed — '
            + 'it is your copy, on your machine.',
        place: 'intake',
        prove: s => s.catalogueCount > 0 },
      { id: 'note',
        text: 'Open it, and leave a note beside it',
        note: 'The note box sits next to the text, so you never leave the page to write. '
            + 'It keeps the chapter and page you were on.',
        place: 'yourshelf',
        prove: s => has(s.badges, 'first-book-note') },
      { id: 'carry',
        text: 'Put it in your backpack',
        note: 'What you carry is what a resident may see — and only while you carry it.',
        place: 'yourshelf',
        prove: s => has(s.badges, 'first-carry') },
    ],
    closing: 'That book and that note are yours now. Nothing else in the Pavilion had to happen first.',
  },
  {
    n: 2,
    icon: '👥',
    title: 'The residents',
    why: 'Now that you are carrying something, they have something to talk about. '
       + 'A resident with nothing to talk about is a chatbot.',
    asides: [
      { text: 'You do not need them. The Library, the reader, your notes, the day and the lessons all '
            + 'work with nothing installed, forever. If you never connect a model, nothing here is '
            + 'broken — it is quieter, that is all.' },
      { text: 'Ask about the book in your backpack and the answer comes back with page numbers you can '
            + 'turn to and check. Ask with 🔎 and it searches what you have written, and shows you '
            + 'exactly what it found.' },
      { text: 'Not sure your computer can run one? The Connections panel will read this machine and '
            + 'tell you plainly — including when the honest answer is "not on this one".',
        door: 'openConnections' },
    ],
    /* ONE BEAT, AND IT MUST BE ONE THAT WORKS WITH NO AI. first-word is
       awarded on the dialog path in main.js, not on a reply — so a
       visitor on a small laptop still finishes this stage and still
       gets told stages 3 to 5 exist. Making "connect a model" a beat
       would turn the tutorial into a door onto nothing for exactly the
       people it is most for. */
    beats: [
      { id: 'hello',
        text: 'Say hello to one of them',
        note: 'Seven residents, each a different job rather than a different voice. Sebastian is the '
            + 'hub; ask him when you do not know who to ask.',
        door: 'openRoster',
        prove: s => has(s.badges, 'first-word') },
    ],
    closing: 'They answer better the more you are carrying. That is the whole trick.',
  },
  {
    n: 3,
    icon: '☀',
    title: 'The day, and the desk',
    why: 'One task. One is finishable in the first sitting, and that is the point of the size.',
    asides: [
      { text: 'The date is a framing device, not a stick. Nothing turns red and nothing says "overdue" '
            + '— it is there so you scope the work to a real day.' },
      { text: 'Any note you take on a book carries a small button: bring it to today\'s plan. '
            + 'That one motion — shelf to desk — is most of what this place is for.' },
      { text: 'Everything you have written, from whichever door you wrote it through, is in one place.',
        door: 'openNotesLog' },
    ],
    beats: [
      { id: 'task',
        text: 'Set one task for today',
        note: 'Two or three things you actually mean to do. Each step can name the room it happens in, '
            + 'and take you there.',
        door: 'openDailyTasks',
        prove: s => count(s.dailyTasks) > 0 },
    ],
    closing: 'A day you wrote down, and a desk that keeps what you are working on between visits.',
  },
  {
    n: 4,
    icon: '✍',
    title: 'Making, not only following',
    why: 'This is where you stop being a reader of someone else\'s thing.',
    asides: [
      { text: 'You can walk the lessons already here, or write your own. The Learning Tree holds both '
            + 'side by side, and neither is more real than the other.' },
      { text: 'Three steps, one line each, is a lesson. It is allowed to be small — you will edit it '
            + 'in the next stage.' },
      { text: 'A lesson can cite the book it came from, so whoever walks it knows where to read.' },
    ],
    beats: [
      { id: 'lesson',
        text: 'Write one lesson of your own',
        note: 'A title and a few steps. If it came out of a book you are reading, there is a shortcut '
            + 'in the Reader that starts it for you.',
        place: 'tree',
        prove: s => count(s.myLessons) > 0 },
    ],
    closing: 'It is yours, it is editable forever, and nothing gates it.',
  },
  {
    n: 5,
    icon: '🤝',
    title: 'Leave something for others',
    why: 'Last, because it means nothing to someone who has not felt the first four.',
    asides: [
      { text: 'This is the step the whole place is shaped around: a person with a craft — a teacher, a '
            + 'meditator, an engineer — leaving work that somebody else can actually walk.' },
      { text: 'Nothing is uploaded. A packet reaches someone because you handed them a file.' },
    ],
    /* No `beats` — Stage 5 is the readiness checklist below, which needs
       a chosen lesson and cannot be a list of one-press doors. */
    beats: [],
    closing: '',
  },
];
export const STAGE_COUNT = STAGES.length;

/* ---------- what is done, and what is next ----------
   Derived on every render. Nothing here is written to the save. */
export function stageState(store) {
  const s = store || {};
  let firstOpen = 0;
  const out = STAGES.map(stage => {
    const beats = stage.beats.map(b => ({ ...b, done: !!b.prove(s) }));
    const done = stage.n === 5 ? !!(s.tutorial && s.tutorial.graduated)
                               : beats.every(b => b.done);
    return { ...stage, beats, done };
  });
  for (const st of out) { if (!st.done) { firstOpen = st.n; break; } }
  return out.map(st => ({ ...st, current: st.n === firstOpen }));
}
/* 1…5, or 6 when every stage is finished. Never stored — see rule 4 in
   the header. A visitor who did all of this organically before the
   tutorial existed lands correctly on 6, which is the honest answer. */
export function currentStage(store) {
  const st = stageState(store).find(x => x.current);
  return st ? st.n : STAGE_COUNT + 1;
}

/* ---------- Stage 5: is this course ready for another person? ----------
   The five rows are plans/INDEPENDENT-COURSE-GRADUATION.md's graduation
   check. Three are DERIVED and two are the visitor's own judgement,
   because no code can read a lesson and know whether a stranger could
   follow it. Marking which is which is the point: a checklist that
   pretends to have measured a judgement is worse than one that asks. */
export function readyChecks(store, lessonId) {
  const s = store || {};
  const ready = (s.tutorial && s.tutorial.ready && s.tutorial.ready[lessonId]) || {};
  const published = (s.commons && s.commons.published) || [];
  return [
    { id: 'exists', kind: 'derived',
      text: 'It exists — a course of your own making',
      done: (s.myLessons || []).some(l => l && l.id === lessonId) },
    { id: 'walked', kind: 'derived',
      text: 'You walked it to the end yourself',
      done: (s.lessonsDone || []).includes(lessonId) },
    { id: 'standsAlone', kind: 'judgement',
      text: 'Its steps stand alone. Someone who never met you could follow them.',
      done: !!ready.standsAlone },
    { id: 'outcome', kind: 'judgement',
      text: 'It says what it produces — and it produced it',
      done: !!(ready.outcome && String(ready.outcome).trim()),
      value: ready.outcome || '' },
    /* EITHER PUBLISHED HERE, OR TICKED. Writing a packet file out leaves
       no trace in the save — the Pavilion genuinely cannot see it. So it
       asks, rather than calling a person a liar or silently blocking
       them. Rule 6. */
    { id: 'left', kind: 'either',
      text: 'It has left this machine',
      note: 'Publishing it here ticks this. If you wrote the file out and handed it over instead, '
          + 'nothing recorded that — so say so yourself.',
      done: !!ready.licensed
         || published.some(p => p && p.sourceKind === 'lesson' && String(p.sourceId) === String(lessonId)) },
  ];
}

/* REFUSES WITH SENTENCES, NEVER A BARE FALSE. A button that does nothing
   is the house failure mode; a button that says which of five things is
   missing is the cure. */
export function canGraduate(store, lessonId) {
  if (!lessonId) return { ok: false, missing: ['Choose which of your courses this is about.'] };
  const rows = readyChecks(store, lessonId);
  const missing = rows.filter(r => !r.done).map(r => r.text);
  return { ok: !missing.length, missing };
}

/* ---------- the sentence that keeps Stage 5 honest ----------
   Held as a constant so npm test can pin its wording. F-rank, Missions
   and the Outer→Inner door are all unbuilt drafts — MISSION-SYSTEM-PLAN.md
   and THE-THREE-COURTS.md, the latter subtitled "Nothing here is built".
   Recording a graduation that claims to open a door onto nothing is the
   exact failure this project keeps naming, so it says the opposite. */
export const MISSIONS_NOT_BUILT =
  'Missions are not built. There is no F-rank door and this does not open one — '
+ 'saying otherwise would be a door onto nothing. What this record means today is exactly what it '
+ 'says: you made a thing, you finished it, and you made it usable by someone who was never here. '
+ 'If Missions are ever built they will read this. Until then it is a note to yourself, on your own '
+ 'machine, and that is not nothing.';

export const TUTORIAL_NOTICE =
  'Nothing here is locked, and none of it has to be done in order — every room is open from the '
+ 'moment you arrive. This is only the Pavilion pointing at what it is for.';

/* Every door any stage names, for the export-drift guard in npm test.
   Derived rather than listed: a beat pointing at a door nobody wired is
   a button that silently does nothing. */
export function tutorialDoors() {
  const out = new Set();
  for (const st of STAGES) {
    for (const b of st.beats) if (b.door) out.add(b.door);
    for (const a of (st.asides || [])) if (a.door) out.add(a.door);
  }
  return [...out];
}
/* And the PLACES keys, checked against data/places.js the same way. */
export function tutorialPlaces() {
  const out = new Set();
  for (const st of STAGES) for (const b of st.beats) if (b.place) out.add(b.place);
  return [...out];
}
