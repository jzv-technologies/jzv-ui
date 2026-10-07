import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, fetchAllPages } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { ConditionalBlock, useCanAccess } from '../portal-shared/ConditionalBlock';
import {
  ALL_MONTHS,
  getAcademicMonthYear,
  getCurrentAcademicYearLabel,
  parseAcademicYearLabel,
  buildAcademicMonths,
  buildAcademicCalendarRows,
  buildPeriodsPerWeekMap,
  buildEstimateRows,
} from './dashboard/overviewUtils';

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

const BookPlannerView = ({
  role = 'management',
  user,
  userRoles = [],
  teacherRecord,
  onBack,
}) => {
  const canAccess = useCanAccess(userRoles);
  const canEdit = canAccess('book-planner-edit');

  // Tab definitions controlled via app_view_controller (Blueprint Rule 2)
  const TABS = useMemo(
    () => [
      {
        id: 'targets',
        componentName: 'book-planner-tab-targets',
        label: 'Target Completion Matrix',
        icon: 'fa-flag-checkered',
      },
      {
        id: 'pacing',
        componentName: 'book-planner-tab-pacing',
        label: 'Pacing Overview',
        icon: 'fa-chart-pie',
      },
    ],
    []
  );

  const availableTabs = useMemo(() => {
    return TABS.filter((tab) => canAccess(tab.componentName));
  }, [TABS, canAccess]);

  const [activeTab, setActiveTab] = useState('targets');

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Filters and state
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYearLabel());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');

  // Data states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [bookClasses, setBookClasses] = useState([]);
  const [bookTrackers, setBookTrackers] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [academicEvents, setAcademicEvents] = useState([]);
  const [academicStartMonth, setAcademicStartMonth] = useState(6);
  const [academicEndMonth, setAcademicEndMonth] = useState(5);

  // Edit draft state
  const [estimateDraft, setEstimateDraft] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        resClasses,
        resSubjects,
        resBooks,
        resBookClasses,
        resTrackers,
        resTimetable,
        resLogs,
        resCalendar,
        resEvents,
        resConfig,
      ] = await Promise.all([
        supabase.from('classes').select('*').order('id', { ascending: true }),
        supabase.from('syl_subjects').select('*').order('name', { ascending: true }),
        supabase.from('syl_books').select('*').order('name', { ascending: true }),
        supabase.from('map_class_books').select('*'),
        supabase.from('trk_book_level_progress').select('*'),
        supabase
          .from('timetable_slots')
          .select('id, class_id, subject_id, teacher_id, day, period_id'),
        fetchAllPages('trk_daily_teacher_progress', '*'),
        supabase
          .from('academic_calendar')
          .select('*')
          .order('year', { ascending: true })
          .order('month', { ascending: true }),
        supabase.from('academic_events').select('*').order('start_date', { ascending: true }),
        supabase
          .from('admin_configruation')
          .select('val')
          .eq('key', 'academic_year_range')
          .maybeSingle(),
      ]);

      setClasses(resClasses.data || []);
      setSubjects(resSubjects.data || []);
      setBooks(resBooks.data || []);
      setBookClasses(resBookClasses.data || []);
      setBookTrackers(resTrackers.data || []);
      setTimetableSlots(resTimetable.data || []);
      setAllLogs(resLogs.data || []);
      setCalendarEntries(resCalendar.data || []);
      setAcademicEvents(resEvents.data || []);

      if (resConfig?.data?.val) {
        const cfg = resConfig.data.val;
        const rawStart =
          typeof cfg.start_month === 'object' ? cfg.start_month?.start_month : cfg.start_month;
        const rawEnd =
          typeof cfg.end_month === 'object' ? cfg.end_month?.end_month : cfg.end_month;
        const sm = Number(rawStart);
        const em = Number(rawEnd);
        if (Number.isFinite(sm) && sm >= 1 && sm <= 12) setAcademicStartMonth(sm);
        if (Number.isFinite(em) && em >= 1 && em <= 12) setAcademicEndMonth(em);
      }
    } catch (err) {
      console.warn('Failed to load Book Planner data:', err);
      showToast('Could not load curriculum data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentAcademicMonths = useMemo(
    () => buildAcademicMonths(academicStartMonth, academicEndMonth),
    [academicStartMonth, academicEndMonth]
  );

  const academicMonthOptions = useMemo(() => {
    const startYear = parseAcademicYearLabel(academicYear);
    return currentAcademicMonths.map((mObj) => {
      const m = typeof mObj === 'object' ? mObj.month : mObj;
      const year = getAcademicMonthYear(startYear, m, academicStartMonth);
      const label = ALL_MONTHS.find((item) => item.value === m)?.label || `Month ${m}`;
      return {
        value: m,
        year,
        label: `${label} ${year}`,
      };
    });
  }, [academicYear, currentAcademicMonths, academicStartMonth]);

  const calendarRows = useMemo(
    () =>
      buildAcademicCalendarRows(
        academicYear,
        calendarEntries,
        academicStartMonth,
        academicEndMonth,
        academicEvents
      ),
    [academicYear, calendarEntries, academicStartMonth, academicEndMonth, academicEvents]
  );

  const periodsPerWeekMap = useMemo(
    () => buildPeriodsPerWeekMap(timetableSlots),
    [timetableSlots]
  );

  const baseEstimateRows = useMemo(
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

  // Sync draft from base rows
  useEffect(() => {
    setEstimateDraft(
      baseEstimateRows.reduce((accumulator, row) => {
        accumulator[row.mappingId] = {
          expectedEndMonth: row.expectedEndMonth || '',
        };
        return accumulator;
      }, {})
    );
  }, [baseEstimateRows]);

  // Compute dynamic estimate rows based on active user changes in draft
  const dynamicEstimateRows = useMemo(() => {
    const startYear = parseAcademicYearLabel(academicYear);

    return baseEstimateRows.map((row) => {
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

      const calculatedStartMonth = row.calculatedStartMonth || academicStartMonth;
      const effectiveEndMonth = expectedEndMonthNum || academicEndMonth;

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
        const calRow = calendarRows.find((r) => r.month === m);
        return sum + (Number(calRow?.teaching_days) || 20);
      }, 0);

      const activeTeachingWeeks = Number((activeTeachingDays / 5).toFixed(1));

      const startMonthYear = getAcademicMonthYear(startYear, calculatedStartMonth, academicStartMonth);
      const startMonthObj = ALL_MONTHS.find((item) => item.value === Number(calculatedStartMonth));
      const startMonthName = startMonthObj?.label ? startMonthObj.label.slice(0, 3) : `M${calculatedStartMonth}`;
      const startMonthFullLabel = `${startMonthName} ${startMonthYear}`;

      const endMonthYear = getAcademicMonthYear(startYear, effectiveEndMonth, academicStartMonth);
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
  }, [academicYear, baseEstimateRows, estimateDraft, academicStartMonth, academicEndMonth, calendarRows]);

  // Filtered rows based on UI filters
  const filteredRows = useMemo(() => {
    return dynamicEstimateRows.filter((row) => {
      if (selectedClassId !== 'all' && String(row.classId) !== String(selectedClassId)) {
        return false;
      }
      if (selectedSubjectId !== 'all' && String(row.subjectId) !== String(selectedSubjectId)) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesBook = (row.bookName || '').toLowerCase().includes(term);
        const matchesSubject = (row.subjectName || '').toLowerCase().includes(term);
        const matchesClass = (row.className || '').toLowerCase().includes(term);
        return matchesBook || matchesSubject || matchesClass;
      }
      return true;
    });
  }, [dynamicEstimateRows, selectedClassId, selectedSubjectId, searchTerm]);

  const groupedRows = useMemo(() => groupEstimateRows(filteredRows), [filteredRows]);

  const stats = useMemo(() => {
    const total = dynamicEstimateRows.length;
    const withCustomTarget = dynamicEstimateRows.filter((r) => r.expectedEndMonthNum).length;
    const autoStarted = dynamicEstimateRows.filter((r) => r.hasFirstLessonEntry).length;
    const avgTeachingWeeks =
      total > 0
        ? (dynamicEstimateRows.reduce((sum, r) => sum + (r.activeTeachingWeeks || 0), 0) / total).toFixed(1)
        : 0;
    return { total, withCustomTarget, autoStarted, avgTeachingWeeks };
  }, [dynamicEstimateRows]);

  const handleEndMonthChange = (mappingId, value) => {
    setEstimateDraft((previous) => ({
      ...previous,
      [mappingId]: {
        expectedEndMonth: value ? Number(value) : null,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const startYear = parseAcademicYearLabel(academicYear);

    const payload = dynamicEstimateRows.map((row) => {
      let endMonthDate = null;
      const endM = row.expectedEndMonthNum;
      if (endM) {
        const y = getAcademicMonthYear(startYear, endM, academicStartMonth);
        const lastDay = new Date(y, endM, 0).getDate();
        endMonthDate = `${y}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }

      return {
        class_id: row.classId,
        book_id: row.bookId,
        expected_end_date: endMonthDate,
        updated_at: new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from('trk_book_level_progress')
      .upsert(payload, { onConflict: 'class_id,book_id' })
      .select('*');

    setSaving(false);

    if (error) {
      showToast(`Failed to save completion targets: ${error.message}`, 'error');
    } else {
      showToast('Book target completion dates saved successfully.', 'success');
      setBookTrackers((previous) => {
        const savedMap = new Map(
          (data || payload).map((entry) => [`${entry.class_id}-${entry.book_id}`, entry])
        );
        return (previous || []).map((item) => {
          const saved = savedMap.get(`${item.class_id}-${item.book_id}`);
          return saved
            ? { ...item, expected_end_date: saved.expected_end_date }
            : item;
        });
      });
    }
  };

  return (
    <div
      className="w-full flex flex-col min-h-[600px] bg-slate-50/60 pb-12"
      data-feature="book-planner"
    >
      {/* ── HEADER SECTION (Rule 1A & Rule 4) ── */}
      <div className="w-full bg-white border-b border-light-border px-4 sm:px-6 py-4 print:hidden shadow-2xs space-y-3 shrink-0">
        {/* Row 1: Title + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-base shadow-2xs shrink-0">
              <i className="fas fa-book-bookmark" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                  Book Planner
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-200">
                  Target Completion
                </span>
              </div>
              <p className="text-[11px] font-semibold text-gray-400 hidden sm:block">
                Set and track target completion timelines, teaching days, and pacing milestones for class books.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-2 rounded-xl border border-light-border bg-white text-xs font-bold text-gray-600 hover:text-dark-primary hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <i className="fas fa-arrow-left text-xs" />
                <span>Back</span>
              </button>
            )}

            {activeTab === 'targets' && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={!canEdit || saving || loading}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black shadow-xs hover:bg-brand-primary/90 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} text-xs`} />
                <span>{saving ? 'Saving...' : 'Save Targets'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Tab Navigation (LEFT) + Active Tab Filters (RIGHT) (Blueprint Rule 1A) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Tab Navigation (Rule 2) */}
          <div
            className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0 overflow-x-auto no-scrollbar"
            data-feature-tab="book-planner-tabs"
          >
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-brand-primary shadow-xs font-black'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className={`fas ${tab.icon} text-[10px]`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Active Tab Filters (Rule 2.3 & Rule 8.4) */}
          <div
            className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 w-full lg:w-auto"
            data-feature-filter={activeTab}
          >
            {/* Search Input */}
            <div className="col-span-2 sm:w-60 relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              <input
                type="text"
                placeholder="Search class, subject, book..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-light-border bg-gray-50/60 focus:bg-white text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              />
            </div>

            {/* Class Filter */}
            <div className="w-full sm:w-40">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
              >
                <option value="all">All Classes ({classes.length})</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="w-full sm:w-44">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
              >
                <option value="all">All Subjects ({subjects.length})</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT SECTION (Rule 1B) ── */}
      <div
        className="w-full p-4 sm:p-6 flex-1 animate-in fade-in duration-200"
        data-feature="book-planner-content"
      >
        {/* Tab 1: Target Completion Matrix (Gated via app_view_controller) */}
        {activeTab === 'targets' && (
          <ConditionalBlock name="book-planner-tab-targets" roles={userRoles}>
            {loading ? (
              <div className="bg-white rounded-3xl border border-light-border p-12 text-center text-xs font-bold text-gray-400">
                <i className="fas fa-spinner fa-spin mr-2 text-brand-primary" />
                Loading Book Planner data...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-light-border p-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-lg">
                  <i className="fas fa-book-open" />
                </div>
                <h4 className="text-sm font-black text-dark-primary">No Books Found</h4>
                <p className="text-xs text-gray-400">
                  {searchTerm || selectedClassId !== 'all' || selectedSubjectId !== 'all'
                    ? 'No books match the selected filters. Try clearing your search.'
                    : 'No class books have been mapped yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Books</p>
                    <p className="text-lg font-black text-dark-primary">{stats.total}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Auto-Started</p>
                    <p className="text-lg font-black text-emerald-700">{stats.autoStarted}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Custom Targets</p>
                    <p className="text-lg font-black text-indigo-700">{stats.withCustomTarget}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Avg Weeks</p>
                    <p className="text-lg font-black text-amber-700">{stats.avgTeachingWeeks}w</p>
                  </div>
                </div>

                {/* Grouped Books Cards */}
                {groupedRows.map(([className, subjectsForClass]) => (
                  <div
                    key={className}
                    className="rounded-3xl border border-light-border bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all"
                  >
                    {/* Class Header */}
                    <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-gray-100">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                        <i className="fas fa-graduation-cap" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-dark-primary">{className}</h3>
                        <p className="text-[10px] font-bold text-gray-400">
                          {Object.values(subjectsForClass).reduce((s, r) => s + r.length, 0)} books configured
                        </p>
                      </div>
                    </div>

                    {/* Subjects */}
                    <div className="space-y-4">
                      {Object.entries(subjectsForClass).map(([subjectName, rows]) => (
                        <div
                          key={subjectName}
                          className="rounded-2xl bg-gray-50/60 border border-gray-200/60 p-3.5 space-y-3"
                        >
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-primary" />
                            {subjectName}
                            <span className="text-[10px] text-gray-400 font-bold lowercase">
                              ({rows.length} {rows.length === 1 ? 'book' : 'books'})
                            </span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                                  className="p-3.5 rounded-2xl border border-gray-200 bg-white shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                                >
                                  <div>
                                    {/* Book Title & Periods */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-xs font-black">
                                          <i className="fas fa-book" />
                                        </div>
                                        <h5
                                          className="text-xs font-black text-dark-primary truncate"
                                          title={row.bookName}
                                        >
                                          {row.bookName}
                                        </h5>
                                      </div>
                                      <span className="text-[10px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg shrink-0">
                                        {row.periodsPerWeek || 0} p/w
                                      </span>
                                    </div>

                                    {/* Auto-Start Badge & Active Days */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                      <span
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 ${
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

                                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200/60">
                                        {row.activeTeachingDays}d (~{row.activeTeachingWeeks}w)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Target Completion Selector */}
                                  <div className="pt-2.5 border-t border-gray-100 space-y-1.5">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                                      Target Completion:
                                    </label>
                                    <div className="relative">
                                      <select
                                        value={endM}
                                        onChange={(e) =>
                                          handleEndMonthChange(row.mappingId, e.target.value)
                                        }
                                        disabled={!canEdit}
                                        className="w-full appearance-none px-3 py-1.5 pr-8 rounded-xl border border-gray-250 bg-gray-50/70 hover:bg-white text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all cursor-pointer disabled:opacity-50"
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
                                      <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none" />
                                    </div>

                                    <div className="text-[10px] font-semibold text-gray-400 truncate flex items-center gap-1">
                                      <i className="fas fa-calendar-check text-[9px] text-indigo-500" />
                                      <span>
                                        {row.calculatedStartMonthLabel} → {effectiveEndMonthLabel}
                                      </span>
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
            )}
          </ConditionalBlock>
        )}

        {/* Tab 2: Pacing Overview (Gated via app_view_controller) */}
        {activeTab === 'pacing' && (
          <ConditionalBlock name="book-planner-tab-pacing" roles={userRoles}>
            {loading ? (
              <div className="bg-white rounded-3xl border border-light-border p-12 text-center text-xs font-bold text-gray-400">
                <i className="fas fa-spinner fa-spin mr-2 text-brand-primary" />
                Loading Pacing Overview...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-light-border p-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-lg">
                  <i className="fas fa-chart-pie" />
                </div>
                <h4 className="text-sm font-black text-dark-primary">No Pacing Records Found</h4>
                <p className="text-xs text-gray-400">No books match the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-3xl border border-light-border shadow-xs flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0">
                      <i className="fas fa-book-open-reader" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Curriculum Books</p>
                      <p className="text-xl font-black text-dark-primary">{stats.total}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-light-border shadow-xs flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shrink-0">
                      <i className="fas fa-flag-checkered" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Target Configured</p>
                      <p className="text-xl font-black text-indigo-700">
                        {stats.withCustomTarget}{' '}
                        <span className="text-xs text-gray-400 font-semibold">
                          ({stats.total > 0 ? Math.round((stats.withCustomTarget / stats.total) * 100) : 0}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-light-border shadow-xs flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shrink-0">
                      <i className="fas fa-circle-play" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Started by Teachers</p>
                      <p className="text-xl font-black text-emerald-700">
                        {stats.autoStarted}{' '}
                        <span className="text-xs text-gray-400 font-semibold">
                          ({stats.total > 0 ? Math.round((stats.autoStarted / stats.total) * 100) : 0}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-light-border shadow-xs flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-base shrink-0">
                      <i className="fas fa-calendar-week" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Avg Teaching Weeks</p>
                      <p className="text-xl font-black text-amber-700">{stats.avgTeachingWeeks} Weeks</p>
                    </div>
                  </div>
                </div>

                {/* Pacing Overview Table */}
                <div className="bg-white rounded-3xl border border-light-border shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-light-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-dark-primary tracking-tight">
                        Curriculum Pacing Timelines
                      </h3>
                      <p className="text-[11px] font-semibold text-gray-400">
                        Active teaching windows and scheduled pacing periods per class book.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold">
                      {filteredRows.length} {filteredRows.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-light-border text-[10px] font-black uppercase text-gray-400 tracking-wider">
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Book Name</th>
                          <th className="py-3 px-4">Start Month</th>
                          <th className="py-3 px-4">Target Completion</th>
                          <th className="py-3 px-4 text-center">Teaching Days</th>
                          <th className="py-3 px-4 text-center">Teaching Weeks</th>
                          <th className="py-3 px-4 text-center">Periods / Wk</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold text-dark-primary">
                        {filteredRows.map((row) => {
                          const isStarted = row.hasFirstLessonEntry;
                          const hasCustom = Boolean(row.expectedEndMonthNum);

                          return (
                            <tr key={row.mappingId} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-3 px-4 font-black text-dark-primary">
                                {row.className}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {row.subjectName}
                              </td>
                              <td className="py-3 px-4 font-bold text-dark-primary">
                                {row.bookName}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                                    isStarted
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <i className={`fas ${isStarted ? 'fa-play' : 'fa-clock'} text-[8px]`} />
                                  {row.calculatedStartMonthLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                                    hasCustom
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <i className="fas fa-flag-checkered text-[8px]" />
                                  {row.expectedEndMonthLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-bold">
                                {row.activeTeachingDays}d
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-indigo-600">
                                ~{row.activeTeachingWeeks}w
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-lg bg-gray-100 font-black text-[10px] text-gray-700">
                                  {row.periodsPerWeek || 0} p/w
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isStarted && hasCustom ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Active · Target Set
                                  </span>
                                ) : isStarted ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                    Active · Full Year
                                  </span>
                                ) : hasCustom ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Target Set
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">
                                    Full Year Default
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </ConditionalBlock>
        )}
      </div>
    </div>
  );
};

export default BookPlannerView;
