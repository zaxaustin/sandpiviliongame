/* ================================================================
   [BACKEND TROUBLE] — the two ways a database can be open and still
   be wrong, and the words for each.

   Kept OUT of overlays.js, and DOM-free, for one reason: this is the
   line that decides whether a fault is visible, and the fault class it
   covers is the most expensive one this project has. It should be
   testable by `npm test` in a second, without a browser, forever.

   WHY IT EXISTS AT ALL. On 2026-08-04 an array parameter made every
   Records Hall write fail on the embedded database, and the title
   screen read "● Built-in database — your shelves, chapters and notes
   are indexed" the entire time. It was telling the truth about the only
   thing it asked: a read-only ping. Finding it took a hand-written
   probe.

   A FAILED READ IS SELF-REPORTING — the panel is empty and you go
   looking. A FAILED WRITE IS NOT: it shows up weeks later as something
   missing that nobody watched being saved. So these outrank the healthy
   line and the storage-ceiling warning both.

   Order matters: a write failure is the more urgent of the two, because
   a behind-schema database usually cannot write either, and naming the
   schema would send someone to fix the wrong thing.
   ================================================================ */

/* Returns null when there is nothing wrong — the caller then shows its
   ordinary line. Never throws, and tolerates a null status, because it
   runs on a path that must survive having no database at all. */
export function backendTrouble(st){
  if(!st || !st.up) return null;          // "not open" is a different message
  if(st.writeError){
    return {
      kind: 'write',
      text: '⚠ The database is open but something did not save — ' + st.writeError
          + '. Your work is still in your save; the index is what is behind.',
    };
  }
  if(st.schemaError){
    return {
      kind: 'schema',
      text: '⚠ The database is open but its schema is behind — ' + st.schemaError
          + '. Some rooms may not find what they expect.',
    };
  }
  return null;
}
