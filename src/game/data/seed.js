/* ================================================================
   [SEED] — library documents. In Phase 3 these rows move into the
   library_documents table; `doc` becomes the JSONB column.
   License + source are first-class fields, never buried in the blob.
   ================================================================ */
export const TRADITIONS = ['Theravada','Mahayana','Daoism','Practice'];
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
const RAW_SEED_LIBRARY = [
 // ---- Theravada ----
 { slug:'dhammapada', tradition:'Theravada', title:'The Dhammapada',
   license:'CC0 1.0', source_url:'https://suttacentral.net/dhp', attribution:'SuttaCentral',
   doc:{ summary:'A collection of the Buddha’s sayings in verse — short, direct, and endlessly re-read across every Buddhist culture.',
     sections:[
       {heading:'What it is', body:'Four hundred twenty-three verses arranged by theme: the mind, heedfulness, anger, the self, the path. Each verse stands alone; together they form the most portable summary of the teaching that exists.'},
       {heading:'How to read it', body:'Slowly, and in small amounts. One chapter a sitting is plenty. The verses are designed to be carried through a day and tested against experience, not consumed.'},
       {heading:'A practice note', body:'Many practitioners keep a single verse as a companion for a week. When the week ends, the verse usually looks different than when it began. That difference is the practice.'}]}},
 { slug:'satipatthana', tradition:'Theravada', title:'Satipatthana — Foundations of Mindfulness',
   license:'CC0 1.0', source_url:'https://suttacentral.net/mn10', attribution:'SuttaCentral',
   doc:{ summary:'The Buddha’s core instruction manual for mindfulness practice: four fields of attention, one method.',
     sections:[
       {heading:'The four foundations', body:'Attention is trained on body, feeling-tone, mind-states, and the patterns of experience itself. Each field is observed as it arises and passes, internally and externally, without adding or subtracting.'},
       {heading:'Why it matters', body:'Nearly every modern mindfulness method descends from this single discourse. Reading the source clarifies what the derivatives kept and what they quietly dropped.'}]}},
 { slug:'metta', tradition:'Theravada', title:'The Metta Sutta — On Loving-Kindness',
   license:'CC0 1.0', source_url:'https://suttacentral.net/snp1.8', attribution:'SuttaCentral',
   doc:{ summary:'A short discourse on goodwill without conditions — the disposition of a mind that has stopped keeping score.',
     sections:[
       {heading:'The instruction', body:'Cultivate care for all beings the way a parent protects an only child: without exception, without expectation of return, in every posture and every hour.'},
       {heading:'A practice note', body:'Metta is usually practiced as phrases repeated toward oneself, a friend, a stranger, a difficult person, and finally all beings. The difficult person is where the practice actually starts.'}]}},
 { slug:'anapanasati', tradition:'Theravada', title:'Anapanasati — Mindfulness of Breathing',
   license:'CC0 1.0', source_url:'https://suttacentral.net/mn118', attribution:'SuttaCentral',
   doc:{ summary:'Sixteen steps of breath awareness, from simply knowing the breath to complete letting go.',
     sections:[
       {heading:'The structure', body:'Four sets of four: calming the body, brightening feeling, steadying the mind, and seeing clearly. Each set builds on the last; the breath is the thread through all sixteen.'},
       {heading:'For a daily sit', body:'Most daily practice lives in the first four steps for years. That is not slowness — that is the method working as designed.'}]}},
 // ---- Mahayana ----
 { slug:'heart-sutra', tradition:'Mahayana', title:'The Heart Sutra',
   license:'Public Domain', source_url:'https://www.sacred-texts.com/bud/', attribution:'sacred-texts.com',
   doc:{ summary:'The shortest of the great Perfection of Wisdom texts, and somehow the deepest well. Chanted daily across the Mahayana world.',
     sections:[
       {heading:'What it says', body:'Form and emptiness are not two things. Every category the mind uses to carve up experience — including the path itself — is examined and found to be open, without a fixed core.'},
       {heading:'How it is used', body:'Less studied than chanted. Its rhythm does part of the work; the meaning arrives sideways, usually years after memorization.'}]}},
 { slug:'diamond-sutra', tradition:'Mahayana', title:'The Diamond Sutra',
   license:'Public Domain', source_url:'https://www.sacred-texts.com/bud/', attribution:'sacred-texts.com',
   doc:{ summary:'A dialogue on generosity and perception — famously, the oldest dated printed book in the world.',
     sections:[
       {heading:'The core move', body:'Every time a concept is offered, the Buddha affirms it, negates it, and returns it transformed. The pattern trains the reader to hold ideas without gripping them.'},
       {heading:'The famous close', body:'The sutra ends by comparing all conditioned things to a dream, a bubble, a flash of lightning — a passage that has anchored contemplative practice for sixteen centuries.'}]}},
 { slug:'bodhicaryavatara', tradition:'Mahayana', title:'The Way of the Bodhisattva',
   license:'Overview only — translations vary', source_url:'https://www.lotsawahouse.org/', attribution:'Shantideva, 8th c.',
   doc:{ summary:'Shantideva’s guide to living for the benefit of all beings — the most beloved manual in Tibetan Buddhism.',
     sections:[
       {heading:'What it covers', body:'Ten chapters moving from the first spark of altruistic intention through patience, effort, meditation, and wisdom. The patience chapter alone has carried whole monasteries through hard winters.'},
       {heading:'A note on editions', body:'Modern translations remain under copyright, so this shelf holds an overview with a pointer to openly available editions. Provenance first — that is how this Library works.'}]}},
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
 { slug:'zhuangzi', tradition:'Daoism', title:'The Zhuangzi',
   license:'Public Domain', source_url:'https://www.sacred-texts.com/tao/', attribution:'Zhuangzi · Legge translation',
   doc:{ summary:'Parables, jokes, and impossible conversations — Daoism’s wildest and funniest classic.',
     sections:[
       {heading:'What to expect', body:'Butchers whose knives never dull, trees too useless to be cut down, a philosopher unsure if he dreamed the butterfly or the butterfly dreamed him. Every joke has a blade of insight in it.'},
       {heading:'Why it pairs with sitting', body:'Where meditation loosens the grip of thought from the inside, the Zhuangzi loosens it from the outside — by making the gripping itself look ridiculous.'}]}},
 { slug:'inner-chapters', tradition:'Daoism', title:'Reading the Inner Chapters',
   license:'Original — Pavilion Commons', source_url:'https://www.sacred-texts.com/tao/', attribution:'Pavilion stewards',
   doc:{ summary:'A short orientation to the seven Inner Chapters — the oldest core of the Zhuangzi.',
     sections:[
       {heading:'The map', body:'Seven chapters: free wandering, the equality of things, nourishing life, the human world, the sign of full virtue, the great source as teacher, and responding to emperors and kings.'},
       {heading:'A steward’s suggestion', body:'Begin with chapter three, Nourishing Life. It is the shortest, and the butcher story inside it is the whole book in miniature.'}]}},
 { slug:'religions-ancient-china', tradition:'Daoism', title:'Religions of Ancient China',
   license:'Public Domain', source_url:'https://www.gutenberg.org/ebooks/2330', attribution:'Herbert A. Giles · Project Gutenberg',
   doc:{ summary:'A scholar’s overview of how Chinese religious life actually moved from an early sky-and-ancestor faith into Confucianism, Taoism, and Buddhism — history, not scripture, and useful for exactly that reason.',
     sections:[
       {heading:'What it is', body:'Giles traces a plain historical line: an old faith centered on Shang-ti and ancestor worship, gradually joined and reshaped by Confucius’s ethics, Lao-tzu’s Tao, and Buddhism arriving from India. It reads as history and comparative religion, not devotion.'},
       {heading:'Why it earns a shelf spot here', body:'Every other Daoist text on this shelf is a primary source or a steward’s close reading of one. This is the outside view — where Taoism actually came from and how it sat alongside its neighbors — useful before or after sitting with the Tao Te Ching itself, not instead of it.'}]}},
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
];
export const SEED_LIBRARY = RAW_SEED_LIBRARY.map(d => ({ category:'classical', ...d }));
