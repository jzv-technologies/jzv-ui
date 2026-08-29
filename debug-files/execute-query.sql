-- Task: Rename salary_tracker to trk_emp_salary and student_fees to trk_student_fees
-- Date: 2026-08-29
-- Tables affected: salary_tracker, trk_emp_salary, student_fees, trk_student_fees

BEGIN;

-- 1. Rename salary_tracker table to trk_emp_salary (if salary_tracker exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'salary_tracker') THEN
    ALTER TABLE public.salary_tracker RENAME TO trk_emp_salary;
  END IF;
END $$;

-- Ensure employee_name column exists on trk_emp_salary and is backfilled
ALTER TABLE public.trk_emp_salary
ADD COLUMN IF NOT EXISTS employee_name TEXT;

UPDATE public.trk_emp_salary st
SET employee_name = e.name
FROM public.employees e
WHERE st.employee_id = e.id
  AND (st.employee_name IS NULL OR st.employee_name = '');

-- Auto-sync trigger for trk_emp_salary employee_name
CREATE OR REPLACE FUNCTION public.sync_trk_emp_salary_employee_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_name IS NULL OR NEW.employee_name = '' THEN
    SELECT name INTO NEW.employee_name
    FROM public.employees
    WHERE id = NEW.employee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_salary_tracker_employee_name ON public.trk_emp_salary;
DROP TRIGGER IF EXISTS trg_sync_trk_emp_salary_employee_name ON public.trk_emp_salary;

CREATE TRIGGER trg_sync_trk_emp_salary_employee_name
BEFORE INSERT OR UPDATE ON public.trk_emp_salary
FOR EACH ROW
EXECUTE FUNCTION public.sync_trk_emp_salary_employee_name();


-- 2. Rename student_fees table to trk_student_fees (if student_fees exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_fees') THEN
    ALTER TABLE public.student_fees RENAME TO trk_student_fees;
  END IF;
END $$;

COMMIT;
