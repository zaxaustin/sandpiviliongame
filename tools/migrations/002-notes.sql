-- ================================================================
-- MIGRATION 002 — notes
--
-- WHY THIS IS A SEPARATE FILE AND NOT AN EDIT TO schema.sql.
-- schema.sql runs ONCE, when the database volume is first created. It has
-- already run. Editing it now would change nothing on this machine and
-- would silently disagree with every database that already exists. Changing
-- a live database is always a new, numbered, re-runnable file.
--
-- Every statement below is IF NOT EXISTS / OR REPLACE, so running this
-- twice is harmless. That is the property that makes migrations safe to
-- apply without first working out whether they were already applied.
--
--   docker exec -i sand-pavilion-postgres psql -U pavilion -d pavilion \
--     -v ON_ERROR_STOP=1 -f - < tools/migrations/002-notes.sql
--
-- WHAT THIS BUYS, and it is the thing localStorage cannot do: every note
-- you have ever written, searchable as one body of text, and reachable by
-- the book AND CHAPTER it came from. That is the "find all references" of
-- the IDE framing in CLAUDE.md, and it is why the notes half has felt
-- underbuilt no matter how many books were added.
-- ================================================================

CREATE TABLE IF NOT EXISTS notes (
  id          BIGSERIAL PRIMARY KEY,
  -- Where it came from. The six stores the save keeps separately
  -- (data.notes, data.bookNotes, chatNotes, research, grant, hall) become
  -- one table with an honest label, rather than six arrays unioned on every
  -- render by gatherNotes().
  source      TEXT NOT NULL CHECK (source IN ('mynotes','book','chat','research','grant','hall')),

  -- Optional anchor into the library. A note about a book knows its
  -- chapter; a stray thought at the Writing Desk knows neither, and that is
  -- an ABSENT field rather than a guessed one - the same rule the reader
  -- follows for a book with no chapter marks.
  slug        TEXT REFERENCES books(slug) ON DELETE SET NULL,
  chapter_idx INTEGER,
  page        INTEGER,

  title       TEXT,
  body        TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  folder      TEXT,

  -- The key from the save (e.g. 'book:dhammapada:1a2b3c'), so a note can be
  -- carried in and out without being duplicated on every sync.
  save_key    TEXT UNIQUE,

  created     DATE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_by_book    ON notes (slug, chapter_idx);
CREATE INDEX IF NOT EXISTS notes_by_source  ON notes (source);
CREATE INDEX IF NOT EXISTS notes_by_folder  ON notes (folder);
CREATE INDEX IF NOT EXISTS notes_by_tags    ON notes USING GIN (tags);

-- FULL-TEXT SEARCH over everything you have written. Postgres builds the
-- index itself from title+body; there is nothing to keep in sync by hand,
-- which matters because a hand-maintained index is the exact kind of thing
-- this project has watched drift three times.
CREATE INDEX IF NOT EXISTS notes_fts ON notes
  USING GIN (to_tsvector('english', COALESCE(title,'') || ' ' || body));

-- ---------- what the panels and the residents actually ask ----------

-- "everything I wrote about THIS book", in the book's own order
CREATE OR REPLACE VIEW v_notes_by_book AS
  SELECT n.slug, b.title AS book_title, n.chapter_idx,
         c.label AS chapter_label, n.page, n.title, n.body, n.tags, n.created
    FROM notes n
    LEFT JOIN books b ON b.slug = n.slug
    LEFT JOIN chapters c ON c.slug = n.slug AND c.idx = n.chapter_idx
   WHERE n.slug IS NOT NULL
   ORDER BY b.title, n.chapter_idx NULLS LAST, n.page NULLS LAST;

-- how much you have written about each book, without loading a single note
CREATE OR REPLACE VIEW v_note_counts AS
  SELECT b.slug, b.title, count(n.id) AS notes,
         count(DISTINCT n.chapter_idx) FILTER (WHERE n.chapter_idx IS NOT NULL) AS chapters_touched
    FROM books b LEFT JOIN notes n ON n.slug = b.slug
   GROUP BY b.slug, b.title
  HAVING count(n.id) > 0
   ORDER BY count(n.id) DESC;

CREATE OR REPLACE FUNCTION touch_notes_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_touch ON notes;
CREATE TRIGGER notes_touch BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION touch_notes_updated();
