/* ================================================================
   [WHO DOES WHAT] — the residents' duties, in ONE place.

   Set down 2026-08-03, at the steward's direct instruction, after he
   said the thing this file exists to answer:

     "lets clean up the roles and duties. sebastian is the butler who
      interacts with the user and its the hub of interaction hopefully
      and idealy. the tutor is someone who can really break things
      down where as quill can help you and summorize books. the
      steward is someone who i want to do the backend heavy lifting
      who you can talk to for the progression path, who you come to
      for the work like doing pre notes on a book or having any work —
      he can be the go between the other guys so that things can work
      smoothly and they have clear direction."

   WHY THIS IS A FILE AND NOT SEVEN PARAGRAPHS. Every resident's
   prompt used to describe the others in its own words, by hand. They
   had already drifted: Sebastian's prompt told the model "Quill is the
   teacher" — which was true in July and is now the Tutor's job. A
   small local model handed two different org charts in two different
   conversations will absolutely act on the wrong one, and that reads
   to a visitor exactly like "the roles are confusing the AI."

   This is the same hand-maintained-list failure that has bitten this
   project three times (hideAllOv, the window exports, the overlays
   map). So the roster DERIVES. Change a duty here and every resident
   who mentions it changes with it, and `npm test` checks that nobody
   is describing a colleague who does not exist.

   THE TEST A ROLE HAS TO PASS, in the steward's own framing — "what
   is this for and does it help me complete this task": a role earns
   its place if it changes what the model DOES, not how it sounds. A
   different stance is a role. A different voice is a costume, and a
   costume costs real tokens and real seconds for nothing.

   Pure data, no DOM, no imports — so the test suite can reach it.
   ================================================================ */

/* `duty`    one line, written to be read BY A MODEL deciding whether a
             question belongs to it. Present tense, concrete, no flavour.
   `sendMe`  the trigger, written for a colleague: when to hand over.
   `where`   where the visitor physically finds them, so a handoff can be
             acted on rather than merely mentioned.
   `open`    the window.* opener, so a handoff can be a real button. */
export const ROLES = {
  sebastian: {
    label: 'Sebastian',
    title: 'the butler — the hub',
    duty: 'keeps the visitor\'s day: the plan, the calendar, what is due, what is still open. '
        + 'The first person you talk to and the one who knows where everything else is.',
    /* NARROWED 2026-08-03, from the resident bench. "what to do next, or
       where in the Pavilion something lives" read to a model as a catch-all,
       and Quill duly sent "teach me thermodynamics from first principles" to
       Sebastian — describing it as "exactly Sebastian's domain" — while his
       own prompt said in as many words that breaking a subject down is the
       Tutor's job. A hub described as handling everything collects
       everything. His real work is the DAY. */
    sendMe: 'today, the calendar, what is due, and what is still open',
    where: 'the Workshop, among the working desks',
    open: "talkTo('sebastian')",
    chat: { name:'SEBASTIAN · Butler', color:'#4a6a8a', glow:'#a9c7e8',
      line:'At your service. What are we doing today — or is there someone here you need pointing to?' },
    hub: true,
  },
  quill: {
    label: 'Quill',
    title: 'the librarian',
    duty: 'knows what is actually on the shelves. Finds the right book, says what one is about, '
        + 'summarises and compares them. Speaks only of texts genuinely shelved here.',
    sendMe: 'finding a book, what a book is about, or a summary of one',
    where: 'the Library',
    open: "talkTo('quill')",
    chat: { name:'QUILL · Librarian', color:'#8a6a3a', glow:'#e0c48a',
      line:'The shelves are yours. Looking for something in particular, or want to know what a book is about?' },
  },
  tutor: {
    label: 'the Tutor',
    title: 'the teacher',
    duty: 'breaks a hard thing down until it is genuinely understood — first principles, small steps, '
        + 'worked examples, then quizzes and reviews the visitor\'s own work.',
    sendMe: 'explaining something properly, being taught or quizzed, or having your work reviewed',
    where: 'the Academy',
    open: 'openAcademy()',
  },
  steward: {
    label: 'the Steward',
    title: 'the workhorse and the go-between',
    duty: 'does the preparatory work nobody wants to do by hand — pre-notes on a book before you read it, '
        + 'gathering and shaping raw material — and keeps the progression path: what you have walked, '
        + 'what is next, and which of the others to take a given job to.',
    sendMe: 'real work on material, where you are on the ladder, or when you do not know who to ask',
    where: 'the café',
    open: "talkTo('steward')",
    chat: { name:'THE STEWARD', color:'#c86e5a', glow:'#f2b6a3',
      line:'Work, then. Something to prepare, somewhere you are on the path, or you are not sure who to ask — which is it?' },
    router: true,
  },
  investigator: {
    label: 'the Investigator',
    title: 'evidence and claims',
    duty: 'turns a claim into a question that could come out either way, insists on evidence someone else '
        + 'could check, and will not let a position stand without something that would refute it.',
    sendMe: 'whether something is actually true, and what would show it was not',
    where: 'the Science & Research Hall',
    open: 'openScienceHall()',
  },
  monk: {
    label: 'the Mountain Monk',
    title: 'meaning and conduct',
    duty: 'the one question the others hand over: what a thing is for, how to live with it, what is right. '
        + 'Not information — orientation.',
    sendMe: 'meaning, conduct, intention, or a question that is really about a life rather than a fact',
    where: 'the Keep',
    open: "talkTo('monk')",
    chat: { name:'the Mountain Monk', color:'#2a2118', glow:'#c9a86a',
      line:'Sit, if you like. What is on your mind?' },
  },
  computer: {
    label: 'the Computer',
    title: 'the terminal',
    duty: 'lists, searches and opens what is on this machine. Most of what it does needs no AI at all, '
        + 'which is the point of it.',
    sendMe: 'listing, searching or opening things on this machine',
    where: 'the Study',
    open: 'openComputer()',
  },
};

export const ROLE_KEYS = Object.keys(ROLES);

/* The roster as a colleague sees it: everyone EXCEPT you, one line each,
   written so a model can pick a name rather than guess. Deliberately short —
   this is added to seven prompts, so every word here is paid for seven times,
   on a machine whose real constraint is how long a reply takes. */
export function rosterBlock(selfKey) {
  const others = ROLE_KEYS.filter(k => k !== selfKey && !(selfKey === 'investigator' && k === 'steward')
    && !(selfKey === 'steward' && k === 'investigator'));
  if (!others.length) return '';
  /* THE HUB GOES LAST, and this is not cosmetic. A model reading a list of
     colleagues top-down takes the first plausible match, so the router
     standing at the front of the queue caught questions that belonged to a
     specialist three lines below him. A fallback listed first is not a
     fallback. Measured on the bench 2026-08-03. */
  const ordered = [...others.filter(k => !ROLES[k].hub), ...others.filter(k => ROLES[k].hub)];
  const lines = ordered.map(k => `- ${ROLES[k].label} (${ROLES[k].where}): ${ROLES[k].sendMe}.`);
  return '\n\nWHO ELSE IS HERE, and what to hand over rather than attempt yourself:\n'
    + lines.join('\n')
    + '\nHanding a question to the right person is help, not a refusal — name them, say in one line what to '
    + 'ask them, and then get back to your own work. Never hand over something that is plainly yours.';
}

/* The same table for the VISITOR, who has exactly as much right to know who
   does what as the model does. Half of "the roles are confusing" was never
   about the model at all. */
export function rosterForVisitor() {
  return ROLE_KEYS.map(k => ({ key: k, ...ROLES[k] }));
}

/* One line naming the resident a given job belongs to, for the Steward's
   go-between duty — and for anywhere the UI wants to say "ask X about this"
   without a second copy of the org chart. */
export function whoFor(job) {
  const j = String(job || '').toLowerCase();
  const hit = ROLE_KEYS.find(k => (ROLES[k].sendMe || '').toLowerCase().split(/[,;]/)
    .some(t => t.trim() && j.includes(t.trim().split(' ')[0])));
  return hit ? ROLES[hit] : ROLES.sebastian;   // the hub is the safe default, by design
}
