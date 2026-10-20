// src/components/timetable/TimetableSheet.jsx
/**
 * TimetableSheet Component
 * The printable timetable grid. Shared by the on-screen preview and the print document so
 * both always render identical output. Sizing only ever swaps the paper dimensions for
 * landscape - the sheet is never rotated.
 */

import React from 'react';
import { DEFAULT_PRINT_SETTINGS } from '../../types/print-settings';
import { resolvePrintText } from '../../utils/printUtils';

const PAGE_DIMENSIONS = {
  a4: { width: '210mm', height: '297mm' },
  letter: { width: '8.5in', height: '11in' },
  legal: { width: '8.5in', height: '14in' },
  a3: { width: '297mm', height: '420mm' },
  a5: { width: '148mm', height: '210mm' },
};

export const getSheetDimensions = (pageSize, orientation) => {
  const page = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.a4;
  const isLandscape = orientation === 'landscape';
  return {
    width: isLandscape ? page.height : page.width,
    height: isLandscape ? page.width : page.height,
  };
};

/**
 * @param {Object} props
 * @param {'class'|'teacher'} [props.variant] - class grid shows teachers, teacher grid shows classes
 * @param {boolean} [props.forPrint] - when true the sheet flows with the page instead of a fixed box
 */
const TimetableSheet = ({ timetableData, settings, variant = 'class', forPrint = false }) => {
  const s = { ...DEFAULT_PRINT_SETTINGS, ...settings };
  const tableStyle = { ...DEFAULT_PRINT_SETTINGS.tableStyle, ...s.tableStyle };
  const { days, periods, slots } = timetableData || {};

  // The name this sheet is for: a class name, or a teacher name in teacher view. Batch prints
  // pass one dataset per class, so every placeholder resolves against its own sheet.
  const entityName = timetableData?.entityName || '';
  const headerContext = {
    className: variant === 'teacher' ? '' : entityName,
    teacherName: variant === 'teacher' ? entityName : '',
    viewLabel: timetableData?.viewLabel || (variant === 'teacher' ? 'Teacher View' : 'Class View'),
    timetableName: variant === 'teacher' ? 'Teacher Timetable' : 'Class Timetable',
  };

  const pageHeaders = (s.pageHeaders || []).filter(
    (header) => header && header.visible !== false
  );
  const pageFooter = s.pageFooter;

  const allDays = days || [];
  const allPeriods = periods || [];

  const displayDays =
    s.selectedColumns.length > 0
      ? allDays.filter((d) => s.selectedColumns.includes(d))
      : allDays;
  const displayPeriods =
    s.selectedRows.length > 0
      ? allPeriods.filter((p) => s.selectedRows.includes(String(p.id)))
      : allPeriods;

  const rowHeaderData = s.rowHeaderData?.length ? s.rowHeaderData : ['period', 'timestamp'];

  const getSlot = (day, periodId) =>
    (slots || []).find((x) => x.day === day && String(x.period_id) === String(periodId));

  const { width, height } = getSheetDimensions(s.pageSize, s.orientation);

  // First column: sized to its own text rather than to the table font size. The period label and
  // the timestamp are drawn at fixed small sizes, so scaling this column with the font-size
  // setting only ever added empty space beside them.
  const FIRST_COL_LABEL_FONT = 10;
  const FIRST_COL_STAMP_FONT = 8;
  const estimateTextWidth = (text, fontPx) => String(text || '').length * fontPx * 0.5;
  const headerWidth = estimateTextWidth(s.showHeaders ? 'Period / Day' : '', FIRST_COL_LABEL_FONT);
  const labelWidths = displayPeriods.map((p) =>
    estimateTextWidth(
      rowHeaderData.includes('period') ? p.name || `Period ${p.period_number}` : '',
      FIRST_COL_LABEL_FONT
    )
  );
  const stampWidths = displayPeriods.map((p) =>
    estimateTextWidth(
      rowHeaderData.includes('timestamp') && p.start_time && p.end_time
        ? `${p.start_time} - ${p.end_time}`
        : '',
      FIRST_COL_STAMP_FONT
    )
  );
  // A single unusually long period name ("Period 6 (Break)") must not widen every row of the
  // table: such a label wraps instead, inside the row height the data cells already set.
  const labelWidth = Math.min(Math.max(0, ...labelWidths), Math.max(headerWidth, 62));
  const contentFirstColWidth = Math.min(
    140,
    Math.max(56, Math.ceil(Math.max(headerWidth, labelWidth, 0, ...stampWidths)) + 14)
  );
  const firstColWidth =
    tableStyle.firstColumnWidthMode === 'fixed'
      ? tableStyle.firstColumnWidth
      : contentFirstColWidth;

  const renderCell = (day, period) => {
    const cellKey = `${day}-${period.id}`;
    const slot = getSlot(day, period.id);
    const isAssigned = Boolean(slot && slot.subject_id);

    if (!isAssigned) {
      return (
        <td
          key={cellKey}
          className="border border-light-border bg-light-bg/20 p-1 align-top"
          style={{ minHeight: '42px' }}
        >
          <div className="text-center text-dark-muted text-[9px] italic">Free</div>
        </td>
      );
    }

    const subjectName = slot.subject_name || 'Subject';
    const periodName = period.name || `Period ${period.period_number}`;
    const secondary =
      variant === 'teacher'
        ? slot.class_name || 'Class'
        : slot.teacher_name || 'Teacher';

    if (s.cellMode === 'graphic') {
      return (
        <td key={cellKey} className="border border-light-border p-1 align-top">
          <div className="bg-white rounded-lg p-1.5 shadow-sm border border-light-border">
            {s.cellData.includes('period') && (
              <div className="text-[8px] font-bold text-brand-primary uppercase mb-0.5">
                {periodName}
              </div>
            )}
            {s.cellData.includes('timestamp') &&
              period.start_time &&
              period.end_time && (
                <div className="text-[8px] text-dark-soft mb-0.5">
                  {period.start_time} - {period.end_time}
                </div>
              )}
            {s.cellData.includes('subject') && (
              <div className="text-[9px] font-bold text-dark-primary truncate">
                {subjectName}
              </div>
            )}
            {s.cellData.includes('teacher') && (
              <div className="text-[8px] text-dark-soft truncate">{secondary}</div>
            )}
          </div>
        </td>
      );
    }

    const lines = [];
    if (s.cellData.includes('period')) lines.push(periodName);
    if (s.cellData.includes('timestamp') && period.start_time && period.end_time) {
      lines.push(`${period.start_time}-${period.end_time}`);
    }
    if (s.cellData.includes('subject')) lines.push(subjectName);
    if (s.cellData.includes('teacher')) lines.push(secondary);

    return (
      <td
        key={cellKey}
        className={`border border-light-border p-1 align-top ${
          s.showGridLines ? '' : 'border-0'
        }`}
        style={{ minHeight: '42px' }}
      >
        <div className="text-center leading-tight flex flex-col items-center justify-center">
          {lines.map((line, idx) => (
            <span key={idx} className="truncate w-full">
              {line}
            </span>
          ))}
        </div>
      </td>
    );
  };

  return (
    <div
      className="print-sheet bg-white"
      data-print-sheet="true"
      style={
        forPrint
          ? { width: '100%', padding: 0 }
          : { width, height, padding: `${s.margin}mm`, boxShadow: '0 25px 50px -12px rgba(0,0,0,.25)' }
      }
    >
      {pageHeaders.length > 0 && (
        <div
          className="print-config-header mb-3 space-y-1"
          style={{ marginBottom: `${s.headerMargin ?? 5}mm` }}
        >
          {pageHeaders.map((header) =>
            header.type === 'image' ? (
              header.imageUrl ? (
                <div
                  key={header.id}
                  className="flex"
                  style={{
                    justifyContent:
                      header.imagePosition === 'left'
                        ? 'flex-start'
                        : header.imagePosition === 'right'
                          ? 'flex-end'
                          : 'center',
                  }}
                >
                  <img
                    src={header.imageUrl}
                    alt={header.label || 'Print header'}
                    style={{
                      width: `${header.imageSize || 80}%`,
                      height:
                        header.imageSizing === 'fixed'
                          ? `${header.imageHeight || 20}mm`
                          : 'auto',
                      maxHeight: header.imageSizing === 'fixed' ? undefined : '35mm',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              ) : null
            ) : header.text ? (
              <div
                key={header.id}
                style={{
                  color: header.color,
                  fontSize: `${header.fontSize || 12}px`,
                  fontWeight:
                    header.fontStyle?.includes('bold') || (!header.fontStyle && header.bold)
                      ? 800
                      : 600,
                  fontStyle: header.fontStyle?.includes('italic') ? 'italic' : 'normal',
                  textAlign: header.alignment,
                }}
              >
                {resolvePrintText(header.text, headerContext)}
              </div>
            ) : null
          )}
        </div>
      )}
      <table
        className="w-full border-collapse text-center"
        style={{ fontSize: `${s.fontSize}pt`, tableLayout: 'fixed' }}
      >
        {s.tableHeader.visible && s.tableHeader.headingText?.trim() && (
          <caption
            className="print-table-heading"
            style={{
              captionSide: 'top',
              backgroundColor: s.tableHeader.backgroundColor,
              color: s.tableHeader.color,
              fontSize: `${s.tableHeader.fontSize}pt`,
              fontWeight: 700,
              textAlign: s.tableHeader.alignment,
              padding: '6px',
            }}
          >
            {resolvePrintText(s.tableHeader.headingText, headerContext)}
          </caption>
        )}
        <colgroup>
          <col style={{ width: `${firstColWidth}px` }} />
          {displayDays.map((day) => (
            <col key={day} />
          ))}
        </colgroup>
        <thead>
          {s.showHeaders && s.tableHeader?.visible !== false && (
            <tr className="print-column-header bg-brand-primary text-white">
              <th className="border border-light-border px-1.5 py-1 font-bold text-[10px] leading-tight whitespace-nowrap">
                Period / Day
              </th>
              {displayDays.map((day) => (
                <th key={day} className="border border-light-border p-1.5 font-bold text-[10px]">
                  {day}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {displayPeriods.map((period, periodIdx) => (
            <tr
              key={period.id}
              className={
                s.pageBreak === 'after-period' && periodIdx < displayPeriods.length - 1
                  ? 'page-break-after'
                  : ''
              }
            >
              <td
                className={`border border-light-border px-1.5 py-1 font-bold text-[10px] leading-tight bg-light-bg/50 text-left align-middle ${
                  s.showGridLines ? '' : 'border-0'
                }`}
              >
                {rowHeaderData.includes('period') && (
                  <div className="leading-tight break-words">
                    {period.name || `Period ${period.period_number}`}
                  </div>
                )}
                {rowHeaderData.includes('timestamp') &&
                  period.start_time &&
                  period.end_time && (
                    <div className="text-[8px] font-medium text-dark-soft leading-tight">
                      {period.start_time} - {period.end_time}
                    </div>
                  )}
              </td>
              {displayDays.map((day) => renderCell(day, period))}
            </tr>
          ))}
        </tbody>
      </table>

      {pageFooter?.visible !== false && (pageFooter?.text || pageFooter?.imageUrl) && (
        <div
          className="print-config-footer mt-3"
          style={{
            marginTop: `${s.footerMargin ?? 5}mm`,
            textAlign: pageFooter.alignment,
            color: pageFooter.color,
            fontSize: `${pageFooter.fontSize || 9}px`,
          }}
        >
          {pageFooter.type === 'image' ? (
            <img
              className="inline-block"
              src={pageFooter.imageUrl}
              alt="Print footer"
              style={{
                width: `${pageFooter.imageSize || 80}%`,
                height:
                  pageFooter.imageSizing === 'fixed'
                    ? `${pageFooter.imageHeight || 20}mm`
                    : 'auto',
                maxHeight: pageFooter.imageSizing === 'fixed' ? undefined : '35mm',
                objectFit: 'contain',
              }}
            />
          ) : (
            resolvePrintText(pageFooter.text, headerContext)
          )}
        </div>
      )}

    </div>
  );
};

export default TimetableSheet;
