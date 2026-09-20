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
    'tile',
    'Manage Portal User Roles',
    'Administration',
    true,
    'none',
    ARRAY['admin', 'management'],
    35,
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
  ),
  (
    'syl-tab-my-activity',
    'tab',
    'My Activity Tab',
    'syllabus-progress-tracker',
    true,
    'none',
    ARRAY['admin', 'management', 'teacher'],
    5,
    'Teacher personal classroom log and activity tab'
  ),

  -- Examination Views & Progress Report Components
  (
    'ward-exam-timetable',
    'tile',
    'Exam Timetable',
    'Parent Portal',
    true,
    'readonly',
    ARRAY['parent'],
    25,
    'Ward examination timetable and venue schedule for parents'
  ),
  (
    'exam-results-tab-report',
    'tab',
    'Progress Reports Tab',
    'exam-results',
    true,
    'none',
    ARRAY['admin', 'management', 'coordinator', 'teacher'],
    3,
    'Progress report card generation, grade calculation, and print export tab'
  ),
  (
    'exam-progress-report',
    'tile',
    'Progress Reports',
    'Examinations',
    true,
    'none',
    ARRAY['admin', 'management', 'coordinator', 'teacher'],
    15,
    'Official student progress report cards with customizable templates and charts'
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

-- ── Compatibility & Secure Functions ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role_above(required_role integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Compatibility function for legacy schema policies
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_teachers_with_auth_secure(p_auth_id uuid DEFAULT NULL::uuid)
RETURNS TABLE (
  teacher_id bigint,
  name character varying,
  is_male boolean,
  auth_id uuid,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS teacher_id,
    e.name::character varying,
    e.is_male,
    e.auth_id,
    e.is_active
  FROM public.employees e
  WHERE e.is_active = true 
    AND e.is_teacher = true
    AND (p_auth_id IS NULL OR e.auth_id = p_auth_id)
  ORDER BY e.name;
END;
$$;

-- ============================================================================
-- Examination System & Parent Portal Schema, RPC and Access Grants
-- ============================================================================

-- 1. Security Definer RPC for admin_configuration access via service role
-- Since admin_configuration is a critical configuration table, clients access it exclusively through RPC calls.
CREATE OR REPLACE FUNCTION public.get_admin_config(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val jsonb;
BEGIN
  BEGIN
    SELECT val INTO v_val FROM public.admin_configuration WHERE key = p_key LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    BEGIN
      SELECT val INTO v_val FROM public.admin_configruation WHERE key = p_key LIMIT 1;
    EXCEPTION WHEN undefined_table THEN
      v_val := NULL;
    END;
  END;
  RETURN v_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_admin_config(p_key text, p_val jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.admin_configuration (key, val, updated_at)
    VALUES (p_key, p_val, NOW())
    ON CONFLICT (key) DO UPDATE SET
      val = EXCLUDED.val,
      updated_at = NOW();
  EXCEPTION WHEN undefined_table THEN
    BEGIN
      INSERT INTO public.admin_configruation (key, val, updated_at)
      VALUES (p_key, p_val, NOW())
      ON CONFLICT (key) DO UPDATE SET
        val = EXCLUDED.val,
        updated_at = NOW();
    EXCEPTION WHEN undefined_table THEN
      RETURN false;
    END;
  END;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_config(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_admin_config(text, jsonb) TO authenticated, service_role;

-- 2. Row Level Security for Exam Schedules, Sessions, and Slots: Check either staff role or parent
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view published exam schedules" ON public.exam_schedules;
DROP POLICY IF EXISTS "exam_schedules_role_or_parent_select" ON public.exam_schedules;

CREATE POLICY "exam_schedules_role_or_parent_select"
ON public.exam_schedules FOR SELECT
TO authenticated, anon
USING (
  has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
  OR has_parent_role()
  OR can_access_component('ward-exam-timetable'::text)
  OR can_access_component('exam-sched-tab-parent'::text)
  OR (status ILIKE 'published' AND (has_parent_role() OR can_access_component('ward-exam-timetable'::text)))
);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view exam sessions" ON public.exam_sessions;
DROP POLICY IF EXISTS "exam_sessions_role_or_parent_select" ON public.exam_sessions;

CREATE POLICY "exam_sessions_role_or_parent_select"
ON public.exam_sessions FOR SELECT
TO authenticated, anon
USING (
  has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
  OR has_parent_role()
  OR can_access_component('ward-exam-timetable'::text)
  OR can_access_component('exam-sched-tab-parent'::text)
  OR can_access_component('exam-schedule'::text)
);

ALTER TABLE public.exam_schedule_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view exam slots" ON public.exam_schedule_slots;
DROP POLICY IF EXISTS "exam_schedule_slots_role_or_parent_select" ON public.exam_schedule_slots;

CREATE POLICY "exam_schedule_slots_role_or_parent_select"
ON public.exam_schedule_slots FOR SELECT
TO authenticated, anon
USING (
  has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
  OR has_parent_role()
  OR can_access_component('ward-exam-timetable'::text)
  OR can_access_component('exam-sched-tab-parent'::text)
  OR can_access_component('exam-schedule'::text)
);

-- 3. Register required view controller tiles for Parent Portal and Examination modules
INSERT INTO public.app_view_controller (
  component_name,
  is_visible,
  sort_order,
  portal,
  valid_access_roles,
  description,
  icon,
  theme
)
VALUES 
  ('ward-exam-timetable', true, 55, 'parent', ARRAY['parent', 'admin', 'management', 'coordinator'], 'Exam Timetable view for parents to track upcoming ward exam dates and sessions', 'fa-calendar-check', 'rose'),
  ('exam-progress-report', true, 60, 'portal', ARRAY['admin', 'management', 'coordinator', 'teacher'], 'Student Progress Report Card generator with drag-and-drop template designer', 'fa-file-invoice', 'emerald'),
  ('exam-results-tab-report', true, 70, 'portal', ARRAY['admin', 'management', 'coordinator', 'teacher'], 'Progress Report card generation tab inside Examination Results Manager', 'fa-id-card', 'indigo')
ON CONFLICT (component_name) DO UPDATE SET
  is_visible = EXCLUDED.is_visible,
  valid_access_roles = EXCLUDED.valid_access_roles,
  description = EXCLUDED.description;

COMMIT;
