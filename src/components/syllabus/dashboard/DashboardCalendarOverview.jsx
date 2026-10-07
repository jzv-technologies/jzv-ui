import React, { useMemo } from 'react';

const DashboardCalendarOverview = ({
  academicYear,
  academicYearOptions = [],
  onAcademicYearChange,
  calendarRows = [],
  canEdit = false,
}) => {
  const totalWorkingDays = useMemo(
    () => calendarRows.reduce((sum, row) => sum + (Number(row.working_days) || 0), 0),
    [calendarRows]
  );

  const totalTeachingDays = useMemo(
    () => calendarRows.reduce((sum, row) => sum + (Number(row.teaching_days) || 0), 0),
    [calendarRows]
  );

  const totalActivityDays = useMemo(
    () => calendarRows.reduce((sum, row) => sum + (Number(row.activity_days) || 0), 0),
    [calendarRows]
  );

  const totalHolidays = useMemo(
    () => calendarRows.reduce((sum, row) => sum + (Number(row.holidays) || 0), 0),
    [calendarRows]
  );

  return (
    <div
      className="w-full space-y-5 animate-in fade-in duration-200"
      data-feature="dashboard-calendar-overview"
    >
      {/* ── Top Header Card ── */}
      <div className="bg-white rounded-3xl border border-light-border p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black shadow-2xs shrink-0">
            <i className="fas fa-calendar-days text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                Calendar Overview
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black border border-teal-200/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">
              Monthly breakdown of working days, instructional teaching days, co-curricular activity days, and holidays.
            </p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          <label htmlFor="calendar-overview-ay-select" className="text-xs font-bold text-gray-400">
            Academic Session:
          </label>
          <div className="relative">
            <select
              id="calendar-overview-ay-select"
              value={academicYear}
              onChange={(e) => onAcademicYearChange && onAcademicYearChange(e.target.value)}
              className="appearance-none px-3.5 py-2 pr-9 rounded-xl border border-light-border bg-gray-50/70 hover:bg-white text-xs font-black text-dark-primary cursor-pointer outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-2xs"
            >
              {academicYearOptions.map((option) => (
                <option key={option} value={option}>
                  AY {option}
                </option>
              ))}
            </select>
            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Working Days */}
        <div className="p-4 sm:p-5 rounded-2xl border border-light-border bg-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
            <i className="fas fa-briefcase" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider truncate">
              Working Days
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-700 tracking-tight">
              {totalWorkingDays}{' '}
              <span className="text-xs font-bold text-emerald-600/70">Days</span>
            </span>
          </div>
        </div>

        {/* Teaching Days */}
        <div className="p-4 sm:p-5 rounded-2xl border border-light-border bg-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
            <i className="fas fa-chalkboard-user" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider truncate">
              Teaching Days
            </span>
            <span className="text-lg sm:text-2xl font-black text-indigo-700 tracking-tight">
              {totalTeachingDays}{' '}
              <span className="text-xs font-bold text-indigo-600/70">Days</span>
            </span>
          </div>
        </div>

        {/* Activity Days */}
        <div className="p-4 sm:p-5 rounded-2xl border border-light-border bg-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
            <i className="fas fa-palette" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider truncate">
              Activity Days
            </span>
            <span className="text-lg sm:text-2xl font-black text-violet-700 tracking-tight">
              {totalActivityDays}{' '}
              <span className="text-xs font-bold text-violet-600/70">Days</span>
            </span>
          </div>
        </div>

        {/* Holidays */}
        <div className="p-4 sm:p-5 rounded-2xl border border-light-border bg-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
            <i className="fas fa-umbrella-beach" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider truncate">
              Holidays
            </span>
            <span className="text-lg sm:text-2xl font-black text-rose-700 tracking-tight">
              {totalHolidays}{' '}
              <span className="text-xs font-bold text-rose-600/70">Days</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Monthly Calendar Cards Grid ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-dark-soft flex items-center gap-2">
            <i className="fas fa-calendar text-brand-primary" /> Month-by-Month Schedule
          </h3>
          <span className="text-[11px] font-bold text-gray-400">
            {calendarRows.length} Months in Cycle
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
          {calendarRows.map((row) => {
            const working = Number(row.working_days) || 0;
            const teaching = Number(row.teaching_days) || 0;
            const activity = Number(row.activity_days) || 0;
            const holidays = Number(row.holidays) || 0;
            const total = Number(row.total_days) || 30;

            return (
              <div
                key={`${row.year}-${row.month}`}
                className="p-4 rounded-2xl border border-light-border bg-white shadow-2xs hover:shadow-xs hover:border-brand-primary/30 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-gray-100">
                    <span className="text-xs font-black text-dark-primary group-hover:text-brand-primary transition-colors">
                      {row.monthLabel} {row.year}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-500"
                      title="Synchronized with Academic Calendar"
                    />
                  </div>

                  {/* Day breakdown list */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-gray-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Working:
                      </span>
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                        {working}d
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-gray-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Teaching:
                      </span>
                      <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                        {teaching}d
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-gray-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        Activity:
                      </span>
                      <span className="font-black text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md text-[11px]">
                        {activity}d
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-gray-400 font-bold flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Holidays:
                      </span>
                      <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md text-[11px]">
                        {holidays}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer total */}
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-extrabold text-gray-400">
                  <span>Total Days</span>
                  <span className="text-gray-600 font-black">{total} Days</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardCalendarOverview;
