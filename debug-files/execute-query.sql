-- ============================================================================
-- Exam Results Management & Progress Reports Registry Updates
-- 1. Deactivate direct 'exam-progress-report' tile (it is now exclusively a subview inside Exam Results)
-- 2. Register 'exam-results-import' for CSV bulk marks import
-- ============================================================================

-- Deactivate direct tile for exam-progress-report if present in app_view_controller
UPDATE public.app_view_controller
SET is_active = false
WHERE component_name = 'exam-progress-report';

-- Register or update exam-results-import capability
INSERT INTO public.app_view_controller (
  component_name,
  display_name,
  description,
  component_type,
  parent_component,
  feature_group,
  valid_roles,
  is_active,
  display_order
) VALUES (
  'exam-results-import',
  'Import Examination Marks',
  'Bulk import marks for one or more subjects from CSV with override/ignore options',
  'action_button',
  'exam-results-tab-entry',
  'Academics',
  ARRAY['admin', 'management', 'coordinator', 'teacher'],
  true,
  90
)
ON CONFLICT (component_name)
DO UPDATE SET
  valid_roles = EXCLUDED.valid_roles,
  is_active = true,
  description = EXCLUDED.description;
