/* ================================================================
   [SEED] — library documents. In Phase 3 these rows move into the
   library_documents table; `doc` becomes the JSONB column.
   License + source are first-class fields, never buried in the blob.
   ================================================================ */
import { dhammapadaFullText } from './library-texts/dhammapada.js';
import { satipatthanaFullText } from './library-texts/satipatthana.js';
import { mettaFullText } from './library-texts/metta.js';
import { anapanasatiFullText } from './library-texts/anapanasati.js';

export const TRADITIONS = ['Theravada','Mahayana','Daoism','Practice','Science','Classics','Native American','Hindu','Tantra'];
/* Categories are a second, orthogonal axis to tradition — "what kind of
   text is this" rather than "which lineage." Every seed text today is
   the same kind (classical, hand-vetted, non-fiction) — the taxonomy is
   defined now, ahead of content that will actually use the other
   values, same instinct as `saveVersion`: the field should exist before
   it's needed, not be retrofitted once it is. */
export const CATEGORIES = [
  { id:'classical',   label:'Classical' },
  { id:'non-fiction',  label:'Non-fiction' },
  { id:'fiction',      label:'Fiction' },
  { id:'research',     label:'Research papers' },
  { id:'ai-written',   label:'AI-written' },
  { id:'personal',     label:'Personal' },
];
/* Optional `added:'YYYY-MM-DD'` field, same "define before it's needed"
   instinct — undated entries (everything seeded so far) just never show
   the Index/shelf's "NEW" tag. `promote-draft.py` (sketched in the
   README's Growing the Library section) should stamp this automatically
   once it exists; until then, set it by hand on anything freshly added. */
const RAW_SEED_LIBRARY = [
 // ---- Theravada ----
 { slug:'dhammapada', tradition:'Theravada', title:'The Dhammapada',
   license:'CC0 1.0', source_url:'https://suttacentral.net/dhp', attribution:'SuttaCentral',
   doc:{ summary:'A collection of the Buddha’s sayings in verse — short, direct, and endlessly re-read across every Buddhist culture.',
     sections:[
       {heading:'What it is', body:'Four hundred twenty-three verses arranged by theme: the mind, heedfulness, anger, the self, the path. Each verse stands alone; together they form the most portable summary of the teaching that exists.'},
       {heading:'How to read it', body:'Slowly, and in small amounts. One chapter a sitting is plenty. The verses are designed to be carried through a day and tested against experience, not consumed.'},
       {heading:'A practice note', body:'Many practitioners keep a single verse as a companion for a week. When the week ends, the verse usually looks different than when it began. That difference is the practice.'}],
     // the summary/sections above stay grounded in the SuttaCentral CC0 shelf
     // record; the full text is a different, independently-licensed edition —
     // F. Max Müller's own 1881 translation, straight off Project Gutenberg,
     // kept as its own honestly-sourced object rather than blended into the
     // citation above.
     fullText:{ text:dhammapadaFullText, translator:'F. Max Müller (1881), from The Sacred Books of the East, Vol. X',
       source_url:'https://www.gutenberg.org/ebooks/2017', license:'Public Domain (Project Gutenberg)' }}},
 { slug:'satipatthana', tradition:'Theravada', title:'Satipatthana — Foundations of Mindfulness',
   license:'CC0 1.0', source_url:'https://suttacentral.net/mn10', attribution:'SuttaCentral',
   doc:{ summary:'The Buddha’s core instruction manual for mindfulness practice: four fields of attention, one method.',
     sections:[
       {heading:'The four foundations', body:'Attention is trained on body, feeling-tone, mind-states, and the patterns of experience itself. Each field is observed as it arises and passes, internally and externally, without adding or subtracting.'},
       {heading:'Why it matters', body:'Nearly every modern mindfulness method descends from this single discourse. Reading the source clarifies what the derivatives kept and what they quietly dropped.'}],
     // same honestly-sourced pattern as the Dhammapada above: summary/sections
     // stay tied to the SuttaCentral CC0 shelf record; the full text is
     // Bhikkhu Sujato's own CC0 translation, fetched via
     // tools/caravan/suttacentral.py from the suttacentral.net bilara API.
     fullText:{ text:satipatthanaFullText, translator:'Bhikkhu Sujato',
       source_url:'https://suttacentral.net/mn10', license:'CC0 1.0' }}},
 { slug:'metta', tradition:'Theravada', title:'The Metta Sutta — On Loving-Kindness',
   license:'CC0 1.0', source_url:'https://suttacentral.net/snp1.8', attribution:'SuttaCentral',
   doc:{ summary:'A short discourse on goodwill without conditions — the disposition of a mind that has stopped keeping score.',
     sections:[
       {heading:'The instruction', body:'Cultivate care for all beings the way a parent protects an only child: without exception, without expectation of return, in every posture and every hour.'},
       {heading:'A practice note', body:'Metta is usually practiced as phrases repeated toward oneself, a friend, a stranger, a difficult person, and finally all beings. The difficult person is where the practice actually starts.'}],
     fullText:{ text:mettaFullText, translator:'Bhikkhu Sujato',
       source_url:'https://suttacentral.net/snp1.8', license:'CC0 1.0' }}},
 { slug:'anapanasati', tradition:'Theravada', title:'Anapanasati — Mindfulness of Breathing',
   license:'CC0 1.0', source_url:'https://suttacentral.net/mn118', attribution:'SuttaCentral',
   doc:{ summary:'Sixteen steps of breath awareness, from simply knowing the breath to complete letting go.',
     sections:[
       {heading:'The structure', body:'Four sets of four: calming the body, brightening feeling, steadying the mind, and seeing clearly. Each set builds on the last; the breath is the thread through all sixteen.'},
       {heading:'For a daily sit', body:'Most daily practice lives in the first four steps for years. That is not slowness — that is the method working as designed.'}],
     fullText:{ text:anapanasatiFullText, translator:'Bhikkhu Sujato',
       source_url:'https://suttacentral.net/mn118', license:'CC0 1.0' }}},
 // ---- Mahayana ----
 { slug:'dzogchen-note', tradition:'Mahayana', title:'A Note on the Luminous Nature of Mind',
   license:'Original — Pavilion Commons', source_url:'https://suttacentral.net', attribution:'Pavilion stewards',
   doc:{ summary:'A steward’s note on Dzogchen’s central pointing: the unchanging, luminous nature of mind.',
     sections:[
       {heading:'The pointing', body:'Dzogchen distinguishes mind’s contents — thoughts, moods, weather — from mind’s nature, which is described as unchanging, clear, and aware. Practice is recognizing the second without chasing the first.'},
       {heading:'A precision note', body:'This is the exact counterpart to intuitions often attributed to the Tao Te Ching’s unchanging Dao. The traditions rhyme, but they are distinct instruments; the Library shelves them separately on purpose.'}]}},
 // ---- Daoism ----
 { slug:'tao-te-ching', tradition:'Daoism', title:'Tao Te Ching',
   license:'Public Domain', source_url:'https://www.sacred-texts.com/tao/taote.htm', attribution:'Laozi · Legge translation',
   doc:{ summary:'Eighty-one brief chapters on moving with the grain of things instead of against it.',
     sections:[
       {heading:'What it is', body:'Part statecraft, part contemplative manual, part poem. Its central figure is water: soft, low, patient, and stronger than stone over any timescale that matters.'},
       {heading:'How to read it', body:'Not front to back. Open anywhere; read one chapter; put it down. The book is designed for a lifetime of re-entry, not a weekend of completion.'}]}},
 { slug:'inner-chapters', tradition:'Daoism', title:'Reading the Inner Chapters',
   license:'Original — Pavilion Commons', source_url:'https://www.sacred-texts.com/tao/', attribution:'Pavilion stewards',
   doc:{ summary:'A short orientation to the seven Inner Chapters — the oldest core of the Zhuangzi.',
     sections:[
       {heading:'The map', body:'Seven chapters: free wandering, the equality of things, nourishing life, the human world, the sign of full virtue, the great source as teacher, and responding to emperors and kings.'},
       {heading:'A steward’s suggestion', body:'Begin with chapter three, Nourishing Life. It is the shortest, and the butcher story inside it is the whole book in miniature.'}]}},
 // ---- Practice ----
 { slug:'hearth-logbook', tradition:'Practice', title:'A Practice Logbook — Crucible Trial No. 1',
   license:'Original — Pavilion Commons', source_url:'https://suttacentral.net', attribution:'The first user',
   doc:{ summary:'Thirty days of the Hearth, recorded honestly: what was tended, what was rested, what actually changed.',
     sections:[
       {heading:'The trial design', body:'One intention set each morning. Seven rhythm blocks marked tended or rested each night. No streaks, no scores — the record is the only reward, and the record does not lie.'},
       {heading:'What the record showed', body:'The blocks most often rested were the ones scheduled against the body’s grain. The fix was not more discipline; it was a better map of the day. The desk in the next room exists because of this trial.'}]}},
 { slug:'steward-notes', tradition:'Practice', title:'Steward’s Field Notes',
   license:'Original — Pavilion Commons', source_url:'https://suttacentral.net', attribution:'Pavilion stewards',
   doc:{ summary:'Working notes on confirmation, badges, and why the Pavilion reads the record and never the soul.',
     sections:[
       {heading:'On conferral', body:'A badge here is testimony: a human steward looked at public evidence and signed their name to it. Nothing self-declared, nothing purchased, nothing automatic. Rigor is the kindness.'},
       {heading:'On progression', body:'The Lantern Path lights one lantern at a time, but the Library and the Atlas never lock. Progression orders the invitation; it never gates the knowledge.'}]}},
 { slug:'on-precision', tradition:'Practice', title:'On Precision in Tradition',
   license:'Original — Pavilion Commons', source_url:'https://suttacentral.net', attribution:'Pavilion stewards',
   doc:{ summary:'Why the Pavilion names its sources exactly, even when traditions rhyme.',
     sections:[
       {heading:'The principle', body:'Comparative insight is welcome; blurred attribution is not. When two traditions point at similar moons, the Library records both fingers separately, with their own licenses and lineages intact.'},
       {heading:'The working rule', body:'Every text answers three questions at the door: what is it, where is it from, and under what license does it travel? A text that cannot answer waits outside as UNVERIFIED until it can.'}]}},
 { slug:'how-library-works', tradition:'Practice', title:'How This Library Works',
   license:'Original — Pavilion Commons', source_url:'https://suttacentral.net', attribution:'Pavilion stewards',
   doc:{ summary:'The Library’s standing rules, posted where anyone can read them.',
     sections:[
       {heading:'The rules', body:'No gate, no fee, no ledger of debts. Every entry carries license and source from the moment it is shelved. Anyone may read; stewards shelve; the record of both is public.'},
       {heading:'Where the books come from', body:'The seed collection draws on SuttaCentral (released CC0) and public-domain archives. As the shelves grow, the same rule holds: provenance at the point of entry, never retrofitted.'}]}},
 // ---- Classics ----
 { slug:'meditations', tradition:'Classics', title:'Meditations',
   license:'Public Domain', source_url:'https://www.gutenberg.org/ebooks/2680', attribution:'Marcus Aurelius · Project Gutenberg',
   doc:{ summary:'The private notebook of a Roman emperor, written only for himself, on how to meet each day without being ruined by it.',
     sections:[
       {heading:'What it is', body:'Twelve short books Marcus Aurelius wrote to himself while commanding armies on the Danube frontier — never meant for anyone else to read, which is exactly why it still sounds so direct sixteen centuries later.'},
       {heading:'How to read it', body:'The same instinct as the Dhammapada: open anywhere, read a page, let one line sit with you through the day. It was written in fragments and rewards being read that way.'}]}},
 { slug:'republic', tradition:'Classics', title:'The Republic',
   license:'Public Domain', source_url:'https://www.gutenberg.org/ebooks/1497', attribution:'Plato · tr. Benjamin Jowett · Project Gutenberg',
   doc:{ summary:'Plato’s dialogue on justice, building an imagined ideal city from scratch to work out what justice actually is in a single person.',
     sections:[
       {heading:'What it is', body:'Socrates and his companions construct a city, institution by institution, on the theory that justice at the scale of a whole society will be easier to see than justice in one soul — then read the answer back onto the individual.'},
       {heading:'Why it’s still read', body:'Its detours — the allegory of the cave, the philosopher-king, the divided line — have outlasted the argument they were built to illustrate, and mostly get read on their own terms now.'}]}},
 { slug:'nicomachean-ethics', tradition:'Classics', title:'The Nicomachean Ethics',
   license:'Public Domain', source_url:'https://www.gutenberg.org/ebooks/8438', attribution:'Aristotle · Project Gutenberg',
   doc:{ summary:'Aristotle’s account of what a good life actually consists of — not a rulebook, but a case for virtue as a trained habit.',
     sections:[
       {heading:'What it is', body:'Ten books arguing that virtue isn’t a feeling or a rule but a disposition built through practice, typically found as a mean between two opposing failures — courage between recklessness and cowardice, and so on.'},
       {heading:'How to read it', body:'Slower than it looks. The individual claims are plain, but Aristotle’s method is to test each one from several angles before trusting it — worth matching his pace rather than skimming for conclusions.'}]}},
 // ---- Science ----
 { slug:'origin-of-species', tradition:'Science', title:'On the Origin of Species',
   license:'Public Domain', source_url:'https://www.gutenberg.org/ebooks/1228', attribution:'Charles Darwin · Project Gutenberg (1859, first edition)',
   doc:{ summary:'Darwin’s 1859 case for evolution by natural selection, built patiently from evidence anyone of the time could go check for themselves.',
     sections:[
       {heading:'What it is', body:'Rather than opening with grand theory, Darwin starts with pigeon breeding and farm animals — variation under human selection that his Victorian readers already knew firsthand — before extending the same logic out to the whole natural world.'},
       {heading:'Why it still matters', body:'It’s less a list of conclusions than a demonstration of how to argue carefully from ordinary evidence toward an enormous claim — arguably the more durable lesson, independent of the biology.'}]}},
];
export const SEED_LIBRARY = RAW_SEED_LIBRARY.map(d => ({ category:'classical', ...d }));
