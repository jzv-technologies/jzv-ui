// src/utils/printUtils.js
/**
 * Print Utilities for Timetable
 * Builds the print stylesheet and injects it only while printing.
 *
 * Two print modes are supported:
 *  - 'sheet': the app is hidden and only the dedicated print document (a portal direct child
 *             of <body>) is printed. Used for the generated timetable grid. Because the print
 *             document is not inside the app tree it can never be clipped by an ancestor with
 *             overflow/height constraints, which is what previously cut off every column
 *             except the first.
 *  - 'dom'  : the currently displayed subview is printed as-is, by hiding everything and then
 *             revealing the element marked data-print-target="active".
 */

import { DEFAULT_PRINT_SETTINGS } from '../types/print-settings';

const PAGE_SIZES = {
  a4: { width: '210mm', height: '297mm' },
  letter: { width: '8.5in', height: '11in' },
  legal: { width: '8.5in', height: '14in' },
  a3: { width: '297mm', height: '420mm' },
  a5: { width: '148mm', height: '210mm' },
};

/** Normalise a single value or array of values into a list of trimmed strings */
const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

/** Escape a value for use inside a CSS attribute selector */
const cssAttr = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const SHELL_RESET = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    background: #ffffff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  #root, #root > div, main, .min-h-screen, .animate-in, [data-feature="timetable-planner"],
  [data-feature="timetable-content"] {
    display: block !important;
    position: static !important;
    overflow: visible !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
    animation: none !important;
    background: transparent !important;
  }
`;

/**
 * Generate CSS for print media
 * @param {Object} settings - Print settings
 * @param {'sheet'|'dom'} mode - Printing strategy
 * @returns {string} CSS string
 */
export const generatePrintCSS = (settings, mode = 'sheet') => {
  const s = { ...DEFAULT_PRINT_SETTINGS, ...settings };
  const { pageSize, orientation, fontSize, margin, pageBreak, showGridLines } = s;

  const page = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? page.height : page.width;
  const pageHeight = isLandscape ? page.width : page.height;

  let css = `
    /* Screen: the print document is never shown */
    .timetable-print-area {
      display: none !important;
    }

    @media print {
      @page {
        size: ${pageWidth} ${pageHeight};
        margin: ${margin}mm;
      }

      ${SHELL_RESET}

      body {
        font-size: ${fontSize}pt;
      }

      /* ---- Sheet mode: print only the generated document ---- */
      #root {
        display: none !important;
      }

      .timetable-print-area {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .timetable-print-area .print-sheet {
        width: 100% !important;
        height: auto !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }

      /* ---- DOM mode: print the active subview as displayed ---- */
      body.jzv-print-dom #root {
        display: block !important;
      }

      body.jzv-print-dom .timetable-print-area {
        display: none !important;
      }

      body.jzv-print-dom * {
        visibility: hidden !important;
      }

      body.jzv-print-dom [data-print-target="active"],
      body.jzv-print-dom [data-print-target="active"] * {
        visibility: visible !important;
      }

      body.jzv-print-dom [data-print-target="active"] {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        font-size: ${fontSize}pt !important;
      }

      /* The subview uses utility text sizes, so inherit to make the font-size setting apply */
      body.jzv-print-dom [data-print-target="active"] * {
        font-size: inherit !important;
      }

      /* List views are sized for a scrolling screen, so once a wide grid is fitted to the
         page its columns get narrow. Cells then rely on the 'truncate' utility (nowrap plus
         ellipsis) and every value collapses to a single letter. Wrap the text instead of
         clipping it so the printed content stays readable. */
      body.jzv-print-dom [data-print-target="active"] * {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }
    }
  `;

  if (pageBreak === 'after-period') {
    css += `
      @media print {
        tr.page-break-after {
          page-break-after: always;
        }
      }
    `;
  }

  if (!showGridLines) {
    css += `
      @media print {
        .print-sheet table, .print-sheet th, .print-sheet td,
        body.jzv-print-dom [data-print-target="active"] table,
        body.jzv-print-dom [data-print-target="active"] th,
        body.jzv-print-dom [data-print-target="active"] td {
          border: none !important;
        }
      }
    `;
  }

  if (mode === 'dom') {
    // The list subviews render the transpose of the printed sheet (days are rows, periods are
    // columns), so the same selections trim the opposite axis. The selections are an include
    // list, so anything outside them is hidden. Cells carry print tags instead of being
    // filtered out of the data, which keeps the on-screen view untouched.
    const hideOutside = (attr, values) => {
      const keep = asList(values)
        .map((value) => String(value).trim())
        .filter(Boolean)
        .map((value) => `[${attr}="${cssAttr(value)}"]`);
      return keep.length > 0 ? `[${attr}]:not(${keep.join('):not(')})` : null;
    };

    const selectors = [
      hideOutside('data-print-day', s.selectedColumns),
      hideOutside('data-print-period-id', s.selectedRows),
    ]
      .filter(Boolean)
      .map((sel) => `body.jzv-print-dom [data-print-target="active"] ${sel}`);

    if (selectors.length > 0) {
      css += `
        @media print {
          ${selectors.join(',\n          ')} {
            display: none !important;
          }
        }
      `;
    }
  }

  return css;
};

/**
 * Inject print CSS into the document, tagging <body> with the active print mode.
 * @param {Object} settings - Print settings
 * @param {'sheet'|'dom'} mode - Printing strategy
 */
export const injectPrintCSS = (settings, mode = 'sheet') => {
  const css = generatePrintCSS(settings, mode);

  const existing = document.getElementById('timetable-print-styles');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = 'timetable-print-styles';
  style.textContent = css;
  document.head.appendChild(style);

  document.body.classList.toggle('jzv-print-dom', mode === 'dom');
  document.body.classList.toggle('jzv-print-sheet', mode === 'sheet');
};

/**
 * Remove print CSS and the mode classes from the document
 */
export const removePrintCSS = () => {
  const existing = document.getElementById('timetable-print-styles');
  if (existing) existing.remove();
  document.body.classList.remove('jzv-print-dom', 'jzv-print-sheet');
};

/**
 * Format date for print footer
 * @returns {string} Formatted date
 */
export const formatPrintDate = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

/**
 * Format time for print footer
 * @returns {string} Formatted time
 */
export const formatPrintTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

/**
 * Replace footer placeholders
 * @param {string} template - Footer template
 * @param {number} page - Current page
 * @param {number} totalPages - Total pages
 * @returns {string} Formatted footer
 */
export const formatFooter = (template, page = 1, totalPages = 1) =>
  String(template || '')
    .replaceAll('{date}', formatPrintDate())
    .replaceAll('{time}', formatPrintTime())
    .replaceAll('{page}', String(page))
    .replaceAll('{totalPages}', String(totalPages));

export default {
  generatePrintCSS,
  injectPrintCSS,
  removePrintCSS,
  formatPrintDate,
  formatPrintTime,
  formatFooter,
};
