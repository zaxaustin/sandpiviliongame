/* ================================================================
   [THE PORTABLE COURSE] — one Markdown document that is both how you
   write a lesson here and how one arrives from somewhere else.

   WHY THIS EXISTS. Tutorial Stage 5 asks the visitor for a course whose
   "steps stand alone — someone who never met you could follow them."
   Until 2026-08-10 a step could not hold more than ONE LINE:
   saveMyLesson() split the textarea on newlines and took everything
   after the first `|` as the body, so a paragraph was impossible and
   the packet round trip flattened it back to `title | body` anyway.

   The renderer was never the problem — ui/lesson-tree.js has always
   printed s.body, and readingIn() already scans title+body for a
   chapter reference and offers a door to it. The DISPLAY half was
   built; the writing and the interchange capped it at a line. This
   project's signature bug: a capability that exists and cannot be
   reached.

   AND THE REAL LEVERAGE, which is the steward's:

     the strongest drafting happens in an ordinary chat window with a
     strong model. The Pavilion's job is not to replace that. It is to
     give a portable shape that work can arrive in, and a local course
     worth actually walking once it is here.

   So this is deliberately a TEXT format, not JSON. A person can write
   it by hand, a model can be asked for it in one prompt, it diffs, and
   it survives being pasted into a chat window and back out again. JSON
   fails every one of those.

   ONE FORMAT, TWO JOBS — and that is rule 4 rather than tidiness. The
   authoring textarea and the imported file are parsed by the same
   function, so there is no second convention that can drift from this
   one.

   WHAT IT DOES NOT DO. There is no Objective/Practice/Reflection field
   on a step, and that is on purpose: nothing in the app reads them yet,
   and a field nobody reads is a field that rots. The format RECOMMENDS
   writing them as bold labels inside the body, where they render as
   prose today and can be promoted to real fields the moment something
   actually consumes one.

   Pure: no DOM, no imports, no reaching for `data`. Same contract as
   data/chapters.js, which is the other structured-text parser here.
   ================================================================ */

import { lessonToMarkdown } from './lesson-doc.js';

export const COURSE_EXT = '.course.md';

/* The frontmatter keys this understands. Anything else is preserved in
   `extra` rather than dropped — a course written for a later version of
   the Pavilion must not lose fields on a round trip through this one.

   `purpose`/`audience`/`outcome`/`prerequisites`/`category` were promoted
   OUT of `extra` on 2026-08-14. They rode along untouched for four days,
   which was correct while nothing read them — and stopped being correct
   the moment plans/HIGH-STANDARD-COURSE-CREATION-GUIDE.md made purpose and
   outcome load-bearing (required pieces 1 and 5). `category` was the
   quietest of the five: the Course Board has had a `Skill` category since
   July and the steward's own frontmatter says `category: "Skill"`, so the
   two halves of one idea sat a field-name apart and never met. */
const KNOWN = ['title', 'summary', 'track', 'level', 'reading', 'author',
               'drafted-with', 'license', 'source',
               'purpose', 'audience', 'outcome', 'prerequisites', 'category',
               'baseline'];

/* Frontmatter keys whose value is a block list rather than a scalar.

   `baseline` joined `prerequisites` on 2026-08-14 and the two are a PAIR
   that must not be collapsed into one field, however similar they look:

     prerequisites — what the COURSE demands of anyone who starts it
     baseline      — what its AUTHOR actually brought, on the day they began

   The steward asked for the second because a beginner and someone with
   real experience need different material for the same subject. Keeping it
   in the file is what makes it useful to the NEXT person as well as to the
   model that drafted it: "I built this having never soldered anything"
   tells a reader what the work will cost them, and no `level: 201` does. */
const LIST_KEYS = ['prerequisites', 'baseline'];

/* Strip whitespace, and then ONE matched pair of surrounding quotes.

   Measured 2026-08-14 against the steward's own two courses: he writes
   `title: "Junior Electrical Engineer Path — …"`, which is ordinary YAML
   and which this function used to hand back with the quote marks still
   attached, so the Course Board would have shown them. Only a MATCHED
   pair is removed, and only one, so a title that genuinely ends in a
   quotation mark loses nothing. */
const clean = s => {
  const v = String(s == null ? '' : s).trim();
  const q = v.charAt(0);
  if (v.length >= 2 && (q === '"' || q === "'") && v.charAt(v.length - 1) === q) {
    return v.slice(1, -1).trim();
  }
  return v;
};

/* ---------- reading it ----------
   Returns { ok, lesson, problems }. `problems` is always an array of
   SENTENCES, never codes — a person pasting a file that will not import
   needs to know which line to fix, and rule 6 says say so plainly. */
export function parseCourse(text, opts) {
  const o = opts || {};
  const problems = [];
  const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
  if (!src.trim()) return { ok: false, lesson: null, problems: ['There is nothing here to read.'] };

  /* --- frontmatter, if the file opens with a --- fence --- */
  const meta = {};
  const extra = {};
  let body = src;
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  if (fm) {
    body = src.slice(fm[0].length);
    /* A key with no value opens a BLOCK LIST — the `- item` lines beneath it
       belong to it until the next key. This is ordinary YAML and it is how
       the steward writes `prerequisites:`; without it, `parseCourse` reported
       one problem per bullet and refused the file outright. Measured
       2026-08-14 on courses/junior-electrical-engineer.course.md: three
       problems, ok:false, the course could not enter the Pavilion at all.

       A `- ` line is only ever read as a list item when a list is actually
       open. Otherwise it falls through to the "frontmatter is key: value"
       problem exactly as before, so a genuinely malformed file still says so. */
    let listKey = null;
    let listBag = null;
    for (const line of fm[1].split('\n')) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const item = /^\s*-\s+(.*\S)\s*$/.exec(line);
      if (item && listKey) { listBag[listKey].push(clean(item[1])); continue; }
      const at = line.indexOf(':');
      if (at < 0) { problems.push(`Could not read the line "${line.trim()}" — frontmatter is "key: value".`); continue; }
      const k = line.slice(0, at).trim().toLowerCase();
      const v = clean(line.slice(at + 1));
      const bag = KNOWN.includes(k) ? meta : extra;
      if (!v && (LIST_KEYS.includes(k) || bag === extra)) {
        /* Empty value: it is either a declared list key, or an unknown key
           that may turn out to be one. Start a list; if no `- ` line follows,
           it collapses back to the empty string below so nothing changes. */
        bag[k] = [];
        listKey = k; listBag = bag;
        continue;
      }
      bag[k] = v;
      listKey = null; listBag = null;
    }
    /* A list that never received an item is just an empty value. */
    for (const bag of [meta, extra]) {
      for (const k of Object.keys(bag)) if (Array.isArray(bag[k]) && !bag[k].length) bag[k] = '';
    }
  }

  /* --- the steps. `## Something` opens one; everything until the next
     `##` is its body, paragraphs and all. A `# Title` heading before the
     first step is taken as the title when frontmatter did not give one. --- */
  const steps = [];
  let title = meta.title || '';
  let preamble = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h2 = /^##\s+(.*\S)\s*$/.exec(line);
    const h1 = /^#\s+(.*\S)\s*$/.exec(line);
    /* `## 3. Read it again` — lessonToMarkdown numbers its step headings, and
       a round trip must not accumulate "1. 1. 1." on every pass. The number is
       positional and is regenerated on the way out, so it is dropped here. */
    if (h2) {
      if (cur) steps.push(cur);
      cur = { title: h2[1].trim().replace(/^\d+\.\s*/, ''), lines: [] };
      continue;
    }
    if (h1 && !cur) { if (!title) title = h1[1].trim(); continue; }
    if (cur) cur.lines.push(line); else preamble.push(line);
  }
  if (cur) steps.push(cur);

  /* lessonToMarkdown writes an italic facts line (`*Reading · level 101*`)
     under the title, a `**Before this:** …` line when prerequisites were
     passed, and an italic provenance footer under a `---` rule. All three are
     rendered FROM the frontmatter, so reading them back as prose would
     duplicate them on every round trip. Dropped, not parsed.

     A bare `---` rule is dropped too (2026-08-14). The steward separates every
     module with one, so without this every step body ended in a literal
     "---" — mdLite renders one mark and that is not it. */
  const tidy = a => a.join('\n')
    .replace(/^\s*\*[^*\n]+\*\s*$/gm, '')
    .replace(/^---\s*$[\s\S]*?_Written in the Sand Pavilion[^_]*_\s*$/m, '')
    .replace(/^\*\*Before this:\*\*.*$/gm, '')
    .replace(/^---+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n').trim();

  if (!title) problems.push('No title — give it a `title:` in the frontmatter, or a `# Heading` at the top.');
  if (!steps.length) {
    problems.push('No steps — each one is a `## Heading`, and a course needs at least one.');
  }
  steps.forEach((s, i) => {
    if (!s.title) problems.push(`Step ${i + 1} has no heading.`);
  });

  if (problems.length) return { ok: false, lesson: null, problems };

  /* --- WHO MADE IT. The same `by` shape data/note-versions.js gives a
     note, deliberately: a course drafted in a chat window and an AI note
     written in the Reader are the same question, and one vocabulary for
     it is rule 4. `drafted-with: <model>` marks it the AI's; absent
     means the person's own. --- */
  const user = clean(meta.author) || clean(o.user) || 'user 1';
  const model = clean(meta['drafted-with']);
  const by = model ? { who: 'ai', user, model } : { who: 'you', user };

  /* --- THE OPENING INTENTION, kept instead of thrown away.

     Everything before the first `##` used to be read for one paragraph and
     dropped. On the steward's own courses that discarded the whole of
     "# How to walk this course" — which is not preamble, it is required
     piece 1 of plans/HIGH-STANDARD-COURSE-CREATION-GUIDE.md, the answer to
     "what is the real question that brings you here".

     The summary is lifted out of the intro when the two share their first
     paragraph, so that emitting (which writes the summary as prose above the
     intro) and re-reading is stable rather than duplicating a paragraph on
     every pass. --- */
  const pre = tidy(preamble);
  const paras = pre ? pre.split('\n\n') : [];
  /* A summary is one line by the time it is written back out — the emitter
     folds it, because frontmatter has no multi-line scalar here. So fold it
     on the way IN as well, or the two disagree the moment a paragraph
     contains a soft line break. Caught on the real
     courses/theoretical-minimum.course.md, whose opening paragraph is two
     lines: the summary round-tripped folded, stopped matching the intro's
     first paragraph, and the paragraph appeared TWICE on the second pass. */
  const fold = s => String(s == null ? '' : s).replace(/\s*\n+\s*/g, ' ').trim();
  const summary = clean(meta.summary) ? fold(clean(meta.summary)) : fold(paras[0] || '');
  const intro = (paras.length && fold(paras[0]) === summary
    ? paras.slice(1).join('\n\n')
    : pre).trim();

  const lesson = {
    title,
    summary,
    track: clean(meta.track) || 'Your own lessons',
    level: Number(meta.level) || 101,
    steps: steps.map(s => {
      const body = tidy(s.lines);
      /* ★ A MODULE CAN NAME ITS BOOK. `**Reading:** <title>` — the same bold
         label convention the format already uses for Practice and Reflection,
         which is why the drafting prompt can ask for it in one line.

         It is LIFTED OUT of the body rather than left in it: a title sitting
         in prose is a sentence, and a title in a field is a door. The Board
         turns it into "📖 open it". The line is removed from the body so it
         does not render twice, and the emitter writes it back — so this
         survives being handed on, which a sentence would not.

         Matched loosely on purpose (rule 6): what a model writes is a TITLE,
         and what the shelf has is a slug. Resolving one to the other is the
         Board's job and needs a human press, because
         "2018_dc-electrical-circuits-workbook" will never automatically be
         "James Fiore's DC Electrical Circuit Analysis". */
      const m = /^\*\*Reading:\*\*\s*(.+?)\s*$/m.exec(body);
      const step = { title: s.title, body: m ? body.replace(m[0], '').replace(/\n{3,}/g, '\n\n').trim() : body };
      if (m && m[1]) step.reading = clean(m[1]);
      return step;
    }),
    by,
    mine: true,
  };
  if (intro) lesson.intro = intro;
  if (meta.reading) lesson.book = { slug: clean(meta.reading) };
  if (meta.license) lesson.license = clean(meta.license);
  if (meta.source) lesson.source = clean(meta.source);
  /* The five promoted 2026-08-14. `purpose` and `outcome` are the standard's
     required pieces 1 and 5; `category` is the Course Board's own vocabulary
     arriving under its own name at last. */
  if (meta.purpose) lesson.purpose = clean(meta.purpose);
  if (meta.audience) lesson.audience = clean(meta.audience);
  if (meta.outcome) lesson.outcome = clean(meta.outcome);
  if (meta.category) lesson.category = clean(meta.category);
  for (const k of LIST_KEYS) {
    if (Array.isArray(meta[k]) && meta[k].length) lesson[k] = meta[k].slice();
    else if (meta[k]) lesson[k] = [clean(meta[k])];
  }
  /* Unknown keys ride along rather than being dropped — a file from a
     newer Pavilion must survive a trip through an older one. */
  if (Object.keys(extra).length) lesson.extra = extra;

  return { ok: true, lesson, problems: [] };
}

/* ---------- writing it out ----------
   ONE EMITTER, and it is not this file's. data/lesson-doc.js has written the
   teacher-facing Markdown document since 2026-08-03 — for the steward's friend
   who teaches English, which is the same person this whole round trip is for.
   Adding a second writer here would have been rule 4's exact shape, so this
   asks that one for its portable form instead.

   npm test asserts parse(emit(x)) === x rather than trusting it. */
export function emitCourse(lesson) {
  return lessonToMarkdown(lesson || {}, { frontmatter: true });
}

/* ================================================================
   [THE BOARD AND THE DOCUMENT] — two shapes for one idea, joined.

   `data.courses` (the Course Board) and `data.myLessons` (the Learning
   Tree) diverged in July and have disagreed ever since: a Board step was
   {title, practice, url, done}, a Tree step {title, body}. Step 4 of
   plans/COURSE-AUTHORING-AND-IMPORT.md named it and deliberately left it.

   The steward settled it 2026-08-14: the COURSE BOARD is where courses
   live and are walked; the Learning Tree becomes the visual map of what
   you might want to do and points here. So the Board's step gains `body`
   — ADDITIVELY, so every course pinned before today renders unchanged —
   and these two functions are the only place the two shapes meet.

   They are a PAIR ON PURPOSE. `emitCourse` still delegates to
   data/lesson-doc.js, the one and only Markdown writer; a Board course
   reaches it by becoming a lesson first, never by growing a second
   emitter here. npm test fails the build if one appears.
   ================================================================ */

/* A course carries the standard's own vocabulary in `category`
   ("Skill", "Study"); the Board keeps a lowercase id. The allowed ids are
   passed IN rather than restated here, because a second copy of that list
   is rule 4's exact shape and this file is pure. */
function categoryId(v, allowed) {
  const want = String(v == null ? '' : v).trim().toLowerCase();
  const list = allowed && allowed.length ? allowed : [];
  return list.includes(want) ? want : 'personal';
}

export function courseFromLesson(lesson, opts) {
  const L = lesson || {};
  const o = opts || {};
  const c = {
    id: o.id || Date.now(),
    title: L.title || 'A course',
    /* The Board has always shown one line under the title. A full course
       has a purpose; a checklist has whatever the person typed. */
    why: L.purpose || L.summary || '',
    category: categoryId(L.category, o.categories),
    due: o.due || null,
    steps: (L.steps || []).map(s => ({
      title: s.title || '',
      body: s.body || '',
      /* The title the module names. `bookSlug` is what the person confirmed it
         resolves to on their shelf — kept apart deliberately, because the
         title travels with the course and the slug is only true here. */
      ...(s.reading ? { reading: s.reading } : {}),
      practice: s.practice || '',
      url: s.url || '',
      done: false,
    })),
    begun: o.today || '',
    archived: false,
  };
  /* The full-course half. Every one of these is absent on a checklist and
     absent is the whole distinction, so none of them is defaulted. */
  if (L.summary) c.summary = L.summary;
  if (L.intro) c.intro = L.intro;
  if (L.purpose) c.purpose = L.purpose;
  if (L.audience) c.audience = L.audience;
  if (L.outcome) c.outcome = L.outcome;
  if ((L.prerequisites || []).length) c.prerequisites = L.prerequisites.slice();
  if ((L.baseline || []).length) c.baseline = L.baseline.slice();
  if (L.track) c.track = L.track;
  if (L.level) c.level = L.level;
  if (L.by) c.by = L.by;
  if (L.license) c.license = L.license;
  if (L.source) c.source = L.source;
  if (L.book) c.book = L.book;
  if (L.extra) c.extra = L.extra;
  /* THE CLAIM, not the check. `standard` says which contract this course
     is under; courseStanding() says whether it is actually met. Keeping
     them apart is the point — a claim nobody checks is decoration. */
  c.standard = courseStanding(c).full ? 'high' : 'simple';
  return c;
}

export function lessonFromCourse(course) {
  const c = course || {};
  const L = {
    title: c.title || 'A course',
    summary: c.summary || c.why || '',
    track: c.track || 'Your own lessons',
    level: c.level || 101,
    steps: (c.steps || []).map(s => ({ title: s.title || '', body: s.body || '',
                                       ...(s.reading ? { reading: s.reading } : {}) })),
    by: c.by || { who: 'you', user: 'user 1' },
    mine: true,
  };
  if (c.intro) L.intro = c.intro;
  if (c.purpose) L.purpose = c.purpose;
  if (c.audience) L.audience = c.audience;
  if (c.outcome) L.outcome = c.outcome;
  if ((c.prerequisites || []).length) L.prerequisites = c.prerequisites.slice();
  if ((c.baseline || []).length) L.baseline = c.baseline.slice();
  if (c.category) L.category = c.category;
  if (c.license) L.license = c.license;
  if (c.source) L.source = c.source;
  if (c.book) L.book = c.book;
  if (c.extra) L.extra = c.extra;
  return L;
}

/* ---------- simple checklist, or full course? ----------

   THE TWO MODES HAVE TO STAY LOUD. Rich courses and thin checklists share
   `data.courses` now, so a three-line list must never be able to LOOK like
   a course somebody could hand to a stranger. This decides which it is,
   and it decides from what the record actually holds — never from what the
   record CLAIMS in `standard`.

   ⚠ WHAT THIS DOES NOT CHECK, said plainly rather than implied.
   plans/HIGH-STANDARD-COURSE-CREATION-GUIDE.md lists SEVEN required
   pieces. Four of them — baseline, theoretical minimum, the daily
   commitment, and the blank-page gate — have nowhere to live in a course
   record yet, so this function cannot see them and does not pretend to.
   `full` here means "this is a real multi-module course with explanatory
   text, an intention and a stated outcome", which is the honest claim the
   badge makes. It is NOT the graduation gate and must not be read as one.
   The remaining pieces arrive with Phase B½ of
   plans/RICH-COURSE-IMPORT-AND-AUTHORING-PATHWAY.md. */
export function courseStanding(course) {
  const c = course || {};
  const steps = c.steps || [];
  const bodied = steps.filter(s => {
    const b = String(s.body || '').trim();
    return b.length >= 120 || /\n\s*\n/.test(b);
  });

  const has = {
    intention: !!(String(c.intro || '').trim() || String(c.purpose || '').trim()),
    outcome: !!String(c.outcome || '').trim(),
    modules: steps.length >= 2 && bodied.length >= 2,
    attribution: !!(String(c.license || '').trim() || (c.by && c.by.user)),
    prerequisites: !!(c.prerequisites || []).length,
  };

  /* The three that decide it. Attribution and prerequisites are reported
     so the ready-for-others checklist has them, but a course is not
     demoted to a checklist for lacking a licence line. */
  const full = has.intention && has.outcome && has.modules;

  const missing = [];
  if (!has.intention) missing.push('No opening intention — say what the real question or goal is, in a `purpose:` line or a paragraph before the first module.');
  if (!has.outcome) missing.push('No stated outcome — say what a person will be able to do at the end, in an `outcome:` line.');
  if (!has.modules) {
    missing.push(steps.length < 2
      ? 'Only one module — a course another person can walk needs at least two.'
      : 'The modules have no explanatory text — a heading and a one-line note is a checklist, not a course somebody else could follow.');
  }
  if (!has.attribution) missing.push('No licence or author — needed before this can be handed to anyone else.');
  if (!has.prerequisites) missing.push('No prerequisites — say what someone needs before they start, even if the answer is nothing.');

  return {
    full,
    has,
    missing,
    /* What a person sees. Never "incomplete" or "low" — a personal
       checklist is a legitimate thing to keep, not a failed course. */
    label: full ? 'full course' : 'personal tracking',
    bodied: bodied.length,
    steps: steps.length,
  };
}

/* ---------- the authoring textarea ----------
   ONE TEXTAREA, TWO SHAPES, and the rule for telling them apart is a
   single character sequence so it can be explained in one sentence.

   The line-based form (`Title | one line of body`, one step per line)
   is how every lesson in this Pavilion was written before today and it
   is genuinely the right tool for a three-step lesson you are jotting
   down. It stays.

   The moment the text contains a `## ` heading it is the portable
   format instead, which is what you get when you paste in something a
   model wrote. No mode switch, no radio button: the text says which it
   is. */
export function looksLikeCourseMd(text) {
  return /^##\s+\S/m.test(String(text || ''));
}

/* Parse whichever the visitor actually typed. Returns the same shape as
   parseCourse so one caller handles both. */
export function parseSteps(text, opts) {
  if (looksLikeCourseMd(text)) return parseCourse(text, opts);
  const steps = String(text || '').split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => { const [t, ...rest] = l.split('|'); return { title: (t || '').trim(), body: rest.join('|').trim() }; })
    .filter(s => s.title);
  if (!steps.length) {
    return { ok: false, lesson: null,
             problems: ['A lesson needs at least one step — one per line, or `## Heading` sections.'] };
  }
  return { ok: true, lesson: { steps }, problems: [] };
}

/* The inverse, for putting an existing lesson back INTO the textarea to
   edit. A lesson whose bodies are all single-line goes back as the
   simple form; anything with a paragraph in it has to go back as
   Markdown or editing would silently truncate it. */
export function stepsToText(steps) {
  const list = steps || [];
  const multi = list.some(s => /\n/.test(String(s.body || '')));
  if (!multi) return list.map(s => s.title + (s.body ? ' | ' + s.body : '')).join('\n');
  return list.map(s => '## ' + s.title + (s.body ? '\n\n' + s.body : '')).join('\n\n');
}
