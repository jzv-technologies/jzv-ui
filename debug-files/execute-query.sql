-- Task: Move expected_start_month & expected_end_month to trk_book_level_progress and drop from map_class_books
-- Date: 2026-08-17
-- Tables affected: trk_book_level_progress, map_class_books

BEGIN;

-- 1. Add expected_start_month and expected_end_month as DATE columns on trk_book_level_progress (defaults to NULL)
ALTER TABLE trk_book_level_progress 
  ADD COLUMN IF NOT EXISTS expected_start_month DATE,
  ADD COLUMN IF NOT EXISTS expected_end_month DATE;

-- 2. Trigger function: auto-populates expected_start_month when progress begins (completed > 0 or in_progress > 0)
CREATE OR REPLACE FUNCTION trg_fn_set_book_expected_start_month()
RETURNS TRIGGER AS $$
BEGIN
  -- When expected_start_month is NULL and progress starts, set to CURRENT_DATE
  IF NEW.expected_start_month IS NULL AND (COALESCE(NEW.completed, 0) > 0 OR COALESCE(NEW.in_progress, 0) > 0) THEN
    NEW.expected_start_month := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to trk_book_level_progress
DROP TRIGGER IF EXISTS trg_set_book_expected_start_month ON trk_book_level_progress;
CREATE TRIGGER trg_set_book_expected_start_month
BEFORE INSERT OR UPDATE OF completed, in_progress, expected_start_month ON trk_book_level_progress
FOR EACH ROW
EXECUTE FUNCTION trg_fn_set_book_expected_start_month();

-- 4. Drop the legacy columns from map_class_books
ALTER TABLE map_class_books 
  DROP COLUMN IF EXISTS expected_start_month,
  DROP COLUMN IF EXISTS expected_end_month;

COMMIT;
