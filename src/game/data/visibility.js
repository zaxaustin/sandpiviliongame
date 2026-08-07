/* ================================================================
   [VISIBILITY] — the one vocabulary for "is this mine or is this ours?"

   Written 2026-07-27, at direct request: before the Pavilion is handed
   to other people, a visitor has to be able to tell at a glance which
   things are private to them and which are held in common. Until now
   that distinction was real in exactly one place (the Library's
   certified shelves vs Your Shelf 👤) and invisible everywhere else —
   notes, papers, lesson plans, courses and Paths were all private with
   no way out, and nothing on screen said so.

   Three states, and nothing in the Pavilion is outside them:

     PRIVATE  👤  On this machine, in your save. Nothing sends it
                  anywhere, ever — not to us, not to a server, not to
                  another person, unless you personally hand it over.
     SHARED   🤝  You published it: it exists as a packet you wrote out
                  and gave away. The original stays yours.
     COMMONS  🏛  It came from someone else, or shipped with the
                  Pavilion. It carries an author, a license, and a
                  source, the same way every text on a Library shelf
                  does. You may read it, use it, and pass it on.

   The load-bearing rule underneath all three: NOTHING MOVES BY ITSELF.
   There is no sync, no upload, no background anything. A thing becomes
   commons because a person deliberately wrote a file and handed it
   over — which is why this works with no account and no server.
   ================================================================ */

export const VIS = {
  private: { icon:'👤', label:'Yours',        color:'#e0a43c',
             help:'Private to this machine. Nothing sends it anywhere unless you do.' },
  shared:  { icon:'🤝', label:'Shared by you', color:'#7fa36b',
             help:'You wrote this out as a packet and gave it away. Your copy is still yours.' },
  commons: { icon:'🏛', label:'Commons',       color:'#9ac7e8',
             help:'Written by someone else, or shipped with the Pavilion. Carries its author and license.' },
};

/* A small inline badge, for a card or a heading. `note` is optional extra
   text (an author, a license) — callers pass it already escaped. */
export function visBadge(state, note){
  const v=VIS[state]||VIS.private;
  return `<span class="badge" style="border-color:${v.color};color:${v.color}">${v.icon} ${v.label}${note?' · '+note:''}</span>`;
}

/* One line of plain explanation, for the top of a panel. */
export function visLine(state){
  const v=VIS[state]||VIS.private;
  return `${v.icon} <b>${v.label}.</b> ${v.help}`;
}

/* The honest map of every store in the save: what it is, and whether it can
   ever leave this machine. The Your Data panel renders this directly, so the
   answer to "what's private?" is a real list rather than a promise. Keep this
   in step with freshData() in entities.js — a new store that isn't listed
   here is a store nobody can see the status of. */
export const DATA_MAP = [
  { key:'notes',        name:'Your Notes',              state:'private', leaves:'Only if you publish one at the Commons Table, or plant one as a seed.' },
  { key:'bookNotes',    name:'Notes taken on books',    state:'private', leaves:'Never on their own. They travel only inside a note you choose to publish.' },
  { key:'chatNotes',    name:'Notes beside a resident', state:'private', leaves:'Never. These are not published anywhere.' },
  { key:'agentMemory',  name:'What residents remember', state:'private', leaves:'Never. It only feeds that resident’s own next reply, on this machine.' },
  { key:'planner',      name:'Your days and intentions',state:'private', leaves:'Never. The day is yours.' },
  { key:'calendar',     name:'Your calendar',           state:'private', leaves:'Never.' },
  { key:'paths',        name:'Paths',                   state:'private', leaves:'Never yet — publishing a Path is not built.' },
  { key:'ideas',        name:'The Log',                 state:'private', leaves:'Never.' },
  { key:'courses',      name:'Courses and lesson plans',state:'private', leaves:'Only if you publish one at the Commons Table.' },
  { key:'curriculum',   name:'Learning Tree progress',  state:'private', leaves:'Never. Your progress is nobody else’s business.' },
  { key:'hall',         name:'Investigations, experiments, paper analyses', state:'private', leaves:'Only if you publish one at the Commons Table.' },
  { key:'temple',       name:'Eightfold reflections',   state:'private', leaves:'Never. These are the most private thing here.' },
  { key:'workshop',     name:'Archive and Research Desk work', state:'private', leaves:'Only via the Steward Review Queue (Archive) — you submit it deliberately.' },
  { key:'grantProjects',name:'Grant Desk projects',     state:'private', leaves:'Never.' },
  { key:'grove',        name:'The Inheritance Hall',    state:'private', leaves:'Only what you deliberately write out as a bequest file.' },
  { key:'personalLibrary', name:'Your Shelf (books you added)', state:'private', leaves:'Only inside a bequest you plant and give away — and only if the license permits.' },
  { key:'standing',     name:'Your standing instructions to residents', state:'private', leaves:'Never. They only shape what a resident on this machine is told.' },
  { key:'myLessons',    name:'Lessons you wrote yourself', state:'private', leaves:'Only if you publish one at the Commons Table.' },
  { key:'catalogEdits', name:'Your corrections to library cards', state:'private', leaves:'Only if you export them from the Steward’s Index to fold back into the source.' },
  { key:'myShelves',    name:'Your own shelf names',     state:'private', leaves:'Never. How you organise your library is nobody else’s business.' },
  { key:'commons',      name:'The Commons Table',       state:'commons', leaves:'This is the shared shelf: what you received, and what you published.' },
  /* The chapter names you typed yourself. Added to this map 2026-08-07: it
     had been saved since the Study Table was built and listed nowhere, so
     the privacy line was short by one store — and by the one holding your
     own words about how a book is divided. */
  { key:'bookMarks',    name:'Chapters you marked yourself', state:'private', leaves:'Never — not unless you hand a book on with them.' },
  /* The path you picked up. Declared 2026-08-07, when a new guard found that
     lesson-tree.js had been writing it to a store freshData() never mentioned
     — so it was in neither list, which is precisely the gap the older guard
     could not see. */
  { key:'study',        name:'The path you picked up',  state:'private', leaves:'Never. What you chose to work on is yours.' },
  /* The backpack. It holds REFERENCES to things you already own, so it can
     never leak anything the thing itself would not — but it is also the one
     store a resident is allowed to read (data/lookup.js), which is exactly
     why it has to be listed and said plainly. */
  { key:'carrying',     name:'Your backpack',           state:'private', leaves:'Never on its own. What you carry is what a resident may see — and only while you carry it.' },
  { key:'activityLog',  name:'Activity log',            state:'private', leaves:'Never.' },
  { key:'badges',       name:'Badges',                  state:'private', leaves:'Never.' },
  { key:'aiConnections',name:'Your AI connections',     state:'private', leaves:'Never. Keys and addresses stay on this device.' },
];
