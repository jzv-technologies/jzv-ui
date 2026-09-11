-- Task: Register Student Fees as a database-managed portal tile
-- Date: 2026-09-11
-- Tables affected: app_view_controller

BEGIN;

INSERT INTO public.app_view_controller (
  id,
  component_name,
  type,
  display_name,
  parent_name,
  valid_access_roles,
  description,
  is_active,
  default_access,
  display_order,
  icon,
  theme
)
SELECT
  COALESCE(MAX(id), 0) + 1,
  'student-fees',
  'tile',
  'Student Fees',
  'Staff & Students',
  ARRAY['admin', 'management', 'accountant'],
  'Track student fee allocations, sponsorships, payments, and balances.',
  true,
  'none',
  56,
  'fa-receipt',
  'bg-teal-600 text-white'
FROM public.app_view_controller
HAVING NOT EXISTS (
  SELECT 1
  FROM public.app_view_controller
  WHERE component_name = 'student-fees'
);

COMMIT;
