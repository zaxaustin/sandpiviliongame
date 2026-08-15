/* ================================================================
   [DRAFTING A COURSE SOMEWHERE ELSE] — the other half of the bridge.

   WHY THIS EXISTS. On 2026-08-14 the Pavilion learned to RECEIVE a rich
   course. Measured the same afternoon: `grep` for "7-step", "Theoretical
   Minimum" and "prompt template" across src/game/ returned nothing, and
   PROTOCOLS.md returned nothing. So the app could take a finished course
   and could not tell one living soul how to make one. The steward's own
   two courses exist because he did it by hand in a chat window; everybody
   else got a paste box and a placeholder. In his words:

     "A paste box and a format example is not enough. Without the method,
      most people will either produce thin checklists or paste low-quality
      AI output and call it a course — that would quietly erode the
      standard we just fought to establish."

   THE LEVERAGE IS STILL HIS, and this does not take it back:

     the strongest drafting happens in an ordinary chat window with a
     strong model. The Pavilion's job is not to replace that power. Its
     job is to give a clear protocol for using it well.

   This file IS that protocol, as text a person copies into whatever
   window they already have open. No API key, no connection, nothing sent
   from here: it is a paragraph on a clipboard.

   ── TIGHT ON PURPOSE, AND THE CEILING IS TESTED ──

   The first draft ran 98 lines and ~950 tokens. The steward cut it:

     "Keep it tight. One strong prompt is better than a long essay."

   He is right twice over. A long prompt buries its own instructions, and
   CLAUDE.md rule 4 says every list handed to a model is capped and says
   so — a prompt that grows back into an essay is the same erosion this
   exists to prevent. `npm test` fails above PROMPT_MAX_LINES.

   FIVE SECTIONS, and they are his: the baseline, the required pieces,
   the portable shape, the three modes, and the instruction not to produce
   a thin checklist.

   ── AND THE BASELINE IS THE POINT OF THE WHOLE THING ──

   The steward, the same day:

     "we need to find people's baseline — where they are skill wise and
      what they've done before. If they're complete beginners or if they
      have some experience it's going to create different material for
      them... and we can use that as a reference for other people in the
      future."

   Both halves are handled, and the second is the interesting one: the
   prompt tells the model to write the baseline back out INSIDE the
   course's frontmatter. So the draft is shaped for the person who asked,
   AND the finished course carries a permanent, honest statement of what
   its author knew when they started. "I built this having never soldered
   anything" tells the next reader more about what the work will cost
   them than any level number — and it needs no new save store and no
   sync, being four lines that travel with the file.

   Pure: no DOM, no imports, no `data`. Same contract as course-format.js.
   ================================================================ */

/* Required piece 2 of plans/HIGH-STANDARD-COURSE-CREATION-GUIDE.md. Four
   questions, and none of them is a self-rating — "intermediate" means
   nothing to a model and less to the next reader. Concrete things done,
   or honestly not done. */
export const BASELINE_QUESTIONS = [
  { key: 'done',    label: 'What have you already done in this area?',
    hint: 'Projects, jobs, courses, years. Or "nothing at all" — a real answer, and the most useful one to be honest about.' },
  { key: 'without', label: 'What can you already do without looking it up?',
    hint: 'The blank-page question, asked at the start instead of only at the end.' },
  { key: 'stuck',   label: 'Where did you last get stuck, and what stopped you?',
    hint: 'Time, money, a missing tool, a concept that would not land — or you simply stopped. All four are worth saying.' },
  { key: 'hand',    label: 'What do you have to hand?',
    hint: 'Tools, parts, software, minutes in a day, a computer that can or cannot run a local model.' },
];

/* The 7-step Course Authoring protocol, written down in
   plans/COURSE-AUTHORING-AND-IMPORT.md since 2026-08-10 and, until now,
   handed to nobody. */
export const PROTOCOL_STEPS = [
  'Goal and audience, with success criteria',
  'Prerequisites and gaps',
  'Ordered modules, each with an objective',
  'The explanatory body of each module',
  'Practice · reflection · artifact',
  'Polish for transmission — standalone clarity, attribution, licence',
  'Package, import, and walk it yourself',
];

/* THE CEILINGS, tested. Raising either is a decision, not a tidy-up.

   ⚠ I set this at 45 first and that number was wrong, not ambitious. The
   format example alone is ~32 lines and cannot be much shorter while still
   showing frontmatter plus a module carrying all five bold labels — and the
   format is one of the five things the steward asked the prompt to contain.
   A 45-line total could only have been reached by deleting something he
   named. So it is measured and split instead:

     PROSE  — the part that actually erodes. Every "one more clarifying
              sentence" lands here, so this is the number that matters.
     TOTAL  — prose plus the fenced example, held so the example cannot
              quietly grow either.

   And one honest distinction, because rule 4's cap exists for a different
   animal: the capped lists in CLAUDE.md are paid for on EVERY message,
   forever. This is copied ONCE, by a person, into a window they already
   have open. ~770 tokens is cheap there and would be extravagant in a
   system prompt. Tight still matters — a long prompt buries its own
   instructions — but it is a legibility budget, not a token budget.

   ⚠ AND THEY MEASURE THE BARE PROMPT, not one carrying your shelf. Added
   2026-08-15, when the shelf block took an 8-book prompt to 89 lines and the
   ceiling fired. That was the guard measuring the wrong thing: the ceiling
   exists to stop EXPLANATORY PROSE creeping back, and a list of books you
   personally own is content you asked for, one line each. A person with forty
   contemplative texts should get a longer prompt, not a truncated course.

   So the ceilings apply to `buildDraftingPrompt({})`, and a separate guard
   holds the shelf block to one line per book plus a fixed header — which is
   what actually stops it hiding bloat. */
export const PROMPT_MAX_PROSE_LINES = 42;
/* 75 -> 76 on 2026-08-15: `duration:` joined the frontmatter example when the
   steward asked a course to say how long it takes. One line, in the example
   rather than the prose, and a deliberate raise rather than a drift — which
   is exactly what this constant is for. */
export const PROMPT_MAX_LINES = 76;
/* Fixed lines around the book list — the header, the two instruction lines
   about **Reading:** and **Why this text:**, and the four example lines those
   two labels add to the fenced sample. Went 6 -> 9 on 2026-08-15 when the
   steward's first real course came back naming books and never saying why.
   Tight on purpose and with no headroom: raising it should be a decision
   somebody makes, not a number that drifts. */
export const SHELF_BLOCK_OVERHEAD = 9;

const clean = s => String(s == null ? '' : s).replace(/\s*\n+\s*/g, ' ').trim();

/* ---------- the prompt ----------
   `goal` is what they want to learn; `baseline` is a {key: answer} map over
   BASELINE_QUESTIONS. Both optional — a prompt with neither is still usable,
   and refusing to produce one until every box is full would be a form that
   guards a door rather than opens it. */
export function buildDraftingPrompt(opts) {
  const o = opts || {};
  const goal = clean(o.goal);
  const base = o.baseline || {};
  const answer = q => clean(base[q.key]) || '(not answered)';
  const have = (o.have || []).filter(Boolean).slice(0, 14);

  /* ★ THE BOOKS YOU ALREADY OWN, and this is the difference between "a
     course" and "MY course". Measured 2026-08-15: the steward wants a
     meditation course and his shelf already holds the Yoga Sutras of
     Patanjali, the Hatha Yoga Pradipika, Raja Yoga, the Dhammapada, the
     Upanishads, the Rig Veda, three Bhagavad Gitas, the Serpent Power and
     the Diamond Sutra — and nothing in this prompt could say so, so a model
     would have invented a reading list he already owns.

     Named per module rather than in a lump, because a module that says which
     book it reads becomes a DOOR to that book on the Board. A lump is a
     bibliography; a per-module citation is the course pointing at your own
     shelf. */
  const shelf = have.length ? [
    '',
    'BOOKS ALREADY ON MY SHELF — build the modules around THESE, do not invent a reading list',
    ...have.map(t => '- ' + t),
    'Each module that reads one must say so on its own line, exactly:  **Reading:** <the title>',
    'and on the next line  **Why this text:** <why THIS book, and what to look for in it>.',
    'Copy the title as written above. Say plainly if something important is missing from my shelf.',
  ] : [];

  return [
    'Draft a full course for the Sand Pavilion in the portable Markdown format below.',
    '**Do not produce a thin checklist.** Modules need real explanatory prose.',
    '',
    'WHAT I WANT TO LEARN',
    goal || '(replace with the real goal, and the honest reason it matters to you)',
    '',
    'WHERE I AM STARTING FROM — write this back into the frontmatter as `baseline:`',
    ...BASELINE_QUESTIONS.map(q => '- ' + q.label + ' ' + answer(q)),
    'Teach for that. Do not re-teach what I can already do, and assume nothing I did not claim.',
    'If the gap is too wide for one course, say so and propose the smaller one that comes first.',
    ...shelf,
    '',
    'BUILD IT IN THIS ORDER',
    ...PROTOCOL_STEPS.map((s, i) => (i + 1) + '. ' + s),
    '',
    'IT MUST CONTAIN — all seven',
    '1. Opening intention — the real question that makes the work worth doing.',
    '2. Baseline — mine, above, in the frontmatter for whoever reads this next.',
    '3. Theoretical minimum — the few things I must rebuild from scratch, not recall. Cut hard.',
    '4. A daily commitment I can actually keep, named in the opening.',
    '5. Modules with real prose, each with practice, reflection and one artifact.',
    '6. A final gate — what I demonstrate from a blank page, and what must actually work.',
    '7. Transmission — polished so another person can walk it without me.',
    'Note: `prerequisites:` is what the COURSE demands; `baseline:` is what I brought.',
    '',
    'Work me in three modes throughout — analytical (predict, measure, diagnose), creative',
    '(reframe the question), practical (build it, explain it to someone who needs it today).',
    '',
    'THE FORMAT — reply with this and nothing else. Every module is a `## ` heading and nothing',
    'else uses `##`. Objective / Body / Practice / Reflection / Artifact are bold labels inside',
    'the text, not frontmatter keys. Aim for 5–9 modules. Spell the keys exactly as shown.',
    '',
    '```markdown',
    '---',
    'title: "The course title"',
    'purpose: "What this is for, in a sentence or two."',
    'audience: "Who it is for, and what it assumes."',
    'outcome: "What I will be able to do at the end."',
    'category: "Skill"   # Practice, Study, Skill, Work, Health or Personal',
    'track: "A subject area"',
    'level: 101          # 101 beginner, 201 working, 301 advanced',
    'duration: "how long this honestly takes at the pace I said I could keep"',
    'license: "CC-BY-SA 4.0"',
    'prerequisites:',
    '  - "What anyone needs before starting, even if that is nothing"',
    /* One placeholder rather than the four answers again — they are already
       above under WHERE I AM STARTING FROM, and a prompt that says the same
       thing twice is teaching the model that repetition is the format. */
    'baseline:',
    '  - "my four answers from above, one per line"',
    '---',
    '',
    '# How to walk this course',
    '',
    /* TWO paragraphs, and the guard is why. The first becomes the course's
       summary; the intention is what is left. With a single paragraph here the
       example produced an EMPTY intro — a prompt teaching a course with no
       opening intention, which is required piece 1 of the standard the prompt
       exists to uphold. Caught by parsing the example rather than reading it. */
    'One line on what this course is.',
    '',
    'Then the intention: the real question behind it, the daily commitment I am making,',
    'and how I will know it is working. Kept visible for the whole course.',
    '',
    '## Module 1 — Its title',
    '',
    '**Objective:** one sentence.',
    '',
    ...(have.length ? ['**Reading:** the exact title of the book from my shelf this module reads.', '',
                       '**Why this text:** why this one and not another, and what to look for in it.', ''] : []),
    '**Body:** real explanatory paragraphs, as many as the idea needs.',
    '',
    '**Practice:** something I do, not something I read.',
    '',
    '**Reflection:** a question I answer in writing.',
    '',
    '**Artifact:** what I will have made when this module is done.',
    '```',
  ].join('\n');
}

/* ---------- what to READ first ----------

   The steward, 2026-08-14:

     "What I really want to do is have something where we have helped
      drafting the course... have an idea, share with you, then you can help
      me figure out what topics to search for books and also how to draft a
      plan with ChatGPT or Grok."

   Two different questions, and they come in this order. A course drafted
   before you know what you are reading names books it hopes exist; a course
   drafted after names the ones on your shelf. So this prompt comes FIRST and
   the drafting prompt second, and the loop is:

     an idea -> what to read -> get the books in -> draft the course -> walk it

   Deliberately shorter than the drafting prompt. It asks one question, and
   the last line asks for search terms rather than links, because a model
   inventing a URL is the failure mode here and a search term you type
   yourself cannot be a dead link. */
export function buildReadingPrompt(opts) {
  const o = opts || {};
  const goal = clean(o.goal);
  const base = o.baseline || {};
  const answered = BASELINE_QUESTIONS.filter(q => clean(base[q.key]));
  const have = (o.have || []).filter(Boolean).slice(0, 12);

  return [
    'Help me work out what to read.',
    '',
    'WHAT I WANT TO LEARN',
    goal || '(replace this with the real thing)',
    ...(answered.length ? ['', 'WHERE I AM STARTING FROM',
      ...answered.map(q => '- ' + q.label + ' ' + clean(base[q.key]))] : []),
    ...(have.length ? ['', 'ALREADY ON MY SHELF — do not suggest these again',
      ...have.map(t => '- ' + t)] : []),
    '',
    'Suggest 5–8 books or open texts that would actually get me there, in the order',
    'I should read them. For each: title, author, one line on why it earns its place,',
    'and whether it can be had free and legally (Project Gutenberg, Standard Ebooks,',
    'the Internet Archive, arXiv, or an open textbook). Say plainly when it cannot.',
    '',
    'Prefer one excellent book to three overlapping ones. If something is famous but',
    'wrong for where I am starting, say so and say what to read instead.',
    '',
    'End with the handful of search terms I should type to find these myself.',
    'Give me terms rather than links — I would rather search than follow a URL that',
    'may not exist.',
  ].join('\n');
}

/* ---------- one more module, for a course you are already walking ----------

   The steward, 2026-08-15:

     "the local AI generate more coursework and some practice problems — for
      example for meditation it can ask us about karma, list a book about
      karma, and have a book report about what it says."

   That example IS the format's own shape, which is why this is one more prompt
   builder and not a system: the question about karma is the **Objective**, the
   book about karma is **Reading** + **Why this text**, and the book report is
   the **Artifact**. Nothing new had to be invented to hold it.

   DETERMINISTIC FIRST (rule 7). Everything a model would be bad at — what
   modules already exist, which of YOUR books touch the topic, where you said
   you got stuck — is counted here and handed over. The model's job is the one
   thing code cannot do: write the module.

   SHORTER THAN THE DRAFTING PROMPT ON PURPOSE. It is not being asked for a
   course; it is being asked for one module that belongs beside nine others,
   so most of what the drafting prompt establishes is already established by
   the modules it is shown.

   ⚠ IT ASKS FOR ONE MODULE AND SAYS SO THREE TIMES, because a model handed a
   course and asked to extend it will cheerfully return the whole course again.
   The receiving side parses whatever comes back, so a wrong answer here is a
   duplicate course, not a crash — which is exactly the quiet kind of wrong
   this house does not want. */
export function buildExtendPrompt(opts) {
  const o = opts || {};
  const title = clean(o.title);
  const purpose = clean(o.purpose);
  /* Titles only, capped. The bodies would be the whole course, and rule 4's
     cap is the difference between context and recitation. */
  const modules = (o.modules || []).filter(Boolean).slice(0, 12);
  const have = (o.have || []).filter(Boolean).slice(0, 14);
  const stuck = (o.stuck || []).filter(Boolean).slice(0, 5);
  const about = clean(o.about);

  return [
    'Write ONE more module for a course I am already walking. One module — not a course,',
    'not a revision of what exists, and not a summary of it.',
    '',
    'THE COURSE',
    title || '(untitled)',
    ...(purpose ? [purpose] : []),
    '',
    'THE MODULES IT ALREADY HAS, in order',
    ...modules.map((t, i) => (i + 1) + '. ' + clean(t)),
    'Do not repeat any of these. The new one goes after them and assumes them.',
    ...(about ? ['', 'WHAT THE NEW MODULE SHOULD BE ABOUT', about] : []),
    ...(have.length ? ['',
      'BOOKS ALREADY ON MY SHELF — read one of THESE, do not invent a reading list',
      ...have.map(t => '- ' + t),
      'Copy the title exactly as written above. If none of them fits, say so plainly',
      'and leave the **Reading:** line out rather than naming a book I do not have.'] : []),
    ...(stuck.length ? ['',
      /* WHAT I ACTUALLY FOUND HARD, in my own words, from my own record. This
         is the one thing a general model cannot know and the reason a course
         extended here beats one extended in a chat window. */
      'WHERE I HAVE ACTUALLY GOT STUCK ON THIS COURSE — my own words, from my own working',
      ...stuck.map(s => '- ' + clean(s)),
      'Take these seriously. If one of them is the real obstacle, the new module should address it.'] : []),
    '',
    'REPLY WITH THE MODULE AND NOTHING ELSE — one `## ` heading, then the bold labels.',
    'No frontmatter, no preamble, no closing remarks.',
    '',
    '```markdown',
    '## Module N — Its title',
    '',
    '**Objective:** one sentence — the real question this module answers.',
    '',
    ...(have.length ? ['**Reading:** the exact title of the book from my shelf this module reads.', '',
                       '**Why this text:** why this one, and what to look for in it.', ''] : []),
    '**Body:** real explanatory paragraphs. Not a checklist.',
    '',
    '**Practice:** something I do, not something I read.',
    '',
    '**Reflection:** a question I answer in writing.',
    '',
    '**Artifact:** what I will have made when this module is done.',
    '```',
  ].join('\n');
}

/* What is still missing before this is worth sending. Sentences, not codes,
   and it NEVER blocks — filling the gaps inside the chat window is a
   perfectly good way to work. */
export function promptGaps(opts) {
  const o = opts || {};
  const base = o.baseline || {};
  const gaps = [];
  if (!clean(o.goal)) gaps.push('You have not said what you want to learn — the prompt will carry a placeholder instead.');
  const missing = BASELINE_QUESTIONS.filter(q => !clean(base[q.key]));
  if (missing.length === BASELINE_QUESTIONS.length) {
    gaps.push('No baseline yet. The model will draft for a stranger, which usually means too slow or too fast.');
  } else if (missing.length) {
    gaps.push(missing.length + ' of the 4 baseline questions are blank: ' +
      missing.map(q => q.label.replace(/\?$/, '')).join('; ') + '.');
  }
  return gaps;
}
