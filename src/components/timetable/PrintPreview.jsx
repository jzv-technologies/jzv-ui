// src/components/timetable/PrintPreview.jsx
/**
 * PrintPreview Component
 * On-screen preview of the printable sheet(s). Renders the exact same TimetableSheet used by the
 * print document, so what is previewed is what is printed. When several datasets are given (one
 * per class) the sheets are stacked in the same order the pages will be printed.
 */

import React from 'react';
import TimetableSheet from './TimetableSheet';

const PrintPreview = ({ timetableData, datasets = null, settings, variant = 'class', className = '' }) => {
  const sheets = datasets && datasets.length > 0 ? datasets : timetableData ? [timetableData] : [];
  const tableStyle = settings?.tableStyle || {};
  const previewClasses = [
    'print-config-preview',
    tableStyle.columnWidthMode === 'fixed' && 'has-fixed-column-width',
    tableStyle.columnWidthMode === 'fixed' &&
      tableStyle.firstColumnWidthMode !== 'fixed' &&
      'has-auto-first-column-width',
    tableStyle.rowHeightMode === 'fixed' && 'has-fixed-row-height',
    tableStyle.firstColumnWidthMode === 'fixed' && 'has-fixed-first-column-width',
    settings?.tableHeader?.heightMode === 'fixed' && 'has-fixed-table-header-height',
  ]
    .filter(Boolean)
    .join(' ');
  const previewStyle = {
    '--pc-cell-color': tableStyle.cellColor,
    '--pc-cell-size': `${tableStyle.cellFontSize ?? 10}pt`,
    '--pc-cell-align': tableStyle.cellAlignment || 'center',
    '--pc-cell-margin': `${tableStyle.cellMargin ?? 0}px`,
    '--pc-cell-padding': `${tableStyle.cellPadding ?? 2}px`,
    '--pc-band-color': tableStyle.bandedColor || '#f1f5f9',
    '--pc-border-color': tableStyle.borderColor || '#cbd5e1',
    '--pc-border-width': `${tableStyle.showBorders === false ? 0 : tableStyle.borderThickness ?? 1}px`,
    '--pc-border-opacity': `${tableStyle.borderOpacity ?? 100}%`,
    '--pc-first-color': tableStyle.firstColumnDifferent
      ? tableStyle.firstColumnColor
      : tableStyle.cellColor,
    '--pc-first-size': `${
      tableStyle.firstColumnDifferent
        ? tableStyle.firstColumnFontSize ?? 10
        : tableStyle.cellFontSize ?? 10
    }pt`,
    '--pc-first-align': tableStyle.firstColumnDifferent
      ? tableStyle.firstColumnAlignment
      : tableStyle.cellAlignment,
    '--pc-header-color': settings?.tableHeader?.color || '#ffffff',
    '--pc-header-bg': settings?.tableHeader?.backgroundColor || '#1e40af',
    '--pc-header-size': `${settings?.tableHeader?.fontSize ?? 10}pt`,
    '--pc-header-align': settings?.tableHeader?.alignment || 'center',
    '--pc-header-visible': settings?.tableHeader?.visible !== false ? 'table-row-group' : 'none',
    '--pc-header-repeat': settings?.tableHeader?.repeat !== false
      ? 'table-header-group'
      : 'table-row-group',
    '--pc-row-band': tableStyle.bandedRows ? tableStyle.bandedColor : 'transparent',
    '--pc-column-band': tableStyle.bandedColumns ? tableStyle.bandedColor : 'transparent',
    '--pc-column-width': `${tableStyle.columnWidth ?? 120}px`,
    '--pc-row-height': `${tableStyle.rowHeight ?? 36}px`,
    '--pc-first-column-width': `${tableStyle.firstColumnWidth ?? 160}px`,
    '--pc-table-header-height': `${settings?.tableHeader?.height ?? 36}px`,
  };

  return (
    <div
      className={`flex min-h-full min-w-full flex-col items-center gap-6 rounded-xl bg-gray-100 p-4 sm:p-6 ${className}`}
    >
      <div className={`flex min-w-full flex-col items-center gap-6 ${previewClasses}`} style={previewStyle}>
        {sheets.map((data, idx) => (
          <TimetableSheet
            key={data?.classId ?? data?.entityName ?? idx}
            timetableData={data}
            settings={settings}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
};

export default PrintPreview;
