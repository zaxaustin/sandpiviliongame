/* ================================================================
   [MESSAGES] — the residents notice something, and text you about it.

   The steward, 2026-08-16:

     "it would be funny if we have the mountain monk give bad advice like
      take a break… touch some grass. It can be a real menace… the other
      ones can stay quite professional. It takes a village."

     "my idea of this was a text in the phone from these people."

   The phone already existed — `#chatPhone`, the card you tap to return to a
   pocketed conversation. This gives it a second duty rather than building a
   room. `plans/LIVING-VILLAGE-PLAN.md` describes the ambitious version, where
   residents walk and choose and act; it is blocked on an embodiment proof that
   has never shipped. This is the thin path to the same feeling.

   ---------------------------------------------------------------
   FOUR RULES, AND EACH ONE IS A WAY THIS GOES WRONG

   1 · AUTHORED, NOT GENERATED. Rule 7. Every body below is written text with
       real numbers substituted, so the whole feature works with
       `aiConnections: []`. That is not a fallback — it is the point. The
       laptop case is why this had to be cheap, and it also means the Monk's
       register is a copy decision rather than a prompt to wrestle.

   2 · SPARSE, ENFORCED IN CODE. One message per (trigger, ref) EVER, and at
       most one unread per resident. "Sparse over frequent" is a wish until
       something refuses to write the second one.

   3 · IT NOTICES, IT DOES NOT NAG. Straight out of data/the-day.js, which
       argued it first: "'moved four days running' is an observation. A red
       badge is a demand." Nothing here counts against you, nothing is
       overdue, and every one of these is survivable by ignoring it.

   4 · THE MONK MAY BE SHARP, NEVER CRUEL. He is the only one given licence,
       and it is his actual job — roles.js already gives him "ask what the
       thing in front of them is FOR… never answer a life with a citation".
       Telling you to go outside IS the job. The steward drew the line
       himself: "compassionate interruption, not sabotage." SHAME_WORDS below
       is that line made checkable.

   ---------------------------------------------------------------
   ⚠ AND THE CONTENT POINTS OUT OF THE WINDOW, WHICH IS THE WHOLE DESIGN.

   The phone is the most GAME-LIKE surface the Pavilion will ever have —
   characters texting you unprompted. Nearly every message tells you to go and
   do something the app cannot do for you: read the paper book, wire the
   circuit, stand on some grass. data/daily-tasks.js already named this, about
   a step marked `world`:

     "This is the step that makes the Pavilion a support for real study rather
      than a replacement for it, and giving it a button would be pretending
      the app can do it for you."

   Same instinct, said by a person instead of a schema.

   PURE: no DOM, no imports, no reaching for `data`. The caller owns the store
   and hands things in — the same reason daily-tasks.js and the-day.js are
   pure, so `npm test` can hold every rule above rather than trusting it.
   ================================================================ */

/* How many are kept. An unbounded array in the save is a slow leak, and
   nobody scrolls a year of texts. Read ones go first. */
export const MESSAGE_CAP = 40;

/* ⚠ THE LINE, MADE CHECKABLE. Not a content filter — a guard against the one
   failure mode the steward named. A Monk who shames is not a sharper Monk,
   he is a different and worse character, and the difference is a handful of
   words. `npm test` fails if any authored body contains one. */
export const SHAME_WORDS = [
  'lazy', 'pathetic', 'excuse', 'excuses', 'failure', 'failed you', 'disappointing',
  'disappointed in', 'wasting', 'wasted', 'should be ashamed', 'pull yourself',
];

/* Who may write, and it is deliberately three. Sebastian and Quill stay in
   role; the Monk is the one with licence. Adding a fourth means writing their
   voice, which is the expensive part and the reason this list is short. */
export const SENDERS = ['sebastian', 'quill', 'monk'];

/* ---- pick one of several, WITHOUT reshuffling -------------------------
   the-day.js settled this argument for the unread-book rotation and the
   reasoning carries over exactly: "Deterministic per day rather than random:
   it must not reshuffle every time the panel is opened, or it stops being an
   invitation and becomes a slot machine."

   Here the seed is the dedupe key rather than the day, because a message is
   written once and then never changes — but two different courses should not
   get word-for-word the same note. */
function pick(list, seed) {
  let h = 0;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

/* One line, trimmed, for dropping a title into a sentence. */
const short = (s, n) => {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).replace(/[\s,;:.]+\S*$/, '') + '…' : t;
};
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/* ================================================================
   THE TRIGGERS. Five, and every one reads data the Pavilion already had.
   Each returns null when its condition is not met — so the caller can fire
   them blindly and the decision lives here, testable, in one place.
   ================================================================ */
const TRIGGERS = {

  /* You pinned a real course. Sebastian offers to keep an eye — and offers,
     because a butler who assigns you work unasked is a manager. */
  'course-pinned': (c) => {
    if (!c || !c.course || !c.course.title) return null;
    return {
      from: 'sebastian',
      ref: { courseId: String(c.course.id) },
      body: 'You have taken on "' + short(c.course.title, 64) + '".\n\n'
        + 'If it would help, ask me for a daily goal and I will keep one small thing on '
        + 'the board for you — ten focused minutes, or a sentence about what is still '
        + 'unclear. No deadline, and you can set it down whenever you like.',
    };
  },

  /* Quill's actual job: which book, where it sits, and whether you have it.
     ⚠ This is the one that most often sends you OUT — the answer is usually
     "you will have to go and get it", which no button here can do. */
  'shelf-gap': (c) => {
    const missing = (c && c.missing) || [];
    if (!missing.length || !c.course) return null;
    const names = missing.slice(0, 3).map(t => '· ' + short(t, 70)).join('\n');
    const rest = missing.length > 3 ? '\n· …and ' + (missing.length - 3) + ' more' : '';
    return {
      from: 'quill',
      ref: { courseId: String(c.course.id) },
      body: '"' + short(c.course.title, 56) + '" reads '
        + plural(missing.length, 'text', 'texts') + ' that are not on your shelf:\n\n'
        + names + rest + '\n\n'
        + 'I cannot fetch them for you — that part is yours. When you have one, bring it '
        + 'in and I will file it against the course so the module opens straight to it.',
    };
  },

  /* ★ THE ONE HE ASKED FOR BY NAME. Measured from when the session started and
     compared only when you DO something — the sweepReminders shape, which
     CLAUDE.md rule 9 permits explicitly ("a clock comparison, never an AI
     call"). It may interrupt a session that is going WELL, and the steward
     chose that deliberately: that is the funny one, and it is also the one
     worth hearing. */
  'long-sitting': (c) => {
    const mins = Math.floor((c && c.minutes) || 0);
    if (mins < 90) return null;
    /* Words, not digits. "the better part of 3 hours" is a log line; "the
       better part of three hours" is a person talking, and this one is
       supposed to sound like a person talking. */
    const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
    const h = Math.floor(mins / 60);
    const hours = mins < 120 ? 'an hour and a half'
                : h <= 8 ? 'the better part of ' + WORD[h] + ' hours'
                : 'most of the day';
    return {
      from: 'monk',
      /* Once per session — the ref is the session, so a second sweep in the
         same sitting writes nothing. */
      ref: { session: String((c && c.session) || '') },
      body: pick([
        'You have been at this ' + hours + '.\n\nFive minutes of actual ground under your '
          + 'feet would serve the work better than another hour of forcing it. The chair '
          + 'will still be here. So will I.',
        'It has been ' + hours + '.\n\nGo and eat something. I am entirely serious. A mind '
          + 'that has not been fed is not being disciplined, it is being ignored.',
        hours.charAt(0).toUpperCase() + hours.slice(1) + ', by my count.\n\n'
          + 'Stand up. Look at something further away than this screen. That is not a '
          + 'break from the practice — on a day like today it rather is the practice.',
      ], (c && c.session) || 'x'),
    };
  },

  /* A practice the course said to repeat, kept for a while, then quiet. NOT a
     broken streak — there is no streak, nothing went down, and the wording is
     careful about that. It is an observation with a door left open. */
  'practice-quiet': (c) => {
    const days = (c && c.daysKept) || 0;
    const quiet = (c && c.quietDays) || 0;
    if (days < 2 || quiet < 3) return null;
    return {
      from: 'monk',
      ref: { courseId: String(c.course && c.course.id), module: String(c.moduleIndex) },
      body: plural(days, 'morning', 'mornings') + ', then ' + plural(quiet, 'day', 'days')
        + ' of nothing.\n\n'
        + 'I am not asking where you went. I am noting that the cushion has not moved, and '
        + 'that you are the only one who can say whether that matters this week. Nothing '
        + 'here is counting.',
    };
  },

  /* ★ YOU FINISHED ONE. The steward does not want graduation built — "I don't
     think we're ready to really have anything where we have enough of a
     community to let people graduate" — so this is the acknowledgement
     WITHOUT the rank: what you did, and the doors that genuinely exist.

     Sebastian rather than the Monk on purpose. The Monk's licence is to
     interrupt; congratulating someone is not his job and would flatten the
     one voice that is allowed to be sharp. */
  'course-finished': (c) => {
    if (!c || !c.course || !c.course.title) return null;
    const n = (c.modules || 0);
    return {
      from: 'sebastian',
      ref: { courseId: String(c.course.id), done: '1' },
      body: 'You finished "' + short(c.course.title, 56) + '"'
        + (n ? ' — all ' + n + ' modules' : '') + '.\n\n'
        + 'No rank, no ceremony; there is nothing here that opens and it would be silly to '
        + 'pretend otherwise. What is true is that you made a thing and took it to the end, '
        + 'and it is now in a state someone who was never here could walk.\n\n'
        + 'The folder on disk holds the whole of it if you want to keep or hand on a copy.',
    };
  },

  /* The check-in, and the release valve in the same breath. `retakeDailyTask`
     already exists, so "carry on" is one press — and "no" is a real answer
     that closes it cleanly. */
  'task-quiet': (c) => {
    const quiet = (c && c.quietDays) || 0;
    if (quiet < 3 || !c.title) return null;
    return {
      from: 'sebastian',
      ref: { task: short(c.title, 40) },
      body: '"' + short(c.title, 56) + '" has been quiet for '
        + plural(quiet, 'day', 'days') + '.\n\n'
        + 'No harm in that — I am only checking whether you still want it on the board. '
        + 'Take it up again whenever you like, or tell me to let it go and I will.',
    };
  },
};

export const TRIGGER_KEYS = Object.keys(TRIGGERS);

/* ---------------------------------------------------------------
   THE ONE ENTRY POINT. Returns a message, or null.

   It does NOT decide whether to keep it — see `addMessage` — so the two
   questions ("is there something to say" and "may it be said again") stay
   separate and each is testable on its own.                            */
export function messageFor(trigger, ctx) {
  const fn = TRIGGERS[trigger];
  if (!fn) return null;
  const out = fn(ctx || {});
  if (!out || !out.body) return null;
  return { trigger, from: out.from, body: out.body, ref: out.ref || {} };
}

/* The dedupe key. Named rather than inlined, because the whole of rule 2 is
   this string being stable — and a key that quietly changes shape means every
   old message stops matching and they all send again. */
export function dedupeKey(m) {
  const r = (m && m.ref) || {};
  return String(m && m.trigger) + '|'
    + [r.courseId, r.module, r.session, r.task, r.slug].filter(v => v != null).join(':');
}

/* ---------------------------------------------------------------
   MAY IT BE SENT? Pure, and the caller does the writing.

   TWO REFUSALS, and the second is the one that keeps this bearable:
     · this exact (trigger, ref) has been sent before — ever
     · this resident already has an unread message waiting

   The second means a quiet week cannot produce a stack of six notes from the
   Monk the moment you come back. One voice, one thing to say, until you have
   heard it.                                                            */
export function canSend(list, msg) {
  const all = Array.isArray(list) ? list : [];
  if (!msg) return { ok: false, why: 'nothing to send' };
  const key = dedupeKey(msg);
  if (all.some(m => dedupeKey(m) === key)) {
    return { ok: false, why: 'already sent' };
  }
  if (all.some(m => m.from === msg.from && !m.read)) {
    return { ok: false, why: 'that resident already has something waiting' };
  }
  return { ok: true };
}

/* Add it, capped. Returns a NEW array — the caller assigns and persists, so
   this can be tested without a save. Read messages are dropped first: an
   unread one is still owed to you. */
export function addMessage(list, msg, at) {
  const all = Array.isArray(list) ? list.slice() : [];
  const gate = canSend(all, msg);
  if (!gate.ok) return { list: all, added: null, why: gate.why };
  const full = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    from: msg.from, trigger: msg.trigger, ref: msg.ref || {},
    body: msg.body, at: at || '', read: false,
  };
  all.unshift(full);
  if (all.length > MESSAGE_CAP) {
    /* Drop the oldest READ ones first; only if there are none does an unread
       one go, and then the oldest. */
    const readIdx = [];
    all.forEach((m, i) => { if (m.read) readIdx.push(i); });
    while (all.length > MESSAGE_CAP && readIdx.length) all.splice(readIdx.pop(), 1);
    while (all.length > MESSAGE_CAP) all.pop();
  }
  return { list: all, added: full, why: null };
}

export function unreadCount(list) {
  return (Array.isArray(list) ? list : []).filter(m => m && !m.read).length;
}
/* The newest unread, for the phone — it shows one sender at a time. */
export function nextUnread(list) {
  return (Array.isArray(list) ? list : []).find(m => m && !m.read) || null;
}
