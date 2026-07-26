# Lesson 02 — Room for a Library (local storage with Docker)

*Give your Pavilion somewhere to keep the **full text** of a large, growing
library — on your own machine, in Docker. Optional and a bit more advanced: you
only need this if you want a big collection of full books, not just a few. Runs
entirely locally; nothing goes to any cloud.*

---

## Do you even need this? (read first)

**Probably not on day one — and that's fine.** Here's the honest split:

- **Personal books you add yourself** (drop an `.epub`/`.txt` on the Caravan
  Desk — Lesson "Make the Library yours") are stored as **plain files by the app
  itself.** No Docker, no setup. Most people never need more than this.
- **This lesson is for the bigger ambition:** holding the **full text of a large,
  certified library** locally — dozens, hundreds, thousands of books — the
  "build a real library from scratch, and own it" path. That's what Docker +
  MinIO give you: a proper local storage room for text.

If you just want to read a few books you bring in, skip this. If you want to
grow a *serious* library that lives on your machine and answers to no one, read
on.

---

## What Docker and MinIO actually are (one line each)

- **Docker** — a way to run a small, self-contained program (here, a storage
  server) on your computer without it tangling with everything else. Think of it
  as a clean, sealed appliance you switch on.
- **MinIO** — the storage appliance itself: it holds files (your books' full
  text) and hands them back when the Pavilion asks. It runs *only* on your
  machine, reachable only by you.

The catalog *cards* (title, author, summary) are small and live elsewhere; MinIO
holds the **big stuff** — the actual text of the books.

---

## How much space should I give it?

Here's the reassuring math, because it changes the answer:

- **A whole book, as plain text, is tiny** — usually **under 1 MB.** (Text has no
  images or layout; *War and Peace* is about 3 MB of text.)
- So **1 GB ≈ ~1,000 books.** **10 GB ≈ ~10,000 books.**
- **Your idea of "as big as a game — around 32 GB" is a great, generous
  default.** For pure text that's *tens of thousands* of books — far more than
  you'll likely shelve. If you also keep **PDFs or scanned pages** (much bigger,
  1–50 MB each), 32 GB still holds hundreds to a few thousand of those.

**The key thing to understand: you don't pre-carve out a fixed size.** MinIO
just uses free space in the folder you point it at, growing as you add books.
"32 GB" is really a *soft budget you keep in mind*, not a wall you build. On your
machine (plenty of free disk), 32 GB is trivial — you could go far bigger with no
downside but used space.

**Recommended:** think of ~**32 GB** as your starting headroom (your instinct is
right). You'll almost certainly stay well under it, and growing is easy (below).

---

## Setting it up (Windows)

1. **Install Docker Desktop** — from
   [docker.com](https://www.docker.com/products/docker-desktop/). On Windows it
   uses WSL2 under the hood; the installer sets that up. Restart if it asks.
2. **Start Docker Desktop** and let it finish booting (the whale icon in the
   tray goes steady).
3. **Run MinIO**, pointing it at a folder on your disk for the data. In a
   terminal (one line):
   ```
   docker run -d --name sand-pavilion-minio -p 9000:9000 -p 9001:9001 -v C:\sand-pavilion-library:/data minio/minio server /data --console-address ":9001"
   ```
   - `-v C:\sand-pavilion-library:/data` is the important part: it says "keep the
     books in *this* folder on my real drive." Point it at a big drive if you
     like. That folder **is** your library's storage — back it up like anything
     precious.
   - `-d` means it runs in the background; `--name` lets you start/stop it by
     name.
4. **Confirm it's alive:** `curl http://localhost:9000/minio/health/live` should
   respond, and the Pavilion's title/pause screen will show MinIO as reachable.
5. **Keep it on across reboots** (optional): `docker update --restart unless-stopped sand-pavilion-minio`.

*(Mac/Linux: same `docker run`, just swap the `-v` path for a Unix one like
`-v ~/sand-pavilion-library:/data`.)*

The full commands and the certified-library pipeline that fills MinIO live in
[`../PROTOCOLS.md`](../PROTOCOLS.md) (Protocol 1, Pathway B, and Protocol 3).

---

## Making it bigger later

Because it's "just a folder growing on your drive," growing is easy:

- **It grows on its own** as you add books — there's no cap to raise for normal
  use; it keeps using free space in that folder.
- **Give it a bigger home:** stop MinIO (`docker stop sand-pavilion-minio`), move
  the data folder to a larger drive, and re-run the `docker run` with the new
  `-v` path. Same books, more room.
- **If Docker itself runs low** (its WSL disk image has its own ceiling on
  Windows), raise it in **Docker Desktop → Settings → Resources → Disk image
  size.** Most people never touch this.

There's no real upper limit but your actual disk — the Pavilion is designed so
the library can afford to be *big* (that's the whole point of keeping it local
and cheap).

---

## The honest notes

- **This is local, forever.** MinIO here talks only to your machine
  (`localhost`). Your library is yours; nothing about it is uploaded anywhere.
  This is the "own your library, off any cloud" direction made real
  (`../plans/SELF-HOSTED-STACK-PLAN.md`).
- **Docker uses some memory while running.** On a machine with limited cooling,
  that's fine for storage (MinIO is light), but it's one more thing running —
  stop it (`docker stop sand-pavilion-minio`) when you're not adding books if you
  want the machine coolest.
- **You can always start smaller.** There's nothing wrong with skipping Docker
  entirely and using personal files until your library genuinely outgrows them.

---

## What's next
- Fill it: bringing in real books, start to finish, is
  [`../PROTOCOLS.md`](../PROTOCOLS.md) Protocol 1.
- Understand where everything lives (and the limits):
  [`../plans/CAPACITY-AND-PIPELINES.md`](../plans/CAPACITY-AND-PIPELINES.md).
