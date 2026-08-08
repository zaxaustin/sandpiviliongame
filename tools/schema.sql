-- ================================================================
-- THE PAVILION'S KNOWLEDGE, as tables.
--
-- Runs ONCE, when the database volume is first created. Changing this
-- file does nothing to a database that already exists.
--
-- WHAT GOES HERE AND WHAT DOES NOT.
--   here : what the Pavilion knows ABOUT a book - its card, its shelf,
--          its chapters, whether its text is healthy.
--   MinIO: the text itself. Big, opaque, written once.
--   the save (localStorage): your days, notes, progress. Stays local so
--          the Pavilion is complete with none of this running.
--
-- THE RULE THIS SCHEMA IS BUILT AROUND, from the steward, 2026-08-03:
--
--     "chapters to get marked over time or by user input"
--
-- So a chapter is not a fact the app recomputes on every open and throws
-- away. It is a RECORD with a provenance and a confirmation, which is
-- what makes it correctable - and correctable is the whole difference
-- between a chapter list you can trust on a citation and one you cannot.
-- ================================================================

-- ---------- books: the catalogue card ----------
CREATE TABLE IF NOT EXISTS books (
  slug          TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  attribution   TEXT,
  license       TEXT,          -- optional for your own shelf, on purpose
  source_url    TEXT,
  shelf         TEXT,          -- NULL = unfiled; the thing sorting 300 books decides
  kind          TEXT NOT NULL DEFAULT 'book'
                CHECK (kind IN ('book','paper','datasheet','physical')),
  part          TEXT,          -- datasheets only
  text_key      TEXT,          -- the MinIO object; NULL for a book owned on paper
  pages         INTEGER,       -- as the reader paginates it, so citations agree
  added         DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "which of my books are unshelved" is the question the sorter asks every
-- time, over ~300 rows. Index it rather than scanning.
CREATE INDEX IF NOT EXISTS books_unshelved ON books (shelf) WHERE shelf IS NULL;
CREATE INDEX IF NOT EXISTS books_shelf     ON books (shelf);
CREATE INDEX IF NOT EXISTS books_kind      ON books (kind);

-- ---------- health: is the text actually there and readable ----------
-- Written by tools/library-audit.py, which is deterministic Python and calls
-- no model at all. A book with a broken pointer looks identical to a real one
-- until you open it; this is what makes "dead" visible from the shelf.
CREATE TABLE IF NOT EXISTS book_health (
  slug          TEXT PRIMARY KEY REFERENCES books(slug) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('ok','dead','suspect','missing')),
  problems      TEXT[],        -- 'no work here', 'HTML, not text', ...
  body_chars    INTEGER,       -- length with the Gutenberg wrapper stripped
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- chapters: found, or marked by hand, and never guessed ----------
CREATE TABLE IF NOT EXISTS chapters (
  slug          TEXT NOT NULL REFERENCES books(slug) ON DELETE CASCADE,
  idx           INTEGER NOT NULL,        -- 1-based, the order you read them
  page          INTEGER NOT NULL,        -- 0-based, the reader's own pages
  label         TEXT NOT NULL,
  -- HOW WE KNOW. 'toc' is the book's own contents block and the most
  -- trustworthy; 'hand' is the steward and outranks everything, because a
  -- person who has the book open is better evidence than any heuristic.
  source        TEXT NOT NULL CHECK (source IN ('toc','headings','numerals','hand')),
  confirmed     BOOLEAN NOT NULL DEFAULT FALSE,   -- a human has seen it and agreed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (slug, idx)
);

CREATE INDEX IF NOT EXISTS chapters_by_page ON chapters (slug, page);

-- What the detector last did for a book, kept apart from the chapters
-- themselves so re-running it never silently erases a hand-marked list.
CREATE TABLE IF NOT EXISTS chapter_scans (
  slug          TEXT PRIMARY KEY REFERENCES books(slug) ON DELETE CASCADE,
  how           TEXT NOT NULL CHECK (how IN ('toc','headings','numerals','none')),
  found         INTEGER NOT NULL,
  scanned_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- what the residents may read ----------
-- The reason for a backend at all, in the steward's words: Supabase "did not
-- allow AI integration on the backend." A resident should ASK a question of
-- the library, not be handed a pasted list of 296 titles and left to guess.
-- These views are the safe, small answers - deliberately views, so there is
-- one definition of "unshelved" and the prompt cannot drift from the panel.

CREATE OR REPLACE VIEW v_unshelved AS
  SELECT b.slug, b.title, b.attribution, b.kind
    FROM books b
    LEFT JOIN book_health h ON h.slug = b.slug
   WHERE b.shelf IS NULL
     AND COALESCE(h.status, 'ok') <> 'dead'
   ORDER BY b.title;

CREATE OR REPLACE VIEW v_shelf_counts AS
  SELECT COALESCE(shelf, '(unfiled)') AS shelf, COUNT(*) AS n
    FROM books GROUP BY 1 ORDER BY n DESC;

-- Books whose chapters nobody has confirmed - the honest work queue for
-- "mark chapters by hand", and the list the reader can offer you.
-- KEPT IN STEP WITH tools/migrations/004-chapters-honest.sql, and it has to
-- be: applySchema() runs THIS FILE FIRST and then every migration, on every
-- open. If this still held the old five-column shape it would try to replace
-- 004's six-column view on the second open and fail with "cannot drop columns
-- from view" — before the migration that fixes it ever ran. Caught exactly
-- that way 2026-08-07.
--
-- Driven by what was actually SCANNED, not by where the text happens to live.
-- The old version gated on `b.text_key IS NOT NULL` — a MinIO object key,
-- written only by tools/load-library.mjs — so it could never return a row on
-- any machine but the steward's. A book nobody has opened is UNKNOWN, not
-- "needs chapters": the reader's own absent-beats-guessed rule, on a row.
CREATE OR REPLACE VIEW v_needs_chapters AS
  SELECT b.slug, b.title, b.pages, s.how, s.found, s.scanned_at
    FROM chapter_scans s
    JOIN books b ON b.slug = s.slug
   WHERE s.found < 2
   ORDER BY b.pages DESC NULLS LAST;

CREATE OR REPLACE VIEW v_chapter_coverage AS
  SELECT (SELECT count(*) FROM books)                             AS books_known,
         (SELECT count(*) FROM chapter_scans)                     AS books_scanned,
         (SELECT count(*) FROM chapter_scans WHERE found >= 2)    AS books_divided,
         (SELECT count(*) FROM chapters WHERE source = 'hand')    AS marks_by_hand;

-- ---------- keep updated_at honest ----------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS books_touch ON books;
CREATE TRIGGER books_touch BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
