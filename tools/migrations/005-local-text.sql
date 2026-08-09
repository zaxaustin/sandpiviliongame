-- ================================================================
-- 005 · A BOOK'S TEXT CAN LIVE ON THIS MACHINE, AND THE DATABASE
--       HAS TO BE ABLE TO SAY SO.
--
-- Found 2026-08-10 while reconciling a 415-row catalogue: 89 rows had
-- no text_key and looked, from the database's side, like books owned on
-- paper with nothing behind them. They are not. They are
--
--   A Tale of Two Cities · Heart of Darkness · Dracula · Emma ·
--   Don Quixote · The Divine Comedy · The Complete Works of Shakespeare
--
-- and their text is sitting right there in 59 real .txt files under the
-- app's own userData/library, written by shelveAsPersonal()'s fallback
-- path whenever MinIO was not answering.
--
-- `text_key` only ever meant "the MinIO object". There was no column
-- for the other home, so the local half of the Library was known to the
-- SAVE and invisible to the database. That is a real fragility, not a
-- tidiness complaint: lose the localStorage save and those 59 books
-- become unopenable with the files untouched on disk, because nothing
-- else records which file belongs to which book.
--
-- The steward's call: "we can add local files to the personal book
-- shelf, lets update the databaste to reflect it."
--
-- WHY A SECOND COLUMN AND NOT A SCHEME INSIDE text_key. A book can
-- legitimately be in BOTH homes — written to MinIO once and cached as a
-- file, or moved between them — and squeezing two homes into one column
-- forces a parse and loses the ability to say "both". Two nullable
-- columns answer three questions exactly: Docker, this machine, or a
-- card with no text behind it at all. data/book-storage.js already
-- reads the doc that way, so this is the database catching up to the
-- shape the app has been using.
--
-- IDEMPOTENT, like every migration here: applySchema() runs schema.sql
-- plus every migration on BOTH homes on every open, so this file has to
-- be safe to run for the thousandth time.
-- ================================================================

ALTER TABLE books ADD COLUMN IF NOT EXISTS local_file TEXT;

COMMENT ON COLUMN books.local_file IS
  'Filename under userData/library holding this book''s text, when the text was written to this machine rather than to MinIO. NULL means it is not kept locally. A book may have both this and text_key.';

-- "which of my books can I actually open" is now answerable in SQL, and
-- it is the question the Library asks on every render.
CREATE INDEX IF NOT EXISTS books_has_text
  ON books ((text_key IS NOT NULL OR local_file IS NOT NULL));

-- The honest three-way answer, so no caller has to re-derive it and get
-- it slightly different. Matches storageOf() in data/book-storage.js.
CREATE OR REPLACE VIEW v_book_homes AS
  SELECT slug, title, shelf,
         CASE WHEN text_key   IS NOT NULL AND text_key   <> '' THEN 'docker'
              WHEN local_file IS NOT NULL AND local_file <> '' THEN 'machine'
              ELSE 'summary' END AS home,
         text_key, local_file
    FROM books;
