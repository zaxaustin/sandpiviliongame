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
