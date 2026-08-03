-- ================================================================
-- MIGRATION 003 — the Records Hall, and hiding
--
-- From the steward, 2026-08-03:
--
--   "the records hall should see all of it unless its hidden for whatever
--    reason... research in books, papers, then a lab experiment should be
--    separate note places as well as the planning and journaling with
--    Sebastian"
--
-- TWO THINGS, and the distinction between them is the whole design.
--
--   A note is written in a PLACE, and the places stay separate. Reading a
--   book, running a bench experiment, and planning a day with Sebastian are
--   genuinely different acts, and collapsing them into one undifferentiated
--   pile is what made the old Your Notes view feel like a drawer rather than
--   a workshop. `notes.source` already keeps them apart.
--
--   The RECORDS HALL sees across all of them. It owns nothing and duplicates
--   nothing - the same discipline the Lab already follows, where every count
--   is read live from wherever the thing actually lives. It is an INDEX, and
--   an index that holds its own copy of the truth is just a second truth
--   waiting to disagree with the first.
--
-- WHY A TABLE AND NOT ONLY A VIEW. Most of what the visitor produces still
-- lives in the save - dissections, builds, experiments, lessons walked, days
-- planned. A view over the database alone could never see those. So this is
-- a thin INDEX: kind, title, when, and a pointer back to where the real
-- thing lives. The artifact is never copied here, only listed.
--
-- HIDDEN IS A PROPERTY OF THE RECORD, NOT A SEPARATE STORE. "Unless it's
-- hidden for whatever reason" - no reason required, no explanation asked
-- for, and hiding never deletes. It is the visitor's room.
--
--   docker exec -i sand-pavilion-postgres psql -U pavilion -d pavilion \
--     -v ON_ERROR_STOP=1 -f - < tools/migrations/003-records.sql
-- ================================================================

-- Notes can be hidden from the Hall while still existing where they were
-- written. (IF NOT EXISTS so this migration is re-runnable.)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------- the index ----------
CREATE TABLE IF NOT EXISTS records (
  id        BIGSERIAL PRIMARY KEY,

  -- WHAT KIND OF THING THIS WAS. These are the visitor's own acts, kept
  -- distinct on purpose - 'the places stay separate'.
  kind      TEXT NOT NULL CHECK (kind IN (
              'note',          -- something written, anywhere
              'reading',       -- a book marked read
              'dissection',    -- a book pulled apart in the Hall
              'investigation', -- a claim tested
              'experiment',    -- an n-of-1 self-experiment
              'build',         -- something made at the Bench
              'lesson',        -- a lesson walked in the tree
              'day',           -- a day planned or closed with Sebastian
              'packet',        -- work published or received
              'milestone'      -- the PAVILION's own history, not the visitor's
            )),

  title     TEXT NOT NULL,
  detail    TEXT,
  happened  DATE NOT NULL,

  -- WHERE THE REAL THING LIVES. `ref` is the save key, database id, or slug
  -- that opens it; `opener` is the window.* function that does the opening,
  -- so a record in the Hall is never a dead end - the standing rule from
  -- CLAUDE.md's IDE framing.
  ref       TEXT,
  opener    TEXT,
  slug      TEXT REFERENCES books(slug) ON DELETE SET NULL,

  hidden    BOOLEAN NOT NULL DEFAULT FALSE,
  tags      TEXT[] NOT NULL DEFAULT '{}',

  -- so re-indexing updates rather than duplicates
  source_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS records_when   ON records (happened DESC);
CREATE INDEX IF NOT EXISTS records_kind   ON records (kind);
CREATE INDEX IF NOT EXISTS records_visible ON records (happened DESC) WHERE hidden = FALSE;

-- ---------- what the Hall shows ----------

-- Everything the visitor has done, newest first, hidden things excluded.
-- The Pavilion's own milestones are included deliberately: the steward asked
-- for "the cool things we can leave in the timeline of history" alongside
-- his own work, and a room that shows both is a history of the place AND of
-- the person in it.
CREATE OR REPLACE VIEW v_records AS
  SELECT r.id, r.kind, r.title, r.detail, r.happened, r.ref, r.opener,
         r.slug, b.title AS book_title, r.tags
    FROM records r
    LEFT JOIN books b ON b.slug = r.slug
   WHERE r.hidden = FALSE
   ORDER BY r.happened DESC, r.id DESC;

-- What a year of work looks like at a glance - for the room's own header,
-- without loading a single record.
CREATE OR REPLACE VIEW v_record_counts AS
  SELECT kind, count(*) AS n, min(happened) AS first, max(happened) AS latest
    FROM records WHERE hidden = FALSE
   GROUP BY kind ORDER BY n DESC;

-- The separate PLACES, so the Hall can offer them as rooms rather than as a
-- flat list: what was written while reading, at the bench, with Sebastian.
CREATE OR REPLACE VIEW v_notes_by_place AS
  SELECT source AS place, count(*) AS n,
         count(DISTINCT slug) FILTER (WHERE slug IS NOT NULL) AS books
    FROM notes WHERE hidden = FALSE
   GROUP BY source ORDER BY n DESC;
