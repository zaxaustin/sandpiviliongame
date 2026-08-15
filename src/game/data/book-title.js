/* ================================================================
   [A TITLE OFF A FILENAME] — what to call a book nobody titled.

   WHY THIS EXISTS, and it is a measurement rather than a hunch. On
   2026-08-14 the steward said of the books he had just brought in for the
   electrical-engineering course: "they're titled wrong". Six rows, read
   straight out of his own Postgres:

     2018_dc-electrical-circuits-workbook
     2018_electromagnetics_vol-1
     CIRCUIT ANALYSIS  AND DESIGN 3ed
     TattersfieldGeorgeM-ElectricalCircuitAnalysis
     The_Optics_of_Ibn_Al-Haytham_Books_I
     Lessons In Electric Circuits

   Every one of those is a FILENAME. `parseBookFile()` falls back to
   `file.name.replace(/\.epub$/i,'')` when an EPUB carries no title
   metadata and a .txt has no `Title:` line, which is most real downloads —
   Internet Archive, Libgen and a scanned PDF run through pdf-to-text all
   produce exactly these shapes. The book is on the shelf and correct in
   every way except the one a person reads.

   TWO RULES SHAPE THIS FILE.

   Rule 7 — deterministic code first. Splitting camelCase, collapsing
   underscores and casing a sentence are things code does exactly. A model
   would do them approximately, slowly, and differently each time, and this
   runs on every file in a hundred-book drop.

   Rule 6 — say "I don't know". A filename genuinely does not always
   contain the title, and no amount of cleverness recovers what is not
   there. `TattersfieldGeorgeM-ElectricalCircuitAnalysis` is an archive.org
   AuthorTitle identifier and this file deliberately does NOT try to guess
   where the author ends and the work begins — it gets you to
   "Tattersfield George M-Electrical Circuit Analysis" and stops.

   SO NOTHING HERE EVER REWRITES ANYTHING ON ITS OWN. tidyTitle() returns a
   SUGGESTION. The intake shows it beside what the file said and the person
   presses, or edits it, or ignores it. That is rule 9's first question —
   it writes into the visitor's record, so it needs a press — and it is
   also just true that they know what the book is called and this does not.

   Pure: no DOM, no imports, no `data`. Same contract as chapters.js and
   course-format.js.
   ================================================================ */

/* Words that stay lowercase inside a title. Deliberately short — this is
   the conventional English set, not a style guide. */
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from',
  'in', 'into', 'nor', 'of', 'on', 'onto', 'or', 'over', 'the', 'to', 'vs', 'with']);

/* Acronyms this project's own shelves are full of, so `dc` does not become
   `Dc` on a book about direct current. DATA, not logic — extend the list,
   never the rule. Kept to things with exactly one conventional casing. */
const ACRONYMS = new Set(['dc', 'ac', 'rf', 'am', 'fm', 'emf', 'rms', 'pwm', 'led', 'lcd',
  'ic', 'pcb', 'cpu', 'gpu', 'usb', 'pdf', 'html', 'css', 'http', 'api', 'sql',
  'ieee', 'nasa', 'diy', 'faq', 'usa', 'uk', 'ii', 'iii', 'iv', 'vi', 'vii', 'viii', 'ix']);

const EXT = /\.(epub|txt|pdf|mobi|azw3?|djvu|html?)$/i;

/* Does this string appear to be SHOUTING? Ratio rather than "no lowercase
   at all", because `CIRCUIT ANALYSIS AND DESIGN 3ed` has two lowercase
   letters in it and is still shouting. */
function isShouting(s) {
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length < 8) return false;
  const upper = s.replace(/[^A-Z]/g, '').length;
  return upper / letters.length >= 0.8;
}

/* PascalCase and camelCase runs become words. Never applied to an all-caps
   token (`IEEE` must not become `I E E E`).

   ⚠ AND NEVER TO A SHORT ONE. The first version turned `A Guide to LaTeX`
   into `A Guide to La Te X`, caught by running this against titles that
   were already correct rather than only against the broken ones — a
   cleaner that damages good input is worse than no cleaner, because it
   runs on every book in the drop and the good ones are the majority.
   `LaTeX`, `iPhone`, `McKay`, `eBay` are names somebody styled on purpose;
   a run-together filename is long, because it is a whole phrase with the
   spaces taken out. Length is the honest thing that tells them apart. */
const CAMEL_MIN = 12;
function splitCamel(tok) {
  if (/\s/.test(tok) || !/[a-z]/.test(tok) || !/[A-Z]/.test(tok)) return tok;
  if (tok.replace(/[^A-Za-z0-9]/g, '').length < CAMEL_MIN) return tok;
  return tok
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')      // ...fieldGeorge -> ...field George
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');  // HTMLParser    -> HTML Parser
}

/* A hyphen is a separator in `dc-electrical-circuits-workbook` and part of
   the name in `Al-Haytham`. The rule that tells them apart without guessing:
   only split a token that is entirely lowercase/digits. A capital anywhere
   in it means somebody wrote it that way on purpose. */
function splitSlugHyphens(tok) {
  if (/[A-Z]/.test(tok)) return tok;
  if (!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(tok)) return tok;
  /* ⚠ A RANGE IS NOT A SLUG. Found by sweeping all 423 titles in the real
     library rather than the six that prompted this: `Official congressional
     directory, 2011-2012` became `2011 2012`, and `Vols 1-4` became
     `Vols 1 4`. Both are hyphens doing their actual job. If every segment is
     a number, this is a range and nothing here should touch it. */
  if (tok.split('-').every(seg => /^\d+$/.test(seg))) return tok;
  return tok.split('-').join(' ');
}

function caseWord(w, opensClause, titleStart, last) {
  const bare = w.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  if (ACRONYMS.has(bare)) return w.replace(/[A-Za-z]+/, m => m.toUpperCase());
  /* Matched on the BARE word, so a trailing comma cannot hide it. Without
     this, `/ or Chymico-Physical` kept its lowercase `or` and
     `/ or, Glimpses at the…` two shelves over did not — same word, same
     position, two answers, decided by a comma. */
  const small = SMALL.has(bare);
  if (small && !opensClause && !last) return w.toLowerCase();
  /* ⚠ OPENING A CLAUSE PREVENTS DOWNCASING. It does not force upcasing, and
     the difference is the whole of this comment. Two real Gutenberg titles
     in this library disagree about the same position:

       Fifteen Thousand Useful Phrases / A Practical Handbook…
       The Sceptical Chymist / or Chymico-Physical Doubts…

     One capitalises after the slash and one does not, and both are how the
     book is actually titled. So a small word here is returned EXACTLY as
     written. Forcing it either way corrupts one of the two, and there is no
     third answer that is right about both. */
  if (small && opensClause && !titleStart) return w;
  /* Only ever RAISE the case of a word that is entirely lowercase. A word
     the author capitalised oddly (`McKay`, `iPhone`, `LaTeX`) is left
     exactly as written — this cannot know better and should not try. */
  if (/^[a-z]/.test(w) && !/[A-Z]/.test(w)) return w.charAt(0).toUpperCase() + w.slice(1);
  return w;
}

/* ---------- the one function ----------
   Returns a SUGGESTION. Never call this and write the result without
   showing a person first. */
export function tidyTitle(raw) {
  let s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  s = s.replace(EXT, '');
  s = s.replace(/[_ ]+/g, ' ');
  s = s.split(' ').map(splitCamel).join(' ');
  s = s.split(' ').map(splitSlugHyphens).join(' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return '';

  /* A LEADING YEAR IS A PUBLICATION DATE, not the first word of the title.
     Internet Archive prefixes thousands of scans this way. Moved rather
     than dropped — it is real information and losing it would be worse
     than the ugly version. */
  let year = '';
  const y = /^((?:1[4-9]|20)\d{2})\s+(?=\S)/.exec(s);
  if (y && s.length > y[1].length + 4) { year = y[1]; s = s.slice(y[0].length); }

  if (isShouting(s)) s = s.toLowerCase();

  const words = s.split(' ');
  /* A SUBTITLE STARTS A NEW SENTENCE. `iPhone: The Missing Manual` lost its
     capital on `The` until this existed — the small-word rule is about words
     buried inside a title, and a word after a colon or a dash is not buried,
     it is the first word of the next thing.

     `/` is in the list because Project Gutenberg separates title from
     subtitle with one, and this library is full of them. The sweep found six
     at once — `/ A Practical Handbook` had become `/ a Practical Handbook`. */
  const opensClause = i => i === 0 || /[:;/|.?!—–]$/.test(words[i - 1]);
  s = words.map((w, i) => caseWord(w, opensClause(i), i === 0, i === words.length - 1)).join(' ');
  if (year) s += ' (' + year + ')';
  return s;
}

/* An author off a filename has the same underscore problem and none of the
   casing questions — `Ibn_Al-Haytham` only ever needed its underscores back
   as spaces. Deliberately does far less than tidyTitle: a person's name is
   the last thing that should be guessed at. */
export function tidyAuthor(raw) {
  let s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  s = s.replace(/[_ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.split(' ').map(splitCamel).join(' ').replace(/\s+/g, ' ').trim();
  return s;
}

/* Is the suggestion worth showing at all? A title that is already clean must
   not sprout a "did you mean" box beside it — that is noise on every single
   import, and noise is how a real warning stops being read. */
export function titleNeedsTidying(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return false;
  return tidyTitle(s) !== s;
}

/* Does this title look like it came off a filesystem rather than off a book?
   Used to decide whether to say so out loud at intake. Separate from
   `titleNeedsTidying` on purpose: "Lessons In Electric Circuits" wants a
   small correction, "2018_electromagnetics_vol-1" wants an apology. */
export function looksLikeAFilename(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return false;
  return EXT.test(s)
    || /_/.test(s)
    || /^[a-z0-9]+(-[a-z0-9]+){2,}$/.test(s)
    || /[a-z][A-Z]/.test(s)
    || isShouting(s);
}
