// src/types/print-settings.js
/**
 * TypeScript types for Timetable Print Settings
 */

// Page sizes
export const PAGE_SIZES = [
  { id: 'a4', name: 'A4', width: '210mm', height: '297mm' },
  { id: 'letter', name: 'Letter', width: '8.5in', height: '11in' },
  { id: 'legal', name: 'Legal', width: '8.5in', height: '14in' },
  { id: 'a3', name: 'A3', width: '297mm', height: '420mm' },
  { id: 'a5', name: 'A5', width: '148mm', height: '210mm' },
];

// Orientations
export const ORIENTATIONS = [
  { id: 'portrait', name: 'Portrait', icon: 'fa-file-alt' },
  { id: 'landscape', name: 'Landscape', icon: 'fa-file-alt' },
];

// Page break options. The printed grid is period-rows x day-columns, so only row-level
// breaks are representable; day/teacher/class breaks cannot exist in this layout.
export const PAGE_BREAK_OPTIONS = [
  { id: 'none', name: 'None', description: 'One continuous table' },
  {
    id: 'after-period',
    name: 'After Each Period',
    description: 'Start a new page after every period row',
  },
];

// Cell data options
export const CELL_DATA_OPTIONS = [
  { id: 'period', name: 'Period', description: 'Show period name/number' },
  { id: 'timestamp', name: 'Timestamp', description: 'Show start/end time' },
  { id: 'subject', name: 'Subject', description: 'Show subject name' },
  { id: 'teacher', name: 'Teacher', description: 'Show teacher name' },
];

// What the first (row header / period) column shows
export const ROW_HEADER_OPTIONS = [
  { id: 'period', name: 'Period', description: 'Period name or number' },
  { id: 'timestamp', name: 'Timestamp', description: 'Start and end time' },
];

// Cell modes
export const CELL_MODES = [
  { id: 'simple', name: 'Simple', description: 'Text-only cells', icon: 'fa-text-width' },
  { id: 'graphic', name: 'Graphic', description: 'Visual cards with images', icon: 'fa-image' },
];

/**
 * Print settings object
 * @typedef {Object} PrintSettings
 * @property {string} pageSize - Page size ID (a4, letter, legal, a3, a5)
 * @property {string} orientation - Orientation ID (portrait, landscape)
 * @property {number} fontSize - Font size in points (8-14)
 * @property {string} pageBreak - Page break option ID
 * @property {string[]} cellData - Array of cell data option IDs
 * @property {string} cellMode - Cell mode ID (simple, graphic)
 * @property {string[]} selectedColumns - Array of column keys to include
 * @property {string[]} selectedRows - Array of row keys to include
 * @property {boolean} showGridLines - Whether to show grid lines
 * @property {boolean} showHeaders - Whether to show the day/period header row
 * @property {Array} headerLines - Configurable header lines (text, size, colour, visibility)
 * @property {string} footerText - Custom footer text
 * @property {number} margin - Page margin in mm
 * @property {'current'|'all-classes'} printScope - Print the active view, or one page per class
 */

/**
 * Placeholders that can be used in header and footer text. They are resolved per printed sheet,
 * so a batch print of every class shows each class's own name.
 */
export const PRINT_VARIABLES = [
  { token: '{className}', label: 'Class name' },
  { token: '{teacherName}', label: 'Teacher name' },
  { token: '{viewLabel}', label: 'Active view' },
  { token: '{timetableName}', label: 'Timetable name' },
  { token: '{date}', label: 'Date' },
  { token: '{time}', label: 'Time' },
  { token: '{page}', label: 'Page' },
  { token: '{totalPages}', label: 'Total pages' },
];

export const HEADER_LINE_LIMIT = 6;

/**
 * Header lines printed above every sheet. Each line is independent: its own text, font size,
 * colour and visibility, so institute / timetable / class can be styled separately.
 */
export const DEFAULT_HEADER_LINES = [
  {
    id: 'institute',
    label: 'Institute name',
    text: 'JAMIA ZAYTOONAH VELLORE',
    fontSize: 16,
    color: '#0f172a',
    bold: true,
    visible: true,
  },
  {
    id: 'timetable',
    label: 'Timetable name',
    text: '{timetableName}',
    fontSize: 13,
    color: '#334155',
    bold: false,
    visible: true,
  },
  {
    id: 'entity',
    label: 'Class / teacher name',
    text: '{className}{teacherName}',
    fontSize: 12,
    color: '#64748b',
    bold: false,
    visible: true,
  },
];

/**
 * Default print settings
 */
export const DEFAULT_PRINT_SETTINGS = {
  pageSize: 'a4',
  orientation: 'landscape',
  fontSize: 10,
  pageBreak: 'none',
  cellData: ['period', 'subject', 'teacher'],
  cellMode: 'simple',
  selectedColumns: [],
  selectedRows: [],
  rowHeaderData: ['period', 'timestamp'],
  showGridLines: true,
  showHeaders: true,
  headerLines: DEFAULT_HEADER_LINES,
  footerText: 'Generated on {date}',
  margin: 15,
  headerMargin: 5,
  footerMargin: 5,
  pageHeaders: [
    {
      id: 'header1',
      label: 'Header 1',
      type: 'text',
      text: 'JAMIA ZAYTOONAH VELLORE',
      imageUrl: '',
      fontSize: 16,
      color: '#0f172a',
      alignment: 'center',
      imageSize: 80,
      imagePosition: 'center',
      visible: true,
    },
    {
      id: 'header2',
      label: 'Header 2',
      type: 'text',
      text: '{timetableName}',
      imageUrl: '',
      fontSize: 13,
      color: '#334155',
      alignment: 'center',
      imageSize: 80,
      imagePosition: 'center',
      visible: true,
    },
    {
      id: 'header3',
      label: 'Header 3',
      type: 'text',
      text: '{className}{teacherName}',
      imageUrl: '',
      fontSize: 12,
      color: '#64748b',
      alignment: 'center',
      imageSize: 80,
      imagePosition: 'center',
      visible: true,
    },
  ],
  pageFooter: {
    type: 'text',
    text: 'Generated on {date}',
    imageUrl: '',
    fontSize: 9,
    color: '#64748b',
    alignment: 'center',
    imageSize: 80,
    imagePosition: 'center',
    visible: true,
  },
  tableHeader: {
    visible: true,
    repeat: true,
    backgroundColor: '#1e40af',
    fontSize: 10,
    color: '#ffffff',
    alignment: 'center',
    heightMode: 'auto',
    height: 36,
  },
  tableStyle: {
    bandedRows: false,
    bandedColumns: false,
    bandedColor: '#f1f5f9',
    firstColumnDifferent: true,
    firstColumnColor: '#0f172a',
    firstColumnFontSize: 10,
    firstColumnAlignment: 'left',
    cellColor: '#0f172a',
    cellFontSize: 10,
    cellAlignment: 'center',
    cellMargin: 0,
    cellPadding: 2,
    columnWidthMode: 'auto',
    columnWidth: 120,
    rowHeightMode: 'auto',
    rowHeight: 36,
    firstColumnWidthMode: 'auto',
    firstColumnWidth: 160,
    borderThickness: 1,
    borderColor: '#cbd5e1',
    borderOpacity: 100,
    showBorders: true,
  },
  printScope: 'current',
};

export const DEFAULT_DISCIPLINE_PRINT_SETTINGS = {
  ...DEFAULT_PRINT_SETTINGS,
  pageSize: 'a4',
  orientation: 'portrait',
  margin: 8,
  pageHeaders: [
    {
      ...DEFAULT_PRINT_SETTINGS.pageHeaders[0],
      type: 'image',
      text: '',
      imageUrl: '/media/logo-cap.png',
      imageSize: 68,
      imagePosition: 'center',
    },
    {
      ...DEFAULT_PRINT_SETTINGS.pageHeaders[1],
      text: 'WEEK ENDING {weekEnding}',
      fontSize: 14,
      color: '#000000',
    },
    { ...DEFAULT_PRINT_SETTINGS.pageHeaders[2], text: '', visible: false },
  ],
  pageFooter: { ...DEFAULT_PRINT_SETTINGS.pageFooter, text: '', visible: false },
  tableHeader: { ...DEFAULT_PRINT_SETTINGS.tableHeader, backgroundColor: '#ffffff', color: '#000000' },
  tableStyle: {
    ...DEFAULT_PRINT_SETTINGS.tableStyle,
    bandedRows: false,
    firstColumnDifferent: false,
  },
};

/**
 * Print preview data
 * @typedef {Object} PrintPreviewData
 * @property {Object} timetable - Timetable data
 * @property {PrintSettings} settings - Print settings
 * @property {string[]} days - Array of day names
 * @property {Array} periods - Array of period objects
 * @property {Object} slots - Slots data keyed by day-period
 */

export default {
  PAGE_SIZES,
  ORIENTATIONS,
  PAGE_BREAK_OPTIONS,
  CELL_DATA_OPTIONS,
  CELL_MODES,
  PRINT_VARIABLES,
  HEADER_LINE_LIMIT,
  DEFAULT_HEADER_LINES,
  DEFAULT_PRINT_SETTINGS,
};