/* ================================================================
   [PLAN → LESSON] — turning a drafted study plan into a walkable
   lesson, i.e. the joint that was missing.

   THE-STUDY-CHAIN-PLAN.md has the full diagnosis; the short version
   is that `draftLessonPlanFromNote` and `draftLessonPlanFromLesson`
   have both worked since 2026-07-26 and both dead-ended: the model
   writes a real, sequenced plan and it lands as PLAIN TEXT IN A NOTE,
   forever. Reported 2026-08-03 as "i tried making a lesson plan and
   that worked to with some fenagling but its hard to link those to an
   active learning tree."

   Nothing was broken. There was simply nowhere for the thing to go.

   Same reason `draft-parse.js` lives out here: `ui/overlays.js` touches
   the DOM at import time, so nothing in it is reachable from node. A
   parser aimed at what a small local model ACTUALLY writes deserves
   real cases rather than hope.
   ================================================================ */

/* What a plan actually looks like coming out of a local model. Checked
   against the prompt in draftLessonPlanFromNote, which asks for "a short
   sequence of study sessions (each with what to do and roughly how long),
   one small hands-on task per session." Models answer that with headers —
   "Session 1 (30 min):", "Week 2 —", "Day 3.", "**Step 4:**", "## Part 2"
   — and the header is the step boundary. Everything under one header is
   its body.

   Deliberately generous about the header words and strict about the
   NUMBER: a bare "Session:" with no number is prose, not a step, and
   treating it as one splits plans in silly places. */
const HEADER = /^\s*(?:[#>*\-•\s]*)(?:\*\*)?\s*(session|week|day|step|part|stage|lesson|module|unit)\s*#?\s*(\d+)\s*(?:\*\*)?\s*(.*)$/i;
/* A plain numbered list — "1." / "1)" / "1 -" — but only when it opens the
   line. A year, a measurement or a page reference must never look like a step. */
const NUMBERED = /^\s*(?:[*\-•]\s*)?(\d{1,2})\s*[.)]\s+(\S.*)$/;
/* Lines that introduce the whole plan rather than a step of it. */
const GOAL = /^\s*(?:[#>*\-•\s]*)(?:\*\*)?\s*(goal|aim|objective|outcome|purpose)\s*(?:\*\*)?\s*[:—-]\s*(.+)$/i;

function tidy(s) {
  return String(s || '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[#>]+\s*/, '')
    .replace(/^\s*[*\-•]\s*/, '')
    .replace(/^\s*[:—-]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* The drafting prompt asks for "roughly how long," so models write
   "Session 1 (30 min): read chapter 2." Eating the header and leaving the
   parenthetical stranded produced steps titled "(30 min): Read chapter 2",
   which is what the tree actually displayed on 2026-08-03 — found by looking
   at it, not by reading the parser. The duration is worth keeping; it just
   belongs at the end of the title, not the front. */
const LEAD_PAREN = /^\s*[([]([^)\]]{1,28})[)\]]\s*[:—–-]?\s*/;
function liftAside(text) {
  const m = String(text || '').match(LEAD_PAREN);
  if (!m) return { text: String(text || ''), aside: '' };
  const rest = String(text).slice(m[0].length);
  if (!rest.trim()) return { text: String(text || ''), aside: '' };   // the parens WERE the content
  /* Moved, never dropped — whatever is in there was written on purpose, and a
     parser that decides which asides are worth keeping is a parser that throws
     away the one the visitor cared about. */
  return { text: rest, aside: m[1].trim() };
}

/* A step's title should be scannable in the tree, where it sits on one line.
   A model happily writes a whole instruction as its header; keep the first
   sentence for the title and let the rest fall into the body rather than
   truncating mid-word into "Read chapter two and then wr…". */
function splitTitle(text, max = 72) {
  const t = tidy(text);
  if (!t) return { title: '', rest: '' };
  if (t.length <= max) return { title: t, rest: '' };
  const stop = t.search(/[.!?](\s|$)/);
  if (stop > 0 && stop <= max) return { title: t.slice(0, stop).trim(), rest: t.slice(stop + 1).trim() };
  const cut = t.lastIndexOf(' ', max);
  const at = cut > max * 0.5 ? cut : max;
  return { title: t.slice(0, at).trim(), rest: t.slice(at).trim() };
}

/* ---- the whole thing --------------------------------------------------
   planToLesson(text, opts) -> { title, summary, steps:[{title, body}] }

   opts.title    a fallback title (the note's own, usually)
   Never returns zero steps for non-empty input: a plan that could not be
   parsed becomes ONE step holding the text, which is honest and still
   walkable, rather than an empty lesson that looks like a bug.        */
export function planToLesson(text, opts = {}) {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  const fallbackTitle = tidy(opts.title || '').replace(/^lesson plan\s*[—-]\s*/i, '').trim();
  const lines = raw.split('\n');

  let summary = '';
  const blocks = [];           // {title, body[]}
  let cur = null;
  const preamble = [];

  /* Headers and a numbered list are ALTERNATIVE structures, never mixed — so
     decide which one this plan uses before walking it. Without this, "Session
     1: gather the parts" followed by "1. an IR LED / 2. a resistor" shreds one
     session into four steps, because the inner list's "2." lands exactly where
     the next top-level step would have. A parts list is content. */
  const usesHeaders = lines.some(l => HEADER.test(l));

  for (const line of lines) {
    if (!line.trim()) { if (cur) cur.body.push(''); continue; }

    /* The drafting prompt asks for a one-line goal, and models give it.
       That is the lesson's summary, not its first step. */
    const g = !summary && line.match(GOAL);
    if (g && !cur) { summary = tidy(g[2]); continue; }

    const h = line.match(HEADER);
    if (h) {
      const lifted = liftAside(h[3] || '');
      const { title, rest } = splitTitle(lifted.text);
      /* A header with nothing after it ("## Part 2") keeps its own name — the
         step still needs something to be called in the tree. */
      const named = title || tidy(h[1] + ' ' + h[2]);
      cur = { title: named + (lifted.aside ? ' · ' + lifted.aside : ''), body: rest ? [rest] : [] };
      blocks.push(cur);
      continue;
    }

    /* A numbered list only counts as the step structure when this plan has no
       headers AND the numbers actually run 1, 2, 3 from the top — otherwise it
       is a list INSIDE a step (parts to buy, things to check). */
    const n = !usesHeaders && line.match(NUMBERED);
    if (n && Number(n[1]) === blocks.length + 1) {
      const { title, rest } = splitTitle(n[2]);
      cur = { title, body: rest ? [rest] : [] };
      blocks.push(cur);
      continue;
    }

    if (cur) cur.body.push(tidy(line));
    else preamble.push(tidy(line));
  }

  /* No headers and no list — a model that ignored the shape and wrote
     paragraphs. Blank-line-separated paragraphs are the next best boundary,
     and a paragraph each is genuinely walkable. */
  if (!blocks.length) {
    const paras = raw.split(/\n\s*\n/).map(p => tidy(p)).filter(p => p.length > 12);
    for (const p of paras) {
      const { title, rest } = splitTitle(p);
      blocks.push({ title, body: rest ? [rest] : [] });
    }
  }

  if (!summary) {
    /* Anything written before the first step, or failing that the plan's own
       opening line, is the closest thing to a summary the text contains. */
    const pre = preamble.filter(Boolean).join(' ').trim();
    summary = pre || (blocks.length > 1 ? '' : '');
  }

  let steps = blocks
    .map(b => ({ title: tidy(b.title), body: b.body.join('\n').replace(/\n{3,}/g, '\n\n').trim() }))
    .filter(s => s.title || s.body)
    .map(s => s.title ? s : { title: splitTitle(s.body).title, body: '' });

  /* One step holding everything beats an empty lesson. */
  if (!steps.length && raw.trim()) steps = [{ title: splitTitle(raw).title, body: raw.trim() }];

  return {
    title: fallbackTitle || (steps.length ? splitTitle(steps[0].title, 60).title : 'A plan'),
    summary,
    steps,
  };
}
