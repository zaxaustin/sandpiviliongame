/* ================================================================
   [RECORDS] — what the Records Hall is an index OF.

   The Hall showed a hardcoded five-entry array frozen at 2026-07-10.
   `records`, `recordCounts` and `upsertRecord` have existed in
   electron/db.cjs since migration 003 with nothing calling them: a
   database with no consumer on one side, a literal with no database on
   the other.

   THIS IS AN INDEX, NOT A SECOND HOME. Migration 003 says it outright:
   "an index that holds its own copy of the truth is just a second truth
   waiting to disagree with the first." So every row here carries only
   kind / title / when / a pointer back — never the artifact. The build
   still lives in data.hall.builds; this just knows it happened.

   PURE AND DETERMINISTIC (rule 7). No model, no bridge, no clock beyond
   what it is handed. Counting and de-duplicating are things code does
   exactly, so the whole file is a walk over `data`.

   WHAT IS DELIBERATELY NOT HERE, and why — because a Hall that quietly
   omits things is worse than one that says what it does not cover:

     notes    They already have their own table, their own full-text
              index and their own view (v_notes_by_place). Listing every
              note again here would double-count them in recordCounts
              and make "how much have I done" wrong.
     lessons  Whether a lesson is FINISHED depends on its node's step
              list, which lives in the lesson graph rather than in the
              save. data.curriculum holds progress, not completion.
              Guessing would put lessons in your history that you never
              finished, and rule 6 says a wrong answer is worse than
              none. Wire it when the graph is reachable from here.
     days     Same shape of problem: a planner day exists as soon as it
              is opened, which is not the same as a day you worked.

   Anything whose date cannot be established is SKIPPED rather than
   dated today — a record in the wrong year is a lie a note can cite.
   ================================================================ */

/* The Pavilion's own history, which is not the visitor's. Kept because the
   steward asked for "the cool things we can leave in the timeline of
   history" beside his own work. These are seeded as records rather than
   rendered separately, so hiding works on them like anything else. */
export const PAVILION_MILESTONES = [
  { date:'2026-07-06', text:'The original module split — a real Store adapter contract, and the first sketch of a hosted backend (removed again 2026-08-02).' },
  { date:'2026-07-07', text:'The Workshop and the first AI agents — the Café, the Research Desk, the agent-notes commons, the first deploy.' },
  { date:'2026-07-08', text:'Reading notes in the Reader, local object storage, the Classics and Science shelves, the arXiv / Semantic Scholar / SuttaCentral connectors.' },
  { date:'2026-07-09', text:"The Keep's Ganesha statue, the Native American shelf, the reading-to-doing sparks, the Monk and Quill's roles split for real." },
  { date:'2026-07-10', text:'The Eightfold Path Temple and the Tool Commons written down as long-term plans; the Workshop grew these floors.' },
  { date:'2026-07-12', text:'The Science & Research Hall — dissect a claim, weigh the evidence, and keep what survives.' },
  { date:'2026-07-28', text:'The first installer a stranger could run, and the guard that proves the packaged app actually boots.' },
  { date:'2026-08-02', text:'The hosted backend deleted outright. Local and self-hosted from here: the Library is yours, on your machine.' },
  { date:'2026-08-03', text:'The Study Table — work a book one story at a time, naming the units yourself.' },
  { date:'2026-08-04', text:'Every desktop install carries its own Postgres. Search every note you have ever written, by meaning as well as spelling.' },
];

const DATE = /^\d{4}-\d{2}-\d{2}/;

/* A date we are willing to stand behind, or nothing. Accepts the save's
   several habits (a day key, an ISO timestamp, a ms number) and refuses
   anything else rather than inventing one. */
function when(v){
  if(typeof v === 'number' && isFinite(v) && v > 0){
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }
  if(typeof v !== 'string') return null;
  const m = v.match(DATE);
  return m ? m[0] : null;
}
/* The first of several fields that actually holds a date. The save has
   grown `created`, `ts`, `date` and `started` in different rooms. */
function dateOf(o){
  if(!o || typeof o !== 'object') return null;
  for(const k of ['created','ts','date','started','opened','when','updated']){
    const d = when(o[k]);
    if(d) return d;
  }
  return null;
}
function titleOf(o, fallback){
  if(!o || typeof o !== 'object') return fallback;
  for(const k of ['title','name','label','question','claim','subject']){
    if(typeof o[k] === 'string' && o[k].trim()) return o[k].trim().slice(0, 300);
  }
  return fallback;
}

/* ---- the walk ----
   `data`      the save
   `bookTitle` slug -> a real title, so a reading record reads like a book
               rather than like a slug. Passed in rather than imported, so
               this file stays pure and testable.                        */
export function gatherRecords(data, bookTitle){
  if(!data || typeof data !== 'object') return [];
  const out = [];
  const name = s => (typeof bookTitle === 'function' && bookTitle(s)) || s;

  // the Pavilion's own history
  for(const m of PAVILION_MILESTONES){
    out.push({ kind:'milestone', title:m.text, detail:null, happened:m.date,
      ref:null, opener:null, slug:null, tags:[], source_key:'milestone:'+m.date });
  }

  // books marked read — data.read is { slug: 'YYYY-MM-DD' }
  for(const [slug, v] of Object.entries(data.read || {})){
    const d = when(v);
    if(!d || !slug) continue;                 // an undated reading is skipped
    out.push({ kind:'reading', title:name(slug), detail:null, happened:d,
      ref:slug, opener:'openReader', slug, tags:[], source_key:'reading:'+slug });
  }

  /* The Hall's three benches. Same shape, different kinds, so one loop.

     EVERY OPENER HERE IS A REAL window.* FUNCTION, and that is checked by
     npm test rather than trusted. The first version of this file invented
     openInvestigation / openExperiment / openBuild, none of which exist —
     14 of the room's 16 cards were dead, which the standing rule ("nothing
     may be a dead end") forbids and which only showed up by opening the
     room and counting the clickable ones.

     openLab is the room all three actually live in. It takes no argument,
     so `ref` is carried for identity and not passed — a door to the right
     room beats a button that does nothing. */
  const HALL = [
    ['investigations', 'investigation', 'openLab'],
    ['experiments',    'experiment',    'openLab'],
    ['builds',         'build',         'openLab'],
  ];
  for(const [field, kind, opener] of HALL){
    const list = (data.hall && data.hall[field]) || [];
    if(!Array.isArray(list)) continue;
    list.forEach((it, i) => {
      const d = dateOf(it);
      if(!d) return;                          // undated -> skipped, not guessed
      const id = (it && (it.id || it.key)) || String(i);
      out.push({ kind, title:titleOf(it, kind + ' ' + (i + 1)), detail:null,
        happened:d, ref:null, opener, slug:(it && it.slug) || null,
        tags:[], source_key:kind + ':' + id });
    });
  }

  // work published or received at the Commons Table
  const commons = data.commons || {};
  for(const [field, verb] of [['published','Published'], ['received','Received']]){
    const list = commons[field];
    if(!Array.isArray(list)) continue;
    list.forEach((it, i) => {
      const d = dateOf(it);
      if(!d) return;
      const id = (it && (it.id || it.slug)) || String(i);
      out.push({ kind:'packet', title:verb + ': ' + titleOf(it, 'a packet'),
        detail:null, happened:d, ref:null, opener:'openCommonsTable',
        slug:null, tags:[field], source_key:'packet:' + field + ':' + id });
    });
  }

  /* De-duplicate on source_key. Two rooms can legitimately describe the
     same act, and upsertRecord's ON CONFLICT would collapse them anyway —
     doing it here means recordCounts is right BEFORE the write, and means
     the count shown with no database matches the one shown with it. */
  const seen = new Set();
  return out.filter(r => {
    if(seen.has(r.source_key)) return false;
    seen.add(r.source_key);
    return true;
  }).sort((a, b) => (a.happened < b.happened ? 1 : a.happened > b.happened ? -1 : 0));
}

/* What the room's header says, computed the same way whether or not there
   is a database — so the two can never disagree. */
export function recordSummary(records){
  const by = {};
  for(const r of records || []) by[r.kind] = (by[r.kind] || 0) + 1;
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
}

export const RECORD_LOOK = {
  milestone:     { icon:'🏛', label:'the Pavilion' },
  reading:       { icon:'📖', label:'read' },
  investigation: { icon:'🔍', label:'investigations' },
  experiment:    { icon:'🧪', label:'experiments' },
  build:         { icon:'🔧', label:'builds' },
  packet:        { icon:'📦', label:'packets' },
  note:          { icon:'🗒', label:'notes' },
  lesson:        { icon:'🎓', label:'lessons' },
  day:           { icon:'☀', label:'days' },
  dissection:    { icon:'🔬', label:'dissections' },
};
