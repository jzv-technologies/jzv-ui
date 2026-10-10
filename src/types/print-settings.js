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
 * @property {boolean} showHeaders - Whether to show headers
 * @property {string} headerText - Custom header text
 * @property {string} footerText - Custom footer text
 * @property {number} margin - Page margin in mm
 */

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
  headerText: 'Timetable',
  footerText: 'Generated on {date}',
  margin: 15,
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
  DEFAULT_PRINT_SETTINGS,
};