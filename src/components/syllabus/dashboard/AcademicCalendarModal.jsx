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

  const totalAnticipatedActivityDays = useMemo(
    () => calendarDraft.reduce((sum, row) => sum + (Number(row.activity_days) || 0), 0),
    [calendarDraft]
  );

  const totalAnticipatedHolidays = useMemo(
    () => calendarDraft.reduce((sum, row) => sum + (Number(row.holidays) || 0), 0),
    [calendarDraft]
  );

  const currentAcademicMonths = useMemo(
    () => buildAcademicMonths(startMonth, endMonth),
    [startMonth, endMonth]
  );

  const academicMonthOptions = useMemo(() => {
    const startYear = parseAcademicYearLabel(academicYear);
    return currentAcademicMonths.map((mObj) => {
      const m = typeof mObj === 'object' ? mObj.month : mObj;
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
      const rawEndVal =
        draft && draft.expectedEndMonth !== undefined
          ? draft.expectedEndMonth
          : (row.expectedEndDate || row.expectedEndMonth);

      const expectedEndMonthNum =
        typeof rawEndVal === 'string' && rawEndVal.includes('-')
          ? new Date(rawEndVal).getMonth() + 1
          : rawEndVal
            ? Number(rawEndVal)
            : null;

      const calculatedStartMonth = row.calculatedStartMonth || startMonth;
      const effectiveEndMonth = expectedEndMonthNum || endMonth;

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
      const startMonthObj = ALL_MONTHS.find((item) => item.value === Number(calculatedStartMonth));
      const startMonthName = startMonthObj?.label ? startMonthObj.label.slice(0, 3) : `M${calculatedStartMonth}`;
      const startMonthFullLabel = `${startMonthName} ${startMonthYear}`;

      const endMonthYear = getAcademicMonthYear(startYear, effectiveEndMonth);
      const endMonthObj = ALL_MONTHS.find((item) => item.value === Number(effectiveEndMonth));
      const endMonthName = endMonthObj?.label ? endMonthObj.label.slice(0, 3) : `M${effectiveEndMonth}`;
      const endMonthFullLabel = `${endMonthName} ${endMonthYear}`;

      return {
        ...row,
        calculatedStartMonth,
        calculatedStartMonthLabel: startMonthFullLabel,
        expectedEndMonth: rawEndVal || null,
        expectedEndMonthNum,
        expectedEndMonthLabel: endMonthFullLabel,
        activeWindowMonths,
        activeTeachingDays,
        activeTeachingWeeks,
      };
    });
  }, [academicYear, estimateRows, estimateDraft, startMonth, endMonth, calendarDraft]);

  const groupedEstimateRows = useMemo(
    () => groupEstimateRows(dynamicEstimateRows),
    [dynamicEstimateRows]
  );

  const handleCalendarChange = (index, field, value) => {
    const numericValue = Math.max(0, Number(value) || 0);
    setCalendarDraft((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: numericValue,
              source: 'database',
            }
          : row
      )
    );
  };

  const handleResetDefaults = () => {
    setCalendarDraft((previous) =>
      previous.map((row) => ({
        ...row,
        working_days: DEFAULT_WORKING_DAYS,
        teaching_days: DEFAULT_TEACHING_DAYS,
        source: 'default',
      }))
    );
  };

  const handleEstimateEndMonthChange = (mappingId, value) => {
    setEstimateDraft((previous) => ({
      ...previous,
      [mappingId]: {
        expectedEndMonth: value ? Number(value) : null,
      },
    }));
  };

  const handleSaveCalendarClick = async () => {
    const success = await onSaveCalendar(calendarDraft);
    if (success) setActiveSwatchIndex(null);
  };

  const handleSaveEstimatesClick = async () => {
    const startYear = parseAcademicYearLabel(academicYear);
    const payload = dynamicEstimateRows.map((row) => {
      let endMonthDate = null;
      const endM = row.expectedEndMonthNum;
      if (endM) {
        const y = getAcademicMonthYear(startYear, endM);
        const lastDay = new Date(y, endM, 0).getDate();
        endMonthDate = `${y}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }

      return {
        mappingId: row.mappingId,
        trackerId: row.trackerId,
        classId: row.classId,
        bookId: row.bookId,
        expectedEndDate: endMonthDate,
        expectedEndMonth: endMonthDate,
      };
    });
    await onSaveEstimates(payload);
  };

  const handleSaveRangeClick = async () => {
    if (!onSaveAcademicRange) return;
    setIsSavingRange(true);
    await onSaveAcademicRange({ start_month: startMonth, end_month: endMonth });
    setIsSavingRange(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-dark-almostblack/45 backdrop-blur-xs">
      <div className="w-full max-w-5xl rounded-3xl border border-light-border bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-light-border px-6 py-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black">
              <i className="fas fa-sliders" />
            </div>
            <div>
              <h3 className="text-base font-black text-dark-primary">Overview Settings</h3>
              <p className="text-xs font-bold text-gray-400">
                Configure academic year calendar, teaching days, and target pacing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-light-border text-gray-400 hover:text-dark-primary hover:bg-light-bg flex items-center justify-center transition-colors"
          >
            <i className="fas fa-xmark text-base" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'calendar'
                ? 'bg-white text-brand-primary shadow-xs border border-gray-200/80'
                : 'text-gray-500 hover:text-dark-primary hover:bg-white/60'
            }`}
          >
            <i className="fas fa-calendar-days text-[11px]" />
            Academic Calendar & Year Range
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('target_completion')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'target_completion'
                ? 'bg-white text-brand-primary shadow-xs border border-gray-200/80'
                : 'text-gray-500 hover:text-dark-primary hover:bg-white/60'
            }`}
          >
            <i className="fas fa-flag-checkered text-[11px] text-amber-500" />
            Book Target Completion
            <span className="ml-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
              {estimateRows.length}
            </span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'calendar' && (
            <>
              <section className="rounded-2xl border border-light-border p-4 bg-gray-50/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-dark-primary flex items-center gap-2">
                    <i className="fas fa-calendar-alt text-brand-primary" /> Academic Year Range
                  </h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                    Define the starting and ending months for your institution's academic cycle.
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
              </section>

              <section className="rounded-2xl border border-light-border p-4 sm:p-5 bg-light-bg/30 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-black text-dark-primary flex items-center gap-2">
                      <i className="fas fa-calendar-days text-brand-primary"></i> Monthly Working & Teaching Days
                    </h4>
                    <p className="text-[11px] font-bold text-gray-400 mt-1">
                      Working and teaching days are managed in the Academic Calendar and automatically synchronized here.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={academicYear}
                      onChange={(event) => onAcademicYearChange(event.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary cursor-pointer outline-none"
                    >
                      {academicYearOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-extrabold border border-gray-200/80 flex items-center gap-1.5">
                      <i className="fas fa-lock text-[9px] text-gray-400" /> Read-Only
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm shrink-0">
                      <i className="fas fa-briefcase" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">
                        Working Days
                      </span>
                      <span className="text-sm sm:text-base font-black text-emerald-700">
                        {totalAnticipatedWorkingDays} Days
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                      <i className="fas fa-chalkboard-user" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">
                        Teaching Days
                      </span>
                      <span className="text-sm sm:text-base font-black text-indigo-700">
                        {totalAnticipatedTeachingDays} Days
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-black text-sm shrink-0">
                      <i className="fas fa-palette" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">
                        Activity Days
                      </span>
                      <span className="text-sm sm:text-base font-black text-violet-700">
                        {totalAnticipatedActivityDays} Days
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                      <i className="fas fa-umbrella-beach" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">
                        Holidays
                      </span>
                      <span className="text-sm sm:text-base font-black text-rose-700">
                        {totalAnticipatedHolidays} Days
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {calendarDraft.map((row) => (
                    <div
                      key={`${row.year}-${row.month}`}
                      className="p-3 rounded-2xl border border-gray-200/90 bg-white shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-xs font-black text-dark-primary">
                            {row.monthLabel} {row.year}
                          </span>
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-500"
                            title="Synced with Academic Calendar"
                          />
                        </div>

                        <div className="space-y-1 mt-2">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold">Working:</span>
                            <span className="font-extrabold text-emerald-700">{row.working_days || 0}d</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold">Teaching:</span>
                            <span className="font-extrabold text-indigo-700">{row.teaching_days || 0}d</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold">Activity:</span>
                            <span className="font-extrabold text-violet-700">{row.activity_days || 0}d</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-bold">Holidays:</span>
                            <span className="font-extrabold text-rose-700">{row.holidays || 0}d</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'target_completion' && (
            <section className="rounded-2xl border border-light-border p-4 sm:p-5 bg-gradient-to-b from-white to-gray-50/60 shadow-xs">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200/80 pb-3">
                <div>
                  <h4 className="text-sm font-black text-dark-primary flex items-center gap-2">
                    <i className="fas fa-flag-checkered text-amber-500"></i> Book Target Completion
                  </h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-1">
                    Start month is automatically determined from first lesson log or session start. Select target completion month for pacing calculations.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-extrabold shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <i className="fas fa-play text-[9px]" /> Auto-Start (First Log / Session)
                  </span>
                </div>
              </div>

              <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
                {groupedEstimateRows.map(([className, subjectsForClass]) => (
                  <div
                    key={className}
                    className="rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-gray-100">
                      <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-xs">
                        <i className="fas fa-graduation-cap text-[11px]" />
                      </div>
                      <h5 className="text-xs font-black text-dark-primary">{className}</h5>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(subjectsForClass).map(([subjectName, rows]) => (
                        <div
                          key={subjectName}
                          className="rounded-xl bg-gray-50/70 border border-gray-200/60 p-2.5"
                        >
                          <h6 className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                            {subjectName}
                          </h6>

                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {rows.map((row) => {
                              const draft = estimateDraft[row.mappingId] || {};
                              const endM =
                                draft.expectedEndMonth !== undefined
                                  ? draft.expectedEndMonth
                                  : row.expectedEndMonthNum || '';

                              const finalMonthLabel =
                                academicMonthOptions[academicMonthOptions.length - 1]?.label ||
                                'End of Year';

                              const effectiveEndMonthLabel = endM
                                ? academicMonthOptions.find((m) => m.value === Number(endM))?.label ||
                                  row.expectedEndMonthLabel
                                : finalMonthLabel;

                              return (
                                <div
                                  key={row.mappingId}
                                  className="p-3 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-brand-primary/40 hover:shadow-xs transition-all flex flex-col justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-black">
                                          <i className="fas fa-book" />
                                        </div>
                                        <p
                                          className="text-xs font-black text-dark-primary truncate"
                                          title={row.bookName}
                                        >
                                          {row.bookName}
                                        </p>
                                      </div>
                                      <span className="text-[9px] font-extrabold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                        {row.periodsPerWeek || 0} p/w
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                      <span
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 ${
                                          row.hasFirstLessonEntry
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}
                                        title={
                                          row.hasFirstLessonEntry
                                            ? `First lesson log: ${row.firstLessonDate}`
                                            : 'Auto-calculated from session start'
                                        }
                                      >
                                        <i
                                          className={`fas ${
                                            row.hasFirstLessonEntry ? 'fa-play' : 'fa-clock'
                                          } text-[8px]`}
                                        />
                                        {row.calculatedStartMonthLabel}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary font-extrabold text-[10px]">
                                        {row.activeTeachingDays}d (~{row.activeTeachingWeeks}w)
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-gray-100 space-y-1">
                                    <label className="block text-[10px] font-black text-gray-600">
                                      Target Completion:
                                    </label>
                                    <select
                                      value={endM}
                                      onChange={(e) =>
                                        handleEstimateEndMonthChange(row.mappingId, e.target.value)
                                      }
                                      disabled={!canEdit}
                                      className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-gray-50 text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white cursor-pointer"
                                    >
                                      <option value="">
                                        Full Session ({finalMonthLabel})
                                      </option>
                                      {academicMonthOptions.map((m) => (
                                        <option key={m.value} value={m.value}>
                                          {m.label}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="text-[9px] font-semibold text-gray-400 truncate">
                                      {row.calculatedStartMonthLabel} → {effectiveEndMonthLabel}
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
