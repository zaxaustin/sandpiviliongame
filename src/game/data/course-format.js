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
   the Pavilion must not lose fields on a round trip through this one. */
const KNOWN = ['title', 'summary', 'track', 'level', 'reading', 'author',
               'drafted-with', 'license', 'source'];

const clean = s => String(s == null ? '' : s).trim();

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
    for (const line of fm[1].split('\n')) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const at = line.indexOf(':');
      if (at < 0) { problems.push(`Could not read the line "${line.trim()}" — frontmatter is "key: value".`); continue; }
      const k = line.slice(0, at).trim().toLowerCase();
      const v = clean(line.slice(at + 1));
      if (KNOWN.includes(k)) meta[k] = v; else extra[k] = v;
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
     under the title and an italic provenance footer under a `---` rule. Both
     are rendered FROM the frontmatter, so reading them back as prose would
     duplicate them on every round trip. Dropped, not parsed. */
  const tidy = a => a.join('\n')
    .replace(/^\s*\*[^*\n]+\*\s*$/gm, '')
    .replace(/^---\s*$[\s\S]*?_Written in the Sand Pavilion[^_]*_\s*$/m, '')
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

  const lesson = {
    title,
    summary: clean(meta.summary) || tidy(preamble).split('\n\n')[0] || '',
    track: clean(meta.track) || 'Your own lessons',
    level: Number(meta.level) || 101,
    steps: steps.map(s => ({ title: s.title, body: tidy(s.lines) })),
    by,
    mine: true,
  };
  if (meta.reading) lesson.book = { slug: clean(meta.reading) };
  if (meta.license) lesson.license = clean(meta.license);
  if (meta.source) lesson.source = clean(meta.source);
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
