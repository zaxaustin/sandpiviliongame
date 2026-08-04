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

/* A note you wrote and have not looked at since — the ONE rule in this file
   that anything else wanted too. ☀ Today takes the single oldest; the Writing
   Desk (WRITING-DESK-PLAN.md step 2) shows a few, because you are sitting
   down to work rather than glancing at a list. Same rule, one definition —
   two copies of "what counts as forgotten" would drift the first time either
   number was tuned.

   Past a fortnight, so it stays a rediscovery rather than a review queue, and
   `seen` beats `date`: seen is set when a note is actually opened, not merely
   listed. */
export const FORGOTTEN_AFTER_DAYS = 14;
export function forgottenNotes(notes, today, limit) {
  return (notes || [])
    .map(n => ({ n, age: daysBetween(n.seen || n.date, today) }))
    .filter(x => x.n.date && x.age >= FORGOTTEN_AFTER_DAYS && String(x.n.text || '').trim().length > 20)
    .sort((a, b) => b.age - a.age)
    .slice(0, limit == null ? 1 : limit);
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
        choosing, and it is exactly what the tree never offered.

        A PICKED-UP path beats anything inferred (THE-STUDY-CHAIN-PLAN.md
        Stage 2). Progress is a guess at what you care about; picking one
        up is you saying so, and a stated intention must not be outranked
        by a heuristic. It also fires at ZERO steps done, which the
        inference below deliberately cannot — that is the whole first
        evening of a new path, and it was the one the old rule missed. */
  const walkable = lessons.filter(l => l && l.status !== 'planned' && (l.steps || []).length);
  const study = ctx.study && ctx.study.id;
  const picked = study ? walkable.find(l => l.id === study) : null;
  if (picked) {
    const done = ((curriculum[picked.id] || {}).steps) || {};
    const nextIdx = picked.steps.findIndex((_, i) => !done[i]);
    if (nextIdx >= 0) push({ key: 'step-' + picked.id, icon: '🌱',
      title: picked.steps[nextIdx].title,
      note: picked.title + ' · step ' + (nextIdx + 1) + ' of ' + picked.steps.length + ' · the path you picked up',
      fn: 'openLesson', arg: picked.id });
  }
  let best = null;
  for (const l of walkable) {
    if (picked && l.id === picked.id) continue;      // already offered, above
    const done = ((curriculum[l.id] || {}).steps) || {};
    const total = l.steps.length;
    const n = l.steps.filter((_, i) => done[i]).length;
    if (n === 0 || n >= total) continue;                 // not started, or finished
    if (!best || n / total > best.frac) {
      const nextIdx = l.steps.findIndex((_, i) => !done[i]);
      best = { l, nextIdx, n, total, frac: n / total };
    }
  }
  /* Only ONE lesson step ever appears. If you picked a path up, that is the
     one — inferring a second from progress would turn the day into a syllabus,
     and five items is a hard cap for exactly that reason. */
  if (!picked && best) push({ key: 'step-' + best.l.id, icon: '🌱',
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
  const forgotten = forgottenNotes(ctx.notes, today, 1)[0];
  if (forgotten) push({ key: 'note-' + forgotten.n.key, icon: '🗒',
    title: forgotten.n.title || 'A note you wrote',
    note: 'written ' + forgotten.age + ' days ago and not opened since — worth another look?',
    fn: 'openNotesLog', arg: forgotten.n.key });

  /* 6 — brought in and never opened. The commonest quiet regret in any
        library, and the app is the only thing that can notice.

        IT ROTATES, and that is the whole of this rule now. It used to offer
        unread[0] — first in import order, the same book every morning until
        you read it. Fine with three books. The steward imported a hundred-odd
        spiritual texts on 2026-08-03 precisely so he could "read spiritual
        texts that i havent read yet", and this would have shown him book one
        of a hundred, forever, and never mentioned the other ninety-nine.
        A recommendation that cannot change is a nag with better manners.

        Deterministic per day rather than random: it must not reshuffle every
        time the panel is opened, or it stops being an invitation and becomes a
        slot machine. Same book all day, a new one tomorrow.

        Readable ones first. A shelf here holds both real full texts and
        Pavilion summaries of books it does not ship, and "read a page of this"
        is a poor offer when there is no page. */
  const unread = books.filter(b => !read[b.slug]);
  if (unread.length) {
    const hasText = b => !!(b.doc && b.doc.fullText);
    const pool = unread.filter(hasText).length ? unread.filter(hasText) : unread;
    let seed = 0;
    for (const c of String(today)) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const pick = pool[seed % pool.length];
    const shelf = pick.tradition && pick.tradition !== 'Personal' ? pick.tradition : '';
    push({ key: 'unread', icon: '📚', title: pick.title,
      note: unread.length > 1
        ? (shelf ? shelf + ' · ' : '') + 'one of ' + unread.length + ' you have not opened — a different one each day'
        : 'you added this and never opened it',
      fn: 'openReader', arg: pick.slug });
  }

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
