/* ================================================================
   [MACHINE ADVICE] — answering "can my computer run this?" so nobody
   has to know what a gigabyte of VRAM is.

   Written 2026-07-28, for the first real handover: *"most of my friends
   don't even have Ollama or know how to check their computer's
   capabilities, most have laptops."*

   The existing tiered guide was honest but asked the wrong thing of the
   wrong person — it said "8GB RAM → this model", which requires you to
   already know your RAM. Most people don't, and looking it up is exactly
   the kind of small friction that ends an evening's curiosity. So the
   app measures instead of asking.

   RAM is the binding constraint, not the CPU: a model has to fit in
   memory to run at all, and on the integrated graphics in most laptops
   it runs on the CPU out of ordinary RAM. Hence the tiers below are cut
   on total memory, with cores only nudging the expectation of *speed*.

   Deliberately conservative. A tester whose first model is too big gets
   a frozen laptop and never comes back; one whose first model is too
   small gets a fast, slightly simple answer and stays curious. The
   whole point is a second session, so we err small.
   ================================================================ */

/* Ollama tags and their real download sizes (Q4 quantised, mid-2026).
   Sizes are the download; running needs roughly that plus a bit. */
export const MODELS = {
  tiny:     { tag:'llama3.2:1b', gb:1.3, label:'Llama 3.2 · 1B' },
  small:    { tag:'llama3.2:3b', gb:2.0, label:'Llama 3.2 · 3B' },
  standard: { tag:'llama3.1:8b', gb:4.7, label:'Llama 3.1 · 8B' },
};

/* ----- THE OTHER PATHWAY, added 2026-08-13 -------------------------------
   Asked for directly, and the second time this exact question has been
   raised by the same person about the same friends:

     "I know my friend is not gonna be able to run any models on his
      computer but I still wanna get him access to this… let's see if
      there's any cloud models he can run through ollama and make sure
      there's a pathway in the game for that to happen"

   THE ENGINE HAS SUPPORTED THIS SINCE 2026-08-03 AND NOTHING EVER SAID SO.
   Ollama serves hosted models through the SAME local endpoint, so no API
   key is ever pasted into this app: it appears in /api/tags like any other
   model, `isCloudModel()` marks it, the picker offers it, and choosing it
   deliberately is honoured. Measured that day: gpt-oss:20b-cloud answered
   in 0.64s where a local 9B takes many seconds.

   So every piece worked and the only person who could find it was someone
   who already knew it existed — which is rule 5 exactly, and "nothing may
   be a dead end" from the standing decisions. A tester told "skip the AI
   on this machine" was being told the truth about LOCAL models and, by
   omission, something false about the Pavilion.

   Two things this copy must never do:
     · offer it without saying plainly that it leaves the device. The whole
       promise of this place is that things stay here; a pathway out of
       that is fine, a QUIET pathway out of it is not.
     · lead with it on a machine that can run a model locally. Local is the
       disposition; this is the door for people the disposition excludes.
   `prominence` carries that distinction rather than a second copy block. */
export const CLOUD_MODEL = {
  tag: 'gpt-oss:20b-cloud',
  label: 'GPT-OSS 20B (hosted by Ollama)',
  /* `ollama signin` FIRST — a pull without it fails with an auth error that
     reads like a broken install. Ordered, because the order is the bug. */
  steps: ['ollama signin', 'ollama pull gpt-oss:20b-cloud'],
};

/* What is true of it wherever it appears, so no surface can offer the
   hosted door while forgetting to say where it goes. */
export const CLOUD_CAVEAT =
  'What you type to a resident is sent to Ollama\'s servers and answered there — '
  + 'it does not stay on this computer. Everything else still does: your library, '
  + 'your notes, your day, your whole save never leave. Ollama\'s free tier has '
  + 'limits and some models need a paid plan; the app tells you if one refuses.';

export function cloudPathway(tier) {
  const primary = tier === 'none' || tier === 'tight' || tier === 'unknown';
  return {
    ...CLOUD_MODEL,
    prominence: primary ? 'primary' : 'aside',
    why: primary
      ? 'You still get the residents, on a computer that cannot host a model. '
        + 'Install Ollama as normal, sign in with a free account, and pull a hosted '
        + 'model instead of a local one — it runs on Ollama\'s machines and answers '
        + 'in about a second. Nothing else about the Pavilion changes.'
      : 'This computer can run a model of its own, so it should. But a hosted model '
        + 'is there if you want a bigger one occasionally, or if a local one is too slow.',
    caveat: CLOUD_CAVEAT,
  };
}

/* The verdict. `info` is whatever we could actually learn:
     { totalMemGB, cores, cpu, platform, hasBattery, measured }
   `measured` false means we're guessing from browser hints and should
   say so rather than pretend. */
export function recommendModel(info = {}) {
  const ram = Number(info.totalMemGB) || 0;
  const cores = Number(info.cores) || 0;
  const laptop = info.hasBattery === true;
  const notes = [];

  let tier, model, verdict, why;

  if (!ram) {
    tier = 'unknown';
    model = MODELS.small;
    verdict = "Couldn't read this machine";
    why = "The browser won't say how much memory this computer has. Llama 3.2 3B is the safe "
        + 'first try almost anywhere — about 2 GB to download. If it feels slow, drop to '
        + MODELS.tiny.tag + '.';
  } else if (ram < 6) {
    /* Below about 6 GB there is no honest recommendation. Even the smallest
       useful model would take most of what the machine has, and the result is
       a frozen laptop and a tester who never opens it again. Saying "don't"
       is the useful answer, and it costs them nothing — this was caught by the
       test that refuses to suggest a model larger than 60% of memory. */
    tier = 'none';
    model = null;
    verdict = 'Don\'t run a model on this machine — and lose nothing that matters';
    why = `${ram} GB isn't enough to run a language model here without the whole computer `
        + 'struggling, and a frozen laptop is a miserable way to meet this place. So: don\'t. '
        + 'Everything the Pavilion is actually for — the Library, reading, read-aloud, your '
        + 'notes, the day planner, every lesson — works with no AI at all, forever, and is not '
        + 'a lesser version. If you want the residents anyway, there is a hosted way below.';
    notes.push('If you later use a stronger computer, the same Pavilion travels: export your save, import it there.');
  } else if (ram < 8) {
    tier = 'tight';
    model = MODELS.tiny;
    verdict = 'Tight — start very small';
    why = `With ${ram} GB of memory a language model will be a squeeze, but ${MODELS.tiny.label} `
        + `(${MODELS.tiny.gb} GB) should manage. Be honest with yourself if it isn't fun: `
        + 'everything else here works with no AI at all, forever.';
    notes.push('Close other programs before you talk to a resident — a browser full of tabs is the usual culprit.');
  } else if (ram < 12) {
    tier = 'everyday';
    model = MODELS.small;
    verdict = 'Fine — a small model will run nicely';
    why = `${ram} GB is enough for ${MODELS.small.label} (${MODELS.small.gb} GB to download), which is `
        + 'quick and genuinely useful. This is the sweet spot for most laptops.';
  } else if (ram < 24) {
    tier = 'capable';
    model = MODELS.standard;
    verdict = 'Comfortable — the dependable model will run well';
    why = `${ram} GB comfortably fits ${MODELS.standard.label} (${MODELS.standard.gb} GB), which thinks `
        + 'noticeably better than the smaller ones and is still quick enough to hold a conversation.';
  } else {
    tier = 'strong';
    model = MODELS.standard;
    verdict = 'Strong — you can run whatever you like';
    /* THE MONK NO LONGER CLAIMS THE LARGEST MODEL — retired 2026-08-07, and
       this sentence outlived it by three days like the two in overlays.js and
       the one in PROTOCOLS.md. It was the last of the four, and it was found
       only because a live test pressed "Check this computer" and read the
       output; every grep of the docs had missed it because it lives in a
       pure-logic module nobody thinks of as user-facing copy. Advice a person
       acts on IS user-facing copy. */
    why = `${ram} GB is plenty. Start with ${MODELS.standard.label} anyway; it's the reliable everyday `
        + 'choice — every resident here runs on the one model you pick, so a dependable one serves the '
        + 'whole Pavilion. Pull something larger later if replies feel thin.';
  }

  if (cores && cores <= 4 && tier !== 'tight') {
    notes.push(`${cores} processor cores means answers will arrive at a walking pace rather than instantly. That's normal, not broken.`);
  }
  if (laptop) {
    notes.push('This looks like a laptop. Plug it in before a long conversation — thinking is the most demanding thing this app ever does, and on battery most laptops deliberately slow down.');
    notes.push('The fans will spin up. That is the machine working, not struggling.');
  }
  // pointless advice for a machine we've just told not to install anything
  if (model) notes.push('The very first question after starting up is always the slowest — that is the model being loaded into memory. Ask it something short first.');

  /* Always present, never null. A tier that offered no pathway at all is the
     dead end this was added to close, so there is no branch that can drop it
     — only `prominence` changes. `npm test` checks every tier for it. */
  return {
    tier, model, verdict, why, notes, ram, cores, laptop,
    cloud: cloudPathway(tier),
    measured: info.measured !== false,
  };
}

/* The one command they need to type, ready to copy. */
export function pullCommand(model) { return model ? `ollama pull ${model.tag}` : ''; }
