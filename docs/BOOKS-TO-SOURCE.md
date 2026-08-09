# The seed shelf, removed — and where to get the real books

**2026-08-10.** The 27 books hardcoded into `src/game/data/seed.js` are gone,
at the steward's instruction: *"delete the seed books all of them with not a
single thing left."*

**Why they had to go.** Twenty-one of the twenty-seven were **two-section
excerpts pretending to be books** — a few hundred words under a real title,
with no full text behind them. Opening *The Republic* on the seed shelf gave
you a paragraph and a footnote. That is worse than an empty shelf, because an
empty shelf tells the truth. The remaining six had real text and are
re-downloadable in better editions anyway.

**Nothing here was lost.** Every seed text is preserved verbatim in
[`archive/seed-texts-2026-08-10/`](../archive/seed-texts-2026-08-10/) — this is
a list for re-sourcing, not a recovery list. Your own library was never
affected: 415 catalogue rows, 326 full texts in MinIO.

---

## Get these as EPUB — they were excerpts, not books

All public domain. **Standard Ebooks** is worth preferring where it has one:
properly typeset, modern punctuation, real EPUB3, no Gutenberg boilerplate to
strip. Otherwise Gutenberg's own EPUB is fine.

| Title | Author / translation | Where |
|---|---|---|
| Meditations | Marcus Aurelius | Standard Ebooks · Gutenberg #2680 |
| The Republic | Plato, tr. Jowett | Standard Ebooks · Gutenberg #1497 |
| The Nicomachean Ethics | Aristotle | Standard Ebooks · Gutenberg #8438 |
| On the Origin of Species | Charles Darwin (1859 1st ed.) | Standard Ebooks · Gutenberg #1228 |
| The Autobiography of Benjamin Franklin | Benjamin Franklin | Standard Ebooks · Gutenberg #20203 |
| Essays: First Series | Ralph Waldo Emerson | Standard Ebooks · Gutenberg #16643 |
| The Art of War | Sun Tzu, tr. Lionel Giles | Standard Ebooks · Gutenberg #132 |
| Aesop's Fables | tr. George Fyler Townsend | Standard Ebooks · Gutenberg #21 |
| Tao Te Ching | Laozi, tr. James Legge | Gutenberg #216 *(as* The Tao Teh King*)* |
| The Writings of Zhuangzi | Zhuangzi, tr. James Legge | Gutenberg #2114 *(SBE vols. 39–40)* |

**You may already have several of these.** `art-of-war.txt`, `zhuangzi.txt`,
`tao-te-ching.txt` and `aesops-fables.txt` are already objects in your MinIO
bucket — check the Library before re-downloading.

## Already had real text — replace with a full edition when convenient

| Title | Source it came from |
|---|---|
| The Dhammapada | SuttaCentral (CC0) — or Gutenberg #2017, Müller tr. |
| Satipatthana Sutta (MN 10) | SuttaCentral (CC0) |
| The Metta Sutta (Snp 1.8) | SuttaCentral (CC0) |
| Anapanasati Sutta (MN 118) | SuttaCentral (CC0) |
| The First Sermon (SN 56.11) | SuttaCentral (CC0) |
| The Bhagavad Gita | Sir Edwin Arnold, *The Song Celestial* — Gutenberg #2388 |

**SuttaCentral released the whole Pali canon to the commons (CC0)** and the
Caravan Desk already has a live SuttaCentral search — for the five suttas
above, that is the shortest path and gives you the canonical text rather than
an excerpt.

---

## Not re-downloadable — these were ours

Nine of the twenty-seven were **written for the Pavilion**, not sourced. They
cannot be found anywhere because they were never published anywhere:

*A Visitor's Handbook · Waking the Residents · Filling Your Own Shelves · When
Something Goes Wrong · How to Complete Your Own Pavilion · How This Library
Works · On Precision in Tradition · A Practice Logbook · Steward's Field Notes*

Plus *A Note on the Luminous Nature of Mind* and *Reading the Inner Chapters*,
also ours.

They were onboarding documentation shelved as if it were literature, which is
why they are out of the Library. **Their text is kept in
`archive/seed-texts-2026-08-10/`.** If any of it should be in the game again it
belongs in the Welcome panel, on a sign, or in `MANUAL.md` — somewhere a person
looks for help — not on a shelf next to Darwin.

---

## Bringing them back in

**Bring a book in** — the intake table in the Library, right beside Your Shelf.
Drop an `.epub` or a `.txt` straight onto it. With Docker running the text goes
to MinIO and there is no practical limit; without it, the text is written as a
file on this machine.

The longer form, with licence and provenance fields, is the **Caravan Desk** in
the Workshop.
