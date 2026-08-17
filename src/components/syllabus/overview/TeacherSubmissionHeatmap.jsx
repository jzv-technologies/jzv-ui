import React, { useState, useEffect } from 'react';

const CELL_COLORS = {
  good: 'bg-emerald-500 text-white',
  partial: 'bg-amber-400 text-dark-primary font-black',
  missing: 'bg-red-100 border border-red-300 text-red-700 font-black',
  extra: 'bg-blue-500 text-white',
  none: 'bg-gray-100 text-gray-400',
};

const CELL_TOOLTIPS = {
  good: 'All allocated periods submitted',
  partial: 'Partially submitted',
  missing: 'Expected periods not submitted',
  extra: 'Submitted on non-scheduled day',
  none: 'No periods allocated',
};

const getAdherenceColor = (rate) => {
  if (rate >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (rate >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
};

const formatSubmissionTime = (timestamp) => {
  if (!timestamp) return null;
  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp.trim())) {
    return null;
  }
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return null;
  // Check if it's exact UTC midnight (00:00:00) which produces 5:30 AM in IST
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return null;
  }
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TeacherSubmissionHeatmap = ({ heatmapData }) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCellModal, setSelectedCellModal] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedCellModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!heatmapData || !heatmapData.rows || heatmapData.rows.length === 0) {
    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-6 text-sm font-semibold text-gray-500">
        No teacher submission data available for the heatmap.
      </div>
    );
  }

  const { rows, dates, weekLabels = [], weekBlocks: customWeekBlocks } = heatmapData;

  // Use structured weekBlocks from data model
  const weekBlocks = customWeekBlocks || (() => {
    const blocks = [];
    let currentBlock = [];
    let lastWeekNum = -1;
    (dates || []).forEach((date) => {
      const d = new Date(date);
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      if (weekNum !== lastWeekNum && currentBlock.length > 0) {
        blocks.push({ label: weekLabels[blocks.length] || `Week ${blocks.length + 1}`, days: currentBlock });
        currentBlock = [];
      }
      lastWeekNum = weekNum;
      currentBlock.push(date);
    });
    if (currentBlock.length > 0) {
      blocks.push({ label: weekLabels[blocks.length] || `Week ${blocks.length + 1}`, days: currentBlock });
    }
    return blocks;
  })();

  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5 h-full flex flex-col w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div>
          <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-th text-brand-primary"></i>
            Tracker Heatmap
          </h3>
          <p className="text-[11px] font-bold text-gray-400 mt-0.5">
            Click any day cell to view period-by-period class, subject, and tracker submission logs.
          </p>
        </div>
        <span className="text-[10px] font-extrabold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-xl">
          4 Past Weeks + Current Week
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 my-3 text-[10px] font-bold text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center">
            2/2
          </span>
          Full Allocation
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-400 text-dark-primary text-[8px] font-black flex items-center justify-center">
            1/2
          </span>
          Partial
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-red-100 border border-red-300 text-red-700 text-[8px] font-black flex items-center justify-center">
            0/2
          </span>
          Missing Submissions
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-blue-500 text-white text-[8px] font-black flex items-center justify-center">
            1/0
          </span>
          Unplanned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-200 text-gray-400 text-[8px] font-black flex items-center justify-center">
            -
          </span>
          No Allocation
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-gray-500 font-bold sticky left-0 bg-white z-10 min-w-[130px]">
                Teacher
              </th>
              {weekBlocks.map((wb, wi) => (
                <th
                  key={wi}
                  colSpan={wb?.days?.length || 1}
                  className="text-center px-1 py-1.5 text-gray-500 font-extrabold border-l border-gray-200 bg-gray-50/70"
                >
                  {wb?.label || `Week ${wi + 1}`}
                </th>
              ))}
              <th className="text-center px-3 py-2 text-gray-500 font-bold min-w-[140px] border-l border-gray-200">
                Total Submissions / Periods
              </th>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 bg-white z-10"></th>
              {weekBlocks.map((wb, wi) =>
                (wb?.days || []).map((date, di) => {
                  const d = new Date(date);
                  const isValid = !isNaN(d.getTime());
                  const dayIdx = !isValid ? 0 : d.getDay() === 0 ? 5 : d.getDay() - 1; // Mon=0, Sat=5
                  return (
                    <th
                      key={`${wi}-${di}`}
                      className="text-center px-0.5 py-1 text-gray-400 font-bold text-[9px] min-w-[28px]"
                      title={
                        isValid
                          ? d.toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''
                      }
                    >
                      {dayHeaders[dayIdx] || ''}
                    </th>
                  );
                })
              )}
              <th className="border-l border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teacherId} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-3 py-2 font-black text-dark-primary sticky left-0 bg-white z-10 whitespace-nowrap text-xs">
                  {row.teacherName}
                </td>
                {row.cells.map((cell, ci) => {
                  let cellContent = '-';
                  if (cell.allocated > 0 || cell.submissions > 0) {
                    cellContent = `${cell.submissions}/${cell.allocated}`;
                  }

                  return (
                    <td key={ci} className="px-0.5 py-1 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCellModal({
                            teacherName: row.teacherName,
                            cell,
                          })
                        }
                        onMouseEnter={() =>
                          setHoveredCell({
                            teacher: row.teacherName,
                            date: cell.date,
                            dayName: cell.dayName,
                            submissions: cell.submissions,
                            allocated: cell.allocated,
                            status: cell.status,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`w-7 h-6 rounded-md text-[9px] font-black cursor-pointer transition-transform hover:scale-110 active:scale-95 flex items-center justify-center ${
                          CELL_COLORS[cell.status] || CELL_COLORS.none
                        }`}
                        title={`${row.teacherName} · ${cell.date} (${cell.dayName})\nSubmissions: ${cell.submissions} / ${cell.allocated} periods\nClick to view period log details`}
                      >
                        {cellContent}
                      </button>
                    </td>
                  );
                })}

                {/* Submissions vs Allocated Periods column */}
                <td className="px-3 py-2 text-center border-l border-gray-200 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-extrabold text-dark-primary text-xs">
                      {row.totalSubmissions}
                    </span>
                    <span className="text-gray-400 text-[10px]">/</span>
                    <span className="font-bold text-gray-500 text-xs">
                      {row.totalExpected}
                    </span>
                    <span
                      className={`ml-1 text-[10px] font-black px-2 py-0.5 rounded-lg border ${getAdherenceColor(
                        row.adherenceRate
                      )}`}
                    >
                      {Math.round(row.adherenceRate)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hover Info Footer */}
      {hoveredCell && (
        <div className="mt-3 p-2 bg-light-bg rounded-xl text-xs font-bold text-gray-600 flex items-center justify-between">
          <span>
            <strong className="text-dark-primary">{hoveredCell.teacher}</strong> ·{' '}
            {hoveredCell.date} ({hoveredCell.dayName})
          </span>
          <span>
            {hoveredCell.submissions} submissions / {hoveredCell.allocated} allocated periods —{' '}
            <span className="text-brand-primary">{CELL_TOOLTIPS[hoveredCell.status]}</span>
          </span>
        </div>
      )}

      {/* UNIFIED DETAIL MODAL: Single Unified Period Schedule & Submission Table */}
      {selectedCellModal && (
        <div className="fixed inset-0 z-[130] bg-dark-almostblack/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-light-border rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-light-border flex items-start justify-between gap-3 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-dark-primary">
                    {selectedCellModal.teacherName}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-brand-primary/10 text-brand-primary">
                    {selectedCellModal.cell?.dayName} · {selectedCellModal.cell?.date}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-semibold mt-1">
                  Summary:{' '}
                  <strong className="text-dark-primary">
                    {selectedCellModal.cell?.submissions || 0}
                  </strong>{' '}
                  submitted out of{' '}
                  <strong className="text-dark-primary">
                    {selectedCellModal.cell?.allocated || 0}
                  </strong>{' '}
                  allocated periods.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCellModal(null)}
                className="w-8 h-8 rounded-xl border border-light-border text-gray-400 hover:text-dark-primary hover:bg-light-bg flex items-center justify-center transition-colors"
              >
                <i className="fas fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Body: UNIFIED PERIOD SCHEDULE & SUBMISSION TABLE */}
            <div className="p-5 overflow-y-auto flex-1 bg-gray-50/50">
              {(() => {
                const directPeriodRows = selectedCellModal.cell?.periodRows;
                let allRows = [];

                if (Array.isArray(directPeriodRows) && directPeriodRows.length > 0) {
                  allRows = directPeriodRows;
                } else {
                  const allocatedSlots = selectedCellModal.cell?.allocatedSlots || [];
                  const submissionLogs = selectedCellModal.cell?.submissionLogs || [];

                  // Match logs to allocated period slots
                  const usedLogIds = new Set();
                  const periodRows = allocatedSlots.map((slot) => {
                    const matchingLog = submissionLogs.find((log) => {
                      if (usedLogIds.has(log.id)) return false;

                      const classMatch =
                        String(log.classId) === String(slot.classId) ||
                        (log.className &&
                          slot.className &&
                          log.className.trim().toLowerCase() === slot.className.trim().toLowerCase());

                      const subjectMatch =
                        String(log.subjectId) === String(slot.subjectId) ||
                        (log.subjectName &&
                          slot.subjectName &&
                          log.subjectName.trim().toLowerCase() === slot.subjectName.trim().toLowerCase());

                      return classMatch && subjectMatch;
                    });

                    if (matchingLog && matchingLog.id) usedLogIds.add(matchingLog.id);

                    return {
                      isScheduled: true,
                      periodName: slot.periodName || `Period ${slot.periodNum || slot.periodId}`,
                      periodTime: slot.periodTime,
                      className: slot.className,
                      subjectName: slot.subjectName,
                      isSubmitted: Boolean(matchingLog),
                      log: matchingLog,
                    };
                  });

                  // Unscheduled / Extra Submissions
                  const extraLogs = submissionLogs.filter(
                    (log) => !usedLogIds.has(log.id)
                  );

                  const extraRows = extraLogs.map((log) => ({
                    isScheduled: false,
                    periodName: 'Unplanned',
                    periodTime: '',
                    className: log.className,
                    subjectName: log.subjectName,
                    isSubmitted: true,
                    log,
                  }));

                  allRows = [...periodRows, ...extraRows];
                }

                if (allRows.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-400 font-semibold text-xs">
                      No timetable periods scheduled and no submission logs recorded on this day.
                    </div>
                  );
                }

                return (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-600 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 min-w-[130px]">Period Name</th>
                          <th className="px-4 py-3 min-w-[110px]">Class</th>
                          <th className="px-4 py-3 min-w-[140px]">Subject / Book</th>
                          <th className="px-4 py-3 min-w-[180px]">Submission Status & Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                            {/* Period Column */}
                            <td className="px-4 py-3 font-black text-dark-primary whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="flex items-center gap-1.5">
                                  <i className="fas fa-clock text-brand-primary text-[10px]" />
                                  {row.periodName}
                                </span>
                                {row.periodTime && (
                                  <span className="text-[10px] font-bold text-gray-400 ml-4">
                                    {row.periodTime}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Class Column */}
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-1 rounded-xl bg-brand-primary/10 text-brand-primary text-xs font-black border border-brand-primary/20">
                                {row.className}
                              </span>
                            </td>

                            {/* Subject / Book Column */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-dark-primary text-xs">
                                  {row.subjectName || 'Subject'}
                                </span>
                                {(row.bookName || row.log?.bookName) ? (
                                  <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mt-0.5">
                                    <i className="fas fa-book-open text-[10px] text-brand-primary" />
                                    <span className="truncate max-w-[200px]" title={row.bookName || row.log?.bookName}>
                                      {row.bookName || row.log?.bookName}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            {/* Submission Status & Details */}
                            <td className="px-4 py-3">
                              {row.isSubmitted ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                                      <i className="fas fa-circle-check text-[10px]" />
                                      Submitted ({row.log?.progress ?? 100}%)
                                    </span>
                                    {formatSubmissionTime(row.log?.createdAt) && (
                                      <span className="text-[10px] font-bold text-gray-400">
                                        {formatSubmissionTime(row.log.createdAt)}
                                      </span>
                                    )}
                                  </div>
                                  {row.log?.lessonTitle && (
                                    <div className="text-[11px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                      <span className="text-gray-400 font-extrabold mr-1">Lesson:</span>
                                      {row.log.lessonTitle}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                                  <i className="fas fa-circle-xmark text-[10px]" />
                                  Missing Submission
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-light-border bg-gray-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedCellModal(null)}
                className="px-5 py-2 rounded-xl bg-dark-primary text-white text-xs font-bold hover:bg-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSubmissionHeatmap;
