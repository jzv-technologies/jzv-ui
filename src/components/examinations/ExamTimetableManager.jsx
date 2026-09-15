// src/components/examinations/ExamTimetableManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import ExamScheduleSetup from './ExamScheduleSetup';
import ExamSchedulerGrid from './ExamSchedulerGrid';
import ExamTeacherView from './ExamTeacherView';
import ExamCoverageDashboard from './ExamCoverageDashboard';
import ExamNoticeBoardPrint from './ExamNoticeBoardPrint';
import ParentExamTimetableView from './ParentExamTimetableView';

const ExamTimetableManager = ({ userRoles = [], user, teacherRecord }) => {
  // Roles normalization
  const roles = useMemo(
    () => (userRoles || []).map((r) => String(r).toLowerCase().trim()),
    [userRoles]
  );
  const isAdmin = roles.includes('admin') || roles.includes('management');
  const isCoordinator = roles.includes('coordinator') || roles.includes('academic_coordinator');
  const isTeacher = roles.includes('teacher');
  const isParent = roles.includes('parent');

  // Available tabs based on user role
  const availableTabs = useMemo(() => {
    const tabs = [];
    if (isAdmin) {
      tabs.push({ id: 'setup', label: 'Exam Setup', icon: 'fa-gear' });
    }
    tabs.push({ id: 'scheduler', label: 'Scheduler', icon: 'fa-th-large' });
    tabs.push({ id: 'teacher', label: 'Teacher View', icon: 'fa-user-tie' });
    tabs.push({ id: 'coverage', label: 'Coverage', icon: 'fa-chart-pie' });
    tabs.push({ id: 'notice_print', label: 'Notice Board Print', icon: 'fa-print' });
    return tabs;
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState(() => (isAdmin ? 'setup' : 'scheduler'));

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

  // Dynamic selectors (class & teacher)
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

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
      console.error('[ExamTimetableManager] Load error:', err);
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
    const ids = new Set(
      selectedSlots.filter((s) => s.teacher_id).map((s) => String(s.teacher_id))
    );
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

  // If user is a Parent, direct them exclusively to the Parent Ward Schedule view
  if (isParent) {
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

  return (
    <div className="w-full flex flex-col min-h-[500px] m-0 p-0 animate-in fade-in duration-300">
      {/* ── 1. Top Header (Full width, flush to breadcrumbs, no rounded corners) ── */}
      <div className="w-full bg-white border-b border-light-border rounded-none px-4 sm:px-6 py-3 print:hidden shadow-2xs space-y-3">
        {/* Row 1: Title, Exam Badge, and Active Exam Selector / Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-2xs">
              <i className="fas fa-file-circle-check" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                  Exam Schedule
                </h1>
                {selectedSchedule && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
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
                {isAdmin
                  ? 'Manage exam sessions, class schedules, invigilation duties, and notice board printouts'
                  : isCoordinator
                  ? 'Academic Coordinator view — edit slot assignments, invigilators, and view coverage'
                  : 'Teacher view — browse exam timetables for all classes, duty assignments, and notice printout'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {schedules.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">Exam:</span>
                <select
                  value={selectedScheduleId || ''}
                  onChange={(e) => setSelectedScheduleId(e.target.value || null)}
                  className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer max-w-[180px] sm:max-w-xs truncate"
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
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 hover:text-dark-primary transition-all shadow-2xs cursor-pointer"
              title="Refresh Exam Data"
            >
              <i className="fas fa-sync-alt text-xs" />
            </button>
          </div>
        </div>

        {/* Row 2: Subview Selectors on the LEFT, Dynamic Selectors on the RIGHT */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Subview Selectors (Tabs) */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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
          <div className="flex items-center gap-2.5 flex-wrap">
            {activeTab === 'scheduler' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1 rounded-xl">
                  <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">Class:</span>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer min-w-[130px]"
                  >
                    <option value="">— Select class —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedClassId && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                    {scheduledSubjectIdsForClass.size} / {subjectsForClass.length} scheduled
                  </span>
                )}
              </div>
            )}

            {activeTab === 'teacher' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1 rounded-xl">
                  <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">Teacher:</span>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer min-w-[160px]"
                  >
                    <option value="">— Select teacher —</option>
                    {activeTeachersForExam.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                {selectedTeacherId && teacherAssignmentsCount !== null && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                    {teacherAssignmentsCount} assignments
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
          </div>
        </div>
      </div>

      {/* ── 2. Actual Data Table (Full width, rounded corners) ── */}
      <div className="w-full p-4 sm:p-6 flex-1 animate-in fade-in duration-200">
        {activeTab === 'setup' && isAdmin && (
          <ExamScheduleSetup
            schedules={schedules}
            sessions={sessions}
            selectedScheduleId={selectedScheduleId}
            onScheduleSelect={setSelectedScheduleId}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'scheduler' &&
          (selectedSchedule ? (
            <ExamSchedulerGrid
              schedule={selectedSchedule}
              sessions={selectedSessions}
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              slots={selectedSlots}
              classSubjects={classSubjects}
              onRefresh={handleRefresh}
              readOnly={!isAdmin && !isCoordinator}
              selectedClassId={selectedClassId}
              onSelectClass={setSelectedClassId}
              hideClassSelector={true}
            />
          ) : (
            <div className="text-center py-16 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm">
              <i className="fas fa-calendar-plus text-3xl text-slate-300 mb-3 block" />
              <p className="text-sm font-bold text-dark-deepblue">No exam schedule selected</p>
              <p className="text-xs text-dark-muted mt-1">
                {isAdmin
                  ? 'Create or select a schedule in the Exam Setup tab first.'
                  : 'Please contact an administrator to schedule an examination event.'}
              </p>
            </div>
          ))}

        {activeTab === 'teacher' &&
          (selectedSchedule ? (
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
          ))}

        {activeTab === 'coverage' &&
          (selectedSchedule ? (
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
          ))}

        {activeTab === 'notice_print' &&
          (selectedSchedule ? (
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
          ))}
      </div>
    </div>
  );
};

export default ExamTimetableManager;
