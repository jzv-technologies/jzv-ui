// src/utils/tileRegistry.js
/**
 * UI Metadata Registry for Unified Portal components.
 *
 * NOTE: Default UI styling and metadata (icon, colors, translations, action handlers)
 * are maintained here in code to keep the database table `app_view_controller`
 * focused strictly on access control, ordering, and activation state.
 */

export const TILE_METADATA_REGISTRY = {
  // ── Admin-only components ──────────────────────────────────────────
  'form-configurations': {
    title: 'Form Configurations',
    description: 'Configure fields, validation, and overrides for dynamic forms in the database.',
    icon: 'fa-sliders-h',
    buttonColor: 'bg-blue-600 text-white',
    shadow: 'shadow-blue-200',
    group: 'Administration',
    action: 'subview',
  },
  'timetable-planner': {
    title: 'Timetable',
    description:
      'View class and teacher schedules, manage classes, subjects, and schedule conflict-free timetables.',
    icon: 'fa-calendar-alt',
    buttonColor: 'bg-brand-primary text-white',
    shadow: 'shadow-brand-lbg',
    group: 'Calendar and Schedules',
    action: 'subview',
  },
  'avc-admin-manager': {
    title: 'View Controller Manager',
    description: 'Manage app_view_controller table — tile visibility, ordering, and access roles.',
    icon: 'fa-cubes',
    buttonColor: 'bg-purple-700 text-white',
    shadow: 'shadow-purple-200',
    group: 'Administration',
    action: 'subview',
  },
  'manage-user-roles': {
    title: 'Manage Portal User Roles',
    description:
      'Manage authentication accounts, link employees, and assign system & portal roles.',
    icon: 'fa-user-shield',
    buttonColor: 'bg-purple-700 text-white',
    shadow: 'shadow-purple-200',
    group: 'Administration',
    action: 'subview',
    valid_access_roles: ['admin', 'management'],
    display_order: 35,
  },

  // ── Shared admin + management components ───────────────────────────
  'employee-management': {
    title: 'Employee Management',
    description: 'Manage employee records, roles, designations, and profile details.',
    icon: 'fa-users-gear',
    buttonColor: 'bg-orange-primary text-white',
    shadow: 'shadow-orange-200',
    group: 'Staff & Students',
    action: 'subview',
  },
  'salary-tracker': {
    title: 'Salary Tracker',
    description: 'Salary Credit Dashboard and Salary List View for staff and teacher compensation.',
    icon: 'fa-money-bill-wave',
    buttonColor: 'bg-emerald-600 text-white',
    shadow: 'shadow-emerald-200',
    group: 'Staff & Students',
    action: 'subview',
  },
  'student-records': {
    title: 'Student Management',
    description: 'Manage student admission database, student records, and class enrollments.',
    icon: 'fa-user-graduate',
    buttonColor: 'bg-green-dark text-white',
    shadow: 'shadow-green-200',
    group: 'Staff & Students',
    action: 'subview',
    valid_access_roles: ['admin', 'management', 'teacher'],
    display_order: 50,
  },
  'student-fees': {
    title: 'Student Fees',
    description: 'Track student fee allocations, sponsorships, payments, and balances.',
    icon: 'fa-receipt',
    buttonColor: 'bg-teal-600 text-white',
    shadow: 'shadow-teal-200',
    group: 'Staff & Students',
    action: 'subview',
    valid_access_roles: ['admin', 'management', 'accountant'],
    display_order: 56,
  },
  'tv-display': {
    title: 'TV Display Board',
    description: 'Open the full-screen auto-navigating TV display dashboard.',
    icon: 'fa-tv',
    buttonColor: 'bg-emerald-600 text-white',
    shadow: 'shadow-emerald-200',
    group: 'Administration',
    action: 'open_window',
    actionTarget: '/portal/display',
  },

  // ── Management components ──────────────────────────────────────────
  'view-complaints': {
    title: 'View Complaints',
    description: 'Track and review user complaints and feedback submitted through the portal.',
    icon: 'fa-comments',
    buttonColor: 'bg-amber-600 text-white',
    shadow: 'shadow-amber-200',
    group: 'General',
    action: 'subview',
  },
  'registered-complaints': {
    title: 'View Complaints',
    description: 'Track and review user complaints and feedback submitted through the portal.',
    icon: 'fa-comments',
    buttonColor: 'bg-amber-600 text-white',
    shadow: 'shadow-amber-200',
    group: 'General',
    action: 'subview',
  },
  complaint: {
    title: 'Register Feedback',
    description: 'Submit and track your requests or complaints online.',
    icon: 'fa-hand-point-up',
    buttonColor: 'bg-teal-600 text-white',
    shadow: 'shadow-teal-200',
    group: 'General',
    action: 'open_modal',
    actionTarget: 'complaint',
  },
  'timetable-viewer': {
    title: 'Timetable Viewer',
    titleKey: 'role_portal.view_timetable.title',
    description: 'View all class and teacher schedules across the school (read-only).',
    icon: 'fa-calendar-alt',
    buttonColor: 'bg-brand-primary text-white',
    shadow: 'shadow-brand-lbg',
    group: 'Calendar and Schedules',
    action: 'subview',
  },
  'job-applications': {
    title: 'Job Applications',
    description: 'View and review submitted teacher and staff resumes.',
    icon: 'fa-file-signature',
    buttonColor: 'bg-red-600 text-white',
    shadow: 'shadow-red-200',
    group: 'HR',
    action: 'subview',
  },
  'take-test-management': {
    title: 'Take Test Management',
    description:
      'Enable/disable test access per candidate mobile number and configure available tests.',
    icon: 'fa-vial',
    buttonColor: 'bg-teal-600 text-white',
    shadow: 'shadow-teal-200',
    group: 'Testing',
    action: 'subview',
  },
  'requests-exceptions': {
    title: 'Requests & Exceptions',
    description: 'Review teacher permission requests, exceptions, and track approvals.',
    icon: 'fa-comment-dots',
    buttonColor: 'bg-rose-600 text-white',
    shadow: 'shadow-rose-200',
    group: 'Administration',
    action: 'open_modal',
    actionTarget: 'requests-exceptions',
  },

  // ── Syllabus group — multi-role ────────────────────────────────────
  'syllabus-manager': {
    title: 'Syllabus Manager',
    description: 'Manage curriculum nodes, subjects, books, units, chapters, and lessons.',
    icon: 'fa-book-open',
    buttonColor: 'bg-purple-600 text-white',
    shadow: 'shadow-purple-200',
    group: 'Academics',
    action: 'subview',
  },
  'syllabus-progress-tracker': {
    title: 'Syllabus Progress',
    description:
      'Log daily teaching progress, track syllabus completion, and carry forward lessons.',
    icon: 'fa-chart-line',
    buttonColor: 'bg-blue-600 text-white',
    shadow: 'shadow-blue-200',
    group: 'Academics',
    action: 'subview',
  },
  'my-activity': {
    title: 'My Activity',
    description:
      'Log and monitor your personal daily classroom teaching activity, chapter completion, and topic logs.',
    icon: 'fa-user-clock',
    buttonColor: 'bg-indigo-600 text-white',
    shadow: 'shadow-indigo-200',
    group: 'Academics',
    action: 'subview',
    // Not a standalone tile - accessed within Syllabus Progress
  },
  'teacher-activity': {
    title: 'Teacher Activity',
    description:
      'Monitor daily classroom teaching activity, chapter completions, and topic logs across all teachers.',
    icon: 'fa-chalkboard-user',
    buttonColor: 'bg-blue-600 text-white',
    shadow: 'shadow-blue-200',
    group: 'Academics',
    action: 'subview',
    valid_access_roles: ['admin', 'management', 'teacher'],
    display_order: 82,
  },
  'lesson-planner': {
    title: 'Lesson Planner',
    description: 'Plan daily lessons, track lesson milestones, and organize curriculum plans.',
    icon: 'fa-calendar-check',
    buttonColor: 'bg-blue-600 text-white',
    shadow: 'shadow-blue-200',
    group: 'Academics',
    action: 'subview',
  },

  // ── Calendar / Dashboard ───────────────────────────────────────────
  'academic-calendar': {
    title: 'Academic Calendar',
    description: 'View or manage holidays, examinations, preparation days, and teaching days.',
    icon: 'fa-calendar-days',
    buttonColor: 'bg-teal-600 text-white',
    shadow: 'shadow-teal-200',
    group: 'Calendar and Schedules',
    action: 'subview',
  },
  'exam-schedule': {
    title: 'Exam Schedule',
    description:
      'Schedule examinations, assign invigilators, and manage Exam Schedules across all classes.',
    icon: 'fa-file-circle-check',
    buttonColor: 'bg-rose-600 text-white',
    shadow: 'shadow-rose-200',
    group: 'Calendar and Schedules',
    action: 'subview',
    valid_access_roles: ['admin', 'management', 'coordinator', 'teacher'],
    display_order: 35,
  },
  'exam-results': {
    title: 'Exam Results',
    description:
      'Enter and manage examination marks, track completion status, and view result summaries.',
    icon: 'fa-clipboard-check',
    buttonColor: 'bg-emerald-600 text-white',
    shadow: 'shadow-emerald-200',
    group: 'Academics',
    action: 'subview',
    valid_access_roles: ['admin', 'management', 'teacher'],
    display_order: 85,
  },
  dashboard: {
    title: 'Dashboard',
    description: 'View syllabus progress, activity, and attention-required insights.',
    icon: 'fa-gauge-high',
    buttonColor: 'bg-indigo-600 text-white',
    shadow: 'shadow-indigo-200',
    group: 'Academics',
    action: 'subview',
  },

  // ── Teacher-only components ────────────────────────────────────────
  'personal-info': {
    title: 'Personal Info',
    description: 'View your employee profile, designation, and update contact information.',
    icon: 'fa-id-card',
    buttonColor: 'bg-emerald-600 text-white',
    shadow: 'shadow-emerald-200',
    group: 'Personal',
    action: 'subview',
  },

  // ── Shared teacher + parent components ─────────────────────────────
  'my-tickets': {
    title: 'My Tickets',
    description: 'View status and update comments on your submitted support tickets.',
    icon: 'fa-comments',
    buttonColor: 'bg-red-600 text-white',
    shadow: 'shadow-red-200',
    group: 'Complaints & Support',
    action: 'subview',
  },

  // ── Parent-only components ─────────────────────────────────────────
  'class-schedule': {
    title: 'Class Schedule',
    titleKey: 'role_portal.class_schedule.title',
    description: 'View the weekly class schedule and timetable for your child.',
    descriptionKey: 'role_portal.class_schedule.description',
    icon: 'fa-calendar-alt',
    buttonColor: 'bg-emerald-600 text-white',
    shadow: 'shadow-emerald-200',
    group: 'Calendar and Schedules',
    action: 'subview',
  },
  'ward-exam-timetable': {
    title: 'Ward Exam Timetable',
    titleKey: 'role_portal.ward_exam_timetable.title',
    description: 'View the published examination schedule for your child.',
    descriptionKey: 'role_portal.ward_exam_timetable.description',
    icon: 'fa-file-alt',
    buttonColor: 'bg-rose-600 text-white',
    shadow: 'shadow-rose-200',
    group: 'Calendar and Schedules',
    action: 'subview',
  },

  // ── Candidate components ───────────────────────────────────────────
  'take-test': {
    title: 'Take Test',
    description: 'Take the online entrance/evaluation test enabled for your mobile number.',
    icon: 'fa-vial',
    buttonColor: 'bg-teal-600 text-white',
    shadow: 'shadow-teal-200',
    group: 'Testing',
    action: 'subview',
  },
};

/**
 * Logical grouping labels for filtering and categorization in UI.
 */
export const COMPONENT_GROUPS = {
  all: 'All Features',
  'admin-only': 'Administration',
  employees: 'Staff & Employees',
  students: 'Students',
  timetable: 'Timetable & Schedule',
  syllabus: 'Curriculum & Syllabus',
  calendar: 'Academic Calendar',
  dashboard: 'Dashboard & Reports',
  tickets: 'Support Tickets',
  complaints: 'Complaints',
  hr: 'Recruitment & HR',
  testing: 'Evaluations & Tests',
  approvals: 'Requests & Exceptions',
  display: 'Display Systems',
  'dynamic-form': 'Custom Forms',
};

/**
 * Standard group configurations with display metadata, icons, and theme badges.
 */
export const GROUP_CONFIGS = {
  Academics: {
    label: 'Academic & Curriculum',
    icon: 'fa-graduation-cap',
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border border-blue-200',
    order: 10,
  },
  'Staff & Students': {
    label: 'Staff & Students',
    icon: 'fa-users',
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    order: 20,
  },
  'Calendar and Schedules': {
    label: 'Calendar & Schedules',
    icon: 'fa-calendar-days',
    color: 'text-teal-600',
    badgeBg: 'bg-teal-50 text-teal-700 border border-teal-200',
    order: 30,
  },
  Administration: {
    label: 'Administration & System',
    icon: 'fa-shield-halved',
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border border-purple-200',
    order: 40,
  },
  General: {
    label: 'General',
    icon: 'fa-cubes',
    color: 'text-slate-600',
    badgeBg: 'bg-slate-50 text-slate-700 border border-slate-200',
    order: 50,
  },
  Testing: {
    label: 'Evaluations & Tests',
    icon: 'fa-vial',
    color: 'text-teal-600',
    badgeBg: 'bg-teal-50 text-teal-700 border border-teal-200',
    order: 60,
  },
  'Complaints & Support': {
    label: 'Complaints & Support',
    icon: 'fa-headset',
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border border-rose-200',
    order: 70,
  },
  Dashboard: {
    label: 'Dashboard & Overview',
    icon: 'fa-chart-pie',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border border-amber-200',
    order: 5,
  },
  HR: {
    label: 'Recruitment & HR',
    icon: 'fa-user-tie',
    color: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700 border border-sky-200',
    order: 80,
  },
  Personal: {
    label: 'Personal Information',
    icon: 'fa-user-circle',
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    order: 90,
  },
  Display: {
    label: 'Display Systems',
    icon: 'fa-tv',
    color: 'text-violet-600',
    badgeBg: 'bg-violet-50 text-violet-700 border border-violet-200',
    order: 100,
  },
  'Custom Forms': {
    label: 'Custom Forms',
    icon: 'fa-clipboard-list',
    color: 'text-orange-600',
    badgeBg: 'bg-orange-50 text-orange-700 border border-orange-200',
    order: 110,
  },
};

/**
 * Resolves raw group_name from database or tile metadata into a canonical group descriptor.
 * Handles case differences, aliases, and trailing newlines.
 */
export const resolveGroupInfo = (rawGroupName) => {
  if (!rawGroupName) {
    return {
      key: 'General',
      label: 'General',
      icon: 'fa-cubes',
      color: 'text-gray-600',
      badgeBg: 'bg-gray-50 text-gray-700 border border-gray-200',
      order: 999,
    };
  }

  // Strip whitespace, carriage returns, and newlines
  const cleaned = String(rawGroupName)
    .replace(/[\r\n]+/g, ' ')
    .trim();
  const lower = cleaned.toLowerCase();

  let canonicalKey = cleaned;

  if (
    lower === 'admin-only' ||
    lower === 'administration' ||
    lower === 'approvals' ||
    lower === 'admin settings' ||
    lower === 'admin-settings'
  ) {
    canonicalKey = 'Administration';
  } else if (
    lower === 'syllabus' ||
    lower === 'academics' ||
    lower === 'curriculum' ||
    lower === 'academic & curriculam' ||
    lower === 'academic & curriculum'
  ) {
    canonicalKey = 'Academics';
  } else if (
    lower === 'calendar and schedules' ||
    lower === 'schedules' ||
    lower === 'timetable' ||
    lower === 'calendar'
  ) {
    canonicalKey = 'Calendar and Schedules';
  } else if (
    lower === 'staff & students' ||
    lower === 'staff and students' ||
    lower === 'employees' ||
    lower === 'employee' ||
    lower === 'staff' ||
    lower === 'fees and salary' ||
    lower === 'records' ||
    lower === 'students' ||
    lower === 'student'
  ) {
    canonicalKey = 'Staff & Students';
  } else if (lower === 'testing' || lower === 'evaluations') {
    canonicalKey = 'Testing';
  } else if (
    lower === 'general' ||
    lower === 'complaints' ||
    lower === 'feedback & complaint' ||
    lower === 'feedback & complaints' ||
    lower === 'feedback and complaints' ||
    lower === 'registered complaints'
  ) {
    canonicalKey = 'General';
  } else if (lower === 'support' || lower === 'tickets' || lower === 'complaints & support') {
    canonicalKey = 'Complaints & Support';
  } else if (lower === 'dashboard') {
    canonicalKey = 'Dashboard';
  } else if (lower === 'hr' || lower === 'recruitment') {
    canonicalKey = 'HR';
  } else if (lower === 'personal') {
    canonicalKey = 'Personal';
  } else if (lower === 'display') {
    canonicalKey = 'Display';
  } else if (lower === 'dynamic-form' || lower === 'custom forms' || lower === 'custom-forms') {
    canonicalKey = 'Custom Forms';
  }

  if (GROUP_CONFIGS[canonicalKey]) {
    return {
      key: canonicalKey,
      ...GROUP_CONFIGS[canonicalKey],
    };
  }

  return {
    key: cleaned,
    label: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
    icon: 'fa-folder-open',
    color: 'text-slate-600',
    badgeBg: 'bg-slate-50 text-slate-700 border border-slate-200',
    order: 500,
  };
};
