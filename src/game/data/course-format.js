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
               'baseline', 'duration'];

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
      /* ★ ANY MARKDOWN BULLET, not just YAML's. Found 2026-08-15 the first
         time a real person ran the real prompt through a real model: ChatGPT
         returned `* "A basic familiarity with Buddhism and meditation."` and
         the course was refused with eight problems.

         `-` is what YAML says and what the prompt's example shows. `*` and
         `+` are what a model trained on Markdown reaches for anyway, and it
         is not wrong — it is the same list. Insisting on one of three
         interchangeable bullets is the parser being right in a way that helps
         nobody, and it is the SAME failure as the original block-list bug:
         the format the person's model actually writes is not the format the
         parser accepts. That has now cost two imports, so this accepts all
         three rather than waiting for a third. */
      const item = /^\s*[-*+]\s+(.*\S)\s*$/.exec(line);
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
      /* TWO LABELS, NOT ONE LINE WITH A SEPARATOR — and the steward's own
         shelf is why. He has a book called "The First Sermon — Setting the
         Wheel of Dhamma Turning". Splitting `**Reading:** title — why` on a
         dash would have eaten half of that title and matched nothing. Bold
         labels are what this format already uses for Objective, Body,
         Practice and Reflection, so a second one costs no new convention and
         cannot collide with punctuation inside a title. */
      let rest = body;
      const lift = (label) => {
        const re = new RegExp('^\\*\\*' + label + ':\\*\\*\\s*(.+?)\\s*$', 'm');
        const hit = re.exec(rest);
        if (!hit) return '';
        rest = rest.replace(hit[0], '');
        return clean(hit[1]);
      };
      const reading = lift('Reading');
      /* WHY THIS TEXT. Asked for after the first real course came back naming
         a real book from his shelf and saying nothing about it — "it gives
         the books but dosent explain why". A citation without a reason is a
         reading list; with one it is teaching. */
      const why = lift('Why this text');
      const step = { title: s.title, body: rest.replace(/\n{3,}/g, '\n\n').trim() };
      if (reading) step.reading = reading;
      if (why) step.readingWhy = why;
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
  /* How long this takes — the ONE part of a syllabus that cannot be derived
     from the modules, so it is the one part the frontmatter has to carry. */
  if (meta.duration) lesson.duration = clean(meta.duration);
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
      ...(s.readingWhy ? { readingWhy: s.readingWhy } : {}),
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
  if (L.duration) c.duration = L.duration;
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
                                       ...(s.reading ? { reading: s.reading } : {}),
                                       ...(s.readingWhy ? { readingWhy: s.readingWhy } : {}) })),
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
  if (c.duration) L.duration = c.duration;
  if (c.license) L.license = c.license;
  if (c.source) L.source = c.source;
  if (c.book) L.book = c.book;
  if (c.extra) L.extra = c.extra;
  return L;
}

/* ================================================================
   [THE SYLLABUS] — what this is, how long, what it reads, what you do.

   The steward, after building his first real course end to end:

     "there should be like a syllabus in the beginning first… explain what
      the course would be, how long it would take, what kind of material we
      cover and what are you expected to do."

   ALMOST ALL OF IT IS DERIVED, and that is the point. The modules already
   say what they read (`**Reading:**`) and what they ask of you
   (`**Practice:**`, `**Artifact:**`). Deriving the syllabus from them means
   an author writes nothing twice, and a syllabus cannot drift from the
   course it summarises — which is rule 4 rather than tidiness. The one
   thing that genuinely is not derivable is how long it takes, so that is
   the one thing the frontmatter has to carry.

   PEEK, DO NOT LIFT. `**Reading:**` is metadata about a module and was
   lifted out of its body; `**Practice:**` and `**Artifact:**` are content a
   person reads in place, so these are read WITHOUT removing them. The body
   still renders exactly as its author wrote it. This is the promotion
   course-format.js invited in its own header — "they can be promoted the
   moment something actually consumes one" — done non-destructively.
   ================================================================ */
/* ---- THE MODULE'S CONTRACT WITH YOU ----

   Extended 2026-08-15, from the steward reading both of his real courses back:

     "the first thing I see is do something in Falstead — that is exactly the
      kind of material that people need to self study. I don't want to give
      people guard rails but I want to give people more guidance on THIS IS
      HOMEWORK, THIS IS THE THEORY, and THIS IS THE LEVEL I EXPECT YOU TO BE AT
      at the end of this part of the course. Small attainable goals that are
      digested one by one."

   and, on the meditation course:

     "there's not enough homework… no preliminary stress of GO READ THE BOOK…
      I should say do it once, see how you feel, write a report, and keep going
      for 20 days."

   Three labels answer all of that, and each one closes a required piece of
   plans/HIGH-STANDARD-COURSE-CREATION-GUIDE.md that this file's own header
   said had "nowhere to live in a course record yet":

     **Theory:**     the few things you must be able to rebuild from scratch,
                     not recall — required piece 3, the theoretical minimum,
                     PER MODULE rather than once for the whole course.
     **By the end:** the level expected when this part is finished. Required
                     piece 6's gate, made small and attainable and repeated,
                     which is his "digested one by one".
     **Repeat:**     "20 days", "once", "3 sessions". Some practice is done
                     once and understood; some is only understood by doing it
                     for a month. The format could not tell those apart.

   ADDITIVE AND PEEKED, like Practice and Artifact — they live in the body,
   nothing is lifted out of it, and every course written before today renders
   exactly as it did. */
/* The label is what an author writes; the key is what code reads. They were
   the same string until "By the end" arrived and produced `parts['by the end']`
   — a property nobody can reach without quoting, which is how a field ends up
   read in one place and misspelled in another. Named explicitly instead. */
const PART_LABELS = [
  { label: 'Objective',  key: 'objective' },
  { label: 'Theory',     key: 'theory' },
  { label: 'Practice',   key: 'practice' },
  { label: 'Reflection', key: 'reflection' },
  { label: 'Artifact',   key: 'artifact' },
  { label: 'By the end', key: 'byTheEnd' },
  { label: 'Repeat',     key: 'repeat' },
];
export function moduleParts(body) {
  const src = String(body == null ? '' : body);
  const out = {};
  for (const { label, key } of PART_LABELS) {
    /* Everything from the label up to the next bold label at the start of a
       line, or the end of the body. A practice is often several bullets, not
       one line.

       ⚠ NO `m` FLAG, AND THAT IS THE WHOLE POINT. It had one, and under `m`
       the `$` in the lookahead matches END OF LINE — so a lazy match stopped at
       the first newline and every multi-line part was silently truncated to its
       first bullet. LOOKING at the Learning Desk on 2026-08-15 is what found
       it: the real Junior EE module asks for three things and the screen showed
       one, with two whole practices missing and nothing to indicate it.

       Invisible to every test until then, and invisible for exactly the reason
       rule 1 names: the guard fed it a tidy one-line fixture
       ("**Practice:** do it.") and the syllabus only ever COUNTED parts rather
       than rendering them. The guard reads the real course file now.

       `(?:^|\n)` replaces the flag's job of anchoring the label to a line
       start; `$` without `m` is the end of the string, which is what was
       meant. */
    const re = new RegExp('(?:^|\\n)\\*\\*' + label + ':\\*\\*[ \\t]*([\\s\\S]*?)(?=\\n\\*\\*[A-Z][^*\\n]*:\\*\\*|$)');
    const hit = re.exec(src);
    if (hit && hit[1].trim()) out[key] = hit[1].trim();
  }
  return out;
}

/* ---- HOW MANY TIMES, AND OVER WHAT ----

   The steward's meditation shape: "do it once, see how you feel, write a
   report, and keep going for 20 days." Some practice is done once and
   understood; some is only understood by doing it for a month, and the format
   had no way to tell those apart.

   ⚠ IT SAYS "I DON'T KNOW" RATHER THAN GUESSING A NUMBER. `Repeat: as often as
   you can` is a perfectly good instruction from an author and a terrible thing
   to invent a target from — a desk reporting "3 of 1" against a number nobody
   wrote is worse than one reporting nothing. No digits, no target, and the
   caller is told plainly that there is a repeat with no count.

   DAYS ARE COUNTED AS DAYS. "20 days" means twenty days, not twenty presses,
   so the caller counts distinct dates — otherwise sitting once and pressing
   keep four times would read as four days of practice, which is the kind of
   flattering lie rule 9 exists to keep out. */
export function repeatSpec(text) {
  const s = String(text == null ? '' : text).trim();
  if (!s) return null;
  /* ⚠ THE NUMBER WINS OVER THE WORD. The first version tested `^once` first,
     so "once a day for 20 days" — which is exactly how a person writes it —
     came back as ONE. A target of 1 for a twenty-day practice is not a small
     error; it tells you that you are finished on the first morning. */
  const byDay = /\b(day|days|daily|morning|mornings|evening|evenings|night|nights)\b/i.test(s);
  const num = /(\d+)/.exec(s);
  if (num) return { times: Number(num[1]), byDay, text: s };
  if (/^once\b/i.test(s)) return { times: 1, byDay, text: s };
  /* "every morning for a month" has no digit in it, and inventing 30 here
     would be a target nobody wrote. Say there is a repeat and no count. */
  return { times: null, byDay, text: s };
}

/* What a person should know before they start. Pure, derived, and it counts
   rather than claims. `owned` is a predicate the caller supplies — this file
   knows nothing about a shelf. */
export function courseSyllabus(course, owned) {
  const c = course || {};
  const steps = (c.steps || []).filter(s => s && (s.body || s.title));
  const texts = [];
  const seen = new Set();
  for (const s of steps) {
    if (!s.reading || seen.has(s.reading.toLowerCase())) continue;
    seen.add(s.reading.toLowerCase());
    texts.push({ title: s.reading, why: s.readingWhy || '',
                 have: typeof owned === 'function' ? !!owned(s) : !!s.bookSlug });
  }
  const parts = steps.map(s => moduleParts(s.body));
  const artifacts = parts.map(p => p.artifact).filter(Boolean);
  const practices = parts.filter(p => p.practice).length;
  /* ★ WHAT THE COURSE ACTUALLY ASKS OF YOU, counted rather than claimed —
     the steward's "this is homework, this is the theory, this is the level I
     expect you to be at." A syllabus that says "9 modules" and nothing about
     the work is a table of contents. */
  const theory = parts.filter(p => p.theory).length;
  const gates = parts.filter(p => p.byTheEnd).length;
  /* The longest sustained practice in the course, because that is the one
     that decides whether you can take this on. Null when an author asked for
     repetition without naming a count — reported as "over days", never as a
     number nobody wrote. */
  const repeats = parts.map(p => repeatSpec(p.repeat)).filter(r => r && (r.times > 1 || r.byDay));
  const longestRepeat = repeats.reduce((best, r) =>
    (r.times && (!best || !best.times || r.times > best.times)) ? r : (best || r), null);
  return {
    what: c.purpose || c.summary || '',
    outcome: c.outcome || '',
    /* NOT derivable, so it is the one thing the frontmatter carries — and it
       is absent far more often than present, which the caller must say
       plainly rather than invent. */
    howLong: c.duration || '',
    modules: steps.length,
    texts,
    missing: texts.filter(t => !t.have).length,
    practices,
    artifacts,
    theory,
    gates,
    repeats: repeats.length,
    longestRepeat,
  };
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
