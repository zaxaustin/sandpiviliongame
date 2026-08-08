-- ============================================================
-- 004 · The chapter tables stop describing a world that never existed.
--
-- `chapters` and `chapter_scans` have been in the schema since it was
-- written, and until 2026-08-07 NOTHING IN THE APP EVER WROTE TO EITHER.
-- The only writer was tools/load-library.mjs — the MinIO loader, which
-- needs Docker, a manual run and this one machine. So on every install
-- that is not the steward's, both tables were permanently empty.
--
-- Worse, v_needs_chapters gated on `b.text_key IS NOT NULL`. text_key is
-- a MinIO object key, also written only by that loader, so the view could
-- never return a single row anywhere else. A panel built on it would have
-- said "0 books need chapters" while 18 of 39 did — a confident, specific,
-- wrong answer, which is worse than the silence it replaced.
--
-- The app computes chapters every time you open a book and threw the
-- answer away on close. syncChapters() now keeps it, which is what makes
-- this view answerable at all.
-- ============================================================

-- DROP FIRST, AND THIS IS NOT OPTIONAL. applySchema() runs schema.sql and
-- THEN every migration, on EVERY open — so schema.sql recreates the old
-- five-column v_needs_chapters each time, and CREATE OR REPLACE VIEW cannot
-- change a view's shape ("cannot drop columns from view"). Without this the
-- container reports schemaError forever, which is exactly how it was caught.
--
-- The rule for anything after this: A MIGRATION THAT CHANGES A VIEW'S SHAPE
-- MUST DROP IT FIRST. Replacing is only safe when the columns are identical.
DROP VIEW IF EXISTS v_needs_chapters;

-- Driven by what was actually SCANNED, not by where the text happens to
-- live. A book nobody has opened is UNKNOWN, not "needs chapters" — the
-- reader's own rule, that an absent field beats a guessed one, applied to
-- a whole row. So the view can only ever name books the visitor has
-- genuinely opened, and a panel over it must say so.
--
-- AND THAT IS A FEATURE, not a limitation to apologise for. The steward,
-- 2026-08-07: "one step at a time is fine lets a user feel like he is
-- contributing." A number that grows because YOU opened a book and named
-- its chapters is yours in a way a bulk sweep never is — the same reason
-- the seed shelf is small on purpose, and the same reason carrying is
-- manual. So a panel built on this must never offer to "scan everything";
-- it offers the next book, and it lets the count climb.
CREATE OR REPLACE VIEW v_needs_chapters AS
  SELECT b.slug, b.title, b.pages,
         s.how,                      -- 'toc' | 'headings' | 'numerals' | 'none'
         s.found,
         s.scanned_at
    FROM chapter_scans s
    JOIN books b ON b.slug = s.slug
   WHERE s.found < 2                 -- one mark is not a division
   ORDER BY b.pages DESC NULLS LAST;

-- How much of the shelf has been looked at at all, so a panel can say
-- "of the 12 books you have opened" instead of implying it swept the
-- whole library.
CREATE OR REPLACE VIEW v_chapter_coverage AS
  SELECT (SELECT count(*) FROM books)                             AS books_known,
         (SELECT count(*) FROM chapter_scans)                     AS books_scanned,
         (SELECT count(*) FROM chapter_scans WHERE found >= 2)    AS books_divided,
         (SELECT count(*) FROM chapters WHERE source = 'hand')    AS marks_by_hand;
