/* ================================================================
   [NOTE VERSIONS] — a note keeps its history, and nothing you wrote
   is ever overwritten.

   Built 2026-08-04. The steward's own answer to how far an AI may
   reach into his writing, and it was better than any of the three
   options offered:

     "we can have tags like original, then ai cleanup or somthing like
      that, it should feel like git and flow into the backend"

   SO: LINEAR HISTORY, TAGGED. Not branching, not merging — those would
   be git cosplay. What makes git feel safe is one property and this
   file exists to hold it:

       NOTHING THAT WAS WRITTEN IS EVER REPLACED OR REMOVED.

   An improvement is a NEW version appended beside the old one. A
   restore is also an append — going back adds to the history rather
   than cutting it off, which means there is no sequence of presses
   that can lose a sentence. That is the whole design.

   `note.text` stays the CURRENT version, so every existing reader of
   data.bookNotes — gatherNotes(), the four doors, the desk, export,
   the Study Table — keeps working with no change at all. A note with
   no `versions` is a note with one version: an absent field, not a
   migration to run.

   Pure: no DOM, no imports. `npm test` holds the invariant.
   ================================================================ */

/* The tags that mean something to the app. The visitor may write any
   others they like — this is not a closed list, it is the handful the
   code itself creates. */
export const TAG_ORIGINAL = 'original';
export const TAG_AI = 'ai-cleanup';

const now = () => new Date().toISOString().slice(0, 10);
const clean = s => String(s == null ? '' : s);

/* Every note has a history, including the ones written before this file
   existed. Those get a single `original` synthesised from their own text
   — read-only, invented on the way out, never written back into the save
   until something actually adds a version. */
export function versionsOf(note) {
  if (!note) return [];
  const v = Array.isArray(note.versions) ? note.versions.filter(x => x && typeof x.text === 'string') : [];
  if (v.length) return v;
  return [{ text: clean(note.text), tag: TAG_ORIGINAL, ts: note.ts || '' }];
}

/* The current text is the last version. Kept as `note.text` as well, so
   nothing else in the application has to know versions exist. */
export function currentText(note) {
  const v = versionsOf(note);
  return v.length ? v[v.length - 1].text : clean(note && note.text);
}

/* APPEND. The only way a note ever changes.

   Returns the note. Refuses a version identical to the current one —
   not to be clever, but because a history full of "and then nothing
   happened" is a history nobody reads, and the button that produced it
   would look broken. */
export function addVersion(note, text, tag, by) {
  if (!note) return note;
  const body = clean(text).trim();
  if (!body) return note;
  const history = versionsOf(note).slice();
  if (history.length && history[history.length - 1].text.trim() === body) return note;
  history.push({ text: body, tag: clean(tag) || TAG_AI, ts: now(), ...(by ? { by } : {}) });
  note.versions = history;
  note.text = body;                       // the current version, where everything else looks
  return note;
}

/* RESTORE IS ALSO AN APPEND. Going back to what you wrote adds it to the
   end rather than truncating the history — so "undo" can itself be
   undone, and there is no press that destroys anything. This is the one
   decision that makes the whole feature safe to hand an AI. */
export function restoreVersion(note, index) {
  const history = versionsOf(note);
  const want = history[index];
  if (!want) return note;
  return addVersion(note, want.text, want.tag === TAG_ORIGINAL ? TAG_ORIGINAL : want.tag, want.by);
}

/* For the history strip: what to show, newest last, with the current one
   marked. Deliberately not the note's whole text — a strip you can scan. */
export function versionSummary(note, width = 60) {
  const v = versionsOf(note);
  return v.map((x, i) => ({
    i, tag: x.tag, ts: x.ts, by: x.by || '',
    current: i === v.length - 1,
    preview: x.text.length > width ? x.text.slice(0, width).trim() + '…' : x.text,
  }));
}

/* Has anything actually happened to this note? Used to decide whether a
   history strip is worth showing at all — one version is not a history. */
export function hasHistory(note) { return versionsOf(note).length > 1; }

/* ================================================================
   WHO WROTE IT — added 2026-08-09, and it is the same argument as the
   file above it: a note is safe to hand an AI only while it is clear
   whose words are whose.

   THE BUG THIS CLOSES. saveAiBookNote() wrote the assistant's prose
   into data.bookNotes marked by nothing but a '✨ ' at the front of
   the text. gatherNotes() pulled every book note into the pool the
   residents search and dropped even that. And deskDraftLesson()
   handed the lot to a model under the heading "THEIR OWN NOTES ON
   THIS BOOK" — so the assistant's own earlier output came back to it
   as the visitor's writing. Exactly one consumer in the codebase
   checked, and it checked with /^✨ /.

   ATTRIBUTION, NOT EXCLUSION. The first plan filtered AI notes out of
   grounding. The steward overruled it:

     "im fine with leaving [them] in the sand pavilion, just let them
      be labeled ai notes, and have the username of the person who put
      them in or user 1 untill we do a username and password. this way
      we dont degade the books there but we can also have people post
      the notes they think are important and just give a reason why"

   He is right, and the reason is the one this whole project runs on:
   throwing away a real note to fix a LABELLING problem is a worse
   trade. The note stays. It says who wrote it.

   A FIELD, NOT A PREFIX:

       note.by = { who:'ai'|'you', user:'user 1', model:'llama3.2:3b' }

   A prefix is a string one edit away from lying, it cannot name WHICH
   model, and it cannot name the person who was sitting there. A field
   can do all three.
   ================================================================ */

/* WHO IS SITTING HERE. One seam, so when the profile lands
   (THE-TUTORIAL-AND-SIGNING-IN.md §3) exactly one function changes and
   every note written since today gets a real name beside it.

   Injected rather than imported, because this file's whole value is
   being pure — the same pattern as initProviderSettings() in
   ai/provider.js. Nothing calls it? Then everyone is "user 1", said
   out loud rather than left blank. */
let readProfile = () => ({});
export function initNoteAuthor(fn) { if (typeof fn === 'function') readProfile = fn; }
export const ANON_USER = 'user 1';
export function currentUser() {
  const p = readProfile() || {};
  const name = String(p.name || '').trim();
  return name || ANON_USER;
}

/* THE STAMP. Put on a note at the moment it is written, by whichever of
   the two writers wrote it. `model` is only meaningful for 'ai'. */
export function byLine(who, model) {
  const b = { who: who === 'ai' ? 'ai' : 'you', user: currentUser() };
  if (b.who === 'ai' && model) b.model = String(model);
  return b;
}

/* THE PREDICATE THAT REPLACES EVERY /^✨ / — and the reason it has to
   read the old shape as well as the new one: 415 books' worth of notes
   already exist with no `by` at all. This infers at READ time. There is
   no migration, nothing is rewritten, and a save that never opens this
   version is not left broken.

   AN EXPLICIT `by` BEATS THE PREFIX, in both directions. A person may
   perfectly well type ✨ at the start of their own note, and once we
   are stamping notes properly that must not turn their writing into the
   assistant's. The prefix is a fallback for history, never an override. */
export const AI_PREFIX = '✨ ';
export function isAiNote(note) {
  if (!note) return false;
  const who = note.by && note.by.who;
  if (who === 'ai') return true;
  if (who === 'you') return false;
  return String(note.text || '').startsWith(AI_PREFIX);
}

/* IN WORDS, because both a person and a model read this. The model gets
   it in a prompt, which is the whole point — the bug was never that a
   model SEES an AI note, it is that the model was told a person wrote
   it. */
export function authorOf(note) {
  const b = (note && note.by) || {};
  const user = String(b.user || '').trim() || currentUser();
  if (isAiNote(note)) {
    return b.model ? `the AI (${b.model}), for ${user}` : `the AI, for ${user}`;
  }
  return user;
}

/* ONE NOTE AS A LINE A MODEL CAN PARSE, and the reason this is a function
   rather than string concatenation at three call sites.

   A book note is often several paragraphs — an AI note always is, since it
   opens with its own "✨ Analysis of this page (AI)" heading. Written as
   "- [author] first line\nsecond line", the second line reads as a SECOND
   list item with no attribution at all, which is the original bug in
   miniature. Continuation lines are indented under the label so the whole
   note is visibly one person's. Found 2026-08-09 by reading the request body
   the model was actually sent. */
export function labelledNote(note, prefix) {
  const body = String((note && note.text) || '').trim().split('\n');
  const head = '- [' + authorOf(note) + '] ' + (prefix ? prefix + ' ' : '') + (body.shift() || '');
  return body.length ? head + '\n' + body.map(l => '    ' + l).join('\n') : head;
}

/* Read-time backfill for anything that wants the whole shape rather than
   the two questions above — never written back to the save. */
export function attributionOf(note) {
  if (note && note.by && note.by.who) return note.by;
  return { who: isAiNote(note) ? 'ai' : 'you', user: currentUser(), inferred: true };
}
