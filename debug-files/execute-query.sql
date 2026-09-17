-- Task: Fix RLS policies for exam_schedule_slots, exam_schedules, exam_sessions, exam_results, exam_result_entries, and class_subjects
-- Adding can_access_component(...) to ensure permissions assigned in app_view_controller dynamically govern row-level database access.
-- Date: 2026-09-16
-- Tables affected: exam_schedule_slots, exam_schedules, exam_sessions, exam_results, exam_result_entries, class_subjects, app_view_controller

BEGIN;

-- ============================================================
-- 1. ROW-LEVEL SECURITY (RLS) FOR EXAM SCHEDULE SLOTS
-- ============================================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exam_schedule_slots'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exam_schedule_slots', pol.policyname);
  END LOOP;
END $$;

-- 1A. SELECT policy: allowed for staff roles, parent role, or authorized view components
CREATE POLICY exam_schedule_slots_select ON public.exam_schedule_slots
  FOR SELECT TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
    OR has_parent_role()
    OR can_access_component('exam-schedule'::text)
    OR can_access_component('exam-sched-tab-scheduler'::text)
    OR can_access_component('exam-sched-tab-teacher'::text)
    OR can_access_component('exam-sched-tab-coverage'::text)
    OR can_access_component('exam-sched-tab-notice-print'::text)
    OR can_access_component('exam-sched-tab-parent'::text)
  );

-- 1B. WRITE policy: allowed for authorized roles OR users granted exam-sched-slot-edit / scheduler tab
CREATE POLICY exam_schedule_slots_write ON public.exam_schedule_slots
  FOR ALL TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text])
    OR can_access_component('exam-sched-slot-edit'::text)
    OR can_access_component('exam-sched-tab-scheduler'::text)
  )
  WITH CHECK (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text])
    OR can_access_component('exam-sched-slot-edit'::text)
    OR can_access_component('exam-sched-tab-scheduler'::text)
  );


-- ============================================================
-- 2. ROW-LEVEL SECURITY (RLS) FOR EXAM SCHEDULES & SESSIONS
-- ============================================================

-- 2A. Exam Schedules
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exam_schedules'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exam_schedules', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY exam_schedules_select ON public.exam_schedules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY exam_schedules_write ON public.exam_schedules
  FOR ALL TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text])
    OR can_access_component('exam-sched-tab-setup'::text)
    OR can_access_component('exam-sched-publish'::text)
  )
  WITH CHECK (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text])
    OR can_access_component('exam-sched-tab-setup'::text)
    OR can_access_component('exam-sched-publish'::text)
  );

-- 2B. Exam Sessions
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exam_sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exam_sessions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY exam_sessions_select ON public.exam_sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY exam_sessions_write ON public.exam_sessions
  FOR ALL TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text])
    OR can_access_component('exam-sched-tab-setup'::text)
  )
  WITH CHECK (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text])
    OR can_access_component('exam-sched-tab-setup'::text)
  );


-- ============================================================
-- 3. ROW-LEVEL SECURITY (RLS) FOR EXAM RESULTS & ENTRIES
-- ============================================================

-- 3A. Exam Results
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exam_results'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exam_results', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY exam_results_select ON public.exam_results
  FOR SELECT TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
    OR can_access_component('exam-results'::text)
    OR can_access_component('exam-results-tab-entry'::text)
    OR can_access_component('exam-results-tab-summary'::text)
  );

CREATE POLICY exam_results_write ON public.exam_results
  FOR ALL TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
    OR can_access_component('exam-results-adhoc'::text)
    OR can_access_component('exam-results-marking-scheme'::text)
    OR can_access_component('exam-results-status-override'::text)
    OR can_access_component('exam-results-tab-entry'::text)
  )
  WITH CHECK (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
    OR can_access_component('exam-results-adhoc'::text)
    OR can_access_component('exam-results-marking-scheme'::text)
    OR can_access_component('exam-results-status-override'::text)
    OR can_access_component('exam-results-tab-entry'::text)
  );

-- 3B. Exam Result Entries (Student Marks)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exam_result_entries'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exam_result_entries', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY exam_result_entries_select ON public.exam_result_entries
  FOR SELECT TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
    OR can_access_component('exam-results'::text)
    OR can_access_component('exam-results-tab-entry'::text)
    OR can_access_component('exam-results-tab-summary'::text)
    OR (
      has_parent_role() AND (student_id IN (
        SELECT students.id FROM students WHERE is_parent_of_student((students.admission_no)::text)
      ))
    )
  );

CREATE POLICY exam_result_entries_write ON public.exam_result_entries
  FOR ALL TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
    OR can_access_component('exam-results-edit-marks'::text)
    OR can_access_component('exam-results-quick-fill'::text)
    OR can_access_component('exam-results-tab-entry'::text)
  )
  WITH CHECK (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
    OR can_access_component('exam-results-edit-marks'::text)
    OR can_access_component('exam-results-quick-fill'::text)
    OR can_access_component('exam-results-tab-entry'::text)
  );


-- ============================================================
-- 4. ROW-LEVEL SECURITY (RLS) FOR CLASS SUBJECTS
-- ============================================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'class_subjects' AND cmd = 'ALL'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.class_subjects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY class_subjects_write ON public.class_subjects
  FOR ALL TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text])
    OR can_access_component('classes-setup'::text)
    OR can_access_component('timetable-planner'::text)
    OR can_access_component('syllabus-manager'::text)
  )
  WITH CHECK (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text])
    OR can_access_component('classes-setup'::text)
    OR can_access_component('timetable-planner'::text)
    OR can_access_component('syllabus-manager'::text)
  );


-- ============================================================
-- 5. APP_VIEW_CONTROLLER CONSTRAINT & SEED REGISTRATION
-- ============================================================

ALTER TABLE app_view_controller
  DROP CONSTRAINT IF EXISTS app_view_controller_restructured_type_check;

ALTER TABLE app_view_controller
  DROP CONSTRAINT IF EXISTS app_view_controller_type_check;

UPDATE app_view_controller
SET type = 'tab'
WHERE type = 'component';

ALTER TABLE app_view_controller
  ADD CONSTRAINT app_view_controller_restructured_type_check
  CHECK (type IN ('tile', 'tab', 'subview', 'variable'));

INSERT INTO app_view_controller (
  component_name,
  type,
  display_name,
  parent_name,
  is_active,
  default_access,
  valid_access_roles,
  display_order,
  description
) VALUES
  

  -- Student Records Tabs & Action Variables
  (
    'student-tab-records',
    'tab',
    'Students Record',
    'Student Records',
    true,
    'none',
    ARRAY['admin', 'management', 'teacher'],
    10,
    'View and manage student profile records, details, and admissions'
  ),
  (
    'student-tab-fees',
    'tab',
    'Student Fees',
    'Student Records',
    true,
    'none',
    ARRAY['admin', 'management', 'accountant'],
    20,
    'Student fees collection, receipts, dues, and payment registers'
  ),
  (
    'student-add-record',
    'variable',
    'Add Student Record',
    'Student Records',
    true,
    'none',
    ARRAY['admin', 'management'],
    30,
    'Permission to register and admit new students'
  ),
  (
    'student-edit-record',
    'variable',
    'Edit Student Record',
    'Student Records',
    true,
    'none',
    ARRAY['admin', 'management'],
    40,
    'Permission to edit student demographic, academic, and profile data'
  ),
  (
    'student-delete-record',
    'variable',
    'Delete Student Record',
    'Student Records',
    true,
    'none',
    ARRAY['admin'],
    50,
    'Permission to delete student records'
  ),

  -- Employee Records Tabs & Action Variables
  (
    'emp-tab-records',
    'tab',
    'Employee Records',
    'Employee Records',
    true,
    'none',
    ARRAY['admin', 'management', 'teacher', 'staff'],
    10,
    'View employee profiles, designations, and departmental records'
  ),
  (
    'emp-tab-salary',
    'tab',
    'Salary Dashboard & List',
    'Employee Records',
    true,
    'none',
    ARRAY['admin', 'management', 'accountant'],
    20,
    'Monthly salary credit dashboard, ledger, and payout lists'
  ),
  (
    'emp-add-record',
    'variable',
    'Add Employee Record',
    'Employee Records',
    true,
    'none',
    ARRAY['admin', 'management'],
    30,
    'Permission to register new staff and teacher employee records'
  ),
  (
    'emp-edit-record',
    'variable',
    'Edit Employee Record',
    'Employee Records',
    true,
    'none',
    ARRAY['admin', 'management'],
    40,
    'Permission to edit employee credentials, roles, and profiles'
  ),
  (
    'emp-delete-record',
    'variable',
    'Delete Employee Record',
    'Employee Records',
    true,
    'none',
    ARRAY['admin'],
    50,
    'Permission to permanently delete employee records'
  ),

  -- Curriculum & Syllabus Action Variables
  (
    'syl-edit-content',
    'variable',
    'Edit Curriculum Content',
    'Curriculum Manager',
    true,
    'none',
    ARRAY['admin', 'management', 'teacher'],
    10,
    'Permission to add, edit, resequence, and delete units, chapters, and lessons'
  ),
  (
    'syl-add-daily-work',
    'variable',
    'Log Daily Classroom Work',
    'Curriculum Manager',
    true,
    'none',
    ARRAY['admin', 'management', 'teacher'],
    20,
    'Permission to log daily teaching activity and syllabus completion'
  ),
  (
    'syl-manage-books',
    'variable',
    'Manage Books & Class Mappings',
    'Curriculum Manager',
    true,
    'none',
    ARRAY['admin', 'management', 'teacher'],
    30,
    'Permission to add, edit, and map curriculum books to classes'
  ),
  (
    'syl-manage-subjects',
    'variable',
    'Manage Subjects & Classifications',
    'Curriculum Manager',
    true,
    'none',
    ARRAY['admin', 'management'],
    40,
    'Permission to manage subject classifications and delete/reactivate subjects and books'
  ),

  -- Admin Settings Views
  (
    'manage-user-roles',
    'subview',
    'Manage Portal User Roles',
    'Admin Settings',
    true,
    'none',
    ARRAY['admin', 'management'],
    10,
    'Assign portal roles and map employee profiles to authentication accounts'
  ),
  (
    'avc-admin-links',
    'subview',
    'Useful Links Directory',
    'Admin Settings',
    true,
    'none',
    ARRAY['admin', 'management'],
    20,
    'Configure school quick links, external portals, and access roles'
  )

ON CONFLICT (component_name) DO UPDATE
  SET
    type               = EXCLUDED.type,
    display_name       = EXCLUDED.display_name,
    parent_name        = EXCLUDED.parent_name,
    is_active          = EXCLUDED.is_active,
    default_access     = EXCLUDED.default_access,
    valid_access_roles = EXCLUDED.valid_access_roles,
    display_order      = EXCLUDED.display_order,
    description        = EXCLUDED.description;

COMMIT;
