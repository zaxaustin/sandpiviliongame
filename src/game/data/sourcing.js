/* ================================================================
   [SOURCING] — how was this GATHERED? Built 2026-08-02, at direct
   request: "I want to distinguish between things that can be traded
   freely, things I can study for myself and can't share, what's a
   gray area, and what's a strict no-no to gather."

   THE DISTINCTION THAT MAKES THIS A SEPARATE FILE, stated first
   because everything else depends on seeing it:

     copyright.js asks  — given that I have this text, what may I DO
                          with it?
     this file asks     — should I have gone and GOT it, and where
                          from?

   Those are independent axes, and the proof is that the same book can
   sit anywhere on this one without ever moving on the other:

       "Practical Electronics for Inventors" is in copyright always.
         bought from a shop     -> fine to hold
         a friend emails a PDF  -> grey
         a shadow library       -> the line

   The FILE IS IDENTICAL in all three. The act is what differs, and no
   amount of examining the bytes will tell you which one happened. So
   this cannot be inferred from the text the way copyright.js infers
   from a licence header — it can only be inferred from the SOURCE, and
   otherwise it must be asked.

   WHAT THIS DOES NOT DO, deliberately:
     - it does not scan your disk
     - it does not refuse to open anything you drag in
     - it does not lecture you about your own library

   A tool that searched your files and withheld them would be doing to
   you exactly what the gatekeepers do, in the name of opposing them.
   This is a doorman for the COMMONS, not a warden for your shelves.
   The teeth are: we won't help you fetch from the last level, and
   nothing from the last two levels is ever certified into a shared
   shelf. See plans/CREDIT-AND-COMMONS-FRAMEWORK.md.
   ================================================================ */

export const LEVELS = {
  given: {
    id:'given', mark:'🤝', label:'Freely given', tone:'#7fa36b',
    short:'Gather freely. Share freely.',
    advice:'The rights-holder put this out for anyone — public domain, an open licence, or a publisher giving it away. It may travel: the shared queue, a bequest, a course you publish.',
  },
  held: {
    id:'held', mark:'👤', label:'Yours to hold', tone:'#8fb4d9',
    short:'Gather freely. Keep it personal.',
    advice:'Legitimately yours, and not yours to pass on — a book you bought, a paper your library subscribes to, a copy of something you own. Your own shelf needs no licence from anybody; that is your business. Just never put it in the shared queue.',
  },
  ask: {
    id:'ask', mark:'❔', label:'Ask first — the grey', tone:'#e0a43c',
    short:'Read it. Keep it personal. Write down where it came from.',
    advice:'No licence stated anywhere, or an orphan work, or a page you scraped, or a transcript, or a PDF someone sent you. Usually fine to read; genuinely unclear to keep or pass on. The one thing that matters: record where it came from, because in a year you will not remember, and "I don\'t know where I got this" is how a commons ends up holding something it had no right to.',
  },
  no: {
    id:'no', mark:'⛔', label:'Not from here', tone:'#c8574a',
    short:'The Pavilion will not help you get this.',
    advice:'This is not a licence question — it is about the act of acquiring. Shadow libraries, getting round DRM or a paywall, bulk-scraping against a site\'s terms. The Pavilion has no connector for it and never will, and nothing from here is ever certified into a shared shelf. Not squeamishness: a commons with one stolen shelf gets dismissed entirely, and the theft becomes the story instead of every honest thing beside it.',
  },
};
export const LEVEL_ORDER = ['given','held','ask','no'];

/* Sources recognised by name. Deliberately a HAND-WRITTEN list, exactly like
   the Caravan's hand-picked connectors rather than a general scraper — the
   same rule, applied to recognition instead of fetching. Unknown means `ask`,
   never `given`: the failure direction is always toward caution. */
const KNOWN = [
  // --- freely given -------------------------------------------------------
  [/gutenberg\.org/i,              'given', 'Project Gutenberg — public domain'],
  [/standardebooks\.org/i,         'given', 'Standard Ebooks — public domain'],
  [/arxiv\.org/i,                  'given', 'arXiv — open-access preprints'],
  [/(ncbi\.nlm\.nih\.gov\/pmc|pubmed\s*central)/i, 'given', 'PubMed Central — open access'],
  [/openalex\.org|semanticscholar\.org/i, 'given', 'an open scholarly index'],
  [/doaj\.org/i,                   'given', 'the Directory of Open Access Journals'],
  [/suttacentral\.net/i,           'given', 'SuttaCentral — freely given translations'],
  [/wikisource\.org|wikibooks\.org|wikipedia\.org/i, 'given', 'a Wikimedia project — CC BY-SA'],
  [/creativecommons\.org/i,        'given', 'a Creative Commons licence'],
  [/\.gov(\/|$)|nasa\.gov|nist\.gov|\bNEETS\b/i, 'given', 'a government publication — public domain in the US'],
  [/allaboutcircuits\.com\/textbook|ibiblio\.org\/kuphaldt/i, 'given', 'Lessons In Electric Circuits — Design Science Licence'],
  [/(vishay|ti\.com|analog\.com|nxp\.com|microchip\.com|st\.com|onsemi)\b/i, 'given', "a manufacturer's own datasheet, published for anyone"],
  [/github\.com|gitlab\.com/i,     'given', 'a public code host — check the repository\'s licence file'],
  [/openstax\.org|oercommons\.org|merlot\.org/i, 'given', 'an open educational resources publisher'],
  [/loc\.gov|archive\.org\/details\/(?!.*lending)/i, 'given', 'a public archive'],

  // --- the line -----------------------------------------------------------
  [/lib(gen|rary)\s*gen|libgen|gen\.lib|sci-?hub|z-?lib|zlibrary|b-ok\.|annas?-?archive/i,
    'no', 'a shadow library — the Pavilion has no path to these and will not gain one'],
  [/\b(drm[\s-]?(free|removal|strip|crack)|calibre.*deacsm|deDRM)\b/i,
    'no', 'DRM circumvention'],
  [/\b(sci-?hub|paywall\s*(bypass|remove|skip)|12ft\.io)\b/i,
    'no', 'getting round an access control'],
  // NB: no trailing \b — "magnet:?xt=" has a non-word char after the colon, so
  // a word boundary there can never match. Caught by the smoke test, 2026-08-02.
  [/\btorrent\b|magnet:|\.onion\b/i,
    'no', 'a distribution channel with no provenance at all'],
];

/* The grey zone, recognised so it can be NAMED rather than silently passed.
   These are all legitimate to read and genuinely unclear to redistribute — the
   honest answer is "yours, personally, and write down where it came from." */
const GREY = [
  [/youtube\.com|youtu\.be/i,      'a video transcript — fine for your own study, not yours to publish'],
  [/archive\.org\/details\/.*lending|openlibrary\.org/i, 'a lending library — borrowed, not given'],
  [/reddit\.com|news\.ycombinator|stackoverflow\.com|\bforum\b/i, 'a forum post — the author holds it'],
  [/\.edu(\/|$)/i,                 'university-hosted material with no stated terms'],
  [/medium\.com|substack\.com/i,   'a personal publication — usually all rights reserved'],
  [/scribd\.com|coursehero|chegg/i,'a re-upload site — the uploader often had no right to it'],
];

/* Classify a source: a URL, a domain, or a free-text note about where something
   came from ("bought it", "my own copy", "a friend sent it"). Returns a level
   id and the reason, or null when nothing is recognised — and a null must be
   ASKED, never assumed. */
export function classifySource(source=''){
  const s=String(source||'').trim();
  if(!s) return null;

  for(const [re, level, why] of KNOWN){
    if(re.test(s)) return { level, why, matched:true };
  }
  for(const [re, why] of GREY){
    if(re.test(s)) return { level:'ask', why, matched:true };
  }
  // Plain-language answers people actually give when asked where something
  // came from. Checked after the URL patterns so a link always wins.
  if(/\b(i )?(bought|purchased|paid for|own(ed)? it|my (own )?copy|off my shelf|from my shelf|library card|subscription|institutional access)\b/i.test(s))
    return { level:'held', why:'you acquired it legitimately and it is not yours to pass on', matched:true };
  if(/\b(i (wrote|made|took|recorded|photographed)|my own (notes|work|writing|photos)|mine)\b/i.test(s))
    return { level:'given', why:'you made it, so it is yours to do anything with', matched:true };
  if(/\b(a friend|someone) (sent|emailed|gave|shared)|found (it )?online|not sure|no idea|can'?t remember|somewhere\b/i.test(s))
    return { level:'ask', why:'an unrecorded origin — fine to read, not established enough to pass on', matched:true };

  return null;
}

/* The one function the UI calls. Never throws, never guesses upward. */
export function assess({ source='', stated='' } = {}){
  if(stated && LEVELS[stated]) return { ...LEVELS[stated], why:'you said so', stated:true };
  const hit=classifySource(source);
  if(!hit) return { ...LEVELS.ask, why:'nothing recognised about where this came from', stated:false, unrecognised:true };
  return { ...LEVELS[hit.level], why:hit.why, stated:false };
}

/* Whether a thing may be offered to the shared commons at all. Both axes must
   agree — a text can be public domain AND still have been taken from somewhere
   it shouldn't have been, which is exactly the case that motivated this file. */
export function mayEnterCommons({ sharing='', gathered='' } = {}){
  const licenceOk = sharing==='open' || sharing==='pd';
  const sourceOk  = gathered==='given';
  if(!licenceOk && !sourceOk) return { ok:false, because:'neither its licence nor where it came from is established' };
  if(!licenceOk) return { ok:false, because:'its licence does not permit passing it on — keep it on your own shelf' };
  if(!sourceOk)  return { ok:false, because:'where it came from is not established as freely given — a clean licence is not enough on its own' };
  return { ok:true, because:'freely licensed and freely given' };
}
