import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';
import OverviewKPICards from './OverviewKPICards';
import ClassSubjectHeatmap from './ClassSubjectHeatmap';
import ProgressTrendChart from './ProgressTrendChart';
import AttentionRequiredPanel from './AttentionRequiredPanel';
import ClassDonutCharts from './ClassDonutCharts';
import TeacherActivityChart from './TeacherActivityChart';
import AcademicCalendarModal from './AcademicCalendarModal';
import {
  buildAcademicCalendarRows,
  buildAttentionAlerts,
  buildClassDonutData,
  buildEstimateRows,
  buildHeatmapModel,
  buildOverviewSummary,
  buildPacingRecords,
  buildPeriodsPerWeekMap,
  buildTeacherActivityData,
  buildTrendData,
  getAcademicYearOptions,
  getCurrentAcademicYearLabel,
} from './overviewUtils';

const VIEW_OPTIONS = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'weeks', label: 'x-Weeks' },
  { key: 'months', label: 'x-Months' },
];

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
  lessonPlans = [],
  carryForwards = [],
  onOpenClassProgress,
}) => {
  const [viewMode, setViewMode] = useState('monthly');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentAcademicYearLabel());
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [loadingAuxData, setLoadingAuxData] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isSavingEstimates, setIsSavingEstimates] = useState(false);
  const [calendarFallbackReason, setCalendarFallbackReason] = useState('');

  const fetchOverviewData = useCallback(async () => {
    setLoadingAuxData(true);

    const [calendarResult, timetableResult, dailyLogsResult] = await Promise.all([
      supabase
        .from('academic_calendar')
        .select('*')
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
      supabase
        .from('timetable_slots')
        .select('id, class_id, subject_id, teacher_id, day, period_id'),
      supabase
        .from('trk_daily_teacher_progress')
        .select('id, progress_id, teacher_id, date, current_status, progress, created_at'),
    ]);

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

    setLoadingAuxData(false);
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const academicYearOptions = useMemo(
    () => getAcademicYearOptions(calendarEntries),
    [calendarEntries]
  );

  useEffect(() => {
    if (academicYearOptions.includes(selectedAcademicYear)) return;
    setSelectedAcademicYear(academicYearOptions[0] || getCurrentAcademicYearLabel());
  }, [academicYearOptions, selectedAcademicYear]);

  const calendarRows = useMemo(
    () => buildAcademicCalendarRows(selectedAcademicYear, calendarEntries),
    [selectedAcademicYear, calendarEntries]
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
      }),
    [bookClasses, bookTrackers, books, subjects, classes, calendarRows, periodsPerWeekMap]
  );

  const summary = useMemo(
    () => buildOverviewSummary({ pacingRecords, dailyLogs, carryForwards }),
    [pacingRecords, dailyLogs, carryForwards]
  );

  const heatmap = useMemo(
    () => buildHeatmapModel({ classes, subjects, classifications, pacingRecords }),
    [classes, subjects, classifications, pacingRecords]
  );

  const trendData = useMemo(
    () => buildTrendData({ viewMode, calendarRows, lessonPlans, classifications, pacingRecords }),
    [viewMode, calendarRows, lessonPlans, classifications, pacingRecords]
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
    () => buildClassDonutData({ classes, bookTrackers }),
    [classes, bookTrackers]
  );

  const teacherActivityData = useMemo(
    () =>
      buildTeacherActivityData({
        teachers,
        dailyLogs,
        lessonPlans,
        carryForwards,
        assignments,
      }),
    [teachers, dailyLogs, lessonPlans, carryForwards, assignments]
  );

  const estimateRows = useMemo(
    () => buildEstimateRows({ bookClasses, books, subjects, classes, periodsPerWeekMap }),
    [bookClasses, books, subjects, classes, periodsPerWeekMap]
  );

  const handleSaveCalendar = useCallback(async (rows) => {
    setIsSavingCalendar(true);

    const payload = rows.map((row) => ({
      year: row.year,
      month: row.month,
      working_days: Number(row.working_days) || 0,
      teaching_days: Number(row.teaching_days) || 0,
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
        id: row.mappingId,
        estimated_periods: row.estimatedPeriods === '' ? null : Number(row.estimatedPeriods),
      }));

      const { data, error } = await supabase.from('map_class_books').upsert(payload).select('*');

      setIsSavingEstimates(false);

      if (error) {
        showToast(`Failed to save estimates: ${error.message}`, 'error');
        return false;
      }

      if (typeof setBookClasses === 'function') {
        const savedMap = new Map((data || payload).map((entry) => [String(entry.id), entry]));
        setBookClasses((previous) =>
          previous.map((item) => {
            const saved = savedMap.get(String(item.id));
            return saved ? { ...item, estimated_periods: saved.estimated_periods } : item;
          })
        );
      }

      showToast('Book period estimates saved.', 'success');
      return true;
    },
    [setBookClasses]
  );

  const canEditSettings = role === 'admin' || role === 'management';

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-gauge-high text-brand-primary"></i>
              Executive Overview
            </h2>
            <p className="text-sm text-gray-500 font-semibold mt-1">
              Completion, pacing, activity, and attention signals across the syllabus program.
            </p>
            {calendarFallbackReason && (
              <p className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                <i className="fas fa-triangle-exclamation"></i>
                {calendarFallbackReason}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedAcademicYear}
              onChange={(event) => setSelectedAcademicYear(event.target.value)}
              className="px-3 py-2 rounded-xl border border-light-border bg-white text-sm font-bold text-dark-primary"
            >
              {academicYearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <div className="bg-light-lbg border border-light-border p-1 rounded-2xl flex items-center gap-1">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setViewMode(option.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${viewMode === option.key ? 'bg-brand-primary text-white shadow-sm' : 'text-gray-500 hover:text-dark-primary'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-2 rounded-xl border border-light-border bg-white text-sm font-bold text-dark-primary hover:bg-light-bg transition-colors inline-flex items-center gap-2"
            >
              <i className="fas fa-gear text-brand-primary"></i>
              Settings
            </button>
          </div>
        </div>
      </div>

      <OverviewKPICards summary={summary} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] gap-4 items-start">
        <ClassSubjectHeatmap heatmap={heatmap} onCellClick={onOpenClassProgress} />
        <AttentionRequiredPanel alerts={alerts} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] gap-4 items-start">
        <ProgressTrendChart trendData={trendData} viewMode={viewMode} loading={loadingAuxData} />
        <TeacherActivityChart teacherActivityData={teacherActivityData} />
      </div>

      <ClassDonutCharts classDonutData={classDonutData} />

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
      />
    </div>
  );
};

export default SyllabusOverviewDashboard;
