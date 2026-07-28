/* ================================================================
   [COMMONS PACKETS] — the community shelf's starter contents.

   A "packet" is the unit of shared work: a paper, a lesson plan, or a
   course, written out as one .json a person can hand to another person.
   Same idea as a bequest in the Inheritance Hall, pointed at work
   instead of gifts — and the same mechanics: no server, no account,
   nothing moves unless someone deliberately writes a file.

   The three below ship with the build so the Commons Table isn't empty
   on day one. They are honestly attributed to the Pavilion itself —
   NOT to invented people. There are no fake community members here;
   when a real person writes one, theirs will carry their own name
   because they typed it.
   ================================================================ */

export const PACKET_KINDS = {
  paper:  { icon:'📄', label:'Paper',       lands:'your Science & Research Hall' },
  lesson: { icon:'🎓', label:'Lesson plan', lands:'Your Notes' },
  course: { icon:'🧭', label:'Course',      lands:'your Course Board' },
  note:   { icon:'🗒', label:'Note',        lands:'Your Notes' },
};

export const COMMONS_PACKETS = [
  {
    id: 'reading-a-study',
    sandPavilionPacket: 1,
    kind: 'paper',
    title: 'Reading a study without being fooled',
    by: 'The Pavilion',
    license: 'Original — Pavilion Commons',
    created: '2026-07-27',
    summary: 'A short method for appraising a paper you are not qualified to referee — which is nearly all of them.',
    body: `Most of us cannot check a paper's statistics, and pretending otherwise is how people get fooled twice: first by the paper, then by their own confidence. What a non-specialist CAN check is the shape of the claim. That is worth more than it sounds.

1. WHAT WOULD MAKE THIS WRONG?
Ask it before anything else. A claim that cannot be wrong is not a finding, it is a position. If the paper never says what result would have falsified it, that is the first mark against it — and it is a mark you can make without any statistics at all.

2. HOW MANY, AND COMPARED TO WHAT?
Two numbers. How many subjects, and what were they compared against. A striking effect in twelve people who were compared to nobody is a hypothesis. That is not an insult; hypotheses are how everything starts. It is only a problem when it is reported as a conclusion.

3. DID THEY DECIDE WHAT COUNTED BEFORE OR AFTER?
If the outcome being celebrated is not the outcome the study set out to measure, you are looking at something found while rummaging. Sometimes real things are found while rummaging. They then need their own study, run forwards.

4. WHO PAID, AND WHAT DID THEY WANT?
Not disqualifying. Funding is not corruption. But it is context, and a paper that hides it has told you something about itself.

5. IS THE HEADLINE THE PAPER'S, OR SOMEONE ELSE'S?
An enormous share of "science says" is a press office's sentence, not a researcher's. Find the actual claim in the actual abstract before arguing with anyone about it.

WHAT THIS METHOD WILL NOT DO
It will not tell you the paper is true. It cannot. It sorts papers into "worth taking seriously" and "not yet", which is a smaller job than it sounds and the only honest one available to a reader outside the field. The remaining humility is not a flaw in the method; it is the actual epistemic situation, stated plainly.

The Hall's own standing rule applies here too: no gatekeepers of truth, and no volume-as-evidence either. Anyone may make a claim. The claim still has to say what would sink it.`,
  },
  {
    id: 'first-hour-local-ai',
    sandPavilionPacket: 1,
    kind: 'lesson',
    title: 'Lesson plan: someone’s first hour with a local AI',
    by: 'The Pavilion',
    license: 'Original — Pavilion Commons',
    created: '2026-07-27',
    summary: 'For teaching one non-technical person to get a model running on their own machine, in an hour, without them feeling stupid once.',
    body: `WHO THIS IS FOR
One person who has never installed anything like this, sitting at their own computer, with you beside them or on a call. Not a class. The whole plan assumes they will hit at least one error, because they will.

BEFORE YOU START (5 min)
Ask what the machine is: how much memory, and whether it has a graphics card. You are not doing this to judge the machine — you are doing it so you pick a model that will actually answer, and so they never experience a two-minute silence and conclude the whole idea is fake.

THE HOUR

  0–10  WHAT IS ACTUALLY HAPPENING
        A program runs on their computer. It answers. Nothing is sent
        anywhere. Say this in those words — the single biggest thing a
        newcomer gains here is not a skill, it is the realisation that
        this can be true at all.

  10–25 INSTALL AND PULL ONE MODEL
        Install Ollama. Pull ONE small model. Do not offer a choice of
        five; a choice of five is how a beginner spends the hour
        reading comparison tables instead of talking to a machine.

  25–35 THE FIRST REPLY
        Get a reply in a terminal first, before any app. It is the
        moment the thing becomes real. Let them type the question.

  35–50 CONNECT IT TO SOMETHING THEY CARE ABOUT
        Point it at a real task of theirs — a letter, a plan, a piece
        of homework. Abstract demos teach nothing.

  50–60 WHAT IT IS BAD AT
        End here, deliberately. Show it being confidently wrong about
        something they know well. A student who leaves knowing the
        failure mode is safe with it; one who leaves impressed is not.

THE TWO THINGS THAT WILL GO WRONG
1. It takes minutes, or returns nothing. Almost always a "thinking" model,
   or one too big for the machine. Drop a size. This is not their fault and
   they should be told so out loud.
2. Something cannot reach something. In a browser it is usually the origins
   setting; in a desktop app it usually is not, which is worth knowing before
   you spend twenty minutes on it.

HOW YOU KNOW IT WORKED
They open it again the next day without being asked. That is the whole
measure. Not whether they can recite what a model is.`,
  },
  {
    id: 'read-one-book-properly',
    sandPavilionPacket: 1,
    kind: 'course',
    title: 'Read one book properly',
    by: 'The Pavilion',
    license: 'Original — Pavilion Commons',
    created: '2026-07-27',
    summary: 'Six steps, one book, no schedule. Against the habit of collecting books faster than you read them.',
    why: 'A library you have not read is a wish list. This is the smallest real cure.',
    steps: [
      'Choose one book already on your shelves. Not a new one.',
      'Read the first ten pages without taking a single note.',
      'Write one sentence: what you think this book is actually arguing.',
      'Read on, and take notes only where you disagree or do not follow.',
      'When you finish, write what you got wrong in that first sentence.',
      'Tell one person what it said, out loud, without the book in front of you.',
    ],
  },
];
