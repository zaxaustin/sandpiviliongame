/* ================================================================
   [PLACES] — every room in the Pavilion, and the one keystroke to it.

   THE STANDING DECISION THIS FILE EXISTS TO KEEP:

     "nothing may be a dead end ... ONE KEYSTROKE TO ANYWHERE beats a
      beautiful room you must walk to (built and unreachable is the same
      as unbuilt — learned with the Lab)."

   MEASURED 2026-08-10, BEFORE THIS FILE EXISTED: the pause menu reached
   about twenty-five PANELS and named NOT ONE ROOM. Eleven room openers
   were exported and listed nowhere —

     openCommonsTable  openInheritanceHall  openGrantDesk  openCoffee
     openIndex  openCatalog  openRequests  openScienceHall  openComputer
     openPlanner  openCalendar

   — so the Commons Table, the Inheritance Hall, the Science Hall, the
   Writing Desk, the Request Board and the pond were reachable ONLY by
   remembering where they are and walking there. That is the Lab's bug,
   eleven times over, and it had been true for months.

   A TWELFTH WAS WORSE. openArchive() is exported from overlays.js and is
   on NO window at all — the Archive Desk could not be opened by a click
   from anywhere in the application. Only main.js's keyboard handler could
   reach it. Found by building this table, which is the whole argument for
   having one.

   WHY A TABLE AND NOT A LIST IN THE MENU. A hand-written list that must
   match another file is CLAUDE.md rule 4, and it has drifted in this
   repository three separate times — hideAllOv(), the window exports, and
   the overlays map. So the menu is DERIVED from here, and test/smoke.mjs
   crosses this table against scenes.js in BOTH directions: a station in
   the world with no entry fails, and an entry naming a station that is not
   there fails too. The dead `mission` place in carrying.js sat unnoticed
   for weeks precisely because its guard only ever ran one way.

   PURE DATA. No imports, no DOM — the section headings come from
   scenes[key].name at render time rather than being spelled a second time
   here, which is the same reason there is no `label` for a room.
   ================================================================ */

/* Every place you can open, keyed by an id of its own.

     icon     what it shows in the menu
     label    what it is called there
     door     the window export a click calls — checked against the real
              export block by npm test, so a listed room cannot be a dud
              button (the project's oldest and most-repeated gotcha)
     scene    which room it physically stands in — the section it files
              under, and what makes moving a room to a second Grounds a
              one-field edit rather than a hunt
     station  the station KIND in that scene, when you can walk up to it
              and press E. null means it is a panel with no furniture, and
              then `note` has to say where it really is. */
export const PLACES = {
  /* `dialog: true` — this room is a scripted beat, not a workspace: it opens
     the world's dialog box rather than a panel. Marked because the difference
     is real and was invisible. Opening one from the pause menu showed the
     dialog UNDERNEATH the still-open menu, with state.ui stuck on 'menu' so E
     could not advance it — four menu buttons that appeared to do nothing. See
     openDialog() in ui/overlays.js; npm test now holds the fix. */
  hearth: { icon: '🔥', label: 'The Hearth', door: 'openHearth',
    scene: 'works', station: 'hearth', dialog: true },

  yourshelf: { icon: '📕', label: 'Your Shelf', door: 'openMyLibrary',
    scene: 'library', station: 'yourshelf' },
  intake: { icon: '📥', label: 'Bring a book in', door: 'openBookIntake',
    scene: 'library', station: 'intake' },
  index: { icon: '🗂', label: 'The Index', door: 'openIndex',
    scene: 'library', station: null,
    note: 'the whole collection as one list — no desk, it is the shelves themselves' },
  catalog: { icon: '📇', label: 'The Catalogue', door: 'openCatalog',
    scene: 'library', station: null,
    note: 'what each book actually is, shelf by shelf' },

  planner: { icon: '✍', label: 'The Writing Desk', door: 'openPlanner',
    scene: 'study', station: 'planner' },
  courses: { icon: '📋', label: 'The Course Board', door: 'openCourses',
    scene: 'study', station: 'courses' },
  tree: { icon: '🌳', label: 'The Learning Tree', door: 'openLearningTree',
    scene: 'study', station: 'tree' },
  notes: { icon: '🗒', label: 'Your Notes', door: 'openNotesLog',
    scene: 'study', station: 'notes' },
  computer: { icon: '🖥', label: 'The Computer', door: 'openComputer',
    scene: 'study', station: 'computer' },
  requests: { icon: '📌', label: 'The Request Board', door: 'openRequests',
    scene: 'study', station: 'requests' },

  archive: { icon: '🗄', label: 'The Archive Desk', door: 'openArchive',
    scene: 'workshop', station: 'archive' },
  research: { icon: '🔎', label: 'The Research Desk', door: 'openResearchDesk',
    scene: 'workshop', station: 'research' },
  review: { icon: '🐫', label: 'The Caravan Desk', door: 'openReviewQueue',
    scene: 'workshop', station: 'review' },
  calendar: { icon: '📅', label: "Sebastian's Calendar", door: 'openCalendar',
    scene: 'workshop', station: 'calendar' },

  records: { icon: '📜', label: 'The Records Hall', door: 'openRecordsHall',
    scene: 'workshopfloor2', station: 'records' },

  lab: { icon: '🔬', label: 'The Lab', door: 'openLab',
    scene: 'workshopfloor3', station: 'makersbench' },
  hall: { icon: '🧪', label: 'The Science & Research Hall', door: 'openScienceHall',
    scene: 'workshopfloor3', station: null,
    note: 'the Lab’s larger room — the bench, the experiments and the investigations' },

  notice: { icon: '📰', label: 'The Notice Board', door: 'openNoticeBoard',
    scene: 'cafe', station: 'notice', dialog: true },
  residents: { icon: '👥', label: "The Residents' Board", door: 'openResidentsBoard',
    scene: 'cafe', station: 'residents', dialog: true },
  grantdesk: { icon: '💰', label: 'The Grant Desk', door: 'openGrantDesk',
    scene: 'cafe', station: 'grantdesk' },
  coffee: { icon: '☕', label: 'The Counter', door: 'openCoffee',
    scene: 'cafe', station: 'coffee', dialog: true },
  commons: { icon: '🏛', label: 'The Commons Table', door: 'openCommonsTable',
    scene: 'cafe', station: 'commons' },

  inheritance: { icon: '🗿', label: 'The Record Stone', door: 'openInheritanceHall',
    scene: 'grove', station: 'inheritance' },
  alexandria: { icon: '🏚', label: 'The Alexandria Stone', door: 'openAlexandria',
    scene: 'grove', station: 'alexandria' },
};

export const PLACE_KEYS = Object.keys(PLACES);

/* THE ORDER THE MENU LISTS ROOMS IN. Checked to cover exactly the scenes
   PLACES names — no more and no fewer — so a new room cannot be added to
   the table and then quietly not appear. */
export const SCENE_ORDER = [
  // THE PAVILION — where you study alone
  'library', 'study',
  // THE WORKS — where you make, meet, give and rest (2026-08-10)
  'works', 'workshop', 'workshopfloor2', 'workshopfloor3', 'cafe', 'grove',
];

/* STATIONS THAT ARE DELIBERATELY NOT PLACES, each with the reason said
   out loud. Rule 6: a room that is absent says why, and does not simply
   go missing. npm test requires every station kind in scenes.js to be
   either a PLACES entry or named here — the direction that was never
   checked, and the direction the dead `mission` place hid in. */
export const NOT_A_PLACE = {
  lift: 'a way between floors, not a floor — it only means anything from inside the Workshop',
  ledger: 'framing, not open yet — a menu door onto "not open yet" is a dead end with a button on it',
  greenhouse: 'framing, not open yet',
  roundtable: 'framing, not open yet',
  mailroom: 'framing, not open yet',
};

/* SCENES WITH NO PANEL AT ALL, same rule. A room is allowed to be a room
   you sit in rather than a thing you open — but it has to say so here,
   so that a real room going doorless can never pass as one of these. */
export const SCENE_WITHOUT_PLACES = {
  overworld: 'the Pavilion Grounds are the road between the Keep, the Library and the Study, '
    + 'and each of those has its own heading — the hearth moved to the Works with the Cafe it belongs to',
  keep: 'people and the eight folds, not furniture — 👥 Who to ask opens the Grand Master directly',
  libraryfloor2: 'shelves you face and press E; the Index and the Catalogue are the panel version of them',
  librarybasement: 'the Pavilion’s one real secret — a menu door would be a spoiler, not a fix',
};

/* The menu, grouped, ready to render. Takes the scene table so the room
   headings are the rooms’ own names rather than a second spelling of
   them, and so a scene that has quietly stopped existing shows up as a
   heading of "???" instead of being silently dropped. */
export function placesByScene(scenes) {
  return SCENE_ORDER.map(key => ({
    scene: key,
    name: (scenes && scenes[key] && scenes[key].name) || '???',
    items: PLACE_KEYS.filter(k => PLACES[k].scene === key).map(k => ({ id: k, ...PLACES[k] })),
  })).filter(g => g.items.length);
}

/* Every door the menu will call, for the export check. */
export function placeDoors() {
  return PLACE_KEYS.map(k => PLACES[k].door);
}
