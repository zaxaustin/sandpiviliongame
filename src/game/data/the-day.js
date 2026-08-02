/* ================================================================
   [THE DAY] — the answer to "why would I open this today?"

   Built 2026-07-28 from WHY-OPEN-IT-TODAY-PLAN.md. The diagnosis there
   is the whole reason this file exists:

     Everything in the Pavilion is a place you COULD go. Nothing is a
     thing that is WAITING for you. The Writing Desk plans a day after
     you fill it in; the tree holds lessons after you choose one; the
     Hall dissects papers after you decide which. That is fine for a
     tool you visit with an errand and fatal for a place you inhabit,
     because on an ordinary tired evening "what should I do here?" has
     no answer, and the honest response is to close it.

   So this asks the questions nobody was asking on the visitor's behalf,
   over data that was already saved. It invents nothing and stores
   nothing.

   The four rules it must keep, from the plan:

     · NEVER EMPTY. "You're all caught up" is a dead end and a reason
       not to come back. If nothing is pending it offers one small good
       thing instead.
     · NEVER A WALL. Five items, hard cap. A list of everything
       outstanding is a guilt inventory, and guilt is the opposite of a
       habit.
     · EVERY ITEM IS ONE PRESS. Not "go to the Study" — the step itself.
     · IT NOTICES, IT DOES NOT NAG. "Moved four days running" is an
       observation. A red badge is a demand.

   Pure logic, no DOM, no imports from the game — so `npm test` can hold
   it to those rules rather than trusting them.
   ================================================================ */

const MAX = 5;

/* days between two YYYY-MM-DD keys; negative means the first is earlier */
export function daysBetween(a, b) {
  const pa = Date.parse(a + 'T00:00:00'), pb = Date.parse(b + 'T00:00:00');
  if (isNaN(pa) || isNaN(pb)) return 0;
  return Math.round((pb - pa) / 86400000);
}

/* ---- the whole thing --------------------------------------------------
   Everything is passed in, nothing is reached for:
     today       'YYYY-MM-DD'
     sparks      [{dayKey, text, ...}]   — openSparks()
     upcoming    [{kind, id, title, due}] — upcomingItems()
     lessons     [{id, title, steps, prereqs, mine, status}] — allNodes()
     curriculum  data.curriculum  {id: {steps:{i:true}}}
     books       personalLibrary
     read        data.read  {slug:true}
     dissections data.hall.dissections
   Returns at most MAX items: {key, icon, title, note, fn, arg}.        */
export function theDayItems(ctx = {}) {
  const today = ctx.today || '';
  const sparks = ctx.sparks || [];
  const upcoming = ctx.upcoming || [];
  const lessons = ctx.lessons || [];
  const curriculum = ctx.curriculum || {};
  const books = ctx.books || [];
  const read = ctx.read || {};
  const dissections = ctx.dissections || [];
  const out = [];
  const push = it => { if (out.length < MAX && it) out.push(it); };

  /* 1 — overdue, then due today. The only genuinely time-bound things
        here, so they come first; everything else is an invitation. */
  const dated = upcoming.filter(u => u.due).slice().sort((a, b) => String(a.due).localeCompare(String(b.due)));
  for (const u of dated) {
    const d = daysBetween(u.due, today);
    if (d > 0) push({ key: 'late-' + u.id, icon: '⏳', title: u.title,
      note: d === 1 ? 'was due yesterday' : 'was due ' + d + ' days ago', fn: 'openUpcoming' });
    else if (d === 0) push({ key: 'due-' + u.id, icon: '📌', title: u.title, note: 'due today', fn: 'openUpcoming' });
  }

  /* 2 — the next step of something already begun. This is the item most
        likely to build a habit, because continuing is easier than
        choosing, and it is exactly what the tree never offered. */
  const walkable = lessons.filter(l => l && l.status !== 'planned' && (l.steps || []).length);
  let best = null;
  for (const l of walkable) {
    const done = ((curriculum[l.id] || {}).steps) || {};
    const total = l.steps.length;
    const n = l.steps.filter((_, i) => done[i]).length;
    if (n === 0 || n >= total) continue;                 // not started, or finished
    if (!best || n / total > best.frac) {
      const nextIdx = l.steps.findIndex((_, i) => !done[i]);
      best = { l, nextIdx, n, total, frac: n / total };
    }
  }
  if (best) push({ key: 'step-' + best.l.id, icon: '🌱',
    title: best.l.steps[best.nextIdx].title,
    note: best.l.title + ' · step ' + (best.nextIdx + 1) + ' of ' + best.total,
    fn: 'openLesson', arg: best.l.id });

  /* 3 — something you have moved along repeatedly. An observation, made
        once, in plain words. Only surfaces past three days so it cannot
        become a daily scold. */
  const stale = sparks
    .map(s => ({ s, age: daysBetween(s.dayKey, today) }))
    .filter(x => x.age >= 3)
    .sort((a, b) => b.age - a.age)[0];
  if (stale) push({ key: 'stale', icon: '🔁', title: stale.s.text || 'Something you keep carrying',
    note: 'carried for ' + stale.age + ' days — still want it?', fn: 'openStillOpen' });

  /* 4 — a paper you brought in and never pulled apart. The Hall exists
        for exactly this and nobody could find it. */
  /* An explicit mark beats a guess. `kind:'paper'` is set at intake by the
     person who actually knows; the heuristic below is only the fallback for
     everything shelved before that existed, or dragged in with no source. */
  const isPaper = b => b.kind === 'paper'
    || /arxiv|doi|pubmed|semanticscholar|openalex/i.test((b.source_url || '') + ' ' + (b.attribution || ''))
    || /paper|preprint|journal/i.test((b.category || '') + ' ' + (b.title || ''));
  const analysed = new Set(dissections.map(d => String(d.title || '').toLowerCase()));
  const looseP = books.filter(b => isPaper(b) && !analysed.has(String(b.title || '').toLowerCase()));
  if (looseP.length) push({ key: 'paper', icon: '📄', title: looseP[0].title,
    note: looseP.length > 1 ? looseP.length + ' papers you have not pulled apart yet' : 'brought in, never pulled apart',
    fn: 'openScienceHall' });

  /* 5 — a note you wrote and have not looked at since. The note system is
        well organised — six sources, folders, tags, search — but organisation
        only helps someone who is already LOOKING. Nothing ever brought a note
        back, so writing one was the end of its life rather than the start.
        This is the only thing in the app that can close that loop.

        One at a time, and only past a fortnight, so it stays a rediscovery
        rather than a review queue. `seen` is set when a note is actually
        opened, not merely listed. */
  const notes = ctx.notes || [];
  const forgotten = notes
    .map(n => ({ n, age: daysBetween(n.seen || n.date, today) }))
    .filter(x => x.n.date && x.age >= 14 && String(x.n.text || '').trim().length > 20)
    .sort((a, b) => b.age - a.age)[0];
  if (forgotten) push({ key: 'note-' + forgotten.n.key, icon: '🗒',
    title: forgotten.n.title || 'A note you wrote',
    note: 'written ' + forgotten.age + ' days ago and not opened since — worth another look?',
    fn: 'openNotesLog', arg: forgotten.n.key });

  /* 6 — brought in and never opened. The commonest quiet regret in any
        library, and the app is the only thing that can notice. */
  const unread = books.filter(b => !read[b.slug]);
  if (unread.length) push({ key: 'unread', icon: '📚', title: unread[0].title,
    note: unread.length > 1 ? unread.length + ' books you added and have not opened' : 'you added this and never opened it',
    fn: 'openReader', arg: unread[0].slug });

  /* NEVER EMPTY — and on DAY ONE this is the only thing that fires, so it is
     the whole first impression. The first version looked only at the personal
     shelf, which is empty for a new visitor, and so told someone who had just
     been given 27 books that the Library needed growing. Wrong, and a weak
     opening: what a newcomer should be offered is a real book they can read
     immediately, because read-aloud works with nothing installed and that is
     the fastest way to feel what this place is for. Caught 2026-07-28 by
     running a genuinely fresh save instead of a loaded one. */
  if (!out.length) {
    const readable = (ctx.catalogue || []).filter(d => d && d.doc && d.doc.fullText
      && d.doc.fullText.text && d.doc.fullText.text.length > 4000 && !read[d.slug]);
    const own = books.find(b => !read[b.slug]) || books[0];
    if (own) push({ key: 'idle-book', icon: '📖', title: own.title,
      note: 'nothing is waiting — read a page of this instead', fn: 'openReader', arg: own.slug });
    else if (readable.length) push({ key: 'idle-seed', icon: '📖', title: readable[0].title,
      note: 'complete and ready to read — press 🔊 and it will read aloud to you',
      fn: 'openReader', arg: readable[0].slug });
    else push({ key: 'idle-empty', icon: '📥', title: 'Bring a book in',
      note: 'the Library grows because you grow it — drag a file onto the window',
      fn: 'openBookIntake' });
  }
  return out;
}

/* A single plain sentence for the menu, so the door says something true
   before it is opened. Deliberately not a count badge: a number with no
   context reads as a demand, and this is meant to notice, not nag. */
export function theDayLine(items) {
  if (!items || !items.length) return '';
  const late = items.filter(i => i.icon === '⏳').length;
  if (late) return late === 1 ? 'one thing is overdue' : late + ' things are overdue';
  const due = items.filter(i => i.icon === '📌').length;
  if (due) return due === 1 ? 'one thing is due today' : due + ' due today';
  const step = items.find(i => i.icon === '🌱');
  if (step) return 'carry on where you left off';
  return items.length === 1 ? 'one thing waiting' : items.length + ' things waiting';
}
