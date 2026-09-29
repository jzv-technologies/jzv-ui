// src/components/examinations/ExamClassSummaryView.jsx
import React, { useState, useEffect, useMemo } from 'react';

const DEFAULT_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    short: 'Pen',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'fa-circle',
  },
  in_progress: {
    label: 'In Progress',
    short: 'Inp',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'fa-spinner',
  },
  completed: {
    label: 'Completed',
    short: 'Com',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: 'fa-circle-check',
  },
};

const ExamClassSummaryView = ({
  schedules = [],
  selectedScheduleId = '',
  classes = [],
  subjects = [],
  students = [],
  slots = [],
  results = [],
  summaryEntries = [],
  summaryLoading = false,
  onOpenEntryRegister = () => {},
  onRefresh = () => {},
  userRoles = [],
  ENTRY_STATUS_CONFIG = DEFAULT_STATUS_CONFIG,
  filterClassId = '',
  isAllExpanded = true,
}) => {
  // Global & Per-Class status filter states: 'completed' | 'in_progress' | 'pending' | null
  // null = none selected -> shows all subjects
  const [globalStatusFilter, setGlobalStatusFilter] = useState(null);
  const [classFilterMap, setClassFilterMap] = useState({}); // { [classId]: 'completed' | 'in_progress' | 'pending' | null }
  const [collapsedClasses, setCollapsedClasses] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'subject', direction: 'asc' });

  // Sync isAllExpanded prop (controlled from ExamResultsManager) to collapsedClasses
  useEffect(() => {
    if (isAllExpanded) {
      setCollapsedClasses({});
    } else {
      const allCollapsed = {};
      classes.forEach((c) => {
        allCollapsed[c.id] = true;
      });
      setCollapsedClasses(allCollapsed);
    }
  }, [isAllExpanded, classes]);

  // Map result entries by result_id for O(1) lookup
  const summaryEntriesByResultId = useMemo(() => {
    const map = new Map();
    summaryEntries.forEach((entry) => {
      const resId = String(entry.result_id);
      if (!map.has(resId)) {
        map.set(resId, []);
      }
      map.get(resId).push(entry);
    });
    return map;
  }, [summaryEntries]);

  // Aggregate class level details for ALL classes in the selected schedule
  const allClassSummaries = useMemo(() => {
    if (!selectedScheduleId) return [];

    return classes.map((cls) => {
      // 1. Enrolled students in this class
      const clsStudents = students.filter(
        (s) => String(s.class_id) === String(cls.id) && s.enrollment !== 'Inactive'
      );
      const totalStudents = clsStudents.length;

      // 2. Scheduled subjects from exam slots
      const clsSlots = slots.filter(
        (s) =>
          String(s.schedule_id) === String(selectedScheduleId) &&
          String(s.class_id) === String(cls.id)
      );
      const scheduledSubjectIdSet = new Set(clsSlots.map((s) => String(s.subject_id)));
      const scheduledSubs = subjects.filter((s) => scheduledSubjectIdSet.has(String(s.id)));

      // 3. Ad-hoc subjects from exam results
      const clsResults = results.filter(
        (r) =>
          String(r.schedule_id) === String(selectedScheduleId) &&
          String(r.class_id) === String(cls.id)
      );
      const clsResultsBySubjectId = new Map();
      clsResults.forEach((r) => {
        clsResultsBySubjectId.set(String(r.subject_id), r);
      });

      const adHocResults = clsResults.filter((r) => !r.is_from_schedule);
      const adHocSubs = adHocResults
        .map((r) => subjects.find((s) => String(s.id) === String(r.subject_id)))
        .filter(Boolean);

      // 4. Combined unique subjects list
      const combinedSubjectsMap = new Map();
      scheduledSubs.forEach((s) => {
        combinedSubjectsMap.set(String(s.id), { ...s, isAdHoc: false });
      });
      adHocSubs.forEach((s) => {
        if (!combinedSubjectsMap.has(String(s.id))) {
          combinedSubjectsMap.set(String(s.id), { ...s, isAdHoc: true });
        }
      });

      const allSubs = Array.from(combinedSubjectsMap.values());

      // 5. Subject statistics calculation
      let completedCount = 0;
      let inProgressCount = 0;
      let pendingCount = 0;
      let totalPassCount = 0;
      let totalFailCount = 0;
      let totalAbsentCount = 0;

      const subjectRows = allSubs.map((sub) => {
        const res = clsResultsBySubjectId.get(String(sub.id));
        const entryStatus = res?.entry_status || 'pending';

        if (entryStatus === 'completed') completedCount++;
        else if (entryStatus === 'in_progress') inProgressCount++;
        else pendingCount++;

        const entries = res ? summaryEntriesByResultId.get(String(res.id)) || [] : [];
        const absentCount = entries.filter((e) => Boolean(e.is_absent)).length;
        const validMarksEntries = entries.filter(
          (e) => !e.is_absent && e.marks_obtained !== null && e.marks_obtained !== ''
        );
        const validMarks = validMarksEntries.map((e) => Number(e.marks_obtained));

        const maxMarks = res?.max_marks != null ? Number(res.max_marks) : 100;
        const passMarks =
          res?.pass_marks !== null && res?.pass_marks !== undefined
            ? Number(res.pass_marks)
            : Math.round(maxMarks * 0.35);

        const passCount = validMarks.filter((m) => m >= passMarks).length;
        const failCount = validMarks.filter((m) => m < passMarks).length;
        const evaluatedCount = validMarks.length + absentCount;
        const progressPct =
          totalStudents > 0 ? Math.min(100, Math.round((evaluatedCount / totalStudents) * 100)) : 0;

        totalPassCount += passCount;
        totalFailCount += failCount;
        totalAbsentCount += absentCount;

        return {
          subject: sub,
          result: res || null,
          status: entryStatus,
          maxMarks,
          passMarks,
          passCount,
          failCount,
          absentCount,
          evaluatedCount,
          totalStudents,
          progressPct,
        };
      });

      return {
        classItem: cls,
        totalStudents,
        totalPapers: subjectRows.length,
        completedCount,
        inProgressCount,
        pendingCount,
        totalPassCount,
        totalFailCount,
        totalAbsentCount,
        subjectRows,
      };
    });
  }, [
    classes,
    students,
    slots,
    subjects,
    results,
    selectedScheduleId,
    summaryEntriesByResultId,
  ]);

  // Overall Global Statistics across all classes
  const overallStats = useMemo(() => {
    let totalPapers = 0;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let totalStudents = 0;
    let totalPass = 0;
    let totalFail = 0;
    let totalAbsent = 0;
    let activeClassesCount = 0;

    allClassSummaries.forEach((clsSummary) => {
      if (clsSummary.totalPapers > 0) {
        activeClassesCount++;
        totalPapers += clsSummary.totalPapers;
        completed += clsSummary.completedCount;
        inProgress += clsSummary.inProgressCount;
        pending += clsSummary.pendingCount;
        totalStudents += clsSummary.totalStudents;
        totalPass += clsSummary.totalPassCount;
        totalFail += clsSummary.totalFailCount;
        totalAbsent += clsSummary.totalAbsentCount;
      }
    });

    const completionRate =
      totalPapers > 0 ? Math.round((completed / totalPapers) * 100) : 0;

    return {
      activeClassesCount,
      totalClasses: classes.length,
      totalPapers,
      completed,
      inProgress,
      pending,
      totalStudents,
      totalPass,
      totalFail,
      totalAbsent,
      completionRate,
    };
  }, [allClassSummaries, classes.length]);

  // Filtered Class Summaries
  // Requirement 1: When In Progress is selected, class having 0 in progress not to be shown at all; likewise for pending and completed
  // Requirement 2: When the class doesn't have any records, do not show the class itself
  const filteredClassSummaries = useMemo(() => {
    return allClassSummaries.filter((clsSummary) => {
      // Do not show the class if it doesn't have any records/papers
      if (clsSummary.totalPapers === 0) {
        return false;
      }
      if (filterClassId && String(clsSummary.classItem.id) !== String(filterClassId)) {
        return false;
      }
      // Requirement 1: When In Progress is selected, class having 0 in progress not to be shown at all; likewise for pending and completed
      if (globalStatusFilter === 'in_progress' && clsSummary.inProgressCount === 0) {
        return false;
      }
      if (globalStatusFilter === 'pending' && clsSummary.pendingCount === 0) {
        return false;
      }
      if (globalStatusFilter === 'completed' && clsSummary.completedCount === 0) {
        return false;
      }
      return true;
    });
  }, [allClassSummaries, filterClassId, globalStatusFilter]);

  const togglePanel = (classId) => {
    setCollapsedClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  // Status Filter Tile Clicks on Class Panel Header
  // Requirement 1: Managed with Completed, In Progress, Pending; when none is selected, shows all
  const handleClassStatusClick = (classId, status) => {
    const current =
      classFilterMap[classId] !== undefined ? classFilterMap[classId] : globalStatusFilter;
    const newStatus = current === status ? null : status;
    setClassFilterMap((prev) => ({
      ...prev,
      [classId]: newStatus,
    }));
    // Auto expand panel to view the filtered subjects
    setCollapsedClasses((prev) => ({
      ...prev,
      [classId]: false,
    }));
  };

  // Global Status Filter Tile Clicks on Top KPI Banner
  // Requirement 1: Managed with Completed, In Progress, Pending; when none is selected, shows all
  const handleGlobalStatusTileClick = (status) => {
    setGlobalStatusFilter((prev) => (prev === status ? null : status));
    // Reset individual class overrides when global filter changes
    setClassFilterMap({});
  };

  // Sort subjects within a panel
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortedSubjectRows = (rows) => {
    if (!sortConfig.key) return rows;

    return [...rows].sort((a, b) => {
      let aVal;
      let bVal;

      switch (sortConfig.key) {
        case 'subject':
          aVal = (a.subject.name || '').toLowerCase();
          bVal = (b.subject.name || '').toLowerCase();
          break;
        case 'status': {
          const rank = { completed: 3, in_progress: 2, pending: 1 };
          aVal = rank[a.status] || 0;
          bVal = rank[b.status] || 0;
          break;
        }
        case 'pass':
          aVal = a.passCount;
          bVal = b.passCount;
          break;
        case 'fail':
          aVal = a.failCount;
          bVal = b.failCount;
          break;
        case 'absent':
          aVal = a.absentCount;
          bVal = b.absentCount;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  if (!selectedScheduleId) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm p-8">
        <i className="fas fa-calendar-check text-4xl text-slate-300 mb-4 block" />
        <p className="text-base font-bold text-dark-primary">Select an Examination Event</p>
        <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
          Choose an exam schedule from the dropdown above to view the evaluation summary across all classes.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" data-feature="exam-results-summary-view">
      {/* ── TOP KPI OVERVIEW BANNER (Interactive Clickable Tiles for Completed, In Progress, Pending) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Classes Card (Display stat) */}
        <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">
              Classes
            </span>
            <i className="fas fa-chalkboard text-slate-400 text-xs" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-dark-primary mt-1 block">
            {overallStats.activeClassesCount}
          </span>
        </div>

        {/* Total Papers Card (Requirement 1: Display stat, no control) */}
        <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">
              Total Papers
            </span>
            <i className="fas fa-file-lines text-slate-400 text-xs" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-dark-primary mt-1 block">
            {overallStats.totalPapers}
          </span>
        </div>

        {/* Completed Tile: Clicking toggles filter to completed; if none selected, shows all */}
        <button
          type="button"
          onClick={() => handleGlobalStatusTileClick('completed')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
            globalStatusFilter === 'completed'
              ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-400/50 shadow-sm'
              : 'bg-white hover:bg-emerald-50/60 text-emerald-700 border-light-border'
          }`}
          title={
            globalStatusFilter === 'completed'
              ? 'Click to clear filter (show all)'
              : 'Click to filter all classes to completed subjects only'
          }
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                globalStatusFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-700'
              }`}
            >
              Completed
            </span>
            <i
              className={`fas fa-circle-check text-xs ${
                globalStatusFilter === 'completed' ? 'text-emerald-200' : 'text-emerald-500'
              }`}
            />
          </div>
          <span className="text-xl sm:text-2xl font-black mt-1 block">
            {overallStats.completed}
          </span>
        </button>

        {/* In Progress Tile: Clicking toggles filter to in-progress; if none selected, shows all */}
        <button
          type="button"
          onClick={() => handleGlobalStatusTileClick('in_progress')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
            globalStatusFilter === 'in_progress'
              ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/50 shadow-sm'
              : 'bg-white hover:bg-amber-50/60 text-amber-700 border-light-border'
          }`}
          title={
            globalStatusFilter === 'in_progress'
              ? 'Click to clear filter (show all)'
              : 'Click to filter all classes to in-progress subjects only'
          }
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                globalStatusFilter === 'in_progress' ? 'text-amber-100' : 'text-amber-700'
              }`}
            >
              In Progress
            </span>
            <i
              className={`fas fa-spinner text-xs ${
                globalStatusFilter === 'in_progress' ? 'text-amber-200' : 'text-amber-500'
              }`}
            />
          </div>
          <span className="text-xl sm:text-2xl font-black mt-1 block">
            {overallStats.inProgress}
          </span>
        </button>

        {/* Pending Tile: Clicking toggles filter to pending; if none selected, shows all */}
        <button
          type="button"
          onClick={() => handleGlobalStatusTileClick('pending')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
            globalStatusFilter === 'pending'
              ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-400/50 shadow-sm'
              : 'bg-white hover:bg-rose-50/60 text-rose-700 border-light-border'
          }`}
          title={
            globalStatusFilter === 'pending'
              ? 'Click to clear filter (show all)'
              : 'Click to filter all classes to pending subjects only'
          }
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                globalStatusFilter === 'pending' ? 'text-rose-100' : 'text-rose-700'
              }`}
            >
              Pending
            </span>
            <i
              className={`fas fa-circle text-xs ${
                globalStatusFilter === 'pending' ? 'text-rose-200' : 'text-rose-500'
              }`}
            />
          </div>
          <span className="text-xl sm:text-2xl font-black mt-1 block">
            {overallStats.pending}
          </span>
        </button>

        {/* Total Students Card (Display stat) */}
        <div className="bg-white p-3.5 rounded-2xl border border-light-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Total Students
            </span>
            <i className="fas fa-user-graduate text-indigo-500 text-xs" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-indigo-700 mt-1 block">
            {overallStats.totalStudents}
          </span>
        </div>
      </div>

      {/* Global Filter Reset Banner (Only shown if a global status is active) */}
      {globalStatusFilter && (
        <div className="flex items-center justify-between bg-slate-50 px-3.5 py-1.5 rounded-xl border border-light-border text-xs">
          <span className="font-bold text-dark-muted flex items-center gap-2">
            <i className="fas fa-filter text-emerald-600 text-xs" />
            <span>
              Filtering all classes by:{' '}
              <strong className="text-dark-primary capitalize">
                {globalStatusFilter.replace('_', ' ')}
              </strong>
            </span>
          </span>
          <button
            type="button"
            onClick={() => setGlobalStatusFilter(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
          >
            Clear filter (Show all)
          </button>
        </div>
      )}

      {/* ── LOADING STATE ── */}
      {summaryLoading && (
        <div className="text-center py-12 bg-white rounded-2xl border border-light-border shadow-xs">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-dark-muted mt-2 font-bold">
            Loading class performance summaries and marks...
          </p>
        </div>
      )}

      {/* ── NO CLASSES FOUND ── */}
      {!summaryLoading && filteredClassSummaries.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-light-border shadow-xs p-6">
          <i className="fas fa-folder-open text-3xl text-slate-300 mb-3 block" />
          <p className="text-sm font-bold text-dark-primary">
            {globalStatusFilter
              ? `No Classes with ${globalStatusFilter.replace('_', ' ')} Papers Found`
              : 'No Exam Records Found'}
          </p>
          <p className="text-xs text-dark-muted mt-1 max-w-sm mx-auto">
            {globalStatusFilter
              ? `There are no classes with ${globalStatusFilter.replace('_', ' ')} papers in this schedule.`
              : 'No classes with configured examination papers or records were found for this schedule.'}
          </p>
          {globalStatusFilter && (
            <button
              type="button"
              onClick={() => setGlobalStatusFilter(null)}
              className="mt-3 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Show all classes
            </button>
          )}
        </div>
      )}

      {/* ── CLASS PANELS LIST (One panel per class with records) ── */}
      {!summaryLoading &&
        filteredClassSummaries.map((clsSummary) => {
          const cls = clsSummary.classItem;
          const isCollapsed = Boolean(collapsedClasses[cls.id]);
          const sortedRows = getSortedSubjectRows(clsSummary.subjectRows);

          // Effective status filter for this specific class
          // Requirement 1 & 3: When none selected (null), shows all subjects; otherwise shows only matching
          const effectiveClassStatus =
            classFilterMap[cls.id] !== undefined
              ? classFilterMap[cls.id]
              : globalStatusFilter;

          const displayRows = sortedRows.filter((row) => {
            if (!effectiveClassStatus) return true;
            return row.status === effectiveClassStatus;
          });

          return (
            <div
              key={cls.id}
              className="bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden transition-all hover:shadow-sm"
              data-feature="exam-results-class-panel"
            >
              {/* ── PANEL HEADING (Class Name, Total Papers, Completed, In Progress, Pending, Total students) ── */}
              <div className="bg-slate-50/90 border-b border-light-border px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
                {/* Left: Class Name & Total Students */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                    <i className="fas fa-chalkboard-user" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                        {cls.name}
                      </h3>
                      {clsSummary.totalPapers > 0 &&
                        clsSummary.completedCount === clsSummary.totalPapers && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <i className="fas fa-check text-[9px]" /> Completed
                          </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-dark-muted">
                        <i className="fas fa-user-graduate text-[10px] text-slate-400" />
                        {clsSummary.totalStudents} Enrolled Students
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Class Level KPIs (Total Papers stat, Completed/In Progress/Pending buttons) + Total Students + Chevron */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Total Papers: Requirement 1 - Display stat only, no control */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-white text-dark-primary border border-slate-200 shadow-2xs"
                    title={`Total Papers: ${clsSummary.totalPapers}`}
                  >
                    <span className="text-[10px] font-bold text-dark-muted uppercase">
                      Papers:
                    </span>
                    <span>{clsSummary.totalPapers}</span>
                  </span>

                  {/* Completed: Only shown if it has records or is actively filtered */}
                  {(clsSummary.completedCount > 0 || effectiveClassStatus === 'completed') && (
                    <button
                      type="button"
                      onClick={() => handleClassStatusClick(cls.id, 'completed')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-2xs ${
                        effectiveClassStatus === 'completed'
                          ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-400/50'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={
                        effectiveClassStatus === 'completed'
                          ? 'Click to show all subjects'
                          : `Click to show only completed subjects (${clsSummary.completedCount})`
                      }
                    >
                      <i
                        className={`fas fa-circle-check text-[10px] ${
                          effectiveClassStatus === 'completed' ? 'text-white' : 'text-emerald-600'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          effectiveClassStatus === 'completed'
                            ? 'text-emerald-100'
                            : 'text-emerald-600'
                        }`}
                      >
                        Completed:
                      </span>
                      <span>{clsSummary.completedCount}</span>
                    </button>
                  )}

                  {/* In Progress: Requirement 2 - Not to be shown when it has 0 records in that category */}
                  {(clsSummary.inProgressCount > 0 || effectiveClassStatus === 'in_progress') && (
                    <button
                      type="button"
                      onClick={() => handleClassStatusClick(cls.id, 'in_progress')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-2xs ${
                        effectiveClassStatus === 'in_progress'
                          ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/50'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                      title={
                        effectiveClassStatus === 'in_progress'
                          ? 'Click to show all subjects'
                          : `Click to show only in-progress subjects (${clsSummary.inProgressCount})`
                      }
                    >
                      <i
                        className={`fas fa-spinner text-[10px] ${
                          effectiveClassStatus === 'in_progress' ? 'text-white' : 'text-amber-600'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          effectiveClassStatus === 'in_progress'
                            ? 'text-amber-100'
                            : 'text-amber-600'
                        }`}
                      >
                        In Progress:
                      </span>
                      <span>{clsSummary.inProgressCount}</span>
                    </button>
                  )}

                  {/* Pending: Requirement 2 - Not to be shown when it has 0 records in that category */}
                  {(clsSummary.pendingCount > 0 || effectiveClassStatus === 'pending') && (
                    <button
                      type="button"
                      onClick={() => handleClassStatusClick(cls.id, 'pending')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-2xs ${
                        effectiveClassStatus === 'pending'
                          ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-400/50'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                      title={
                        effectiveClassStatus === 'pending'
                          ? 'Click to show all subjects'
                          : `Click to show only pending subjects (${clsSummary.pendingCount})`
                      }
                    >
                      <i
                        className={`fas fa-circle text-[10px] ${
                          effectiveClassStatus === 'pending' ? 'text-white' : 'text-rose-600'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          effectiveClassStatus === 'pending' ? 'text-rose-100' : 'text-rose-600'
                        }`}
                      >
                        Pending:
                      </span>
                      <span>{clsSummary.pendingCount}</span>
                    </button>
                  )}

                  {/* Total Students Pill */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs"
                    title="Total Students Enrolled"
                  >
                    <i className="fas fa-users text-[10px] text-indigo-600" />
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">
                      Students:
                    </span>
                    <span>{clsSummary.totalStudents}</span>
                  </span>

                  {/* Expand / Collapse Chevron */}
                  <button
                    type="button"
                    onClick={() => togglePanel(cls.id)}
                    className="w-8 h-8 rounded-xl bg-white border border-light-border text-dark-muted hover:text-dark-primary flex items-center justify-center transition-all cursor-pointer shadow-2xs ml-1"
                    title={isCollapsed ? 'Expand Class Panel' : 'Collapse Class Panel'}
                  >
                    <i
                      className={`fas fa-chevron-down text-xs transition-transform duration-200 ${
                        isCollapsed ? '' : 'rotate-180'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* ── PANEL BODY (Subject, Status, Pass, Fail, Absent, icon to open in Entry Register) ── */}
              {!isCollapsed && (
                <div className="p-2 sm:p-5">
                  {displayRows.length === 0 ? (
                    <div className="text-center py-6 text-xs text-dark-muted font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <p>
                        No{' '}
                        <strong className="capitalize">
                          {effectiveClassStatus?.replace('_', ' ')}
                        </strong>{' '}
                        subjects found for {cls.name}.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleClassStatusClick(cls.id, effectiveClassStatus)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        <i className="fas fa-undo text-[10px]" /> Show all{' '}
                        {clsSummary.totalPapers} subjects
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Active filter indicator notice if filtered */}
                      {effectiveClassStatus && (
                        <div className="flex items-center justify-between pb-1 text-xs">
                          <span className="font-bold text-dark-muted flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>
                              Showing{' '}
                              <strong className="text-dark-primary capitalize">
                                {effectiveClassStatus.replace('_', ' ')}
                              </strong>{' '}
                              subjects only ({displayRows.length} of {clsSummary.totalPapers})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleClassStatusClick(cls.id, effectiveClassStatus)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                          >
                            Clear filter (Show all)
                          </button>
                        </div>
                      )}

                      <div className="overflow-x-auto rounded-xl border border-light-border">
                        <table className="w-full text-left border-collapse table-auto">
                          <thead>
                            <tr className="bg-slate-100/80 border-b border-light-border text-[10px] sm:text-xs font-bold text-dark-muted uppercase tracking-wider">
                              {/* Subject Header */}
                              <th
                                onClick={() => handleSort('subject')}
                                className="py-2.5 sm:py-3 px-2 sm:px-4 cursor-pointer hover:text-dark-primary transition-colors select-none"
                                data-feature-sort="subject"
                              >
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <span>Subject</span>
                                  <i
                                    className={`fas text-[8px] sm:text-[9px] ${
                                      sortConfig.key === 'subject'
                                        ? sortConfig.direction === 'asc'
                                          ? 'fa-sort-up text-emerald-600'
                                          : 'fa-sort-down text-emerald-600'
                                        : 'fa-sort text-slate-300'
                                    }`}
                                  />
                                </div>
                              </th>

                              {/* Status Header */}
                              <th
                                onClick={() => handleSort('status')}
                                className="py-2.5 sm:py-3 px-1.5 sm:px-4 cursor-pointer hover:text-dark-primary transition-colors select-none"
                                data-feature-sort="status"
                              >
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <span>Status</span>
                                  <i
                                    className={`fas text-[8px] sm:text-[9px] ${
                                      sortConfig.key === 'status'
                                        ? sortConfig.direction === 'asc'
                                          ? 'fa-sort-up text-emerald-600'
                                          : 'fa-sort-down text-emerald-600'
                                        : 'fa-sort text-slate-300'
                                    }`}
                                  />
                                </div>
                              </th>

                              {/* Pass Header (P on mobile, Pass on desktop) */}
                              <th
                                onClick={() => handleSort('pass')}
                                className="py-2.5 sm:py-3 px-1 sm:px-4 cursor-pointer hover:text-dark-primary transition-colors select-none text-center"
                                data-feature-sort="pass"
                              >
                                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                  <span className="inline sm:hidden">P</span>
                                  <span className="hidden sm:inline">Pass</span>
                                  <i
                                    className={`fas text-[8px] sm:text-[9px] ${
                                      sortConfig.key === 'pass'
                                        ? sortConfig.direction === 'asc'
                                          ? 'fa-sort-up text-emerald-600'
                                          : 'fa-sort-down text-emerald-600'
                                        : 'fa-sort text-slate-300'
                                    }`}
                                  />
                                </div>
                              </th>

                              {/* Fail Header (F on mobile, Fail on desktop) */}
                              <th
                                onClick={() => handleSort('fail')}
                                className="py-2.5 sm:py-3 px-1 sm:px-4 cursor-pointer hover:text-dark-primary transition-colors select-none text-center"
                                data-feature-sort="fail"
                              >
                                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                  <span className="inline sm:hidden">F</span>
                                  <span className="hidden sm:inline">Fail</span>
                                  <i
                                    className={`fas text-[8px] sm:text-[9px] ${
                                      sortConfig.key === 'fail'
                                        ? sortConfig.direction === 'asc'
                                          ? 'fa-sort-up text-emerald-600'
                                          : 'fa-sort-down text-emerald-600'
                                        : 'fa-sort text-slate-300'
                                    }`}
                                  />
                                </div>
                              </th>

                              {/* Absent Header (A on mobile, Absent on desktop) */}
                              <th
                                onClick={() => handleSort('absent')}
                                className="py-2.5 sm:py-3 px-1 sm:px-4 cursor-pointer hover:text-dark-primary transition-colors select-none text-center"
                                data-feature-sort="absent"
                              >
                                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                  <span className="inline sm:hidden">A</span>
                                  <span className="hidden sm:inline">Absent</span>
                                  <i
                                    className={`fas text-[8px] sm:text-[9px] ${
                                      sortConfig.key === 'absent'
                                        ? sortConfig.direction === 'asc'
                                          ? 'fa-sort-up text-emerald-600'
                                          : 'fa-sort-down text-emerald-600'
                                        : 'fa-sort text-slate-300'
                                    }`}
                                  />
                                </div>
                              </th>

                              {/* Action Header */}
                              <th className="py-2.5 sm:py-3 px-1 sm:px-4 text-center whitespace-nowrap" title="Action">
                                <span>Action</span>
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-light-border bg-white text-xs">
                            {displayRows.map((row) => {
                              const sub = row.subject;
                              const cfg =
                                ENTRY_STATUS_CONFIG[row.status] || DEFAULT_STATUS_CONFIG.pending;
                              const statusShort =
                                cfg.short ||
                                (row.status === 'completed'
                                  ? 'Com'
                                  : row.status === 'in_progress'
                                    ? 'Inp'
                                    : 'Pen');

                              return (
                                <tr
                                  key={sub.id}
                                  className="hover:bg-slate-50/70 transition-colors group"
                                >
                                  {/* Column 1: Subject */}
                                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-slate-100 text-slate-600 hidden sm:flex items-center justify-center text-xs shrink-0">
                                        <i className="fas fa-book-open" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1 sm:gap-1.5">
                                          <span
                                            className="font-black text-dark-primary text-xs sm:text-sm truncate block"
                                            title={sub.name}
                                          >
                                            {sub.name}
                                          </span>
                                          {sub.isAdHoc && (
                                            <span className="text-[8px] sm:text-[9px] font-black uppercase px-1 sm:px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                              Ad-Hoc
                                            </span>
                                          )}
                                        </div>
                                        {/* Desktop view */}
                                        <p className="text-[11px] text-dark-muted font-medium mt-0.5 hidden sm:block">
                                          Max: <strong>{row.maxMarks}</strong>
                                          {row.passMarks ? ` · Pass: ${row.passMarks}` : ''}
                                        </p>
                                        {/* Mobile view */}
                                        <p
                                          className="text-[10px] text-dark-muted font-bold mt-0.5 sm:hidden"
                                          title={`Pass: ${row.passMarks} / Max: ${row.maxMarks}`}
                                        >
                                          {row.passMarks}/{row.maxMarks}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Column 2: Status */}
                                  <td className="py-2 sm:py-3 px-1.5 sm:px-4">
                                    {/* Desktop view */}
                                    <div className="hidden sm:block space-y-1.5 max-w-[150px]">
                                      <span
                                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.color}`}
                                      >
                                        <i className={`fas ${cfg.icon} text-[8px]`} />
                                        {cfg.label}
                                      </span>
                                      <div className="flex items-center justify-between text-[10px] text-dark-muted font-semibold">
                                        <span>Evaluated</span>
                                        <span>
                                          {row.evaluatedCount} / {row.totalStudents} ({row.progressPct}%)
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            row.progressPct === 100
                                              ? 'bg-emerald-500'
                                              : row.progressPct > 0
                                                ? 'bg-amber-500'
                                                : 'bg-slate-300'
                                          }`}
                                          style={{ width: `${row.progressPct}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Mobile view */}
                                    <div
                                      className="flex sm:hidden items-center gap-1 whitespace-nowrap"
                                      title={`${cfg.label || statusShort}: ${row.evaluatedCount}/${row.totalStudents} evaluated (${row.progressPct}%)`}
                                    >
                                      <span
                                        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${cfg.color}`}
                                      >
                                        {statusShort}
                                      </span>
                                      <span className="text-[10px] font-bold text-dark-primary">
                                        {row.progressPct}%
                                      </span>
                                    </div>
                                  </td>

                                  {/* Column 3: Pass */}
                                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center whitespace-nowrap">
                                    {/* Desktop view */}
                                    <div className="hidden sm:inline-flex flex-col items-center">
                                      <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                        {row.passCount}
                                      </span>
                                      {row.evaluatedCount > 0 && (
                                        <span className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                          {Math.round((row.passCount / row.evaluatedCount) * 100)}%
                                        </span>
                                      )}
                                    </div>
                                    {/* Mobile view */}
                                    <span className="sm:hidden inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded-md text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                      {row.passCount}
                                    </span>
                                  </td>

                                  {/* Column 4: Fail */}
                                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center whitespace-nowrap">
                                    {/* Desktop view */}
                                    <div className="hidden sm:inline-flex flex-col items-center">
                                      <span
                                        className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-lg text-xs font-black shadow-2xs ${
                                          row.failCount > 0
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                            : 'bg-slate-50 text-slate-500 border border-slate-200'
                                        }`}
                                      >
                                        {row.failCount}
                                      </span>
                                      {row.evaluatedCount > 0 && row.failCount > 0 && (
                                        <span className="text-[10px] text-rose-600 font-bold mt-0.5">
                                          {Math.round((row.failCount / row.evaluatedCount) * 100)}%
                                        </span>
                                      )}
                                    </div>
                                    {/* Mobile view */}
                                    <span
                                      className={`sm:hidden inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded-md text-xs font-black shadow-2xs ${
                                        row.failCount > 0
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                                      }`}
                                    >
                                      {row.failCount}
                                    </span>
                                  </td>

                                  {/* Column 5: Absent */}
                                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center whitespace-nowrap">
                                    {/* Desktop view */}
                                    <div className="hidden sm:inline-flex flex-col items-center">
                                      <span
                                        className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-lg text-xs font-black shadow-2xs ${
                                          row.absentCount > 0
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-slate-50 text-slate-500 border border-slate-200'
                                        }`}
                                      >
                                        {row.absentCount}
                                      </span>
                                      {row.evaluatedCount > 0 && row.absentCount > 0 && (
                                        <span className="text-[10px] text-amber-600 font-bold mt-0.5">
                                          {Math.round((row.absentCount / row.evaluatedCount) * 100)}%
                                        </span>
                                      )}
                                    </div>
                                    {/* Mobile view */}
                                    <span
                                      className={`sm:hidden inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded-md text-xs font-black shadow-2xs ${
                                        row.absentCount > 0
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                                      }`}
                                    >
                                      {row.absentCount}
                                    </span>
                                  </td>

                                  {/* Column 6: Action icon (to open in Entry Register) */}
                                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => onOpenEntryRegister(cls.id, sub.id)}
                                      className="inline-flex items-center justify-center gap-1.5 w-7 h-7 sm:w-auto sm:px-3 sm:py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg sm:rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer group/btn"
                                      title={`Open Entry Register for ${cls.name} - ${sub.name}`}
                                    >
                                      <i className="fas fa-edit text-xs transition-transform group-hover/btn:scale-110" />
                                      <span className="hidden sm:inline">Entry Register</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default ExamClassSummaryView;
