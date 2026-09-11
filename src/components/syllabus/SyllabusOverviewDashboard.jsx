import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, fetchAllPages } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import ClassSubjectHeatmap from './dashboard/ClassSubjectHeatmap';
import ProgressTrendChart from './dashboard/ProgressTrendChart';
import AttentionRequiredPanel from './dashboard/AttentionRequiredPanel';
import ClassDonutCharts from './dashboard/ClassDonutCharts';
import TeacherSubmissionHeatmap from './dashboard/TeacherSubmissionHeatmap';
import AcademicCalendarModal from './dashboard/AcademicCalendarModal';
import {
  buildAcademicCalendarRows,
  buildAcademicMonths,
  buildAttentionAlerts,
  buildBookWeeklyTrendData,
  buildClassDonutData,
  buildEstimateRows,
  buildHeatmapModel,
  buildOverviewSummary,
  buildPacingRecords,
  buildPeriodsPerWeekMap,
  buildTeacherActivityData,
  buildTeacherSubmissionHeatmap,
  getAcademicYearOptions,
  getCurrentAcademicYearLabel,
  parseAcademicYearLabel,
  getAcademicMonthYear,
} from './dashboard/overviewUtils';

let overviewDataFetchPromise = null;
const teacherHeatmapFetches = new Map();

const getHeatmapDateRange = (range, customStart, customEnd) => {
  if (range === 'custom' && customStart && customEnd && customStart <= customEnd) {
    return { start: customStart, end: customEnd };
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (range === '7d' ? 6 : 29));
  const toDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { start: toDateString(startDate), end: toDateString(endDate) };
};

const SyllabusOverviewDashboard = ({
  role,
  classes = [],
  subjects = [],
  books = [],
  classifications = [],
  bookClasses = [],
  setBookClasses,
  assignments = [],
  teachers = [],
  bookTrackers = [],
  setBookTrackers,
  allLogs = [],
  lessonPlans = [],
  carryForwards = [],
  onOpenClassProgress,
  onHeaderStateChange,
}) => {
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentAcademicYearLabel());
  const [activeSubTab, setActiveSubTab] = useState('class-dashboard');
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [teacherHeatmapRows, setTeacherHeatmapRows] = useState([]);
  const [heatmapRange, setHeatmapRange] = useState('30d');
  const [customHeatmapStart, setCustomHeatmapStart] = useState('');
  const [customHeatmapEnd, setCustomHeatmapEnd] = useState('');
  const [loadingAuxData, setLoadingAuxData] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isSavingEstimates, setIsSavingEstimates] = useState(false);
  const [calendarFallbackReason, setCalendarFallbackReason] = useState('');
  // Configurable academic year range (start/end month numbers)
  const [academicStartMonth, setAcademicStartMonth] = useState(6);
  const [academicEndMonth, setAcademicEndMonth] = useState(5);

  const [periods, setPeriods] = useState([]);
  const heatmapDateRange = useMemo(
    () => getHeatmapDateRange(heatmapRange, customHeatmapStart, customHeatmapEnd),
    [heatmapRange, customHeatmapStart, customHeatmapEnd]
  );

  const fetchOverviewData = useCallback(async () => {
    setLoadingAuxData(true);

    if (!overviewDataFetchPromise) {
      overviewDataFetchPromise = Promise.all([
        supabase
          .from('academic_calendar')
          .select('id, year, month, working_days, teaching_days, ay')
          .order('year', { ascending: true })
          .order('month', { ascending: true }),
        supabase
          .from('timetable_slots')
          .select('id, class_id, subject_id, teacher_id, day, period_id'),
        fetchAllPages('trk_daily_teacher_progress', '*'),
        supabase
          .from('admin_configruation')
          .select('val')
          .eq('key', 'academic_year_range')
          .maybeSingle(),
        supabase.from('periods').select('*').order('period_number', { ascending: true }),
      ]).finally(() => {
        overviewDataFetchPromise = null;
      });
    }

    const [calendarResult, timetableResult, dailyLogsResult, configResult, periodsResult] =
      await overviewDataFetchPromise;

    if (calendarResult.error) {
      console.warn('Academic calendar unavailable:', calendarResult.error.message);
      setCalendarEntries([]);
      setCalendarFallbackReason(
        'Academic calendar defaults are in use until the SQL migration is applied.'
      );
    } else {
      setCalendarEntries(calendarResult.data || []);
      setCalendarFallbackReason('');
    }

    if (timetableResult.error) {
      console.warn('Failed to load timetable slots:', timetableResult.error.message);
      setTimetableSlots([]);
      showToast('Overview loaded without timetable pacing data.', 'warning');
    } else {
      setTimetableSlots(timetableResult.data || []);
    }

    if (dailyLogsResult.error) {
      console.warn('Failed to load teacher activity logs:', dailyLogsResult.error.message);
      setDailyLogs([]);
    } else {
      setDailyLogs(dailyLogsResult.data || []);
    }

    if (!periodsResult.error && periodsResult.data && periodsResult.data.length > 0) {
      setPeriods(periodsResult.data);
    } else {
      const raw = localStorage.getItem('jzv_timetable_local_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.periods && Array.isArray(parsed.periods)) {
            setPeriods(parsed.periods);
          }
        } catch (e) {}
      }
    }

    if (!configResult.error && configResult.data?.val) {
      const cfg = configResult.data.val;
      const rawStart =
        typeof cfg.start_month === 'object' ? cfg.start_month?.start_month : cfg.start_month;
      const rawEnd = typeof cfg.end_month === 'object' ? cfg.end_month?.end_month : cfg.end_month;
      const sm = Number(rawStart);
      const em = Number(rawEnd);
      if (Number.isFinite(sm) && sm >= 1 && sm <= 12) setAcademicStartMonth(sm);
      if (Number.isFinite(em) && em >= 1 && em <= 12) setAcademicEndMonth(em);
    }

    setLoadingAuxData(false);
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  useEffect(() => {
    const { start, end } = heatmapDateRange;
    const rangeKey = `${start}:${end}`;
    let isCurrent = true;

    if (!teacherHeatmapFetches.has(rangeKey)) {
      const request = fetchAllPages('heatmap_teacher_tracker', '*', (query) =>
        query.gte('date', start).lte('date', end)
      ).finally(() => {
        teacherHeatmapFetches.delete(rangeKey);
      });
      teacherHeatmapFetches.set(rangeKey, request);
    }

    teacherHeatmapFetches.get(rangeKey).then((result) => {
      if (!isCurrent) return;
      if (result.error) {
        console.warn('Failed to load heatmap_teacher_tracker:', result.error.message);
        setTeacherHeatmapRows([]);
      } else {
        setTeacherHeatmapRows(result.data || []);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [heatmapDateRange]);

  const academicMonths = useMemo(
    () => buildAcademicMonths(academicStartMonth, academicEndMonth),
    [academicStartMonth, academicEndMonth]
  );

  const academicYearOptions = useMemo(
    () => getAcademicYearOptions(calendarEntries),
    [calendarEntries]
  );

  useEffect(() => {
    if (academicYearOptions.includes(selectedAcademicYear)) return;
    setSelectedAcademicYear(academicYearOptions[0] || getCurrentAcademicYearLabel());
  }, [academicYearOptions, selectedAcademicYear]);

  // Derive academic year start date for adherence scoping
  const academicYearStartDate = useMemo(() => {
    const startYear = parseAcademicYearLabel(selectedAcademicYear);
    const startMonthNum = Number(academicStartMonth) || 6;
    const startYear4 = getAcademicMonthYear(startYear, startMonthNum);
    return new Date(startYear4, startMonthNum - 1, 1);
  }, [selectedAcademicYear, academicStartMonth]);

  const calendarRows = useMemo(
    () =>
      buildAcademicCalendarRows(
        selectedAcademicYear,
        calendarEntries,
        academicStartMonth,
        academicEndMonth
      ),
    [selectedAcademicYear, calendarEntries, academicStartMonth, academicEndMonth]
  );

  const periodsPerWeekMap = useMemo(() => buildPeriodsPerWeekMap(timetableSlots), [timetableSlots]);

  const pacingRecords = useMemo(
    () =>
      buildPacingRecords({
        bookClasses,
        bookTrackers,
        books,
        subjects,
        classes,
        calendarRows,
        periodsPerWeekMap,
        allLogs,
        academicStartMonth,
        academicEndMonth,
      }),
    [
      bookClasses,
      bookTrackers,
      books,
      subjects,
      classes,
      calendarRows,
      periodsPerWeekMap,
      allLogs,
      academicStartMonth,
      academicEndMonth,
    ]
  );

  const teacherActivityData = useMemo(
    () =>
      buildTeacherActivityData({
        teachers,
        dailyLogs,
        lessonPlans,
        carryForwards,
        assignments,
        academicYearStartDate,
      }),
    [teachers, dailyLogs, lessonPlans, carryForwards, assignments, academicYearStartDate]
  );

  const teacherSubmissionHeatmapData = useMemo(
    () =>
      buildTeacherSubmissionHeatmap({
        teachers,
        teacherHeatmapRows,
        dailyLogs,
        allLogs,
        timetableSlots,
        assignments,
        classes,
        subjects,
        books,
        periods,
        startDate: heatmapDateRange.start,
        endDate: heatmapDateRange.end,
      }),
    [
      teachers,
      teacherHeatmapRows,
      dailyLogs,
      allLogs,
      timetableSlots,
      assignments,
      classes,
      subjects,
      books,
      periods,
      heatmapDateRange,
    ]
  );

  const heatmap = useMemo(
    () =>
      buildHeatmapModel({ classes, subjects, classifications, pacingRecords, assignments, books }),
    [classes, subjects, classifications, pacingRecords, assignments, books]
  );

  const bookWeeklyTrendData = useMemo(
    () =>
      buildBookWeeklyTrendData({
        classes,
        books,
        subjects,
        bookClasses,
        bookTrackers,
        allLogs,
        pacingRecords,
        calendarRows,
        academicStartMonth,
        academicEndMonth,
        weeks: 4,
      }),
    [
      classes,
      books,
      subjects,
      bookClasses,
      bookTrackers,
      allLogs,
      pacingRecords,
      calendarRows,
      academicStartMonth,
      academicEndMonth,
    ]
  );

  const alerts = useMemo(
    () =>
      buildAttentionAlerts({
        pacingRecords,
        teachers,
        assignments,
        carryForwards,
        dailyLogs,
        lessonPlans,
      }),
    [pacingRecords, teachers, assignments, carryForwards, dailyLogs, lessonPlans]
  );

  const classDonutData = useMemo(
    () => buildClassDonutData({ classes, bookTrackers, lessonPlans }),
    [classes, bookTrackers, lessonPlans]
  );

  const estimateRows = useMemo(
    () =>
      buildEstimateRows({
        bookClasses,
        bookTrackers,
        books,
        subjects,
        classes,
        periodsPerWeekMap,
        allLogs,
        calendarRows,
        academicStartMonth,
        academicEndMonth,
      }),
    [
      bookClasses,
      bookTrackers,
      books,
      subjects,
      classes,
      periodsPerWeekMap,
      allLogs,
      calendarRows,
      academicStartMonth,
      academicEndMonth,
    ]
  );

  const handleSaveCalendar = useCallback(async (rows) => {
    setIsSavingCalendar(true);

    const payload = rows.map((row) => ({
      year: row.year,
      month: row.month,
      working_days: Number(row.working_days) || 0,
      teaching_days: Number(row.teaching_days) || 0,
      ay: row.ay || selectedAcademicYear || '2026-27',
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('academic_calendar')
      .upsert(payload, { onConflict: 'year,month' })
      .select('*');

    setIsSavingCalendar(false);

    if (error) {
      showToast(`Failed to save calendar: ${error.message}`, 'error');
      return false;
    }

    setCalendarEntries((previous) => {
      const remaining = previous.filter(
        (entry) => !payload.some((item) => item.year === entry.year && item.month === entry.month)
      );
      return [...remaining, ...(data || payload)];
    });
    setCalendarFallbackReason('');
    showToast('Academic calendar saved.', 'success');
    return true;
  }, []);

  const handleSaveEstimates = useCallback(
    async (rows) => {
      setIsSavingEstimates(true);

      const payload = rows.map((row) => ({
        class_id: row.classId,
        book_id: row.bookId,
        expected_end_date: row.expectedEndDate || row.expectedEndMonth || null,
        ...(row.expectedStartDate ? { expected_start_date: row.expectedStartDate } : {}),
        ...(row.expectedPercentage !== undefined
          ? { expected_percentage: row.expectedPercentage }
          : {}),
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('trk_book_level_progress')
        .upsert(payload, { onConflict: 'class_id,book_id' })
        .select('*');

      setIsSavingEstimates(false);

      if (error) {
        showToast(`Failed to save completion targets: ${error.message}`, 'error');
        return false;
      }

      if (typeof setBookTrackers === 'function') {
        const savedMap = new Map(
          (data || payload).map((entry) => [`${entry.class_id}-${entry.book_id}`, entry])
        );
        setBookTrackers((previous) =>
          (previous || []).map((item) => {
            const saved = savedMap.get(`${item.class_id}-${item.book_id}`);
            return saved
              ? {
                  ...item,
                  expected_end_date: saved.expected_end_date ?? saved.expected_end_month,
                  expected_start_date: saved.expected_start_date ?? saved.expected_start_month,
                  expected_percentage: saved.expected_percentage ?? item.expected_percentage,
                }
              : item;
          })
        );
      }

      showToast('Book target completion dates saved.', 'success');
      return true;
    },
    [setBookTrackers]
  );

  const handleSaveAcademicRange = useCallback(async (start, end) => {
    let startNum = typeof start === 'object' ? Number(start?.start_month) : Number(start);
    let endNum = typeof start === 'object' ? Number(start?.end_month) : Number(end);
    if (!Number.isFinite(startNum) || startNum < 1 || startNum > 12) startNum = 6;
    if (!Number.isFinite(endNum) || endNum < 1 || endNum > 12) endNum = 5;

    const { error } = await supabase
      .from('admin_configruation')
      .upsert(
        { key: 'academic_year_range', val: { start_month: startNum, end_month: endNum } },
        { onConflict: 'key' }
      );
    if (error) {
      showToast(`Failed to save academic year range: ${error.message}`, 'error');
      return false;
    }
    setAcademicStartMonth(startNum);
    setAcademicEndMonth(endNum);
    showToast('Academic year range saved.', 'success');
    return true;
  }, []);

  useEffect(() => {
    if (typeof onHeaderStateChange === 'function') {
      onHeaderStateChange({
        selectedAcademicYear,
        setSelectedAcademicYear,
        academicYearOptions,
        openSettings: () => setIsSettingsOpen(true),
      });
    }
  }, [
    selectedAcademicYear,
    setSelectedAcademicYear,
    academicYearOptions,
    setIsSettingsOpen,
    onHeaderStateChange,
  ]);

  const canEditSettings = role === 'admin' || role === 'management';

  const subTabs = [
    {
      key: 'class-dashboard',
      label: 'Class Dashboard',
      shortLabel: 'Class Dashboard',
      icon: 'fa-chart-pie',
    },
    {
      key: 'subject-heatmap',
      label: 'Subject Heatmap',
      shortLabel: 'Subject Heatmap',
      icon: 'fa-table-cells',
    },
    {
      key: 'tracker-heatmap',
      label: 'Tracker Heatmap',
      shortLabel: 'Tracker Heatmap',
      icon: 'fa-clipboard-user',
    },
    {
      key: 'weekly-progress-trend',
      label: 'Weekly Book Progress Trend',
      shortLabel: 'Weekly Trend',
      icon: 'fa-chart-line',
    },
    {
      key: 'attention-required',
      label: 'Attention Required',
      shortLabel: 'Attention',
      icon: 'fa-triangle-exclamation',
      badge: alerts?.length > 0 ? alerts.length : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar Fallback Warning */}
      {calendarFallbackReason && (
        <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 inline-flex items-center gap-2">
          <i className="fas fa-triangle-exclamation text-amber-600"></i>
          {calendarFallbackReason}
        </div>
      )}

      {/* Mobile sub-view selector */}
      <div className="md:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={activeSubTab}
            onChange={(event) => setActiveSubTab(event.target.value)}
            className="w-full appearance-none bg-white border border-light-border rounded-xl px-3.5 py-2 pr-8 text-xs font-extrabold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
          >
            {subTabs.map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label}
                {tab.badge ? ` (${tab.badge})` : ''}
              </option>
            ))}
          </select>
          <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-dark-soft pointer-events-none" />
        </div>
        {role === 'management' && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Academic Calendar and Book Targets"
            aria-label="Academic Calendar and Book Targets"
            className="shrink-0 w-9 h-9 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:bg-light-bg transition-colors inline-flex items-center justify-center"
          >
            <i className="fas fa-gear text-sm"></i>
          </button>
        )}
      </div>

      {/* Desktop sub-view tabs */}
      <div className="hidden md:flex bg-white border border-light-border p-1.5 sm:p-2 rounded-2xl shadow-sm items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSubTab(tab.key)}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === tab.key
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-dark-soft hover:text-dark-primary hover:bg-light-bg'
            }`}
          >
            <i className={`fas ${tab.icon} text-xs`}></i>
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeSubTab === tab.key
                    ? 'bg-white text-brand-primary'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
        {role === 'management' && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Academic Calendar and Book Targets"
            aria-label="Academic Calendar and Book Targets"
            className="ml-auto shrink-0 w-9 h-9 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:bg-light-bg transition-colors inline-flex items-center justify-center"
          >
            <i className="fas fa-gear text-sm"></i>
          </button>
        )}
      </div>

      {/* Active Sub-View Content */}
      <div className="w-full">
        {activeSubTab === 'tracker-heatmap' && (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="inline-flex rounded-lg border border-light-border bg-white p-1 shadow-sm">
              {[
                ['7d', '7 days'],
                ['30d', '30 days'],
                ['custom', 'Custom'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHeatmapRange(value)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    heatmapRange === value
                      ? 'bg-brand-primary text-white'
                      : 'text-dark-soft hover:bg-light-bg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {heatmapRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customHeatmapStart}
                  onChange={(event) => setCustomHeatmapStart(event.target.value)}
                  aria-label="Heatmap start date"
                  className="h-9 rounded-lg border border-light-border bg-white px-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <input
                  type="date"
                  value={customHeatmapEnd}
                  onChange={(event) => setCustomHeatmapEnd(event.target.value)}
                  aria-label="Heatmap end date"
                  className="h-9 rounded-lg border border-light-border bg-white px-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </>
            )}
          </div>
        )}
        {activeSubTab === 'class-dashboard' && <ClassDonutCharts classDonutData={classDonutData} />}

        {activeSubTab === 'subject-heatmap' && (
          <ClassSubjectHeatmap heatmap={heatmap} onCellClick={onOpenClassProgress} />
        )}

        {activeSubTab === 'tracker-heatmap' && (
          <TeacherSubmissionHeatmap heatmapData={teacherSubmissionHeatmapData} />
        )}

        {activeSubTab === 'weekly-progress-trend' && (
          <ProgressTrendChart
            classes={classes}
            bookWeeklyData={bookWeeklyTrendData}
            loading={loadingAuxData}
          />
        )}

        {activeSubTab === 'attention-required' && <AttentionRequiredPanel alerts={alerts} />}
      </div>

      {/* Settings Modal */}
      <AcademicCalendarModal
        isOpen={isSettingsOpen}
        canEdit={canEditSettings}
        onClose={() => setIsSettingsOpen(false)}
        academicYear={selectedAcademicYear}
        academicYearOptions={academicYearOptions}
        onAcademicYearChange={setSelectedAcademicYear}
        calendarRows={calendarRows}
        estimateRows={estimateRows}
        onSaveCalendar={handleSaveCalendar}
        onSaveEstimates={handleSaveEstimates}
        isSavingCalendar={isSavingCalendar}
        isSavingEstimates={isSavingEstimates}
        academicStartMonth={academicStartMonth}
        academicEndMonth={academicEndMonth}
        onSaveAcademicRange={handleSaveAcademicRange}
        academicMonths={academicMonths}
      />
    </div>
  );
};

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SyllabusOverviewDashboard caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 text-center space-y-3 shadow-sm my-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-lg font-black">
            <i className="fas fa-triangle-exclamation" />
          </div>
          <h4 className="text-base font-black text-red-900">
            Overview Dashboard Encountered an Error
          </h4>
          <p className="text-xs font-semibold text-red-700 max-w-xl mx-auto">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-sm transition-all"
          >
            Retry Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const SafeSyllabusOverviewDashboard = (props) => (
  <DashboardErrorBoundary>
    <SyllabusOverviewDashboard {...props} />
  </DashboardErrorBoundary>
);

export default SafeSyllabusOverviewDashboard;
