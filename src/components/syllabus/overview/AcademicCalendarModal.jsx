import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TEACHING_DAYS,
  DEFAULT_WORKING_DAYS,
  parseAcademicYearLabel,
  getAcademicMonthYear,
  buildAcademicMonths,
} from './overviewUtils';

const ALL_MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

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
  academicStartMonth = 6,
  academicEndMonth = 5,
  onSaveAcademicRange,
  academicMonths = [],
}) => {
  // Modal navigation tab: 'calendar' | 'target_completion'
  const [activeTab, setActiveTab] = useState('calendar');

  const [calendarDraft, setCalendarDraft] = useState(calendarRows);
  const [estimateDraft, setEstimateDraft] = useState({});
  const [activeSwatchIndex, setActiveSwatchIndex] = useState(null);

  // Range config state
  const [startMonth, setStartMonth] = useState(academicStartMonth);
  const [endMonth, setEndMonth] = useState(academicEndMonth);
  const [isSavingRange, setIsSavingRange] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCalendarDraft(calendarRows.map((row) => ({ ...row })));
    setStartMonth(academicStartMonth);
    setEndMonth(academicEndMonth);

    setEstimateDraft(
      estimateRows.reduce((accumulator, row) => {
        accumulator[row.mappingId] = {
          expectedEndMonth: row.expectedEndMonth || '',
        };
        return accumulator;
      }, {})
    );
  }, [isOpen, calendarRows, estimateRows, academicStartMonth, academicEndMonth]);

  const totalAnticipatedWorkingDays = useMemo(
    () => calendarDraft.reduce((sum, row) => sum + (Number(row.working_days) || 0), 0),
    [calendarDraft]
  );

  const totalAnticipatedTeachingDays = useMemo(
    () => calendarDraft.reduce((sum, row) => sum + (Number(row.teaching_days) || 0), 0),
    [calendarDraft]
  );

  const currentAcademicMonths = useMemo(
    () => buildAcademicMonths(startMonth, endMonth),
    [startMonth, endMonth]
  );

  const academicMonthOptions = useMemo(() => {
    const startYear = parseAcademicYearLabel(academicYear);
    return currentAcademicMonths.map((m) => {
      const year = getAcademicMonthYear(startYear, m);
      const label = ALL_MONTHS.find((item) => item.value === m)?.label || `Month ${m}`;
      return {
        value: m,
        year,
        label: `${label} ${year}`,
      };
    });
  }, [academicYear, currentAcademicMonths]);

  const dynamicEstimateRows = useMemo(() => {
    const startYear = parseAcademicYearLabel(academicYear);

    return estimateRows.map((row) => {
      const draft = estimateDraft[row.mappingId];
      const expectedEndMonth =
        draft && draft.expectedEndMonth !== undefined
          ? draft.expectedEndMonth
            ? Number(draft.expectedEndMonth)
            : null
          : row.expectedEndMonth || null;

      const calculatedStartMonth = row.calculatedStartMonth || startMonth;
      const effectiveEndMonth = expectedEndMonth || endMonth;

      let activeWindowMonths = [];
      let cursor = calculatedStartMonth;
      let safetyCounter = 0;
      while (safetyCounter < 12) {
        activeWindowMonths.push(cursor);
        if (cursor === effectiveEndMonth) break;
        cursor = cursor === 12 ? 1 : cursor + 1;
        safetyCounter++;
      }

      const activeTeachingDays = activeWindowMonths.reduce((sum, m) => {
        const calRow = calendarDraft.find((r) => r.month === m);
        return sum + (Number(calRow?.teaching_days) || DEFAULT_TEACHING_DAYS);
      }, 0);

      const activeTeachingWeeks = Number((activeTeachingDays / 5).toFixed(1));

      const startMonthYear = getAcademicMonthYear(startYear, calculatedStartMonth);
      const startMonthFullLabel = `${ALL_MONTHS.find((item) => item.value === calculatedStartMonth)?.label.substring(0, 3)} ${startMonthYear}`;

      const endMonthYear = getAcademicMonthYear(startYear, effectiveEndMonth);
      const endMonthFullLabel = `${ALL_MONTHS.find((item) => item.value === effectiveEndMonth)?.label.substring(0, 3)} ${endMonthYear}`;

      return {
        ...row,
        calculatedStartMonth,
        calculatedStartMonthLabel: startMonthFullLabel,
        expectedEndMonth,
        expectedEndMonthLabel: endMonthFullLabel,
        activeWindowMonths,
        activeTeachingDays,
        activeTeachingWeeks,
      };
    });
  }, [estimateRows, estimateDraft, startMonth, endMonth, academicYear, calendarDraft]);

  const groupedEstimateRows = useMemo(
    () => groupEstimateRows(dynamicEstimateRows),
    [dynamicEstimateRows]
  );

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

  const handleEstimateEndMonthChange = (mappingId, value) => {
    setEstimateDraft((previous) => ({
      ...previous,
      [mappingId]: {
        ...previous[mappingId],
        expectedEndMonth: value,
      },
    }));
  };

  const handleSaveCalendarClick = async () => {
    await onSaveCalendar(calendarDraft);
  };

  const handleSaveEstimatesClick = async () => {
    const payload = estimateRows.map((row) => {
      const draft = estimateDraft[row.mappingId] || {};
      return {
        mappingId: row.mappingId,
        expectedEndMonth: draft.expectedEndMonth ? Number(draft.expectedEndMonth) : null,
      };
    });
    await onSaveEstimates(payload);
  };

  const handleSaveRangeClick = async () => {
    setIsSavingRange(true);
    if (onSaveAcademicRange) {
      await onSaveAcademicRange(Number(startMonth), Number(endMonth));
    }
    setIsSavingRange(false);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-dark-almostblack/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-light-border rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-sliders text-brand-primary"></i>
              Overview Settings
            </h3>
            <p className="text-sm text-gray-500 font-semibold mt-1">
              Configure academic year boundaries, calendar teaching days, and target book completion pacing.
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

        {/* Navigation Tabs Header */}
        <div className="px-6 border-b border-gray-200 bg-gray-50/70 flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2.5 rounded-t-2xl text-xs font-black transition-all flex items-center gap-2 border-t border-x ${
              activeTab === 'calendar'
                ? 'bg-white text-brand-primary border-gray-200 border-b-transparent shadow-xs -mb-px'
                : 'text-gray-500 hover:text-dark-primary border-transparent'
            }`}
          >
            <i className="fas fa-calendar-days text-xs" />
            Academic Calendar Days
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('target_completion')}
            className={`px-4 py-2.5 rounded-t-2xl text-xs font-black transition-all flex items-center gap-2 border-t border-x ${
              activeTab === 'target_completion'
                ? 'bg-white text-brand-primary border-gray-200 border-b-transparent shadow-xs -mb-px'
                : 'text-gray-500 hover:text-dark-primary border-transparent'
            }`}
          >
            <i className="fas fa-flag-checkered text-xs text-amber-500" />
            Book Target Completion
          </button>
        </div>

        {/* Modal Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* TAB 1: ACADEMIC CALENDAR DAYS */}
          {activeTab === 'calendar' && (
            <>
              {/* Configurable Academic Year Range */}
              <section className="rounded-2xl border border-light-border p-4 sm:p-5 bg-gradient-to-r from-brand-primary/5 via-white to-gray-50">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-sm font-black text-dark-primary flex items-center gap-2">
                      <i className="fas fa-calendar-range text-brand-primary"></i> Academic Year Session Range
                    </h4>
                    <p className="text-[11px] font-bold text-gray-400 mt-1">
                      Set start and end month boundaries for the academic session.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-gray-500">Start:</span>
                      <select
                        value={startMonth}
                        onChange={(e) => setStartMonth(Number(e.target.value))}
                        disabled={!canEdit}
                        className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary outline-none"
                      >
                        {ALL_MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-gray-500">End:</span>
                      <select
                        value={endMonth}
                        onChange={(e) => setEndMonth(Number(e.target.value))}
                        disabled={!canEdit}
                        className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary outline-none"
                      >
                        {ALL_MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveRangeClick}
                      disabled={!canEdit || isSavingRange}
                      className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-black shadow-2xs hover:bg-brand-primary/90 transition-all disabled:opacity-50"
                    >
                      {isSavingRange ? 'Saving...' : 'Save Year Range'}
                    </button>
                  </div>
                </div>
              </section>

              {/* Monthly Calendar Swatches Grid */}
              <section className="rounded-2xl border border-light-border p-4 sm:p-5 bg-light-bg/30 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-black text-dark-primary flex items-center gap-2">
                      <i className="fas fa-calendar-days text-brand-primary"></i> Monthly Working & Teaching Days
                    </h4>
                    <p className="text-[11px] font-bold text-gray-400 mt-1">
                      Click any month swatch to adjust working and teaching days for pacing calculations.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={academicYear}
                      onChange={(event) => onAcademicYearChange(event.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary"
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
                      className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-black text-gray-600 hover:bg-light-bg"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>

                {/* Anticipated Days Card */}
                <div className="flex flex-wrap items-center gap-4 bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                      <i className="fas fa-briefcase" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">
                        Anticipated Working Days ({academicYear})
                      </span>
                      <span className="text-base font-black text-dark-primary">
                        {totalAnticipatedWorkingDays} Days
                      </span>
                    </div>
                  </div>

                  <div className="h-7 w-px bg-gray-200 hidden sm:block" />

                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                      <i className="fas fa-chalkboard-user" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">
                        Anticipated Teaching Days ({academicYear})
                      </span>
                      <span className="text-base font-black text-brand-primary">
                        {totalAnticipatedTeachingDays} Days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Month Swatches */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {calendarDraft.map((row, index) => {
                    const isEditing = activeSwatchIndex === index;
                    const isCustom = row.source === 'database';

                    return (
                      <div
                        key={`${row.year}-${row.month}`}
                        onClick={() => canEdit && setActiveSwatchIndex(isEditing ? null : index)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isEditing
                            ? 'bg-brand-primary/5 border-brand-primary ring-2 ring-brand-primary/20 shadow-md'
                            : isCustom
                              ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-500 hover:shadow-sm'
                              : 'bg-white border-gray-200 hover:border-brand-soft hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-black text-dark-primary">
                              {row.monthLabel} {row.year}
                            </span>
                            {isCustom ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Custom DB Days" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-300" title="Default Days" />
                            )}
                          </div>

                          {!isEditing ? (
                            <div className="space-y-0.5 mt-2">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400 font-bold">Working:</span>
                                <span className="font-extrabold text-gray-700">{row.working_days}d</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400 font-bold">Teaching:</span>
                                <span className="font-extrabold text-brand-primary">{row.teaching_days}d</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                              <div>
                                <label className="block text-[9px] font-bold text-gray-500 uppercase">
                                  Working Days
                                </label>
                                <input
                                  type="text"
                                  value={row.working_days}
                                  onChange={(e) =>
                                    handleCalendarChange(index, 'working_days', e.target.value)
                                  }
                                  className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-gray-500 uppercase">
                                  Teaching Days
                                </label>
                                <input
                                  type="text"
                                  value={row.teaching_days}
                                  onChange={(e) =>
                                    handleCalendarChange(index, 'teaching_days', e.target.value)
                                  }
                                  className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-dark-primary outline-none focus:border-brand-primary"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveCalendarClick}
                    disabled={!canEdit || isSavingCalendar}
                    className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs hover:bg-brand-primary/90"
                  >
                    {isSavingCalendar ? 'Saving Calendar...' : 'Save Calendar Days'}
                  </button>
                </div>
              </section>
            </>
          )}

          {/* TAB 2: BOOK TARGET COMPLETION */}
          {activeTab === 'target_completion' && (
            <section className="rounded-2xl border border-light-border p-4 sm:p-5 bg-gradient-to-b from-white to-gray-50/60 shadow-xs">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200/80 pb-3">
                <div>
                  <h4 className="text-sm font-black text-dark-primary flex items-center gap-2">
                    <i className="fas fa-flag-checkered text-amber-500"></i> Book Target Completion
                  </h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-1">
                    Start month is automatically determined from the first lesson log date or June session start. Select the target completion month for expected pacing calculations.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-extrabold shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <i className="fas fa-play text-[9px]" /> Auto-Start (First Log / Session)
                  </span>
                </div>
              </div>

              <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
                {groupedEstimateRows.map(([className, subjectsForClass]) => (
                  <div
                    key={className}
                    className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                      <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-xs">
                        <i className="fas fa-graduation-cap" />
                      </div>
                      <h5 className="text-sm font-black text-dark-primary">{className}</h5>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(subjectsForClass).map(([subjectName, rows]) => (
                        <div
                          key={subjectName}
                          className="rounded-xl bg-gray-50/70 border border-gray-200/60 p-3.5"
                        >
                          <h6 className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand-primary" />
                            {subjectName}
                          </h6>

                          <div className="space-y-3">
                            {rows.map((row) => {
                              const draft = estimateDraft[row.mappingId] || {};
                              const endM =
                                draft.expectedEndMonth !== undefined
                                  ? draft.expectedEndMonth
                                  : row.expectedEndMonth || '';

                              return (
                                <div
                                  key={row.mappingId}
                                  className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-brand-primary/40 transition-all flex flex-col gap-3"
                                >
                                  {/* Top Row: Book Name & Start/End Badges */}
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-[200px]">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-black text-xs">
                                        <i className="fas fa-book" />
                                      </div>
                                      <div>
                                        <p className="text-xs font-black text-dark-primary">
                                          {row.bookName}
                                        </p>
                                        <span className="text-[10px] font-bold text-gray-400">
                                          Timetable: {row.periodsPerWeek || 0} periods/week
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* Auto-Calculated Start Month Badge */}
                                      {row.hasFirstLessonEntry ? (
                                        <span
                                          className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black flex items-center gap-1.5"
                                          title={`First lesson log date: ${row.firstLessonDate}`}
                                        >
                                          <i className="fas fa-play text-[9px]" />
                                          Start: {row.calculatedStartMonthLabel}
                                        </span>
                                      ) : (
                                        <span
                                          className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-black flex items-center gap-1.5"
                                          title="Remaining time calculated from current month."
                                        >
                                          <i className="fas fa-clock text-[9px]" />
                                          Start: {row.calculatedStartMonthLabel}
                                        </span>
                                      )}

                                      {/* Active Duration & Teaching Days Tag */}
                                      <span className="px-2.5 py-1 rounded-xl bg-brand-primary/10 text-brand-primary font-black text-[11px] border border-brand-primary/20">
                                        {row.activeTeachingDays} Teaching Days (~{row.activeTeachingWeeks} Wks)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Bottom Row: End Month Selector Control */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                                        <i className="fas fa-flag-checkered text-amber-500" />
                                        Target Completion Month:
                                      </label>
                                      <select
                                        value={endM}
                                        onChange={(e) =>
                                          handleEstimateEndMonthChange(row.mappingId, e.target.value)
                                        }
                                        disabled={!canEdit}
                                        className="px-3 py-1.5 rounded-xl border border-gray-300 bg-gray-50 text-xs font-black text-dark-primary outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white cursor-pointer"
                                      >
                                        <option value="">
                                          Full Session ({academicMonthOptions[academicMonthOptions.length - 1]?.label || 'End of Year'})
                                        </option>
                                        {academicMonthOptions.map((m) => (
                                          <option key={m.value} value={m.value}>
                                            {m.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="text-[10px] font-bold text-gray-400">
                                      Pacing Range: {row.calculatedStartMonthLabel} → {endM ? (academicMonthOptions.find(m => m.value === Number(endM))?.label || row.expectedEndMonthLabel) : row.expectedEndMonthLabel}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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
                  className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-black disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs hover:bg-brand-primary/90 transition-all flex items-center gap-2"
                >
                  <i className="fas fa-floppy-disk" />
                  {isSavingEstimates ? 'Saving Target Completion...' : 'Save Target Completion'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademicCalendarModal;
