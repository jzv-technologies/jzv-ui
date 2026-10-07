// Re-export shared constants from report-card-designer
export {
  TEMPLATES_CONFIG_KEY,
  DEFAULT_GRADING_SCALE,
  DEFAULT_TABLE_COLUMN_ORDER,
  TABLE_COLUMN_LABELS,
  DEFAULT_TABLE_COLUMN_HEADERS,
  DEFAULT_BLOCK_TITLES,
  DEFAULT_BLOCK_STYLE,
  BLOCK_DEFAULT_BG,
  DEFAULT_CHART_COLUMN,
  CHART_TYPE_LABELS,
  CHART_DATA_LABELS,
  AGGREGATION_LABELS,
  DEFAULT_MOCK_CLASSIFICATIONS,
  CLASSIFICATION_SEQ_FALLBACK,
  CLASSIFICATION_NAME_SEQ_FALLBACK,
  KNOWN_SUBJECT_CLASSIFICATIONS,
  NAMED_COLORS,
  DEFAULT_TEMPLATE,
  BLOCK_LABELS,
} from '../../report-card-designer/constants';

// Generator-specific constants
export const REPORT_MODES = {
  PROGRESS: 'progress',
  RANK_HOLDER: 'rank_holder',
  EXCELLENCE: 'excellence',
};

export const PAPER_SIZES = {
  A4: 'a4',
  LETTER: 'letter',
  LEGAL: 'legal',
  A3: 'a3',
};

export const ORIENTATIONS = {
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
};

export const STUDENT_SELECTION_MODES = {
  ALL: 'all',
  SELECTED: 'selected',
};

export const PRINT_SPECIFICATIONS = {
  a4: { portrait: '296mm', landscape: '209mm' },
  letter: { portrait: '10.95in', landscape: '8.45in' },
  legal: { portrait: '13.95in', landscape: '8.45in' },
  a3: { portrait: '419mm', landscape: '296mm' },
};

export const DEFAULT_PAPER_SIZE = 'a4';
export const DEFAULT_ORIENTATION = 'portrait';