// Exam Results Manager Constants
// Shared constants and configuration for the Exam Results Manager

export const ENTRY_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'fa-circle',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'fa-spinner',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: 'fa-circle-check',
  },
};

export const WORKSPACE_TABS = [
  {
    id: 'entry',
    componentName: 'exam-mark-entry-tab',
    label: 'Marks Entry',
    icon: 'fa-clipboard-check',
  },
  {
    id: 'summary',
    componentName: 'exam-results-tab-summary',
    label: 'Class Summary',
    icon: 'fa-chart-pie',
  },
  {
    id: 'attendance',
    componentName: 'exam-results-tab-attendance',
    label: 'Attendance',
    icon: 'fa-calendar-check',
  },
  {
    id: 'remarks',
    componentName: 'exam-results-tab-remarks',
    label: 'Remarks & Feedback',
    icon: 'fa-comment-dots',
  },
  {
    id: 'report',
    componentName: 'exam-results-tab-report',
    label: 'Progress Reports',
    icon: 'fa-file-invoice',
  },
];

export const REPORT_TYPES = {
  PROGRESS: 'progress',
  RANK_HOLDER: 'rank_holder',
  EXCELLENCE: 'excellence',
};

export const PAPER_SIZES = [
  { id: 'a4', label: 'A4' },
  { id: 'letter', label: 'Letter' },
  { id: 'legal', label: 'Legal' },
  { id: 'a3', label: 'A3' },
];

export const ORIENTATIONS = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
];

export const SAVE_MODES = {
  AUTO: 'auto',
  MANUAL: 'manual',
};

export const REMARKS_MODAL_MODES = {
  INDIVIDUAL: 'individual',
  UPLOAD: 'upload',
};

export const BATCH_SIZE = 100;
export const PAGE_SIZE = 1000;

export const MANAGEMENT_ROLES = ['admin', 'management', 'coordinator', 'principal'];
export const TEACHER_ROLES = ['teacher', 'staff'];
export const ALL_EDIT_ROLES = [...MANAGEMENT_ROLES, ...TEACHER_ROLES];

export const DEFAULT_MAX_MARKS = 100;
export const DEFAULT_PASS_MARKS = 35;