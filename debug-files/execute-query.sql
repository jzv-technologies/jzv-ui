-- Task: Fix trigger function referencing dropped table lesson_tracker_log
-- Date: 2026-07-11
-- Tables affected: lesson_progress, lesson_progress_items

BEGIN;

-- 1. Drop old triggers on renamed or unified tables to avoid naming conflicts
DROP TRIGGER IF EXISTS trg_update_lesson_tracker_log ON lesson_progress_items;
DROP TRIGGER IF EXISTS trg_update_book_tracker_on_log ON lesson_progress;
DROP TRIGGER IF EXISTS trg_set_late_reporting ON lesson_progress_items;
DROP TRIGGER IF EXISTS set_lesson_progress_updated_at ON lesson_progress;

-- 2. Recreate the fn_update_lesson_tracker_log trigger function (pointing to lesson_progress instead of lesson_tracker_log)
CREATE OR REPLACE FUNCTION fn_update_lesson_tracker_log()
RETURNS TRIGGER AS $$
DECLARE
    v_progress_id bigint;
    v_completion_percentage numeric;
    v_current_status varchar;
    v_days_taken integer;
    v_revision_counter integer;
    v_start_date date;
    v_end_date date;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_progress_id := OLD.progress_id;
    ELSE
        v_progress_id := NEW.progress_id;
    END IF;

    -- Calculate aggregates from lesson_progress_items
    SELECT 
        COALESCE(MAX(progress), 0.00),
        COUNT(DISTINCT date),
        COUNT(CASE WHEN is_revision = 'Y' THEN 1 END),
        MIN(date),
        MAX(CASE WHEN progress >= 100 THEN date END)
    INTO 
        v_completion_percentage,
        v_days_taken,
        v_revision_counter,
        v_start_date,
        v_end_date
    FROM lesson_progress_items
    WHERE progress_id = v_progress_id;

    -- Determine status based on progress
    IF v_completion_percentage >= 100 THEN
        v_current_status := 'completed';
    ELSIF v_completion_percentage > 0 THEN
        v_current_status := 'in_progress';
    ELSE
        -- If progress is 0, we preserve 'planned' status if it was set
        SELECT status INTO v_current_status FROM lesson_progress WHERE id = v_progress_id;
        IF v_current_status NOT IN ('planned', 'not_started') OR v_current_status IS NULL THEN
            v_current_status := 'not_started';
        END IF;
    END IF;

    -- Update parent lesson_progress
    UPDATE lesson_progress
    SET 
        completion_percentage = v_completion_percentage,
        status = v_current_status,
        days_taken = v_days_taken,
        revision_counter = v_revision_counter,
        start_date = COALESCE(v_start_date, start_date),
        end_date = v_end_date,
        updated_at = timezone('utc', now())
    WHERE id = v_progress_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the fn_update_book_tracker_on_log_change trigger function (pointing to lesson_progress)
CREATE OR REPLACE FUNCTION fn_update_book_tracker_on_log_change()
RETURNS TRIGGER AS $$
DECLARE
    v_class_id bigint;
    v_book_id bigint;
    v_total_lessons integer;
    v_completed integer;
    v_in_progress integer;
    v_not_started integer;
    v_completion_percentage numeric;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_class_id := OLD.class_id;
        v_book_id := OLD.book_id;
    ELSE
        v_class_id := NEW.class_id;
        v_book_id := NEW.book_id;
    END IF;

    -- Calculate total leaf lessons for the book
    SELECT COUNT(*) INTO v_total_lessons
    FROM syllabus_book_lessons l
    WHERE l.book_id = v_book_id
      AND NOT EXISTS (
          SELECT 1 FROM syllabus_book_lessons child
          WHERE child.book_id = v_book_id
            AND child.level1 = l.level1
            AND (child.level2 = l.level2 OR (l.level2 IS NULL AND child.level2 IS NOT NULL))
            AND (child.level3 = l.level3 OR (l.level3 IS NULL AND child.level3 IS NOT NULL))
            AND child.id <> l.id
      );

    -- Calculate aggregates for this class and book from lesson_progress
    SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END),
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)
    INTO 
        v_completed,
        v_in_progress
    FROM lesson_progress
    WHERE class_id = v_class_id AND book_id = v_book_id;

    v_completed := COALESCE(v_completed, 0);
    v_in_progress := COALESCE(v_in_progress, 0);
    v_total_lessons := COALESCE(v_total_lessons, 0);
    v_not_started := GREATEST(0, v_total_lessons - v_completed - v_in_progress);

    IF v_total_lessons > 0 THEN
        v_completion_percentage := ROUND((v_completed::numeric / v_total_lessons::numeric) * 100, 2);
    ELSE
        v_completion_percentage := 0.00;
    END IF;

    -- Upsert book_tracker
    INSERT INTO book_tracker (
        class_id,
        book_id,
        total_lessons,
        completed,
        in_progress,
        not_started,
        completion_percentage,
        updated_at
    )
    VALUES (
        v_class_id,
        v_book_id,
        v_total_lessons,
        v_completed,
        v_in_progress,
        v_not_started,
        v_completion_percentage,
        timezone('utc', now())
    )
    ON CONFLICT (class_id, book_id) DO UPDATE SET
        total_lessons = EXCLUDED.total_lessons,
        completed = EXCLUDED.completed,
        in_progress = EXCLUDED.in_progress,
        not_started = EXCLUDED.not_started,
        completion_percentage = EXCLUDED.completion_percentage,
        updated_at = EXCLUDED.updated_at;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Reattach the triggers to the correct tables
CREATE TRIGGER trg_update_lesson_tracker_log
AFTER INSERT OR UPDATE OR DELETE ON lesson_progress_items
FOR EACH ROW EXECUTE FUNCTION fn_update_lesson_tracker_log();

CREATE TRIGGER trg_update_book_tracker_on_log
AFTER INSERT OR UPDATE OR DELETE ON lesson_progress
FOR EACH ROW EXECUTE FUNCTION fn_update_book_tracker_on_log_change();

-- 5. fn_set_late_reporting trigger function
CREATE OR REPLACE FUNCTION fn_set_late_reporting()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date <> CURRENT_DATE THEN
        NEW.late_reporting := 'Y';
    ELSE
        NEW.late_reporting := 'N';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_late_reporting
BEFORE INSERT ON lesson_progress_items
FOR EACH ROW EXECUTE FUNCTION fn_set_late_reporting();

-- 6. set_lesson_progress_updated_at trigger
CREATE TRIGGER set_lesson_progress_updated_at
BEFORE UPDATE ON lesson_progress
FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

COMMIT;
