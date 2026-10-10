// src/components/timetable/TimetableSheet.jsx
/**
 * TimetableSheet Component
 * The printable timetable grid. Shared by the on-screen preview and the print document so
 * both always render identical output. Sizing only ever swaps the paper dimensions for
 * landscape - the sheet is never rotated.
 */

import React from 'react';
import { DEFAULT_PRINT_SETTINGS } from '../../types/print-settings';

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
  const { days, periods, slots } = timetableData || {};

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

  const resolvedFooter = s.footerText
    ? s.footerText
        .replaceAll('{date}', new Date().toLocaleDateString())
        .replaceAll('{time}', new Date().toLocaleTimeString())
        .replaceAll('{page}', '1')
        .replaceAll('{totalPages}', '1')
    : '';

  return (
    <div
      className="print-sheet bg-white"
      style={
        forPrint
          ? { width: '100%', padding: 0 }
          : { width, height, padding: `${s.margin}mm`, boxShadow: '0 25px 50px -12px rgba(0,0,0,.25)' }
      }
    >
      {s.showHeaders && s.headerText && (
        <div className="mb-3 text-center">
          <h1 className="text-base font-bold text-dark-primary">{s.headerText}</h1>
        </div>
      )}

      <table
        className="w-full border-collapse text-center"
        style={{ fontSize: `${s.fontSize}pt`, tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: `${Math.max(70, s.fontSize * 9)}px` }} />
          {displayDays.map((day) => (
            <col key={day} />
          ))}
        </colgroup>
        <thead>
          {s.showHeaders && (
            <tr className="bg-brand-primary text-white">
              <th className="border border-light-border p-1.5 font-bold text-[10px]">
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
                className={`border border-light-border p-1.5 font-bold text-[10px] bg-light-bg/50 text-left ${
                  s.showGridLines ? '' : 'border-0'
                }`}
              >
                {rowHeaderData.includes('period') && (
                  <div>{period.name || `Period ${period.period_number}`}</div>
                )}
                {rowHeaderData.includes('timestamp') &&
                  period.start_time &&
                  period.end_time && (
                    <div className="text-[8px] font-medium text-dark-soft">
                      {period.start_time} - {period.end_time}
                    </div>
                  )}
              </td>
              {displayDays.map((day) => renderCell(day, period))}
            </tr>
          ))}
        </tbody>
      </table>

      {resolvedFooter && (
        <div className="mt-3 text-center text-[9px] text-dark-soft">{resolvedFooter}</div>
      )}
    </div>
  );
};

export default TimetableSheet;
