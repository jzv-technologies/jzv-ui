// src/components/examinations/ExamResultsManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import ExamResultsEntryGrid from './ExamResultsEntryGrid';

const ENTRY_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'fa-circle',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'fa-spinner',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: 'fa-circle-check',
  },
};

const ExamResultsManager = ({ userRoles = [], user, teacherRecord }) => {
  // Roles normalization
  const roles = useMemo(
    () => (userRoles || []).map((r) => String(r).toLowerCase().trim()),
    [userRoles]
  );
  const isCoordinator = useMemo(
    () =>
      roles.some((r) => ['coordinator', 'academic_coordinator', 'admin', 'management'].includes(r)),
    [roles]
  );

  // Master data
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);

  // Exam results
  const [results, setResults] = useState([]);

  // UI state
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeResultId, setActiveResultId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'in_progress' | 'completed'
  const [loading, setLoading] = useState(true);
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [adHocSubjectId, setAdHocSubjectId] = useState('');
  const [adHocMaxMarks, setAdHocMaxMarks] = useState('100');
  const [adHocPassMarks, setAdHocPassMarks] = useState('');
  const [savingAdHoc, setSavingAdHoc] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const safe = async (query) => {
      try {
        const r = await query;
        return r.data || [];
      } catch {
        return [];
      }
    };

    const [
      dbSchedules,
      dbClasses,
      dbSubjects,
      dbStudents,
      dbTeachers,
      dbSlots,
      dbClassSubjects,
      dbResults,
    ] = await Promise.all([
      safe(supabase.from('exam_schedules').select('*').order('start_date', { ascending: false })),
      safe(supabase.from('classes').select('*').order('name')),
      safe(supabase.from('syl_subjects').select('*').order('name')),
      safe(
        supabase
          .from('students')
          .select('id, student_name, admission_no, class_id, enrollment')
          .order('student_name')
      ),
      safe(
        supabase
          .from('employees')
          .select('id, name, is_active, is_teacher')
          .eq('is_teacher', true)
          .eq('is_active', true)
          .order('name')
      ),
      safe(supabase.from('exam_schedule_slots').select('*')),
      safe(supabase.from('class_subjects').select('*')),
      safe(supabase.from('exam_results').select('*')),
    ]);

    setSchedules(dbSchedules);
    setClasses(dbClasses);
    setSubjects(dbSubjects);
    setStudents(dbStudents);
    setTeachers(dbTeachers);
    setSlots(dbSlots);
    setClassSubjects(dbClassSubjects);
    setResults(dbResults);

    if (!selectedScheduleId && dbSchedules.length > 0) {
      setSelectedScheduleId(String(dbSchedules[0].id));
    }
    setLoading(false);
  }, [selectedScheduleId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshResults = useCallback(async () => {
    const { data } = await supabase.from('exam_results').select('*');
    setResults(data || []);
  }, []);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => String(s.id) === String(selectedScheduleId)) || null,
    [schedules, selectedScheduleId]
  );

  const teacherMap = useMemo(() => {
    const map = {};
    teachers.forEach((t) => {
      map[String(t.id)] = t.name;
    });
    return map;
  }, [teachers]);

  // Students for the selected class (active enrollment only)
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(
      (s) => String(s.class_id) === String(selectedClassId) && s.enrollment !== 'Inactive'
    );
  }, [students, selectedClassId]);

  // Subjects that have exam_schedule_slots for this class in this schedule
  const scheduledSubjects = useMemo(() => {
    if (!selectedScheduleId || !selectedClassId) return [];
    const subjectIds = new Set(
      slots
        .filter(
          (s) =>
            String(s.schedule_id) === String(selectedScheduleId) &&
            String(s.class_id) === String(selectedClassId)
        )
        .map((s) => String(s.subject_id))
    );
    return subjects.filter((s) => subjectIds.has(String(s.id)));
  }, [slots, selectedScheduleId, selectedClassId, subjects]);

  // Results for this schedule+class
  const classResults = useMemo(() => {
    return results.filter(
      (r) =>
        String(r.schedule_id) === String(selectedScheduleId) &&
        String(r.class_id) === String(selectedClassId)
    );
  }, [results, selectedScheduleId, selectedClassId]);

  const classResultsIndex = useMemo(() => {
    const idx = {};
    classResults.forEach((r) => {
      idx[String(r.subject_id)] = r;
    });
    return idx;
  }, [classResults]);

  // Ensure result rows exist for all scheduled subjects
  const ensureResult = useCallback(
    async (subjectId) => {
      const existing = classResultsIndex[String(subjectId)];
      if (existing) return existing;

      const { data, error } = await supabase
        .from('exam_results')
        .insert({
          schedule_id: Number(selectedScheduleId),
          class_id: Number(selectedClassId),
          subject_id: Number(subjectId),
          max_marks: 100,
          is_from_schedule: true,
          entry_status: 'pending',
        })
        .select()
        .single();

      if (error) {
        showToast('Failed to initialise result record', 'error');
        return null;
      }
      await refreshResults();
      return data;
    },
    [classResultsIndex, selectedScheduleId, selectedClassId, refreshResults]
  );

  const handleSubjectSelect = async (subjectId) => {
    const result = await ensureResult(subjectId);
    if (result) setActiveResultId(result.id);
  };

  const handleStatusUpdate = useCallback(async (resultId, newStatus) => {
    await supabase.from('exam_results').update({ entry_status: newStatus }).eq('id', resultId);
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, entry_status: newStatus } : r))
    );
  }, []);

  const handleMaxMarksChange = async (resultId, newMax) => {
    await supabase
      .from('exam_results')
      .update({ max_marks: Number(newMax) })
      .eq('id', resultId);
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, max_marks: Number(newMax) } : r))
    );
  };

  const handleAddAdHoc = async (e) => {
    e.preventDefault();
    if (!adHocSubjectId) return;
    setSavingAdHoc(true);
    try {
      const { error } = await supabase.from('exam_results').insert({
        schedule_id: Number(selectedScheduleId),
        class_id: Number(selectedClassId),
        subject_id: Number(adHocSubjectId),
        max_marks: Number(adHocMaxMarks) || 100,
        pass_marks: adHocPassMarks ? Number(adHocPassMarks) : null,
        is_from_schedule: false,
        entry_status: 'pending',
      });
      if (error) throw error;
      showToast('Ad-hoc subject added', 'success');
      setShowAdHocForm(false);
      setAdHocSubjectId('');
      setAdHocMaxMarks('100');
      setAdHocPassMarks('');
      await refreshResults();
    } catch (err) {
      showToast(err.message || 'Failed to add ad-hoc subject', 'error');
    } finally {
      setSavingAdHoc(false);
    }
  };

  const activeResult = useMemo(
    () => results.find((r) => r.id === activeResultId) || null,
    [results, activeResultId]
  );

  const activeSubject = useMemo(
    () =>
      activeResult ? subjects.find((s) => String(s.id) === String(activeResult.subject_id)) : null,
    [activeResult, subjects]
  );

  // Active slot and permission determination
  const activeSlot = useMemo(() => {
    if (!selectedScheduleId || !selectedClassId || !activeResult) return null;
    return (
      slots.find(
        (s) =>
          String(s.schedule_id) === String(selectedScheduleId) &&
          String(s.class_id) === String(selectedClassId) &&
          String(s.subject_id) === String(activeResult.subject_id)
      ) || null
    );
  }, [slots, selectedScheduleId, selectedClassId, activeResult]);

  const activeInvigilatorName = useMemo(() => {
    if (!activeSlot?.teacher_id) return null;
    return teacherMap[String(activeSlot.teacher_id)] || null;
  }, [activeSlot, teacherMap]);

  const isInvigilator = useMemo(() => {
    if (!teacherRecord?.id || !activeSlot?.teacher_id) return false;
    return String(teacherRecord.id) === String(activeSlot.teacher_id);
  }, [teacherRecord, activeSlot]);

  const canEditMarks = isCoordinator || isInvigilator;

  // All subjects to show in the left panel = scheduledSubjects + ad-hoc
  const adHocResults = useMemo(
    () => classResults.filter((r) => !r.is_from_schedule),
    [classResults]
  );

  const adHocSubjects = useMemo(
    () =>
      adHocResults
        .map((r) => subjects.find((s) => String(s.id) === String(r.subject_id)))
        .filter(Boolean),
    [adHocResults, subjects]
  );

  const allSubjectsToShow = useMemo(() => {
    const ids = new Set();
    const list = [];
    scheduledSubjects.forEach((s) => {
      ids.add(String(s.id));
      list.push({ ...s, isAdHoc: false });
    });
    adHocSubjects.forEach((s) => {
      if (!ids.has(String(s.id))) {
        ids.add(String(s.id));
        list.push({ ...s, isAdHoc: true });
      }
    });
    return list;
  }, [scheduledSubjects, adHocSubjects]);

  // Completion summary
  const completionStats = useMemo(() => {
    const total = allSubjectsToShow.length;
    const completed = allSubjectsToShow.filter(
      (s) => classResultsIndex[String(s.id)]?.entry_status === 'completed'
    ).length;
    const inProgress = allSubjectsToShow.filter(
      (s) => classResultsIndex[String(s.id)]?.entry_status === 'in_progress'
    ).length;
    return { total, completed, inProgress, pending: total - completed - inProgress };
  }, [allSubjectsToShow, classResultsIndex]);

  // Filtered subjects based on statusFilter tab
  const filteredSubjects = useMemo(() => {
    if (statusFilter === 'all') return allSubjectsToShow;
    return allSubjectsToShow.filter((sub) => {
      const st = classResultsIndex[String(sub.id)]?.entry_status || 'pending';
      return st === statusFilter;
    });
  }, [allSubjectsToShow, statusFilter, classResultsIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      {/* Top Header Card (Book Manager Aligned) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 border border-light-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-2xs">
            <i className="fas fa-clipboard-check" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-dark-primary tracking-tight">
              Exam Results Entry
            </h1>
            <p className="text-xs font-bold text-dark-muted">
              {isCoordinator
                ? 'Academic Coordinator / Admin view — enter, review, or override marks for any subject'
                : teacherRecord?.name
                  ? `Teacher view (${teacherRecord.name}) — enter marks for assigned invigilation subjects`
                  : 'Enter and manage examination marks per subject and class'}
            </p>
          </div>
        </div>

        {selectedSchedule && (
          <div className="flex items-center gap-2.5">
            <div className="text-right">
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
                  } text-[9px]`}
                />
                {selectedSchedule.status}
              </span>
            </div>
            <div className="flex-1 min-w-[200px]">
              <select
                value={selectedScheduleId}
                onChange={(e) => {
                  setSelectedScheduleId(e.target.value);
                  setSelectedClassId('');
                  setActiveResultId(null);
                }}
                className="w-full px-3 py-2 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300"
              >
                <option value="">— Select schedule —</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={refreshResults}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all shadow-2xs"
              title="Refresh Results"
            >
              <i className="fas fa-sync-alt text-xs" />
            </button>
          </div>
        )}
      </div>

      {/* Selectors Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-light-border rounded-2xl p-4 shadow-xs">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-bold text-dark-slate mb-1 uppercase tracking-wide">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setActiveResultId(null);
            }}
            disabled={!selectedScheduleId}
            className="w-full px-3 py-2 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 disabled:opacity-50"
          >
            <option value="">— Select class —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Completion summary badges */}
        {selectedClassId && allSubjectsToShow.length > 0 && (
          <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:ml-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
              <span>{completionStats.completed}</span>
              <span className="font-normal text-[11px]">Completed</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold text-amber-700 bg-amber-50 border-amber-200">
              <span>{completionStats.inProgress}</span>
              <span className="font-normal text-[11px]">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold text-slate-700 bg-slate-50 border-slate-200">
              <span>{completionStats.pending}</span>
              <span className="font-normal text-[11px]">Pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Yet to Get Results Alert Banner */}
      {selectedScheduleId && selectedClassId && completionStats.pending > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 font-medium shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
              <i className="fas fa-hourglass-half" />
            </div>
            <div>
              <p className="font-bold text-dark-primary">
                {completionStats.pending} {completionStats.pending === 1 ? 'Subject' : 'Subjects'}{' '}
                Yet to Get Results
              </p>
              <p className="text-[11px] text-amber-800">
                Examination results have not been submitted for these papers yet. Invigilators can
                enter marks or Academic Coordinators can override.
              </p>
            </div>
          </div>
          {statusFilter !== 'pending' && (
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Filter Pending Papers
            </button>
          )}
        </div>
      )}

      {/* Two-Panel Layout */}
      {selectedScheduleId && selectedClassId ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left: Subject list with Status Filter Bar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white border border-light-border rounded-2xl overflow-hidden shadow-xs">
              <div className="p-3 border-b border-light-border bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-black text-dark-primary uppercase tracking-wide">
                  Subjects
                </h3>
                {isCoordinator && (
                  <button
                    onClick={() => setShowAdHocForm(true)}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    title="Add ad-hoc subject not in exam schedule"
                  >
                    <i className="fas fa-plus text-[9px]" />
                    <span>Ad-hoc</span>
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="p-2 border-b border-light-border bg-slate-50/50 flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'All', count: completionStats.total },
                  { id: 'pending', label: 'Pending', count: completionStats.pending },
                  { id: 'in_progress', label: 'In Progress', count: completionStats.inProgress },
                  { id: 'completed', label: 'Done', count: completionStats.completed },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      statusFilter === pill.id
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-dark-muted hover:text-dark-primary border border-light-border'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`px-1 py-0.2 rounded-full text-[9px] ${
                        statusFilter === pill.id
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 text-dark-muted'
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {filteredSubjects.length === 0 ? (
                <div className="text-center py-8 text-xs text-dark-muted">
                  <i className="fas fa-book-open text-2xl mb-2 block opacity-20" />
                  No subjects match the "{statusFilter}" filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {filteredSubjects.map((sub) => {
                    const res = classResultsIndex[String(sub.id)];
                    const cfg = ENTRY_STATUS_CONFIG[res?.entry_status || 'pending'];
                    const isActive = String(res?.id) === String(activeResultId);

                    // Find invigilator for this subject
                    const slot = slots.find(
                      (s) =>
                        String(s.schedule_id) === String(selectedScheduleId) &&
                        String(s.class_id) === String(selectedClassId) &&
                        String(s.subject_id) === String(sub.id)
                    );
                    const invName = slot?.teacher_id ? teacherMap[String(slot.teacher_id)] : null;
                    const isMyDuty =
                      teacherRecord?.id &&
                      slot?.teacher_id &&
                      String(teacherRecord.id) === String(slot.teacher_id);

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSubjectSelect(sub.id)}
                        className={`w-full text-left px-3.5 py-3 transition-all cursor-pointer flex items-start gap-2.5 ${
                          isActive
                            ? 'bg-emerald-50 border-l-4 border-emerald-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`text-xs font-bold truncate ${
                                isActive ? 'text-emerald-700' : 'text-dark-deepblue'
                              }`}
                            >
                              {sub.name}
                            </p>
                            {sub.isAdHoc && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                Ad-hoc
                              </span>
                            )}
                            {isMyDuty && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-dark-muted truncate mt-0.5">
                            Inv:{' '}
                            <span className="font-semibold text-dark-slate">
                              {invName || 'Unassigned'}
                            </span>
                          </p>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.color}`}
                        >
                          <i className={`fas ${cfg.icon} mr-1 text-[8px]`} />
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Marking Scheme Config Card */}
            {activeResult && (
              <div className="bg-white border border-light-border rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-dark-primary uppercase tracking-wide">
                    Marking Scheme
                  </h4>
                  {!canEditMarks && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Locked
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-dark-slate mb-1">
                      Max Marks
                    </label>
                    <input
                      type="number"
                      disabled={!canEditMarks}
                      value={activeResult.max_marks}
                      onChange={(e) => handleMaxMarksChange(activeResult.id, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-light-border rounded-xl bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-dark-slate mb-1">
                      Pass Marks
                    </label>
                    <input
                      type="number"
                      disabled={!canEditMarks}
                      value={activeResult.pass_marks || ''}
                      onChange={(e) =>
                        supabase
                          .from('exam_results')
                          .update({ pass_marks: e.target.value ? Number(e.target.value) : null })
                          .eq('id', activeResult.id)
                          .then(() => refreshResults())
                      }
                      className="w-full px-3 py-1.5 text-xs font-bold border border-light-border rounded-xl bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Mark Entry Grid */}
          <div className="lg:col-span-3">
            {activeResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-light-border shadow-xs">
                  <div>
                    <h2 className="text-base font-black text-dark-primary tracking-tight">
                      {activeSubject?.name}
                      <span className="ml-2 text-xs font-normal text-dark-muted">
                        · {classStudents.length} students · Max Marks: {activeResult.max_marks}
                      </span>
                    </h2>
                    {activeInvigilatorName && (
                      <p className="text-xs text-dark-muted mt-0.5">
                        Assigned Invigilator:{' '}
                        <strong className="text-dark-primary">{activeInvigilatorName}</strong>
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                      ENTRY_STATUS_CONFIG[activeResult.entry_status]?.color
                    }`}
                  >
                    {ENTRY_STATUS_CONFIG[activeResult.entry_status]?.label}
                  </span>
                </div>

                <ExamResultsEntryGrid
                  result={activeResult}
                  students={classStudents}
                  onStatusUpdate={handleStatusUpdate}
                  canEdit={canEditMarks}
                  invigilatorName={activeInvigilatorName}
                  isCoordinator={isCoordinator}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[360px] bg-white border border-light-border rounded-2xl p-8 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 shadow-2xs">
                  <i className="fas fa-hand-pointer" />
                </div>
                <p className="text-sm font-bold text-dark-primary">
                  Select a Subject to Enter Marks
                </p>
                <p className="text-xs text-dark-muted mt-1 max-w-sm text-center">
                  Click any subject from the list on the left to view the student register and
                  record examination marks.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-light-border rounded-2xl shadow-sm p-8">
          <i className="fas fa-clipboard-list text-4xl text-slate-300 mb-4 block" />
          <p className="text-base font-bold text-dark-primary">Select an Exam Schedule and Class</p>
          <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
            Choose an examination event and class section from the dropdowns above to view scheduled
            subjects and record student marks.
          </p>
        </div>
      )}

      {/* Ad-hoc Subject Modal */}
      {showAdHocForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-light-border bg-emerald-50/50">
              <h3 className="text-base font-bold text-dark-primary">Add Ad-Hoc Subject</h3>
              <p className="text-[11px] text-dark-muted mt-0.5">
                Add a subject outside the formal exam schedule.
              </p>
            </div>
            <form onSubmit={handleAddAdHoc} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1.5">Subject *</label>
                <select
                  value={adHocSubjectId}
                  onChange={(e) => setAdHocSubjectId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300"
                  required
                >
                  <option value="">— Select subject —</option>
                  {subjects
                    .filter((s) => !classResultsIndex[String(s.id)])
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1.5">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    value={adHocMaxMarks}
                    onChange={(e) => setAdHocMaxMarks(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1.5">
                    Pass Marks
                  </label>
                  <input
                    type="number"
                    value={adHocPassMarks}
                    onChange={(e) => setAdHocPassMarks(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingAdHoc}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {savingAdHoc ? 'Adding...' : 'Add Subject'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdHocForm(false)}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamResultsManager;
