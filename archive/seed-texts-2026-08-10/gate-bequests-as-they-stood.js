/* ================================================================
   [BEQUESTS] — gifts left at the gate of the Inheritance Hall.

   The Hall itself ships EMPTY, and that stays true: nothing below is
   in the ground when you arrive. These are bequests *offered* — the
   same `.json` shape one person hands another, bundled with the build
   so a visitor's first act in that courtyard can be receiving
   something rather than staring at bare sand. You choose to plant
   them, one at a time, and you can dig any of them up again.

   Everything here is drawn from texts already on the Library's own
   shelves, under licenses that genuinely permit it (CC0 SuttaCentral
   translations, and the Pavilion's own writing). Quotations are
   marked as quotations and attributed where they come from — the same
   test every text passes at the Library door, applied to a gift.
   ================================================================ */

/* The Buddha's first discourse — Dhammacakkappavattana Sutta (SN 56.11),
   Bhikkhu Sujato's translation, CC0, already shelved here as "The First
   Sermon". Every passage quoted below is from that text verbatim. */
const SERMON = 'The First Sermon (SN 56.11), trans. Bhikkhu Sujato, CC0 — shelved on the Theravada shelf.';

export const GATE_BEQUESTS = [
  {
    id: 'first-turning',
    sandPavilionBequest: 1,
    kind: 'book',
    title: 'The First Turning',
    by: 'The Pavilion',
    left: 'the day the Hall was opened',
    message: "Five texts, and the first one is where the whole thing starts: a talk given to five people in a deer park, on the road, to an audience that had walked out on him a few days before.\n\nRead that one first. The other four are what it turns into when someone actually practises it.",
    books: [
      { slug:'first-sermon', title:'The First Sermon — Setting the Wheel of Dhamma Rolling', license:'CC0 1.0', tradition:'Theravada',
        source_url:'https://suttacentral.net/sn56.11', attribution:'Bhikkhu Sujato, CC0',
        summary:'The first discourse: the middle way, the four noble truths, and the eightfold path, in the order he first gave them.' },
      { slug:'dhammapada', title:'The Dhammapada', license:'CC0 1.0', tradition:'Theravada',
        summary:'The verses. Short enough to carry, deep enough to keep returning to.' },
      { slug:'satipatthana', title:'Satipatthana — Foundations of Mindfulness', license:'CC0 1.0', tradition:'Theravada',
        summary:'What "right mindfulness" actually means in practice, step by step.' },
      { slug:'anapanasati', title:'Anapanasati — Mindfulness of Breathing', license:'CC0 1.0', tradition:'Theravada',
        summary:'The most practical instruction in the canon. Sixteen steps, one breath at a time.' },
      { slug:'metta', title:'The Metta Sutta — On Loving-Kindness', license:'CC0 1.0', tradition:'Theravada',
        summary:'Short. Read it out loud once and you will see why it survived.' },
    ],
  },
  {
    id: 'four-truths',
    sandPavilionBequest: 1,
    kind: 'seed',
    title: 'The Four Truths and the Eight Folds',
    by: 'The Pavilion',
    left: 'the day the Hall was opened',
    message: "His first teaching, put in the ground as a seed rather than handed over as a book — because this is the kind of thing that only opens on its own time.\n\nEvery quoted line below is verbatim from the discourse itself, not a summary written here.",
    notes: [
      { title: 'The middle way — what it is between',
        created: '',
        body: "Before the four truths, before the eight folds, he names two things to walk between:\n\n“Mendicants, these two extremes should not be cultivated by one gone forth. What two? Indulgence in sensual pleasures, which is low, crude, ordinary, ignoble, and pointless. And indulgence in self-mortification, which is painful, ignoble, and pointless. Avoiding these two extremes, the Realized One understood the middle way of practice, which gives vision and knowledge, and leads to peace, direct knowledge, awakening, and extinguishment.”\n\nWorth sitting with that the second extreme is on the list at all. Grinding yourself down is named as being just as pointless as indulging yourself — by someone who had spent years doing exactly that first.\n\n— " + SERMON },
      { title: 'The four noble truths, in his own words',
        created: '',
        body: "1. SUFFERING.\n“Rebirth is suffering; old age is suffering; illness is suffering; death is suffering; being coupled with the disliked is suffering; separation from the liked is suffering; not getting what you wish for is suffering.”\n\n2. ITS ORIGIN.\n“It’s the craving that leads to future lives, mixed up with relishing and greed, taking pleasure there wherever it alights. That is, craving for sensual pleasures, craving to continue existence, and craving for nonexistence.”\n\n3. ITS CESSATION.\n“It’s the fading away and cessation of that very same craving with no residue left behind; giving it away, letting it go, releasing it, and not clinging to it.”\n\n4. THE PRACTICE THAT LEADS THERE.\n“It is simply this noble eightfold path.”\n\nNote the shape: a problem, its cause, the news that it can actually stop, and then a method. That is a diagnosis, not a creed — which is why it survives translation into almost any life.\n\n— " + SERMON },
      { title: 'The eightfold path — the eight, as first given',
        created: '',
        body: "“And what is that middle way of practice? It is simply this noble eightfold path, that is: right view, right purpose, right speech, right action, right livelihood, right effort, right mindfulness, and right immersion.”\n\nAll eight of them stand as signs in the Keep, north of the Grounds — walk up to any one and it opens as a reflection you can keep adding to. “Right purpose” and “right immersion” are rendered there in their more familiar forms, right intention and right concentration; same folds, older English.\n\nThey are not eight stages to complete in order. They are eight things that hold each other up.\n\n— " + SERMON },
      { title: 'The line the whole thing turns on',
        created: '',
        body: "One person in that audience of five actually got it while it was being said, and what he understood is recorded as a single sentence:\n\n“Everything that is liable to arise is liable to cease.”\n\nThat is the whole teaching in eight words, and it is also — read plainly, with no religion attached at all — simply a true description of every object, every mood, every institution, and every one of us.\n\nEverything turns to sand. So give it away first.\n\n— " + SERMON },
    ],
  },
  {
    id: 'buried-question',
    sandPavilionBequest: 1,
    kind: 'sword',
    title: 'Something buried here',
    by: 'The Pavilion',
    left: 'the day the Hall was opened',
    message: "Buried on purpose. It will not surface for anyone who hasn't read the first discourse — not because the words are secret, but because the answer is worthless if you haven't.",
    hidden: { kind:'read', slug:'first-sermon', label:'read The First Sermon in the Library' },
    course: {
      title: 'Sit with impermanence for a week',
      why: "Not a belief to adopt. A claim to actually check against your own life, which is the only way anything here is worth holding.",
      steps: [
        'Read the first discourse once, slowly, without taking a single note.',
        'Pick one thing you are certain will last. Write down why you are certain.',
        'For seven days, note one thing each day that arose and then ceased. Small ones count most.',
        'On the seventh day, read what you wrote on day one again.',
        'Decide for yourself whether the claim held. Write that down too — including if it did not.',
      ],
    },
    trial: {
      question: 'The middle way avoids two extremes. Name them.',
      answer: 'sensual indulgence and self-mortification',
      hint: 'One is the road he grew up on; the other is the road he tried next. Both are named in the first paragraph.',
    },
  },
];
