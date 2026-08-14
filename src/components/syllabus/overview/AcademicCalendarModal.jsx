import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_TEACHING_DAYS, DEFAULT_WORKING_DAYS } from './overviewUtils';

const groupEstimateRows = (estimateRows = []) => {
  const grouped = estimateRows.reduce((accumulator, row) => {
    if (!accumulator[row.className]) accumulator[row.className] = {};
    if (!accumulator[row.className][row.subjectName]) {
      accumulator[row.className][row.subjectName] = [];
    }
    accumulator[row.className][row.subjectName].push(row);
    return accumulator;
  }, {});

  return Object.entries(grouped);
};

const AcademicCalendarModal = ({
  isOpen,
  canEdit,
  onClose,
  academicYear,
  academicYearOptions = [],
  onAcademicYearChange,
  calendarRows = [],
  estimateRows = [],
  onSaveCalendar,
  onSaveEstimates,
  isSavingCalendar,
  isSavingEstimates,
}) => {
  const [calendarDraft, setCalendarDraft] = useState(calendarRows);
  const [estimateDraft, setEstimateDraft] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setCalendarDraft(calendarRows.map((row) => ({ ...row })));
    setEstimateDraft(
      estimateRows.reduce((accumulator, row) => {
        accumulator[row.mappingId] = row.estimatedPeriods;
        return accumulator;
      }, {})
    );
  }, [isOpen, calendarRows, estimateRows]);

  const groupedEstimateRows = useMemo(() => groupEstimateRows(estimateRows), [estimateRows]);

  if (!isOpen) return null;

  const handleCalendarChange = (index, key, value) => {
    setCalendarDraft((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value.replace(/[^0-9]/g, '') } : row
      )
    );
  };

  const handleResetDefaults = () => {
    setCalendarDraft((previous) =>
      previous.map((row) => ({
        ...row,
        working_days: DEFAULT_WORKING_DAYS,
        teaching_days: DEFAULT_TEACHING_DAYS,
      }))
    );
  };

  const handleEstimateChange = (mappingId, value) => {
    setEstimateDraft((previous) => ({
      ...previous,
      [mappingId]: value.replace(/[^0-9]/g, ''),
    }));
  };

  const handleSaveCalendarClick = async () => {
    await onSaveCalendar(calendarDraft);
  };

  const handleSaveEstimatesClick = async () => {
    const payload = estimateRows.map((row) => ({
      mappingId: row.mappingId,
      estimatedPeriods: estimateDraft[row.mappingId] ?? '',
    }));
    await onSaveEstimates(payload);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-dark-almostblack/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-light-border rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-sliders text-brand-primary"></i>
              Overview Settings
            </h3>
            <p className="text-sm text-gray-500 font-semibold mt-1">
              Manage academic calendar pacing inputs and book period estimates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl border border-light-border text-gray-500 hover:text-dark-primary hover:bg-light-bg transition-colors"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section className="rounded-2xl border border-light-border p-4 sm:p-5 bg-light-bg/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-dark-primary">Monthly Calendar</h4>
                <p className="text-[11px] font-bold text-gray-400 mt-1">
                  June through March working-day and teaching-day assumptions.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={academicYear}
                  onChange={(event) => onAcademicYearChange(event.target.value)}
                  className="px-3 py-2 rounded-xl border border-light-border bg-white text-sm font-bold text-dark-primary"
                >
                  {academicYearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3 py-2 rounded-xl border border-light-border bg-white text-xs font-black text-gray-600 hover:bg-light-bg"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-4 font-black">Month</th>
                    <th className="py-2 px-2 font-black">Year</th>
                    <th className="py-2 px-2 font-black">Working Days</th>
                    <th className="py-2 px-2 font-black">Teaching Days</th>
                  </tr>
                </thead>
                <tbody>
                  {calendarDraft.map((row, index) => (
                    <tr key={`${row.year}-${row.month}`} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-bold text-dark-primary">{row.monthLabel}</td>
                      <td className="py-3 px-2 text-gray-500 font-semibold">{row.year}</td>
                      <td className="py-3 px-2">
                        <input
                          value={row.working_days}
                          onChange={(event) =>
                            handleCalendarChange(index, 'working_days', event.target.value)
                          }
                          disabled={!canEdit}
                          className="w-24 px-3 py-2 rounded-xl border border-light-border bg-white text-sm font-bold text-dark-primary disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          value={row.teaching_days}
                          onChange={(event) =>
                            handleCalendarChange(index, 'teaching_days', event.target.value)
                          }
                          disabled={!canEdit}
                          className="w-24 px-3 py-2 rounded-xl border border-light-border bg-white text-sm font-bold text-dark-primary disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveCalendarClick}
                disabled={!canEdit || isSavingCalendar}
                className="px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingCalendar ? 'Saving Calendar...' : 'Save Calendar'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-light-border p-4 sm:p-5 bg-white">
            <div className="mb-4">
              <h4 className="text-sm font-black text-dark-primary">Book Period Estimates</h4>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Configure estimated periods by class, subject, and book. Weeks-to-complete is
                calculated from timetable periods per week.
              </p>
            </div>

            <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
              {groupedEstimateRows.map(([className, subjectsForClass]) => (
                <div
                  key={className}
                  className="rounded-2xl border border-light-border bg-light-bg/40 p-4"
                >
                  <h5 className="text-sm font-black text-dark-primary mb-3">{className}</h5>
                  <div className="space-y-4">
                    {Object.entries(subjectsForClass).map(([subjectName, rows]) => (
                      <div
                        key={subjectName}
                        className="rounded-2xl bg-white border border-light-border p-4"
                      >
                        <h6 className="text-xs font-black uppercase tracking-wide text-gray-400 mb-3">
                          {subjectName}
                        </h6>
                        <div className="space-y-3">
                          {rows.map((row) => (
                            <div
                              key={row.mappingId}
                              className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_120px_120px_120px] gap-3 items-center"
                            >
                              <div>
                                <p className="text-sm font-bold text-dark-primary">
                                  {row.bookName}
                                </p>
                                <p className="text-[11px] font-bold text-gray-400 mt-1">
                                  Periods/week: {row.periodsPerWeek || 0}
                                </p>
                              </div>
                              <input
                                value={estimateDraft[row.mappingId] ?? ''}
                                onChange={(event) =>
                                  handleEstimateChange(row.mappingId, event.target.value)
                                }
                                disabled={!canEdit}
                                placeholder="Periods"
                                className="px-3 py-2 rounded-xl border border-light-border bg-white text-sm font-bold text-dark-primary disabled:bg-gray-100 disabled:text-gray-400"
                              />
                              <div className="px-3 py-2 rounded-xl border border-light-border bg-light-bg text-sm font-bold text-gray-600">
                                {row.periodsPerWeek || 0} / week
                              </div>
                              <div className="px-3 py-2 rounded-xl border border-light-border bg-light-bg text-sm font-bold text-gray-600">
                                {row.periodsPerWeek > 0 &&
                                Number(estimateDraft[row.mappingId] || 0) > 0
                                  ? `${(Number(estimateDraft[row.mappingId]) / row.periodsPerWeek).toFixed(1)} wks`
                                  : 'n/a'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveEstimatesClick}
                disabled={!canEdit || isSavingEstimates}
                className="px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingEstimates ? 'Saving Estimates...' : 'Save Period Estimates'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AcademicCalendarModal;
