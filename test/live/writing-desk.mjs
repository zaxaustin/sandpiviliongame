/* THE WRITING DESK — WRITING-DESK-PLAN.md, driven in a real browser.
   Needs `npm run preview` (dist/ on :4173).

   The one thing here that could not be checked any cheaper: THE PICKER
   DERIVES. roles.js is the org chart, and every hand-maintained copy of it
   in this repo has drifted — hideAllOv, the window exports, Sebastian's own
   prompt telling a model "Quill is the teacher" months after that stopped
   being true. So this test reads roles.js in node, reads the desk in Chrome,
   and fails if they disagree. Add a resident to roles.js with a chat prompt
   and this test tells you the moment the desk does not have them.

   The thread checks need a live local AI and are SKIPPED LOUDLY without one
   — the suite still has to pass on a machine with nothing running, which is
   the whole shape of the shipped beta. */
import puppeteer from 'file:///C:/Users/resto/Desktop/projects/sand%20pavilion%20game/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { readFileSync } from 'node:fs';
import { ROLES, ROLE_KEYS } from '../../src/game/data/roles.js';

/* A REAL excerpt from a book the steward brought in himself, not a synthetic
   string. The first version of this test used 'one line\n'.repeat(400) and the
   book paginated to a single page — paginate() splits on BLANK lines, so a
   text with none is one long page, and every page assertion below passed
   without being able to fail. That is the exact "guard born dead" this
   project keeps writing. A real text has real paragraphs and real chapters. */
const BOOK = readFileSync(new URL('../fixtures/chapters/numerals-discourses.txt', import.meta.url), 'utf8');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0, skipped = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};
const skip = (name, why) => { console.log('  skip ' + name + '  — ' + why); skipped++; };

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1050, height: 950 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

/* A player-added book in the save, not a seed one — the standing rule in
   CLAUDE.md. Nothing in step 1 reads it; step 2 (the pocketed book) will,
   and a test that starts from the real shape does not have to be rewritten. */
await p.evaluateOnNewDocument((t) => localStorage.setItem('sandPavilionSave.v2', JSON.stringify({
  /* aiConnections deliberately NOT overridden — the default save carries the
     built-in Ollama connection, so the thread checks below run for real on a
     machine that has one, and skip themselves loudly on one that does not. */
  seenWelcome: true,
  personalLibrary: [{
    slug: 'personal-discourses-of-epictetus', title: 'Discourses Of Epictetus',
    tradition: 'Personal', personal: true, license: '', added: '2026-08-03',
    category: 'personal', attribution: 'Epictetus',
    doc: { summary: '', sections: [], fullText: { text: t } },   // NO sections — the real shape
  }],
})), BOOK);
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));

console.log('\nThe Writing Desk — who is at it\n');

/* ---- the picker, read out of the running desk ---- */
const desk = await p.evaluate(async () => {
  openPlanner();
  await new Promise(r => setTimeout(r, 250));
  togglePlannerTool('assist');
  await new Promise(r => setTimeout(r, 400));
  const body = document.getElementById('planToolBody');
  const picker = body ? body.querySelector('.row') : null;
  const btns = picker ? [...picker.querySelectorAll('button')] : [];
  return {
    labels: btns.map(x => x.textContent.replace(/\s*•\s*$/, '').trim()),
    keys: btns.map(x => (/setDeskAgent\('([^']+)'\)/.exec(x.getAttribute('onclick') || '') || [])[1]),
    active: btns.filter(x => !x.className.includes('ghost')).map(x => x.textContent.trim()),
    toolboxLabel: [...document.querySelectorAll('#planToolbox button')].map(x => x.textContent.replace(/^\S+\s*/, '').trim())
      .find(t => /^Ask /.test(t)) || null,
    aiOn: !!document.getElementById('planAskInput'),
    quickStart: (document.querySelectorAll('#planToolBody .row')[1] || { querySelector: () => null })
      .querySelector('button') ? {
        label: document.querySelectorAll('#planToolBody .row')[1].querySelector('button').textContent.trim(),
        prompt: document.querySelectorAll('#planToolBody .row')[1].querySelector('button').getAttribute('onclick') || '',
      } : null,
    placeholder: (document.getElementById('planAskInput') || {}).placeholder || '',
    meta: body ? body.textContent.slice(0, 300) : '',
  };
});

ok('every resident in roles.js is at the desk',
  desk.keys.length === ROLE_KEYS.length && ROLE_KEYS.every(k => desk.keys.includes(k)),
  `roles.js has ${ROLE_KEYS.length} (${ROLE_KEYS.join(', ')}); the desk offers ${desk.keys.length} (${desk.keys.join(', ')})`);

ok('the desk offers nobody roles.js does not have',
  desk.keys.every(k => ROLE_KEYS.includes(k)),
  desk.keys.filter(k => !ROLE_KEYS.includes(k)).join(', ') || 'none extra');

ok('the buttons carry the labels from roles.js',
  desk.keys.every((k, i) => desk.labels[i] === ROLES[k].label),
  desk.keys.map((k, i) => desk.labels[i] === ROLES[k].label ? null : `${k}: "${desk.labels[i]}" ≠ "${ROLES[k].label}"`)
    .filter(Boolean).join('; ') || 'all match');

const hub = ROLE_KEYS.find(k => ROLES[k].hub);
ok('the hub is who is sitting there when you open it',
  desk.active.length === 1 && desk.active[0].replace(/\s*•\s*$/, '').trim() === ROLES[hub].label,
  `expected ${ROLES[hub].label}, got ${JSON.stringify(desk.active)}`);

ok('the toolbox button says WHO is at the desk',
  desk.toolboxLabel === 'Ask ' + ROLES[hub].label,
  JSON.stringify(desk.toolboxLabel));

ok('the desk says what the one who is here is for',
  desk.meta.includes(ROLES[hub].sendMe.slice(0, 30)),
  desk.meta.slice(0, 120).replace(/\s+/g, ' '));

/* Found by screenshotting the desk with the Tutor at it and looking: three
   day-planning quick starts sat under her, unchanged. Not an error, not a
   crash — just quietly the wrong thing, which is what this house keeps
   shipping. It is a check now. */
/* IT ONLY EXISTS WITH AN AI CONNECTED. renderPlannerAssistBody() is
   `el.innerHTML = aiOn ? <picker + quick starts + ask box> : <the off state>`,
   so with Ollama down there is no quick start to follow anybody, and this went
   red for a reason that has nothing to do with what it tests. Found
   2026-08-09. The two threading checks below already skipped for exactly this;
   hard-failing here and skipping there taught nobody anything except to stop
   reading the result. */
if (!desk.aiOn) {
  skip('the quick start follows whoever is at the desk',
       'no local AI connected — the desk renders its off state, quick starts and all');
} else {
  ok('the quick start follows whoever is at the desk',
    !!desk.quickStart && desk.quickStart.label.includes(ROLES[hub].label)
      && desk.quickStart.prompt.includes(ROLES[hub].sendMe.slice(0, 25)),
    desk.quickStart ? desk.quickStart.label : 'no quick start rendered');
}

/* ---- calling someone else over ---- */
const other = ROLE_KEYS.find(k => k !== hub);
const swap = await p.evaluate(async (k) => {
  setDeskAgent(k);
  await new Promise(r => setTimeout(r, 300));
  const body = document.getElementById('planToolBody');
  const btns = [...body.querySelector('.row').querySelectorAll('button')];
  return {
    active: btns.filter(x => !x.className.includes('ghost')).map(x => x.textContent.replace(/\s*•\s*$/, '').trim()),
    toolboxLabel: [...document.querySelectorAll('#planToolbox button')].map(x => x.textContent.replace(/^\S+\s*/, '').trim())
      .find(t => /^Ask /.test(t)) || null,
    quickStart: (document.querySelectorAll('#planToolBody .row')[1] || { querySelector: () => null })
      .querySelector('button') ? {
        label: document.querySelectorAll('#planToolBody .row')[1].querySelector('button').textContent.trim(),
        prompt: document.querySelectorAll('#planToolBody .row')[1].querySelector('button').getAttribute('onclick') || '',
      } : null,
    placeholder: (document.getElementById('planAskInput') || {}).placeholder || '',
    meta: body.textContent.slice(0, 300),
  };
}, other);

ok('calling someone over actually swaps who is there',
  swap.active.length === 1 && swap.active[0] === ROLES[other].label,
  JSON.stringify(swap.active));

ok('the toolbox button follows them',
  swap.toolboxLabel === 'Ask ' + ROLES[other].label, JSON.stringify(swap.toolboxLabel));

ok('the desk now says what THEY are for',
  swap.meta.includes(ROLES[other].sendMe.slice(0, 30)),
  swap.meta.slice(0, 120).replace(/\s+/g, ' '));

if (!desk.aiOn) {
  skip('and the quick start is now THEIR job', 'no local AI connected — see above');
} else {
  ok('and the quick start is now THEIR job',
    !!swap.quickStart && swap.quickStart.label.includes(ROLES[other].label)
      && swap.quickStart.prompt.includes(ROLES[other].sendMe.slice(0, 25)),
    swap.quickStart ? swap.quickStart.label : 'no quick start rendered');
}

/* ---- one at a time: the threads must not bleed ---- */
if (!desk.aiOn) {
  skip('each resident keeps their own thread', 'no local AI connected — nothing can be asked');
  skip('a thread survives calling someone else over', 'no local AI connected');
} else {
  const threads = await p.evaluate(async (a, bKey) => {
    const ask = async (agent, q) => {
      setDeskAgent(agent);
      await new Promise(r => setTimeout(r, 200));
      document.getElementById('planAskInput').value = q;
      await sendPlannerMessage();
      await new Promise(r => setTimeout(r, 300));
    };
    await ask(a, 'Reply with the single word: ready.');
    const aCount = document.querySelectorAll('#planAskHistory .card').length;
    setDeskAgent(bKey);
    await new Promise(r => setTimeout(r, 300));
    const bCount = document.querySelectorAll('#planAskHistory .card').length;
    setDeskAgent(a);
    await new Promise(r => setTimeout(r, 300));
    const backCount = document.querySelectorAll('#planAskHistory .card').length;
    const names = [...document.querySelectorAll('#planAskHistory .card .t')].map(x => x.textContent.trim());
    const dotted = [...document.getElementById('planToolBody').querySelector('.row').querySelectorAll('button')]
      .filter(x => /•/.test(x.textContent))
      .map(x => (/setDeskAgent\('([^']+)'\)/.exec(x.getAttribute('onclick') || '') || [])[1]);
    return { aCount, bCount, backCount, names, dotted };
  }, hub, other);

  ok('each resident keeps their own thread',
    threads.aCount >= 2 && threads.bCount === 0,
    `${ROLES[hub].label} had ${threads.aCount} cards, ${ROLES[other].label} had ${threads.bCount}`);

  ok('a thread survives calling someone else over',
    threads.backCount === threads.aCount,
    `${threads.aCount} → ${threads.backCount}`);

  ok('the reply is attributed to the resident who gave it',
    threads.names.includes(ROLES[hub].label), JSON.stringify(threads.names));

  ok('the picker marks who you have already spoken to',
    threads.dotted.length === 1 && threads.dotted[0] === hub, JSON.stringify(threads.dotted));
}

/* ---- the book in front of you ---- */
console.log('\nThe book in front of you\n');

const empty = await p.evaluate(async () => {
  togglePlannerTool('book');
  await new Promise(r => setTimeout(r, 300));
  const body = document.getElementById('planToolBody');
  return {
    text: body.textContent.replace(/\s+/g, ' ').trim(),
    doors: [...body.querySelectorAll('button')].map(x => x.getAttribute('onclick')),
    title: document.querySelector('#planToolPanel h3').textContent.trim(),
  };
});
ok('an empty desk says so', /Nothing on the desk yet/.test(empty.text), empty.text.slice(0, 80));
ok('and is not a dead end — it carries the doors to a book',
  empty.doors.some(d => /openMyLibrary|openIndex/.test(d || '')), JSON.stringify(empty.doors));

/* Pocket a REAL player-added book, deep in it, then walk to the desk. */
const pocketed = await p.evaluate(async () => {
  const slug = 'personal-discourses-of-epictetus';
  closeUI();
  openReader(slug);
  await openFullText(slug);
  for (let i = 0; i < 3; i++) fullTextNextPage();
  const shown = document.getElementById('rdFullTextPageNum')?.textContent || '';
  minimizeReader();
  await new Promise(r => setTimeout(r, 250));
  openPlanner();
  await new Promise(r => setTimeout(r, 250));
  togglePlannerTool('book');
  await new Promise(r => setTimeout(r, 350));
  const body = document.getElementById('planToolBody');
  return {
    readerPage: shown,
    pageCount: (/of\s+(\d+)/.exec(shown) || [])[1] || '0',
    pageNum: (/Page\s+(\d+)/.exec(shown) || [])[1] || '0',
    panelTitle: document.querySelector('#planToolPanel h3').textContent.trim(),
    toolboxLabel: [...document.querySelectorAll('#planToolbox button')].map(x => x.textContent.trim())
      .find(t => /Epictetus/i.test(t)) || null,
    where: body.querySelector('.meta')?.textContent.trim() || '',
    hasNoteBox: !!document.getElementById('deskNoteInput'),
  };
});
/* If this book were one page long, every "the right page" check below would
   pass no matter what the code did. Assert the subject is real first. */
ok('the fixture is a real multi-page book', Number(pocketed.pageCount) > 5,
  `${pocketed.pageCount} pages, sitting on ${pocketed.pageNum}`);
ok('walking forward actually moved off page 1', Number(pocketed.pageNum) === 4, pocketed.readerPage);

ok('the pocketed book is on the desk', /Discourses Of Epictetus/i.test(pocketed.panelTitle), pocketed.panelTitle);
ok('the toolbox button names the book you are carrying', !!pocketed.toolboxLabel, JSON.stringify(pocketed.toolboxLabel));
ok('the desk knows the page you walked over with',
  pocketed.where.includes('p. ' + pocketed.pageNum), `${pocketed.where} (reader said ${pocketed.readerPage})`);
ok('it names the author read out of the file', /Epictetus/.test(pocketed.where), pocketed.where);
ok('there is somewhere to write about it', pocketed.hasNoteBox);

const wrote = await p.evaluate(async () => {
  document.getElementById('deskNoteInput').value = 'Assent is the only thing wholly ours.';
  deskAddNote();
  await new Promise(r => setTimeout(r, 400));
  const body = document.getElementById('planToolBody');
  const card = body.querySelector('.card');
  return {
    msg: document.getElementById('deskNoteMsg')?.textContent || '',
    stamp: card?.querySelector('.s')?.textContent.trim() || '',
    text: card?.textContent || '',
    doors: [...(card?.querySelectorAll('button') || [])].map(x => x.textContent.trim()),
    key: (/openBookAtNote\('([^']+)'\)/.exec(card?.innerHTML || '') || [])[1] || null,
    cleared: document.getElementById('deskNoteInput').value === '',
  };
});
ok('a note written at the desk is kept', /Assent is the only thing wholly ours/.test(wrote.text), wrote.text.slice(0, 90));
ok('and it records the page it was written on — the RIGHT page',
  wrote.stamp.includes('p. ' + pocketed.pageNum), `${wrote.stamp} (was on p. ${pocketed.pageNum})`);
ok('the box clears after keeping it', wrote.cleared);
ok('the desk confirms it out loud', /kept/.test(wrote.msg), JSON.stringify(wrote.msg));
ok('the note carries the same doors as everywhere else',
  wrote.doors.some(d => /Open the book here/.test(d)) && wrote.doors.some(d => /today/i.test(d)),
  JSON.stringify(wrote.doors));

/* THE KEY IS THE JOINT. A desk-built key that gatherNotes() would not
   recognise gives two buttons that silently do nothing — so follow it. */
const followed = await p.evaluate(async (k) => {
  /* WALK AWAY FIRST. Without this the reader is already sitting on the page
     the note was written on, so "it landed on the right page" passes even
     when the note carries no page at all — proved by breaking it. */
  openReader('personal-discourses-of-epictetus');
  await openFullText('personal-discourses-of-epictetus', 0);
  await new Promise(r => setTimeout(r, 200));
  const walkedTo = document.getElementById('rdFullTextPageNum')?.textContent || '';
  await openBookAtNote(k);
  await new Promise(r => setTimeout(r, 800));
  return {
    walkedTo,
    slug: currentDocSlug(),
    page: document.getElementById('rdFullTextPageNum')?.textContent || '',
    readerOpen: !!document.querySelector('#readerOv.open'),
  };
}, wrote.key);
ok('the test walked away from the page first, so landing there means something',
  followed.walkedTo === 'Page 1 of ' + pocketed.pageCount, followed.walkedTo);
ok('“Open the book here” actually opens the book',
  followed.readerOpen && followed.slug === 'personal-discourses-of-epictetus',
  JSON.stringify(followed));
ok('and lands on the exact page the note was written on',
  followed.page === 'Page ' + pocketed.pageNum + ' of ' + pocketed.pageCount,
  `${followed.page} — expected page ${pocketed.pageNum}`);

/* ---- older notes at the desk ---- */
console.log('\nYour older notes, at the desk\n');

const older = await p.evaluate(async () => {
  closeUI(); openPlanner();
  await new Promise(r => setTimeout(r, 250));
  togglePlannerTool('notes');
  await new Promise(r => setTimeout(r, 400));
  const body = document.getElementById('planToolBody');
  const heads = [...body.querySelectorAll('h4')].map(x => x.textContent.trim());
  const cards = [...body.querySelectorAll('.card')];
  return {
    heads,
    text: body.textContent.replace(/\s+/g, ' '),
    firstCardDoors: [...(cards[0]?.querySelectorAll('button') || [])].map(x => x.textContent.trim()),
    opensNote: body.innerHTML.includes('openNotesLog('),
    opensBook: body.innerHTML.includes('openBookAtNote('),
    stillHasCabinet: body.innerHTML.includes('createNote()'),
  };
});
ok('the desk gathers what you wrote lately', older.heads.includes('Lately'), JSON.stringify(older.heads));
ok('and the note written a moment ago is in it',
  /Assent is the only thing wholly ours/.test(older.text), older.text.slice(0, 100));
ok('every gathered note opens somewhere', older.opensNote && older.opensBook,
  `openNotesLog:${older.opensNote} openBookAtNote:${older.opensBook}`);
ok('the filing cabinet is still there — this is a reader, not a replacement', older.stillHasCabinet);

/* The resurfacing rule is shared with ☀ Today, so prove the DESK asks it,
   with a note old enough to qualify. */
const resurfaced = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
await p.evaluate(async (old) => {
  /* write it straight into the save the way an old note actually looks, then
     reopen the desk so the panel is built fresh from gatherNotes() */
  const raw = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  raw.notes = raw.notes || [];
  raw.notes.push({ id: 'old-note-1', title: 'An old thought', created: old, updated: old,
    body: 'Something I wrote weeks ago and have not looked at since, long enough to count.' });
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify(raw));
  return old;
}, resurfaced);

/* CLAUDE.md rule 6 — a reload re-fires evaluateOnNewDocument and would wipe
   the save just written. Carry it to a SECOND page instead. */
const p2 = await b.newPage();
const errs2 = [];
p2.on('pageerror', e => errs2.push(e.message));
await p2.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p2.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));
const surfaced = await p2.evaluate(async () => {
  openPlanner();
  await new Promise(r => setTimeout(r, 250));
  togglePlannerTool('notes');
  await new Promise(r => setTimeout(r, 400));
  const body = document.getElementById('planToolBody');
  return {
    heads: [...body.querySelectorAll('h4')].map(x => x.textContent.trim()),
    text: body.textContent.replace(/\s+/g, ' '),
  };
});
ok('a note not looked at in weeks comes back at the desk',
  surfaced.heads.includes('Worth another look') && /An old thought|weeks ago and have not looked/.test(surfaced.text),
  JSON.stringify(surfaced.heads));
ok('and it says how long it has been', /\d+ days ago/.test(surfaced.text),
  (/(\d+ days ago)/.exec(surfaced.text) || [])[1] || surfaced.text.slice(0, 90));

/* ---- the lesson draft, surfaced where the work happens ---- */
console.log('\nA lesson drafted in notes, before the wall\n');

const draftDoor = await p.evaluate(async () => {
  togglePlannerTool('book');
  await new Promise(r => setTimeout(r, 350));
  const body = document.getElementById('planToolBody');
  return {
    hasDraft: [...body.querySelectorAll('button')].some(x => /Draft a lesson/.test(x.textContent)),
    call: body.innerHTML.includes('deskDraftLesson()'),
  };
});
ok('the drafting chain is visible from the book on the desk',
  draftDoor.hasDraft && draftDoor.call, JSON.stringify(draftDoor));

if (!desk.aiOn) {
  skip('a draft lands in a NOTE, not on the wall', 'no local AI connected');
} else {
  const drafted = await p.evaluate(async () => {
    const treeBefore = (JSON.parse(localStorage.getItem('sandPavilionSave.v2')).myLessons || []).length;
    await deskDraftLesson();
    await new Promise(r => setTimeout(r, 500));
    const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
    const plan = (save.notes || []).find(n => /^Lesson plan — /.test(n.title || ''));
    return {
      msg: document.getElementById('deskNoteMsg')?.textContent || '',
      madeNote: !!plan,
      planBody: plan ? (plan.body || '').slice(0, 120) : '',
      linkedToBook: !!(plan && plan.book && plan.book.slug === 'personal-discourses-of-epictetus'),
      treeBefore,
      treeAfter: (save.myLessons || []).length,
      offersRead: (document.getElementById('deskNoteMsg')?.innerHTML || '').includes('deskOpenDraft('),
      offersTree: (document.getElementById('deskNoteMsg')?.innerHTML || '').includes('lessonFromPlanNote('),
    };
  });
  ok('a draft lands in a NOTE, not on the wall', drafted.madeNote, drafted.msg.slice(0, 90));
  ok('and NOTHING reached the tree without a press',
    drafted.treeAfter === drafted.treeBefore, `${drafted.treeBefore} → ${drafted.treeAfter}`);
  ok('the draft says where it came from', /Drafted by your local AI from/.test(drafted.planBody), drafted.planBody.slice(0, 70));
  ok('the draft is linked back to the book', drafted.linkedToBook);
  ok('you are offered the read-and-edit step before the tree',
    drafted.offersRead && drafted.offersTree, `read:${drafted.offersRead} tree:${drafted.offersTree}`);

  const edited = await p.evaluate(async () => {
    const save = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
    const plan = (save.notes || []).find(n => /^Lesson plan — /.test(n.title || ''));
    deskOpenDraft(plan.id);
    await new Promise(r => setTimeout(r, 350));
    return {
      editing: !!document.getElementById('noteBodyInput'),
      tool: !!document.getElementById('noteTitleInput'),
      canPromote: (document.getElementById('planToolBody')?.innerHTML || '').includes('lessonFromPlanNote('),
    };
  });
  ok('“read and edit it” opens the draft in an editor', edited.editing && edited.tool, JSON.stringify(edited));
  ok('and the tree is one press away from the editor', edited.canPromote);
}

ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
ok('no page errors on the second page either', errs2.length === 0, errs2.slice(0, 3).join(' | ') || 'none');

await b.close();
console.log('\n' + (failed ? `${failed} FAILED` : 'writing-desk: all checks passed')
  + (skipped ? ` (${skipped} skipped)` : '') + '\n');
process.exit(failed ? 1 : 0);
