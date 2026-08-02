# Book bundles, and the Docker pool — two tiers, one manifest

Written **2026-08-02**, from a direct steer:

> *"I wanted Docker to work as a container for the books and I already made a
> big space for it. This would be useful in the future if I want to use it on my
> phone — but the real use of Docker is that we can have bundles of books and
> send them to other people easier. I wanted to have some form of isolation
> where I can download the books personally on my computer, but I can also have
> the Docker library which should be much bigger, in theory holding all the
> books everyone put in. Some internal way of sharing info safely — that is the
> plan. Then we can focus on using Docker to host the books for a website later,
> to be shared for a beta if that's possible."*
>
> *"Let's make sure we don't undo work that was there for a good reason."*

That last line governs this document, so it opens with an inventory rather than
a design.

---

## What already exists — do not rebuild any of this

Checked against the code on 2026-08-02, after a day of deletions. All of it
survived and all of it is load-bearing.

- **MinIO is real and running.** `sand-pavilion-minio`, Docker, the
  `sand-pavilion-library` bucket, **42 texts, 75 MB** on this machine right now.
  Put there by `tools/caravan/push-fulltext.py`. This is the pool. It works.
- **The reader already reads from it.** A book's `doc.fullText` is *either*
  `{text}` (inline) *or* `{storage:{bucket,key}}` (fetched from MinIO on
  demand). **This is the single most important existing fact in this plan** —
  the app is already indifferent to whether a book's bytes are in hand or in the
  pool. Nothing about bundles requires changing the reader.
- **A health check that fails softly.** `refreshLibraryStorageStatus()` only
  warns when a shelved book actually *has* a MinIO pointer. No pointers, no
  warning — which is why a beta tester with no Docker sees nothing amiss, and
  why **zero shipped seed books use a pointer**. Deliberate. Keep it that way.
- **A bequest already carries a book manifest.** `data/bequests.js`:
  `books:[{slug,title,license,tradition,source_url,attribution,summary}]`. It
  hands over a *reading list* — the entries, not the bytes.
- **`exportableData()` already inlines text from disk.** It walks
  `personalLibrary`, reads each book's `.txt` back through the desktop bridge,
  and inlines it into an export *copy* without touching live data. This is the
  hard half of "make a bundle" and it is already written and working.
- **Packets** (`data/commons-packets.js`) — the file-based unit for *work*
  (paper / lesson / course / note). Bundles are the same idea for *books*, and
  should feel like a sibling, not a new system.
- **Both provenance axes** — `copyright.js` (may this be shared?) and
  `sourcing.js` (how was it gathered?), with `mayEnterCommons()` requiring both
  to agree. This is the gate a bundle passes through.

**So the missing piece is one thing, not a system: a bequest carries a reading
list; nothing carries the texts.** Everything else is already here.

---

## The two tiers, named

The steer describes two libraries and wants them isolated. They are:

**Tier 1 — your shelf.** Books you downloaded yourself. On desktop they are real
`.txt` files in the app's own data folder; in a browser they live in the save.
Small, personal, yours, **works with nothing running**. This tier must never
require Docker — that is the whole reason the app is trustworthy offline.

**Tier 2 — the pool.** MinIO in Docker. Much bigger, no practical cap but the
disk, and in principle holding everything anyone has contributed. Optional by
construction: if it is down, tier 1 is untouched and the app does not care.

The isolation the steer asks for is already structural: **tier 1 is files, tier
2 is a service.** A book in tier 2 that you want permanently is *pulled down*
into tier 1; a book in tier 1 you want to share widely is *pushed up*. Neither
happens by itself.

---

## The bundle — one manifest, three physical forms

A **bundle** is a named set of books with their provenance, plus a way to reach
each book's text. Nothing more.

```jsonc
{
  "sandPavilionBundle": 1,
  "id": "electronics-starter",
  "title": "Electronics, from nothing",
  "by": "Zac",                       // a label, not an account
  "made": "2026-08-02",
  "message": "What I actually used. Kuphaldt first, the rest when you need them.",
  "books": [
    {
      "slug": "lessons-in-electric-circuits-1",
      "title": "Lessons In Electric Circuits, Vol I — DC",
      "attribution": "Tony R. Kuphaldt",
      "license": "Design Science License",
      "source_url": "https://www.ibiblio.org/kuphaldt/electricCircuits/",
      "tradition": "Science",
      "sharing": "open",             // copyright.js verdict
      "gathered": "given",           // sourcing.js verdict
      "sha256": "9f2c…",             // of the text, always
      "text": "…"                    // EITHER inline…
      // "storage": { "bucket":"sand-pavilion-library", "key":"…" }  // …OR a pointer
    }
  ]
}
```

**The `text`-or-`storage` choice is the same one the reader already understands.**
That single fact is what makes three delivery forms one format:

1. **A `.json` file** — texts inline. Works with nothing installed, e-mailable if
   small, and identical in spirit to a packet or a bequest. The default.
2. **A folder or `.zip`** — `bundle.json` plus `texts/<sha256>.txt`. For when
   inline would be tens of megabytes. Content-addressed filenames mean
   duplicates across bundles collapse and integrity is checkable.
3. **A MinIO pointer set** — the manifest alone, each book a `{bucket,key}`.
   Tiny to send; useless without reach to that pool. This is the *website* and
   *phone* form.

**Every book carries its `sha256` in all three cases**, which is what makes a
bundle checkable rather than merely received: the same book from two sources is
provably the same bytes, and a corrupted or altered text is detectable.

---

## Two kinds of bundle, because the steer asked for isolation

This is where today's provenance work earns its keep.

**📦 A private archive.** Anything on your shelf, no questions. For backup, for
moving between your own machines, for reaching your library from your phone. It
is marked `"private": true` and the export says plainly: *this is for you; it is
not a thing to hand out.* No provenance gate, because a personal copy needs no
licence from anybody — that has been the rule since the beginning.

**🤝 A shareable bundle.** Only books where **both axes agree** —
`mayEnterCommons({sharing, gathered})` returns ok. Freely licensed *and* freely
gathered. Anything else is silently excluded from the manifest and named in a
"left out, and why" list so the omission is visible rather than mysterious.

A private archive can never become shareable by renaming it: the export path is
different and the flag is written into the manifest.

---

## What "sharing info safely" actually means here

Four properties, each already true elsewhere in the project and worth stating so
they are not lost:

1. **Nothing moves by itself.** No sync. A bundle exists because a person made
   one and handed it over.
2. **You see what you are taking before you take it.** Import shows the manifest
   — every title, its licence, where it came from — and imports nothing until you
   accept. Same discipline as the Commons Table.
3. **Provenance travels with the book, permanently.** A book that arrives in a
   bundle keeps its `sharing`/`gathered`/`source_url` on your shelf, so it can be
   re-shared honestly (or correctly refused) years later by someone who was not
   there.
4. **Content-addressing makes tampering visible.** The manifest's `sha256` is
   checked on import. A text that does not match its hash is reported, not
   silently shelved.

---

## Phases — smallest useful first

**B0 — Export a bundle (`.json`, inline).** Select books in Your Library →
*Make a bundle* → choose private archive or shareable → a file. Reuses
`exportableData()`'s inlining almost verbatim. **This is the first slice and it
is genuinely small**, because the hard part is already written.

**B1 — Import a bundle.** Drag it onto the window, same as a book. Shows the
manifest, the provenance, what will be added and what is already on your shelf
(by `sha256`, so a re-import is a no-op rather than a duplicate). You accept.

**B2 — The pool becomes visible in-game.** A door somewhere honest — the Caravan
Desk or the Library — that says what is in the Docker pool, whether it is
running, and offers *pull this down to my shelf* / *push this up to the pool*.
Today MinIO is only reachable by running a Python script; a person cannot see
their own 75 MB. **This is the "fix the pathways" item.**

**B3 — Big bundles: the folder/zip form.** `bundle.json` + `texts/<sha>.txt`,
for when inline is absurd. Also the natural on-disk shape for a bundle that
lives in the pool.

**B4 — The phone.** MinIO already speaks HTTP. Reach it on the local network,
open the browser build, and the reader's existing `storage` path just works —
that is why the pointer form matters. Needs: a bound address rather than
localhost, and honest words about what exposing it means.

**B5 — The website.** MinIO can serve a bucket read-only over HTTP, so the
website could host bundles as plain downloads: a manifest page, and files anyone
can fetch. This is the "shared for a beta" ask, and it is real — but it is the
one phase with a running cost and an exposure surface, so it comes last and gets
its own decision. `COMMONS-BACKEND-PLAN.md` is the sibling document; a bundle is
a much better first payload than a packet, because books are the thing people
actually want.

---

## The honest risks

- **Tier 1 must never come to depend on tier 2.** The moment your own notes or
  your own books need a container running to be readable, the app has become
  fragile in exchange for tidiness. MinIO earns its place for *bulk text*, where
  the files are big and absence is survivable. Guard this one.
- **A shipped seed book must never carry a MinIO pointer.** Zero do today. If
  one ever does, every tester without Docker gets a book that will not open and
  a warning they cannot act on. Worth a test.
- **Bundles make it easy to pass on something you shouldn't.** Which is exactly
  why the shareable path is gated on both axes and the private path is labelled
  in the file itself. Easy sharing without provenance is how a commons acquires
  something it had no right to — and one bad shelf discredits everything beside
  it (`CREDIT-AND-COMMONS-FRAMEWORK.md`).
- **"Everyone's books in one pool" is a moderation question wearing a storage
  costume.** A pool anyone can push to needs a review step before it is a
  commons rather than a dump. The Steward Review Queue already exists for texts;
  point at it rather than inventing something.
- **Do not let this eat the Inheritance Hall.** A bequest is a *gift with a
  message*, sometimes gated behind a real requirement. A bundle is *bulk
  transfer*. They share a manifest shape and should share code, but they are
  different gestures and both should survive.

---

## Cross-references
- `SELF-HOSTED-STACK-PLAN.md` — the backend direction. Narrower now: after
  2026-08-02 the catalog is `seed.js` in the repo and there is no database to
  replace, so MinIO-for-bulk-text is the live remainder.
- `CREDIT-AND-COMMONS-FRAMEWORK.md` — the two provenance axes and the rule that
  both must agree before anything travels.
- `COMMONS-BACKEND-PLAN.md` — content-addressed packets and keypair identity;
  a bundle is the same instinct pointed at books, and `sha256` here is the same
  idea as the packet id there.
- `LIBRARY-GROWTH-PLAN.md`, `PROTOCOLS.md` Protocol 1 — how texts get in.
- `data/bequests.js`, `data/commons-packets.js` — the two existing file-based
  sharing formats a bundle must feel like a sibling of.

**One line to hold onto:** the app has never cared whether a book's text is in
your hand or in the pool — so a bundle is not new plumbing, it is a manifest
plus a decision about where the bytes live.
