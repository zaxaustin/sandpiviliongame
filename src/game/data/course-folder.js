/* ================================================================
   [THE COURSE FOLDER] — what a course looks like as plain files.

   The steward, 2026-08-15:

     "i also wanna see where we're gonna hold all these files together and if
      we can combine them all into a course folder that people can access in
      the back end."

   "The back end" here means a real directory of real files, not a database a
   person cannot see. So a course on disk is:

     courses/<slug>/
       README.txt      what this folder is, in plain words
       course.md       the course itself, portable, re-importable
       syllabus.md     what it is, how long, what it reads, what you do
       work/NN-<module>.md   your attempts at that module, newest last
       handouts/       anything printed

   ⚠ NOTHING HERE WRITES MARKDOWN. `course.md` is lessonFromCourse() ->
   lessonToMarkdown(), the one emitter, which has been the only Markdown writer
   in this project since the format existed. This file decides WHAT files there
   are and WHERE they go; a second formatter would be a second thing to keep in
   step with the format, and the round-trip guard would stop meaning anything.

   PURE. It returns a list of { sub, name, content } and touches no disk and no
   window — so `npm test` can assert the whole file set without Electron, and
   the two callers (desktop bridge, browser download) share one answer.
   ================================================================ */

import { lessonFromCourse, courseSyllabus } from './course-format.js';
import { lessonToMarkdown, lessonFileName } from './lesson-doc.js';

/* THE FOLDER'S NAME. lessonFileName() already turns a title into a findable
   slug and is what the export button uses, so the folder and the file a person
   downloads are named the same way — one rule, not two. */
export function courseSlug(course) {
  return lessonFileName({ title: (course && course.title) || 'course' }, 'md').replace(/\.md$/, '');
}

/* One work file per module, named so an `ls` reads in course order. */
export function workFileName(course, i) {
  const step = ((course && course.steps) || [])[i] || {};
  const n = String(Number(i) + 1).padStart(2, '0');
  const slug = lessonFileName({ title: step.title || ('module ' + n) }, 'md').replace(/\.md$/, '');
  return n + '-' + slug + '.md';
}

const SAID_WORDS = {
  'not-yet': 'not yet', 'with-help': 'with my notes', 'on-my-own': 'on my own',
};
const said = id => SAID_WORDS[id] || '';

/* YOUR WORKING, AS A DOCUMENT. Written for the person who opens the folder in
   six months, so it leads with the date and the two honest answers and then
   gives the words exactly as typed. No headings inside the attempt — those are
   the author's words and this must not reformat them. */
export function workMarkdown(course, i, attempts) {
  const step = ((course && course.steps) || [])[i] || {};
  const lines = [
    '# ' + (step.title || ('Module ' + (Number(i) + 1))),
    '',
    '_Your attempts at this module, from the Learning Desk. Nothing here was',
    'written by a model, and nothing here has been marked._',
    '',
  ];
  for (const a of (attempts || [])) {
    lines.push('## ' + (a.at || 'undated'));
    const chips = [];
    if (a.before) chips.push('beforehand you said: **' + said(a.before) + '**');
    if (a.after) chips.push('afterwards: **' + said(a.after) + '**');
    if (chips.length) { lines.push('', chips.join(' · ')); }
    lines.push('', String(a.text || '').trim());
    if (a.stuck) lines.push('', '> Where I got stuck: ' + String(a.stuck).trim());
    lines.push('');
  }
  return lines.join('\n');
}

/* The syllabus as a page — derived, never authored, so it can be rewritten on
   every save without losing anything a person typed. `owned` is the caller's
   shelf predicate, exactly as courseSyllabus() takes it. */
export function syllabusMarkdown(course, owned) {
  const s = courseSyllabus(course, owned);
  const lines = ['# ' + ((course && course.title) || 'A course'), ''];
  if (s.what) lines.push(s.what, '');
  const bits = [s.modules + ' module' + (s.modules === 1 ? '' : 's')];
  bits.push(s.howLong || 'no length stated');
  if (s.practices) bits.push(s.practices + ' practice' + (s.practices === 1 ? '' : 's'));
  if (s.artifacts.length) bits.push(s.artifacts.length + ' thing' + (s.artifacts.length === 1 ? '' : 's') + ' you make');
  lines.push(bits.join(' · '), '');
  if (s.outcome) lines.push('**You end with:** ' + s.outcome, '');
  if (s.texts.length) {
    lines.push('## What it reads', '');
    for (const t of s.texts) {
      lines.push('- ' + (t.have ? '✓' : '○') + ' ' + t.title + (t.why ? ' — ' + t.why : ''));
    }
    lines.push('');
    if (s.missing) lines.push('_' + s.missing + ' of these ' + (s.missing === 1 ? 'is' : 'are')
      + ' not on your shelf yet._', '');
  }
  if (s.artifacts.length) {
    lines.push('## What you make', '');
    for (const a of s.artifacts) lines.push('- ' + String(a).replace(/\n+/g, ' ').trim());
    lines.push('');
  }
  return lines.join('\n');
}

export function readmeText(course, slug) {
  return [
    'THIS FOLDER IS A COURSE.',
    '',
    (course && course.title) || 'A course',
    '',
    'It was written out by the Sand Pavilion, and it is yours. Everything here',
    'is plain text — you can read it, edit it, copy it onto a stick, or open it',
    'in any editor, with or without the Pavilion running.',
    '',
    '  course.md    the course itself. This is the whole thing, in the format',
    '               the Pavilion reads back in — hand this file to someone and',
    '               they can walk the same course.',
    '  syllabus.md  what it is, how long, what it reads, what you do. Worked',
    '               out from the modules, so it is never out of date.',
    '  work/        what YOU wrote at the Learning Desk, one file per module,',
    '               with the dates. This is the part nobody else has.',
    '  handouts/    anything you printed.',
    '',
    'NOTHING HERE IS SENT ANYWHERE. This folder exists on this computer only.',
    'If you want someone else to have the course, give them course.md — and',
    'note that work/ is your own working and is not part of it.',
    '',
    'Folder name: ' + slug,
  ].join('\n');
}

/* ★ THE WHOLE FILE SET, in one pure function.
   `attemptsFor(courseId, i)` and `owned(step)` are supplied by the caller —
   this file knows nothing about a save or a shelf. */
export function courseFolderFiles(course, { attemptsFor, owned } = {}) {
  const slug = courseSlug(course);
  const files = [
    { sub: '', name: 'README.txt', content: readmeText(course, slug) },
    /* THE ONE EMITTER. Not a template here. */
    { sub: '', name: 'course.md', content: lessonToMarkdown(lessonFromCourse(course), { frontmatter: true }) },
    { sub: '', name: 'syllabus.md', content: syllabusMarkdown(course, owned) },
  ];
  const steps = (course && course.steps) || [];
  for (let i = 0; i < steps.length; i++) {
    const list = typeof attemptsFor === 'function' ? (attemptsFor(course.id, i) || []) : [];
    if (!list.length) continue;      // no attempt, no file — an empty file is a lie about having worked
    files.push({ sub: 'work', name: workFileName(course, i), content: workMarkdown(course, i, list) });
  }
  return { slug, files };
}
