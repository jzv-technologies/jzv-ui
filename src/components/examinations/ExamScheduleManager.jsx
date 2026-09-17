// src/components/examinations/ExamScheduleManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { ConditionalBlock, useCanAccess } from '../portal-shared/ConditionalBlock';
import ExamScheduleSetup from './ExamScheduleSetup';
import ExamSchedulerGrid from './ExamSchedulerGrid';
import ExamTeacherView from './ExamTeacherView';
import ExamCoverageDashboard from './ExamCoverageDashboard';
import ExamNoticeBoardPrint from './ExamNoticeBoardPrint';
import ParentExamTimetableView from './ParentExamTimetableView';

const ExamScheduleManager = ({ userRoles = [], user, teacherRecord }) => {
  const canAccess = useCanAccess(userRoles);

  // Edit capability driven strictly by component name 'exam-sched-slot-edit' in app_view_controller
  const canEditSchedule = canAccess('exam-sched-slot-edit');

  // Master workspace tabs configured with component names registered in app_view_controller
  const WORKSPACE_TABS = useMemo(
    () => [
      {
        id: 'setup',
        componentName: 'exam-sched-tab-setup',
        label: 'Exam Setup',
        icon: 'fa-gear',
      },
      {
        id: 'scheduler',
        componentName: 'exam-sched-tab-scheduler',
        label: 'Scheduler',
        icon: 'fa-th-large',
      },
      {
        id: 'teacher',
        componentName: 'exam-sched-tab-teacher',
        label: 'Teacher View',
        icon: 'fa-user-tie',
      },
      {
        id: 'coverage',
        componentName: 'exam-sched-tab-coverage',
        label: 'Coverage',
        icon: 'fa-chart-pie',
      },
      {
        id: 'notice_print',
        componentName: 'exam-sched-tab-notice-print',
        label: 'Notice Board Print',
        icon: 'fa-print',
      },
      {
        id: 'parent_ward',
        componentName: 'exam-sched-tab-parent',
        label: 'Ward Schedule',
        icon: 'fa-calendar-day',
      },
    ],
    []
  );

  const availableTabs = useMemo(() => {
    return WORKSPACE_TABS.filter((tab) => canAccess(tab.componentName));
  }, [WORKSPACE_TABS, canAccess]);

  const [activeTab, setActiveTab] = useState(() => {
    if (canAccess('exam-sched-tab-setup')) return 'setup';
    if (canAccess('exam-sched-tab-scheduler')) return 'scheduler';
    if (canAccess('exam-sched-tab-teacher')) return 'teacher';
    if (canAccess('exam-sched-tab-parent')) return 'parent_ward';
    return availableTabs[0]?.id || 'scheduler';
  });

  // Ensure activeTab is always one of the permitted availableTabs
  useEffect(() => {
    if (
      availableTabs.length > 0 &&
      !availableTabs.some((t) => t.id === activeTab)
    ) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Master data
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);

  // Exam data
  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  // Dynamic selectors (class & teacher) & view mode
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [schedulerViewMode, setSchedulerViewMode] = useState('single'); // 'single' | 'all'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => String(s.id) === String(selectedScheduleId)) || null,
    [schedules, selectedScheduleId]
  );

  const selectedSessions = useMemo(
    () => sessions.filter((s) => String(s.schedule_id) === String(selectedScheduleId)),
    [sessions, selectedScheduleId]
  );

  const selectedSlots = useMemo(
    () => slots.filter((s) => String(s.schedule_id) === String(selectedScheduleId)),
    [slots, selectedScheduleId]
  );

  const loadMasterData = useCallback(async () => {
    const safe = async (query) => {
      try {
        const r = await query;
        return r.data || [];
      } catch {
        return [];
      }
    };

    const [dbClasses, dbSubjects, dbTeachers, dbClassSubjects] = await Promise.all([
      safe(supabase.from('classes').select('*').order('name')),
      safe(supabase.from('syl_subjects').select('*').order('name')),
      safe(
        supabase
          .from('employees')
          .select('id, name, is_active, is_teacher')
          .eq('is_teacher', true)
          .eq('is_active', true)
          .order('name')
      ),
      safe(supabase.from('class_subjects').select('*')),
    ]);

    setClasses(dbClasses);
    setSubjects(dbSubjects);
    setTeachers(dbTeachers);
    setClassSubjects(dbClassSubjects);

    if (dbClasses.length > 0) {
      setSelectedClassId((prev) => prev || String(dbClasses[0].id));
    }
  }, []);

  const loadExamData = useCallback(async () => {
    const safe = async (query) => {
      try {
        const r = await query;
        return r.data || [];
      } catch {
        return [];
      }
    };

    const [dbSchedules, dbSessions, dbSlots] = await Promise.all([
      safe(supabase.from('exam_schedules').select('*').order('start_date', { ascending: false })),
      safe(supabase.from('exam_sessions').select('*').order('session_order')),
      safe(supabase.from('exam_schedule_slots').select('*')),
    ]);

    setSchedules(dbSchedules);
    setSessions(dbSessions);
    setSlots(dbSlots);

    if (dbSchedules.length > 0 && !selectedScheduleId) {
      setSelectedScheduleId(dbSchedules[0].id);
    }
  }, [selectedScheduleId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadMasterData(), loadExamData()]);
    } catch (err) {
      console.error('[ExamScheduleManager] Load error:', err);
      setError('Failed to load exam data. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [loadMasterData, loadExamData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Teachers who have slots in this selected exam
  const activeTeachersForExam = useMemo(() => {
    const ids = new Set(selectedSlots.filter((s) => s.teacher_id).map((s) => String(s.teacher_id)));
    const list = teachers
      .filter((t) => ids.has(String(t.id)))
      .sort((a, b) => a.name.localeCompare(b.name));
    return list.length > 0 ? list : teachers;
  }, [teachers, selectedSlots]);

  useEffect(() => {
    if (!selectedTeacherId && activeTeachersForExam.length > 0) {
      setSelectedTeacherId(String(activeTeachersForExam[0].id));
    }
  }, [activeTeachersForExam, selectedTeacherId]);

  // Coverage details for currently selected class in scheduler
  const scheduledSubjectIdsForClass = useMemo(() => {
    if (!selectedClassId) return new Set();
    return new Set(
      selectedSlots
        .filter((s) => String(s.class_id) === String(selectedClassId))
        .map((s) => String(s.subject_id))
    );
  }, [selectedSlots, selectedClassId]);

  const subjectsForClass = useMemo(() => {
    if (!selectedClassId) return [];
    const activeIds = new Set(
      classSubjects
        .filter((cs) => String(cs.class_id) === String(selectedClassId) && cs.status === 'active')
        .map((cs) => String(cs.subject_id))
    );
    return subjects.filter((s) => activeIds.has(String(s.id)));
  }, [classSubjects, selectedClassId, subjects]);

  const teacherAssignmentsCount = useMemo(() => {
    if (!selectedTeacherId) return null;
    return selectedSlots.filter((s) => String(s.teacher_id) === String(selectedTeacherId)).length;
  }, [selectedSlots, selectedTeacherId]);

  const handleRefresh = async () => {
    await loadExamData();
    showToast('Exam data refreshed', 'success');
  };

  // If user only has access to parent ward view, direct them exclusively to the Parent Ward Schedule view
  if (availableTabs.length === 1 && availableTabs[0].id === 'parent_ward') {
    return (
      <div className="w-full p-4 sm:p-6">
        <ParentExamTimetableView user={user} classes={classes} subjects={subjects} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-red-200 p-8 max-w-xl mx-auto shadow-sm my-8">
        <i className="fas fa-triangle-exclamation text-3xl text-red-500 mb-3 block" />
        <p className="text-sm font-bold text-dark-deepblue mb-2">Failed to Load Exam Data</p>
        <p className="text-xs text-red-600 mb-4">{error}</p>
        <button
          onClick={loadAll}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all shadow-sm cursor-pointer"
        >
          <i className="fas fa-sync-alt mr-2" />
          Retry
        </button>
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-3xl p-8 max-w-lg mx-auto my-8">
        <i className="fas fa-lock text-3xl text-slate-300 mb-3 block" />
        <p className="text-sm font-bold text-dark-deepblue">Access Restricted</p>
        <p className="text-xs text-dark-muted mt-1">
          You do not have permission to view any Exam Schedule tabs.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-[500px] m-0 p-0 animate-in fade-in duration-300" data-feature="exam-schedule">
      {/* ── 1. Top Header (Full width, flush to breadcrumbs, no rounded corners) ── */}
      <div className="w-full bg-white border-b border-light-border rounded-none px-4 sm:px-6 py-3 print:hidden shadow-2xs space-y-3">
        {/* Row 1: Title, Exam Badge, and Active Exam Selector / Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fas fa-file-circle-check" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                  Exam Schedule
                </h1>
                {selectedSchedule && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      selectedSchedule.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedSchedule.status === 'finished'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <i
                      className={`fas ${
                        selectedSchedule.status === 'published'
                          ? 'fa-circle-check'
                          : selectedSchedule.status === 'finished'
                            ? 'fa-flag-checkered'
                            : 'fa-pen-ruler'
                      } text-[8px]`}
                    />
                    {selectedSchedule.status}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-dark-muted hidden sm:block">
                {canAccess('exam-sched-tab-setup')
                  ? 'Manage exam sessions, class schedules, invigilation duties, and notice board printouts'
                  : canAccess('exam-sched-slot-edit')
                    ? 'Schedule planner — edit slot assignments, invigilators, and view coverage'
                    : 'Browse exam timetables for classes, duty assignments, and notice printout'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
            {schedules.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1 rounded-xl flex-1 sm:flex-initial min-w-0">
                <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">
                  Exam:
                </span>
                <select
                  value={selectedScheduleId || ''}
                  onChange={(e) => setSelectedScheduleId(e.target.value || null)}
                  className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer w-full sm:max-w-xs truncate"
                >
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleRefresh}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 hover:text-dark-primary transition-all shadow-2xs cursor-pointer shrink-0"
              title="Refresh Exam Data"
            >
              <i className="fas fa-sync-alt text-xs" />
            </button>
          </div>
        </div>

        {/* Row 2: Subview Selectors on the LEFT, Dynamic Selectors on the RIGHT */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Subview Selectors (Tabs) */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full shrink-0" data-feature-tab="exam-schedule-tabs">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className={`fas ${tab.icon} text-[10px]`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Dynamic Selectors on the Right Side */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end" data-feature-filter={activeTab}>
            {activeTab === 'scheduler' && (
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {/* View Mode Toggle: Selected Class vs All Classes */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-light-border shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setSchedulerViewMode('single')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      schedulerViewMode === 'single'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-dark-muted hover:text-dark-primary'
                    }`}
                    title="View single selected class timetable"
                  >
                    <i className="fas fa-chalkboard text-[10px]" />
                    <span className="hidden xs:inline sm:inline">Selected Class</span>
                    <span className="xs:hidden sm:hidden">Single</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedulerViewMode('all')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      schedulerViewMode === 'all'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-dark-muted hover:text-dark-primary'
                    }`}
                    title="View multiple tables for all classes"
                  >
                    <i className="fas fa-layer-group text-[10px]" />
                    <span className="hidden xs:inline sm:inline">All Classes</span>
                    <span className="xs:hidden sm:hidden">All</span>
                  </button>
                </div>

                {schedulerViewMode === 'single' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1 rounded-xl shrink-0">
                      <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">
                        Class:
                      </span>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer min-w-[110px] sm:min-w-[130px]"
                      >
                        <option value="">— Select class —</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedClassId && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap shrink-0">
                        {scheduledSubjectIdsForClass.size} / {subjectsForClass.length} scheduled
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-bold text-dark-muted px-2.5 py-1 bg-slate-50 border border-light-border rounded-xl shrink-0">
                    {classes.length} Classes · Multi-Table View
                  </span>
                )}
              </div>
            )}

            {activeTab === 'teacher' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1 rounded-xl shrink-0">
                  <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">
                    Teacher:
                  </span>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer min-w-[140px] sm:min-w-[160px]"
                  >
                    <option value="">— Select teacher —</option>
                    {activeTeachersForExam.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedTeacherId && teacherAssignmentsCount !== null && (
                  <span className="text-xs font-bold text-dark-muted px-2.5 py-1 bg-slate-50 border border-light-border rounded-xl shrink-0">
                    {teacherAssignmentsCount} duties assigned
                  </span>
                )}
              </div>
            )}

            {activeTab === 'coverage' && (
              <span className="text-xs font-bold text-dark-muted">
                {classes.length} Classes · {selectedSlots.length} Exam Papers
              </span>
            )}

            {activeTab === 'notice_print' && (
              <span className="text-xs font-bold text-dark-muted">
                {classes.length} Total Classes Available
              </span>
            )}

            {activeTab === 'parent_ward' && (
              <span className="text-xs font-bold text-dark-muted">
                Parent Ward Exam Schedule
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Actual Data Table / Subviews governed by ConditionalBlock ── */}
      <div className="w-full p-4 sm:p-6 flex-1 animate-in fade-in duration-200" data-feature="exam-schedule-content">
        {activeTab === 'setup' && (
          <ConditionalBlock name="exam-sched-tab-setup" roles={userRoles}>
            <ExamScheduleSetup
              schedules={schedules}
              sessions={sessions}
              selectedScheduleId={selectedScheduleId}
              onScheduleSelect={setSelectedScheduleId}
              onRefresh={handleRefresh}
            />
          </ConditionalBlock>
        )}

        {activeTab === 'scheduler' && (
          <ConditionalBlock name="exam-sched-tab-scheduler" roles={userRoles}>
            {selectedSchedule ? (
              <ExamSchedulerGrid
                schedule={selectedSchedule}
                sessions={selectedSessions}
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                slots={selectedSlots}
                classSubjects={classSubjects}
                onRefresh={handleRefresh}
                readOnly={!canEditSchedule}
                userRoles={userRoles}
                selectedClassId={selectedClassId}
                onSelectClass={setSelectedClassId}
                hideClassSelector={true}
                viewMode={schedulerViewMode}
                onViewModeChange={setSchedulerViewMode}
              />
            ) : (
              <div className="text-center py-16 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm">
                <i className="fas fa-calendar-plus text-3xl text-slate-300 mb-3 block" />
                <p className="text-sm font-bold text-dark-deepblue">No exam schedule selected</p>
                <p className="text-xs text-dark-muted mt-1">
                  {canAccess('exam-sched-tab-setup')
                    ? 'Create or select a schedule in the Exam Setup tab first.'
                    : 'Please contact an administrator to schedule an examination event.'}
                </p>
              </div>
            )}
          </ConditionalBlock>
        )}

        {activeTab === 'teacher' && (
          <ConditionalBlock name="exam-sched-tab-teacher" roles={userRoles}>
            {selectedSchedule ? (
              <ExamTeacherView
                schedule={selectedSchedule}
                sessions={selectedSessions}
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                slots={selectedSlots}
                selectedTeacherId={selectedTeacherId}
                onSelectTeacher={setSelectedTeacherId}
                hideTeacherSelector={true}
              />
            ) : (
              <div className="text-center py-16 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm">
                <p className="text-sm text-dark-muted">
                  Select an exam schedule to view teacher invigilation assignments.
                </p>
              </div>
            )}
          </ConditionalBlock>
        )}

        {activeTab === 'coverage' && (
          <ConditionalBlock name="exam-sched-tab-coverage" roles={userRoles}>
            {selectedSchedule ? (
              <ExamCoverageDashboard
                classes={classes}
                subjects={subjects}
                slots={selectedSlots}
                classSubjects={classSubjects}
              />
            ) : (
              <div className="text-center py-16 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm">
                <p className="text-sm text-dark-muted">
                  Select an exam schedule to view class coverage analytics.
                </p>
              </div>
            )}
          </ConditionalBlock>
        )}

        {activeTab === 'notice_print' && (
          <ConditionalBlock name="exam-sched-tab-notice-print" roles={userRoles}>
            {selectedSchedule ? (
              <ExamNoticeBoardPrint
                schedule={selectedSchedule}
                sessions={selectedSessions}
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                slots={selectedSlots}
              />
            ) : (
              <div className="text-center py-16 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm">
                <p className="text-sm text-dark-muted">
                  Select an exam schedule to generate a notice board printout.
                </p>
              </div>
            )}
          </ConditionalBlock>
        )}

        {activeTab === 'parent_ward' && (
          <ConditionalBlock name="exam-sched-tab-parent" roles={userRoles}>
            <ParentExamTimetableView user={user} classes={classes} subjects={subjects} />
          </ConditionalBlock>
        )}
      </div>
    </div>
  );
};

export default ExamScheduleManager;

