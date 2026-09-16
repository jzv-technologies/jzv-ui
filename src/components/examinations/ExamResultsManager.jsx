// src/components/examinations/ExamResultsManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { ConditionalBlock, useCanAccess } from '../portal-shared/ConditionalBlock';
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
  const canAccess = useCanAccess(userRoles);

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

  // Workspace Tabs registered in app_view_controller
  const WORKSPACE_TABS = useMemo(
    () => [
      {
        id: 'entry',
        componentName: 'exam-results-tab-entry',
        label: 'Results Entry',
        icon: 'fa-clipboard-check',
      },
      {
        id: 'summary',
        componentName: 'exam-results-tab-summary',
        label: 'Class Summary',
        icon: 'fa-chart-pie',
      },
    ],
    []
  );

  const availableTabs = useMemo(() => {
    return WORKSPACE_TABS.filter((tab) => canAccess(tab.componentName));
  }, [WORKSPACE_TABS, canAccess]);

  const [activeTab, setActiveTab] = useState(() => {
    if (canAccess('exam-results-tab-entry')) return 'entry';
    return availableTabs[0]?.id || 'entry';
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
  const [showSchemeEdit, setShowSchemeEdit] = useState(false);

  // Summary entries for class overview tab
  const [summaryEntries, setSummaryEntries] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

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

  // Fetch all entries for summary tab
  useEffect(() => {
    if (activeTab !== 'summary' || classResults.length === 0) return;
    const fetchSummaryEntries = async () => {
      setSummaryLoading(true);
      try {
        const resultIds = classResults.map((r) => r.id);
        const { data } = await supabase
          .from('exam_result_entries')
          .select('*')
          .in('result_id', resultIds);
        setSummaryEntries(data || []);
      } catch (err) {
        console.error('Failed to load summary entries:', err);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummaryEntries();
  }, [activeTab, classResults]);

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

  const handleStatusUpdate = useCallback(
    async (resultId, newStatus) => {
      if (!canAccess('exam-results-status-override') && !isCoordinator) {
        showToast('Permission required to change result status', 'error');
        return;
      }
      await supabase.from('exam_results').update({ entry_status: newStatus }).eq('id', resultId);
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, entry_status: newStatus } : r))
      );
    },
    [canAccess, isCoordinator]
  );

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

  // Enforce access control for mark editing
  const canEditMarks = canAccess('exam-results-edit-marks') && (isCoordinator || isInvigilator);

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

  // Auto-select preferred or first subject whenever class or subject list changes
  useEffect(() => {
    if (!selectedClassId || allSubjectsToShow.length === 0) {
      setActiveResultId(null);
      return;
    }

    const currentSubjectIsValid =
      activeResult && allSubjectsToShow.some((s) => String(s.id) === String(activeResult.subject_id));
    if (currentSubjectIsValid) return;

    // Prefer subject where logged-in user is invigilator
    let preferredSubject = null;
    if (teacherRecord?.id) {
      const mySlot = slots.find(
        (s) =>
          String(s.schedule_id) === String(selectedScheduleId) &&
          String(s.class_id) === String(selectedClassId) &&
          String(s.teacher_id) === String(teacherRecord.id)
      );
      if (mySlot) {
        preferredSubject = allSubjectsToShow.find((s) => String(s.id) === String(mySlot.subject_id));
      }
    }

    // Otherwise prefer first pending subject, then first subject
    if (!preferredSubject) {
      preferredSubject =
        allSubjectsToShow.find((s) => classResultsIndex[String(s.id)]?.entry_status === 'pending') ||
        allSubjectsToShow[0];
    }

    if (preferredSubject) {
      handleSubjectSelect(preferredSubject.id);
    }
  }, [selectedClassId, allSubjectsToShow, teacherRecord?.id, slots, selectedScheduleId]);

  const currentSubjectIndex = useMemo(() => {
    if (!activeResult) return -1;
    return allSubjectsToShow.findIndex((s) => String(s.id) === String(activeResult.subject_id));
  }, [activeResult, allSubjectsToShow]);

  const hasPrevSubject = currentSubjectIndex > 0;
  const hasNextSubject =
    currentSubjectIndex >= 0 && currentSubjectIndex < allSubjectsToShow.length - 1;
  const nextSubjectName = hasNextSubject ? allSubjectsToShow[currentSubjectIndex + 1]?.name : '';

  const handlePrevSubject = () => {
    if (hasPrevSubject) {
      handleSubjectSelect(allSubjectsToShow[currentSubjectIndex - 1].id);
    }
  };

  const handleNextSubject = () => {
    if (hasNextSubject) {
      handleSubjectSelect(allSubjectsToShow[currentSubjectIndex + 1].id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-3xl p-8 max-w-lg mx-auto my-8">
        <i className="fas fa-lock text-3xl text-slate-300 mb-3 block" />
        <p className="text-sm font-bold text-dark-deepblue">Access Restricted</p>
        <p className="text-xs text-dark-muted mt-1">
          You do not have permission to view Exam Results.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-[500px] m-0 p-0 animate-in fade-in duration-300">
      {/* ── 1. Top Header Block ── */}
      <div className="w-full bg-white border-b border-light-border rounded-none px-4 sm:px-6 py-3 print:hidden shadow-2xs space-y-3">
        {/* Row 1: Title, Active Status, Exam Selector, and Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shadow-2xs shrink-0">
              <i className="fas fa-clipboard-check" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                  Exam Results Entry
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
                {isCoordinator
                  ? 'Academic Coordinator / Admin view — enter, review, or override marks for any subject'
                  : teacherRecord?.name
                    ? `Teacher view (${teacherRecord.name}) — enter marks for assigned invigilation subjects`
                    : 'Enter and manage examination marks per subject and class'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {schedules.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">Exam:</span>
                <select
                  value={selectedScheduleId || ''}
                  onChange={(e) => {
                    setSelectedScheduleId(e.target.value);
                    setSelectedClassId('');
                    setActiveResultId(null);
                  }}
                  className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer max-w-[180px] sm:max-w-xs truncate"
                >
                  <option value="">— Select Schedule —</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={async () => {
                await refreshResults();
                showToast('Results refreshed', 'success');
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 hover:text-dark-primary transition-all shadow-2xs cursor-pointer shrink-0"
              title="Refresh Results"
            >
              <i className="fas fa-sync-alt text-xs" />
            </button>
          </div>
        </div>

        {/* Row 2: Workspace Tabs & Consolidated Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Workspace Tabs (if both entry and summary are enabled) */}
            {availableTabs.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto mr-1">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-dark-muted hover:text-dark-primary'
                    }`}
                  >
                    <i className={`fas ${tab.icon} text-[10px]`} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Class Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">Class:</span>
              <select
                value={selectedClassId || ''}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setActiveResultId(null);
                }}
                disabled={!selectedScheduleId}
                className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer disabled:opacity-50 min-w-[130px] max-w-[200px] truncate"
              >
                <option value="">— Select Class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Pills (Only relevant in Entry tab) */}
            {activeTab === 'entry' && (
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
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
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === pill.id
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-dark-muted hover:text-dark-primary'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        statusFilter === pill.id
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200/70 text-dark-muted'
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Ad-Hoc Subject Button guarded by ConditionalBlock */}
            {selectedScheduleId && selectedClassId && (
              <ConditionalBlock name="exam-results-adhoc" roles={userRoles}>
                <button
                  type="button"
                  onClick={() => setShowAdHocForm(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                  title="Add ad-hoc subject not in exam schedule"
                >
                  <i className="fas fa-plus text-[10px]" />
                  <span>Ad-Hoc Subject</span>
                </button>
              </ConditionalBlock>
            )}
          </div>

          {/* Right: Quick Summary Counts */}
          {selectedClassId && allSubjectsToShow.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                <span>{completionStats.completed}/{completionStats.total}</span>
                <span className="font-normal text-[11px] hidden sm:inline">Completed</span>
              </div>
              {completionStats.pending > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold text-amber-700 bg-amber-50 border-amber-200">
                  <i className="fas fa-hourglass-half text-[10px]" />
                  <span>{completionStats.pending}</span>
                  <span className="font-normal text-[11px] hidden sm:inline">Pending</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Tab Content Areas ── */}
      <div className="w-full p-3 sm:p-5 md:p-6 space-y-4">
        {/* Pending Notice Alert Banner */}
        {selectedScheduleId && selectedClassId && completionStats.pending > 0 && activeTab === 'entry' && (
          <div className="bg-amber-50/90 border border-amber-200 px-4 py-2.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 font-medium shadow-2xs">
            <div className="flex items-center gap-2.5">
              <i className="fas fa-hourglass-half text-amber-700 text-sm shrink-0" />
              <div>
                <span className="font-bold text-dark-primary">
                  {completionStats.pending} {completionStats.pending === 1 ? 'Subject' : 'Subjects'} Pending Results
                </span>
                <span className="text-[11px] text-amber-800 ml-1.5 hidden md:inline">
                  — Marks have not been submitted for these papers yet.
                </span>
              </div>
            </div>
            {statusFilter !== 'pending' && (
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Filter Pending Only
              </button>
            )}
          </div>
        )}

        {/* Tab 1: Marks Entry Register */}
        {activeTab === 'entry' && (
          <ConditionalBlock name="exam-results-tab-entry" roles={userRoles}>
            {selectedScheduleId && selectedClassId ? (
              <div className="space-y-4">
                {/* Mobile Subject Switcher Strip (Visible on < lg, hidden on lg+) */}
                <div className="lg:hidden bg-white p-3 rounded-2xl border border-light-border shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-dark-primary uppercase tracking-wide flex items-center gap-1.5">
                      <i className="fas fa-book text-emerald-600 text-xs" />
                      <span>Subjects ({filteredSubjects.length})</span>
                    </span>
                    {activeSubject && (
                      <span className="text-[11px] font-bold text-dark-muted">
                        Active: <strong className="text-emerald-700">{activeSubject.name}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {filteredSubjects.map((sub) => {
                      const res = classResultsIndex[String(sub.id)];
                      const cfg = ENTRY_STATUS_CONFIG[res?.entry_status || 'pending'];
                      const isActive = String(res?.id) === String(activeResultId);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSubjectSelect(sub.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                            isActive
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-dark-primary border-light-border'
                          }`}
                        >
                          <span>{sub.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive
                                ? 'bg-white'
                                : res?.entry_status === 'completed'
                                  ? 'bg-emerald-500'
                                  : res?.entry_status === 'in_progress'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                  {/* Left: Desktop Subject list (hidden on < lg) */}
                  <div className="hidden lg:block lg:col-span-1 space-y-3">
                    <div className="bg-white border border-light-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
                      <div className="p-3.5 border-b border-light-border bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-book text-xs text-dark-muted" />
                          <h3 className="text-xs font-black text-dark-primary uppercase tracking-wide">
                            Subjects ({filteredSubjects.length})
                          </h3>
                        </div>
                      </div>

                    {filteredSubjects.length === 0 ? (
                      <div className="text-center py-8 text-xs text-dark-muted px-4">
                        <i className="fas fa-book-open text-2xl mb-2 block opacity-20" />
                        No subjects match the "{statusFilter}" filter.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                        {filteredSubjects.map((sub) => {
                          const res = classResultsIndex[String(sub.id)];
                          const cfg = ENTRY_STATUS_CONFIG[res?.entry_status || 'pending'];
                          const isActive = String(res?.id) === String(activeResultId);

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
                </div>

                  {/* Right: Subject Switcher & Results Entry Grid */}
                  <div className="w-full lg:col-span-3 space-y-4">
                  {activeResult ? (
                    <>
                      {/* Subject Header & Quick Navigation Bar */}
                      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-light-border shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                              <i className="fas fa-book-open" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base font-black text-dark-primary tracking-tight">
                                  {activeSubject?.name}
                                </h2>
                                {currentSubjectIndex >= 0 && (
                                  <span className="text-[11px] font-bold text-dark-muted bg-slate-100 px-2 py-0.5 rounded-full">
                                    Subject {currentSubjectIndex + 1} of {allSubjectsToShow.length}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    ENTRY_STATUS_CONFIG[activeResult.entry_status]?.color
                                  }`}
                                >
                                  {ENTRY_STATUS_CONFIG[activeResult.entry_status]?.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-xs text-dark-muted mt-0.5 flex-wrap">
                                <span>{classStudents.length} Students</span>
                                <span>·</span>
                                <span>Max Marks: <strong>{activeResult.max_marks}</strong></span>
                                {activeResult.pass_marks && (
                                  <>
                                    <span>·</span>
                                    <span>Pass Marks: <strong>{activeResult.pass_marks}</strong></span>
                                  </>
                                )}
                                {activeInvigilatorName && (
                                  <>
                                    <span>·</span>
                                    <span>Invigilator: <strong className="text-dark-primary">{activeInvigilatorName}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Subject Navigation Buttons & Mobile Dropdown */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                            {/* Mobile Subject Dropdown Picker */}
                            <div className="sm:hidden">
                              <select
                                value={activeSubject?.id || ''}
                                onChange={(e) => handleSubjectSelect(e.target.value)}
                                className="text-xs font-bold border border-light-border rounded-xl px-2 py-1.5 bg-slate-50"
                              >
                                {allSubjectsToShow.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <ConditionalBlock name="exam-results-marking-scheme" roles={userRoles}>
                              <button
                                type="button"
                                onClick={() => setShowSchemeEdit(!showSchemeEdit)}
                                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  showSchemeEdit
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : 'border-light-border text-dark-slate hover:bg-slate-50'
                                }`}
                                title="Edit Max Marks and Pass Marks"
                              >
                                <i className="fas fa-sliders text-[10px]" />
                                <span className="hidden sm:inline">Marking Scheme</span>
                              </button>
                            </ConditionalBlock>

                            <button
                              type="button"
                              disabled={!hasPrevSubject}
                              onClick={handlePrevSubject}
                              className="px-2.5 py-1.5 rounded-xl border border-light-border text-xs font-bold text-dark-slate hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Go to previous subject"
                            >
                              <i className="fas fa-chevron-left text-[10px]" />
                              <span className="hidden sm:inline">Prev</span>
                            </button>

                            <button
                              type="button"
                              disabled={!hasNextSubject}
                              onClick={handleNextSubject}
                              className="px-2.5 py-1.5 rounded-xl border border-light-border text-xs font-bold text-dark-slate hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Go to next subject"
                            >
                              <span className="hidden sm:inline">Next</span>
                              <i className="fas fa-chevron-right text-[10px]" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Marking Scheme Editor */}
                        {showSchemeEdit && canEditMarks && (
                          <div className="bg-slate-50/80 p-3 rounded-2xl border border-light-border flex flex-wrap items-center gap-4 text-xs font-bold animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                              <span className="text-dark-muted">Max Marks:</span>
                              <input
                                type="number"
                                value={activeResult.max_marks}
                                onChange={(e) => handleMaxMarksChange(activeResult.id, e.target.value)}
                                className="w-20 px-2.5 py-1 border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-dark-muted">Pass Marks:</span>
                              <input
                                type="number"
                                value={activeResult.pass_marks || ''}
                                placeholder="Optional"
                                onChange={(e) =>
                                  supabase
                                    .from('exam_results')
                                    .update({ pass_marks: e.target.value ? Number(e.target.value) : null })
                                    .eq('id', activeResult.id)
                                    .then(() => refreshResults())
                                }
                                className="w-24 px-2.5 py-1 border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                              />
                            </div>
                            <span className="text-[11px] text-dark-muted font-normal ml-auto">
                              Changes update in real-time.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Mark Entry Register Grid */}
                      <ExamResultsEntryGrid
                        result={activeResult}
                        students={classStudents}
                        onStatusUpdate={handleStatusUpdate}
                        canEdit={canEditMarks}
                        invigilatorName={activeInvigilatorName}
                        isCoordinator={isCoordinator}
                        onNextSubject={handleNextSubject}
                        hasNextSubject={hasNextSubject}
                        nextSubjectName={nextSubjectName}
                        userRoles={userRoles}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[360px] bg-white border border-light-border rounded-2xl sm:rounded-3xl p-8 shadow-xs">
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
            </div>
          ) : (
              <div className="text-center py-20 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm p-8">
                <i className="fas fa-clipboard-list text-4xl text-slate-300 mb-4 block" />
                <p className="text-base font-bold text-dark-primary">Select an Exam Schedule and Class</p>
                <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
                  Choose an examination event and class section from the dropdowns above to view scheduled
                  subjects and record student marks.
                </p>
              </div>
            )}
          </ConditionalBlock>
        )}

        {/* Tab 2: Class Summary & Analytics */}
        {activeTab === 'summary' && (
          <ConditionalBlock name="exam-results-tab-summary" roles={userRoles}>
            {selectedScheduleId && selectedClassId ? (
              <div className="space-y-4">
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
                    <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider block">Total Papers</span>
                    <span className="text-2xl font-black text-dark-primary mt-1 block">{allSubjectsToShow.length}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Completed</span>
                    <span className="text-2xl font-black text-emerald-700 mt-1 block">{completionStats.completed}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">In Progress</span>
                    <span className="text-2xl font-black text-amber-700 mt-1 block">{completionStats.inProgress}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Pending</span>
                    <span className="text-2xl font-black text-rose-700 mt-1 block">{completionStats.pending}</span>
                  </div>
                </div>

                {/* Subject Cards Grid */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-light-border shadow-sm p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-light-border">
                    <h3 className="text-sm font-black text-dark-primary">
                      Class Subject Evaluation Breakdown ({allSubjectsToShow.length})
                    </h3>
                    <span className="text-xs font-semibold text-dark-muted">
                      {classStudents.length} Students Enrolled
                    </span>
                  </div>

                  {summaryLoading ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-dark-muted mt-2 font-semibold">Loading class performance metrics...</p>
                    </div>
                  ) : allSubjectsToShow.length === 0 ? (
                    <div className="text-center py-12 text-xs text-dark-muted">
                      No subjects configured for this class and schedule.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {allSubjectsToShow.map((sub) => {
                        const res = classResultsIndex[String(sub.id)];
                        const cfg = ENTRY_STATUS_CONFIG[res?.entry_status || 'pending'];
                        const subEntries = summaryEntries.filter((e) => e.result_id === res?.id);
                        const validMarks = subEntries
                          .filter((e) => !e.is_absent && e.marks_obtained !== null && e.marks_obtained !== '')
                          .map((e) => Number(e.marks_obtained));
                        const absentCount = subEntries.filter((e) => e.is_absent).length;
                        const avg =
                          validMarks.length > 0
                            ? (validMarks.reduce((a, b) => a + b, 0) / validMarks.length).toFixed(1)
                            : null;
                        const highest = validMarks.length > 0 ? Math.max(...validMarks) : null;
                        const passMarks = res?.pass_marks ? Number(res.pass_marks) : null;
                        const passCount = passMarks
                          ? validMarks.filter((m) => m >= passMarks).length
                          : null;
                        const evaluatedCount = validMarks.length + absentCount;
                        const progressPct =
                          classStudents.length > 0
                            ? Math.min(100, Math.round((evaluatedCount / classStudents.length) * 100))
                            : 0;

                        return (
                          <div
                            key={sub.id}
                            className="bg-slate-50/70 border border-light-border rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:shadow-xs transition-shadow"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-black text-dark-primary">{sub.name}</h4>
                                    {sub.isAdHoc && (
                                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                        Ad-Hoc
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-dark-muted mt-0.5">
                                    Max: <strong>{res?.max_marks || 100}</strong>
                                    {passMarks ? ` · Pass: ${passMarks}` : ''}
                                  </p>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.color}`}>
                                  <i className={`fas ${cfg.icon} mr-1 text-[8px]`} />
                                  {cfg.label}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-dark-muted font-bold">
                                  <span>Marks Recorded</span>
                                  <span>{evaluatedCount} / {classStudents.length} ({progressPct}%)</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      progressPct === 100
                                        ? 'bg-emerald-500'
                                        : progressPct > 0
                                          ? 'bg-amber-500'
                                          : 'bg-slate-300'
                                    }`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>

                              {/* Score Stats */}
                              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                                <div className="bg-white p-1.5 rounded-xl border border-light-border">
                                  <span className="text-[10px] text-dark-muted block">Average</span>
                                  <span className="text-xs font-black text-dark-primary">{avg || '—'}</span>
                                </div>
                                <div className="bg-white p-1.5 rounded-xl border border-light-border">
                                  <span className="text-[10px] text-dark-muted block">Highest</span>
                                  <span className="text-xs font-black text-emerald-700">{highest ?? '—'}</span>
                                </div>
                                <div className="bg-white p-1.5 rounded-xl border border-light-border">
                                  <span className="text-[10px] text-dark-muted block">Absent</span>
                                  <span className="text-xs font-black text-rose-700">{absentCount}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleSubjectSelect(sub.id);
                                setActiveTab('entry');
                              }}
                              className="w-full py-1.5 px-3 bg-white hover:bg-emerald-50 border border-light-border hover:border-emerald-200 text-dark-slate hover:text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <i className="fas fa-edit text-[10px]" />
                              <span>Open in Entry Register</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm p-8">
                <i className="fas fa-chart-pie text-4xl text-slate-300 mb-4 block" />
                <p className="text-base font-bold text-dark-primary">Select an Exam Schedule and Class</p>
                <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
                  Choose an examination event and class section from the dropdowns above to view class-level score summaries.
                </p>
              </div>
            )}
          </ConditionalBlock>
        )}
      </div>

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

