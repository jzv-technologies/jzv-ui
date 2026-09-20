// src/components/examinations/ExamResultsManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { ConditionalBlock, useCanAccess } from '../portal-shared/ConditionalBlock';
import ExamResultsEntryGrid from './ExamResultsEntryGrid';
import ProgressReportGenerator from './ProgressReportGenerator';
import MultiSelectDropdown from '../MultiSelectDropdown';
import { getAdminConfig } from '../../utils/adminConfigUtils';
import { DEFAULT_TEMPLATE } from './ProgressReportDesigner';

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

  // Capability driven strictly by app_view_controller component
  const canManageAllMarks = canAccess('exam-results-status-override');

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
      {
        id: 'report',
        componentName: 'exam-results-tab-report',
        label: 'Progress Reports',
        icon: 'fa-file-invoice',
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
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
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
  const [classAssignments, setClassAssignments] = useState([]);

  // Exam results
  const [results, setResults] = useState([]);

  // UI state
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [adHocSubjectId, setAdHocSubjectId] = useState('');
  const [adHocMaxMarks, setAdHocMaxMarks] = useState('100');
  const [adHocPassMarks, setAdHocPassMarks] = useState('');
  const [savingAdHoc, setSavingAdHoc] = useState(false);

  // Marking Scheme Dialog State
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [schemeEdits, setSchemeEdits] = useState({});
  const [bulkMaxMarks, setBulkMaxMarks] = useState('100');
  const [bulkPassMarks, setBulkPassMarks] = useState('35');
  const [savingScheme, setSavingScheme] = useState(false);

  // Progress Report Top Filter State
  const [reportStudentScope, setReportStudentScope] = useState('all'); // 'all' | 'selected'
  const [reportSelectedStudentIds, setReportSelectedStudentIds] = useState([]);
  const [reportTemplates, setReportTemplates] = useState([DEFAULT_TEMPLATE]);
  const [reportTemplateId, setReportTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const [isReportDesignerOpen, setIsReportDesignerOpen] = useState(false);

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
      dbClassAssignments,
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
      safe(supabase.from('class_assignments').select('*')),
      safe(supabase.from('exam_results').select('*')),
    ]);

    setSchedules(dbSchedules);
    setClasses(dbClasses);
    setSubjects(dbSubjects);
    setStudents(dbStudents);
    setTeachers(dbTeachers);
    setSlots(dbSlots);
    setClassSubjects(dbClassSubjects);
    setClassAssignments(dbClassAssignments);
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

  // Load report card templates strictly via RPC call with local cache fallback
  useEffect(() => {
    const loadReportTemplates = async () => {
      try {
        const data = await getAdminConfig('exam_progress_report_templates', [DEFAULT_TEMPLATE]);
        if (data && Array.isArray(data) && data.length > 0) {
          setReportTemplates(data);
          setReportTemplateId(data[0].id);
        }
      } catch (err) {
        console.warn('[ExamResultsManager] Failed to load progress report templates:', err);
      }
    };
    loadReportTemplates();
  }, []);

  // Sync selected students when classStudents updates
  useEffect(() => {
    if (classStudents.length > 0) {
      setReportSelectedStudentIds(classStudents.map((s) => String(s.id)));
    } else {
      setReportSelectedStudentIds([]);
    }
  }, [classStudents]);

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

  const handleSubjectSelect = (subjectId) => {
    const sStr = String(subjectId);
    setSelectedSubjectIds((prev) =>
      prev.includes(sStr) ? prev.filter((id) => id !== sStr) : [...prev, sStr]
    );
  };

  const handleSubjectSelectSingle = (subjectId) => {
    setSelectedSubjectIds([String(subjectId)]);
  };

  const handleStatusUpdate = useCallback(
    async (resultId, newStatus) => {
      if (!canAccess('exam-results-status-override')) {
        showToast('Permission required to change result status', 'error');
        return;
      }
      await supabase.from('exam_results').update({ entry_status: newStatus }).eq('id', resultId);
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, entry_status: newStatus } : r))
      );
    },
    [canAccess]
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

  const activeResults = useMemo(() => {
    if (!selectedClassId || selectedSubjectIds.length === 0) return [];
    return selectedSubjectIds
      .map((subId) => {
        const found = classResultsIndex[String(subId)];
        if (found) return found;
        return {
          id: `temp_${subId}`,
          schedule_id: Number(selectedScheduleId),
          class_id: Number(selectedClassId),
          subject_id: Number(subId),
          max_marks: 100,
          pass_marks: null,
          entry_status: 'pending',
          is_from_schedule: true,
        };
      })
      .filter(Boolean);
  }, [selectedClassId, selectedSubjectIds, classResultsIndex, selectedScheduleId]);

  const activeSubjects = useMemo(() => {
    return activeResults
      .map((r) => subjects.find((s) => String(s.id) === String(r.subject_id)))
      .filter(Boolean);
  }, [activeResults, subjects]);

  // Ensure DB rows exist for all selected subjects
  useEffect(() => {
    if (!selectedScheduleId || !selectedClassId || selectedSubjectIds.length === 0) return;
    const initMissing = async () => {
      let created = false;
      for (const sId of selectedSubjectIds) {
        if (!classResultsIndex[String(sId)]) {
          await ensureResult(sId);
          created = true;
        }
      }
      if (created) {
        await refreshResults();
      }
    };
    initMissing();
  }, [selectedScheduleId, selectedClassId, selectedSubjectIds, classResultsIndex, ensureResult, refreshResults]);

  // Active slots and permission determination for each selected subject
  const activeSlots = useMemo(() => {
    if (!selectedScheduleId || !selectedClassId || activeResults.length === 0) return {};
    const slotsMap = {};
    activeResults.forEach((result) => {
      const slot = slots.find(
        (s) =>
          String(s.schedule_id) === String(selectedScheduleId) &&
          String(s.class_id) === String(selectedClassId) &&
          String(s.subject_id) === String(result.subject_id)
      );
      if (slot) {
        slotsMap[String(result.id)] = slot;
      }
    });
    return slotsMap;
  }, [slots, selectedScheduleId, selectedClassId, activeResults]);

  const activeInvigilatorNames = useMemo(() => {
    const names = {};
    Object.entries(activeSlots).forEach(([resultId, slot]) => {
      if (slot?.teacher_id) {
        names[resultId] = teacherMap[String(slot.teacher_id)] || null;
      }
    });
    return names;
  }, [activeSlots, teacherMap]);

  // Check if logged-in teacher is allocated to this subject in class_assignments
  const isAllocatedSubjectTeacher = useMemo(() => {
    const allocatedMap = {};
    if (!teacherRecord?.id || !selectedClassId) return allocatedMap;
    activeResults.forEach((result) => {
      const isAssigned = classAssignments.some(
        (ca) =>
          String(ca.class_id) === String(selectedClassId) &&
          String(ca.subject_id) === String(result.subject_id) &&
          String(ca.teacher_id) === String(teacherRecord.id)
      );
      allocatedMap[String(result.id)] = isAssigned;
    });
    return allocatedMap;
  }, [teacherRecord, selectedClassId, activeResults, classAssignments]);

  // Enforce access control for mark editing - per subject
  const canEditMarksForSubject = useMemo(() => {
    const editMap = {};
    activeResults.forEach((result) => {
      const isInvigilator =
        activeSlots[String(result.id)]?.teacher_id &&
        String(teacherRecord?.id) === String(activeSlots[String(result.id)]?.teacher_id);
      const isSubjectTeacherForThis = isAllocatedSubjectTeacher[String(result.id)];
      editMap[String(result.id)] =
        canAccess('exam-results-edit-marks') &&
        (canManageAllMarks || isInvigilator || isSubjectTeacherForThis);
    });
    return editMap;
  }, [activeResults, activeSlots, teacherRecord, canManageAllMarks, canAccess, isAllocatedSubjectTeacher]);

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

  // Auto-select all subjects for class when class or subject list changes
  useEffect(() => {
    if (!selectedClassId || allSubjectsToShow.length === 0) {
      setSelectedSubjectIds([]);
      return;
    }

    setSelectedSubjectIds((prev) => {
      const valid = prev.filter((id) => allSubjectsToShow.some((s) => String(s.id) === String(id)));
      return valid.length > 0 ? valid : allSubjectsToShow.map((s) => String(s.id));
    });
  }, [selectedClassId, allSubjectsToShow]);

  const handleOpenSchemeModal = () => {
    const initial = {};
    allSubjectsToShow.forEach((sub) => {
      const res = classResultsIndex[String(sub.id)];
      initial[String(sub.id)] = {
        max_marks: res?.max_marks !== undefined ? res.max_marks : 100,
        pass_marks: res?.pass_marks !== undefined && res?.pass_marks !== null ? res.pass_marks : 35,
      };
    });
    setSchemeEdits(initial);
    setShowSchemeModal(true);
  };

  const handleBulkApplyScheme = () => {
    const maxVal = Number(bulkMaxMarks) || 100;
    const passVal = bulkPassMarks !== '' ? Number(bulkPassMarks) : null;
    setSchemeEdits((prev) => {
      const updated = { ...prev };
      allSubjectsToShow.forEach((sub) => {
        updated[String(sub.id)] = {
          max_marks: maxVal,
          pass_marks: passVal,
        };
      });
      return updated;
    });
    showToast(`Applied ${maxVal} Max Marks to all ${allSubjectsToShow.length} subjects`, 'info');
  };

  const handleSaveScheme = async () => {
    setSavingScheme(true);
    try {
      for (const sub of allSubjectsToShow) {
        const edit = schemeEdits[String(sub.id)];
        if (!edit) continue;
        const existing = classResultsIndex[String(sub.id)];
        const maxVal = Number(edit.max_marks) || 100;
        const passVal = edit.pass_marks !== '' && edit.pass_marks !== null ? Number(edit.pass_marks) : null;

        if (existing && !String(existing.id).startsWith('temp_')) {
          await supabase
            .from('exam_results')
            .update({
              max_marks: maxVal,
              pass_marks: passVal,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('exam_results').upsert(
            {
              schedule_id: Number(selectedScheduleId),
              class_id: Number(selectedClassId),
              subject_id: Number(sub.id),
              max_marks: maxVal,
              pass_marks: passVal,
              entry_status: 'pending',
              is_from_schedule: !sub.isAdHoc,
            },
            { onConflict: 'schedule_id,class_id,subject_id' }
          );
        }
      }
      await refreshResults();
      showToast('Marking scheme updated successfully', 'success');
      setShowSchemeModal(false);
    } catch (err) {
      showToast('Failed to save marking scheme: ' + err.message, 'error');
    } finally {
      setSavingScheme(false);
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
    <div
      className="w-full flex flex-col min-h-[500px] m-0 p-0 animate-in fade-in duration-300"
      data-feature="exam-results"
    >
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
                  Exam Results
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
                {canManageAllMarks
                  ? 'Coordinator / Admin view — enter, review, or override marks for any subject'
                  : teacherRecord?.name
                    ? `Teacher view (${teacherRecord.name}) — enter marks for assigned invigilation subjects`
                    : 'Enter and manage examination marks per subject and class'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {schedules.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">
                  Exam:
                </span>
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
          <div className="flex items-center gap-2.5 flex-wrap" data-feature-filter={activeTab}>
            {/* Workspace Tabs (if both entry and summary are enabled) */}
            {availableTabs.length > 1 && (
              <div
                className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto mr-1"
                data-feature-tab="exam-results-tabs"
              >
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
              <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">
                Class:
              </span>
              <select
                value={selectedClassId || ''}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSubjectIds([]);
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

            {/* Subject Selector MultiSelectDropdown in top filter bar */}
            {activeTab === 'entry' && selectedClassId && (
              <div className="min-w-[180px] max-w-[300px]">
                <MultiSelectDropdown
                  label="Subjects"
                  options={allSubjectsToShow.map((sub) => ({
                    id: String(sub.id),
                    label: sub.name,
                  }))}
                  selected={selectedSubjectIds}
                  onChange={setSelectedSubjectIds}
                  placeholder="Select subjects..."
                  fullWidth={false}
                />
              </div>
            )}

            {/* Marking Scheme button in data-feature-filter */}
            {activeTab === 'entry' && selectedScheduleId && selectedClassId && (
              <ConditionalBlock name="exam-results-marking-scheme" roles={userRoles}>
                <button
                  type="button"
                  onClick={handleOpenSchemeModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-dark-slate border border-light-border rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                  title="Configure Maximum and Pass Marks for Subjects"
                >
                  <i className="fas fa-sliders text-emerald-600 text-[11px]" />
                  <span>Marking Scheme</span>
                </button>
              </ConditionalBlock>
            )}

            {/* Ad-Hoc Subject Button guarded by ConditionalBlock */}
            {activeTab === 'entry' && selectedScheduleId && selectedClassId && (
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

            {/* Progress Report Top Filters (repurposing Exam & Class, adding Scope, Template, Designer, Print) */}
            {activeTab === 'report' && (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Student Scope Selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">
                    Scope:
                  </span>
                  <select
                    value={reportStudentScope}
                    onChange={(e) => setReportStudentScope(e.target.value)}
                    className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer"
                  >
                    <option value="all">Entire Class ({classStudents.length})</option>
                    <option value="selected">Selected Students</option>
                  </select>
                </div>

                {/* Conditional Students MultiSelect */}
                {reportStudentScope === 'selected' && (
                  <div className="min-w-[160px] max-w-[240px]">
                    <MultiSelectDropdown
                      label="Students"
                      options={classStudents.map((s) => ({
                        id: String(s.id),
                        label: `${s.student_name} (${s.admission_no})`,
                      }))}
                      selected={reportSelectedStudentIds}
                      onChange={setReportSelectedStudentIds}
                      placeholder="Select students..."
                      fullWidth={false}
                    />
                  </div>
                )}

                {/* Active Template Selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-light-border px-2.5 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-dark-muted whitespace-nowrap">
                    Template:
                  </span>
                  <select
                    value={reportTemplateId}
                    onChange={(e) => setReportTemplateId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-dark-primary outline-none cursor-pointer max-w-[170px] truncate"
                  >
                    {reportTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Designer button */}
                <button
                  type="button"
                  onClick={() => setIsReportDesignerOpen(true)}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  title="Design / Edit Template"
                >
                  <i className="fas fa-palette text-[10px]" />
                  <span>Designer</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={classStudents.length === 0}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <i className="fas fa-print text-xs" />
                  <span>Print / Export PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Tab Content Areas ── */}
      <div className="w-full p-1 sm:p-2 md:p-3 " data-feature="exam-results-content">
        {/* Tab 1: Marks Entry Register */}
        {activeTab === 'entry' && (
          <ConditionalBlock name="exam-results-tab-entry" roles={userRoles}>
            {selectedScheduleId && selectedClassId ? (
              <div className="w-full space-y-4">
                {activeResults.length > 0 ? (
                  <ExamResultsEntryGrid
                    results={activeResults}
                    subjects={activeSubjects}
                    students={classStudents}
                    onStatusUpdate={handleStatusUpdate}
                    canEditMap={canEditMarksForSubject}
                    invigilatorNames={activeInvigilatorNames}
                    canOverrideInvigilator={canManageAllMarks}
                    userRoles={userRoles}
                  />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[360px] bg-white border border-light-border rounded-2xl sm:rounded-3xl p-8 shadow-xs">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 shadow-2xs">
                        <i className="fas fa-hand-pointer" />
                      </div>
                      <p className="text-sm font-bold text-dark-primary">
                        Select Subject(s) to Enter Marks
                      </p>
                      <p className="text-xs text-dark-muted mt-1 max-w-sm text-center">
                        Use the dropdown above to select one or more subjects, then enter marks for all selected subjects in the grid below.
                      </p>
                    </div>
                  )}
                </div>
            ) : (
              <div className="text-center py-20 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm p-8">
                <i className="fas fa-clipboard-list text-4xl text-slate-300 mb-4 block" />
                <p className="text-base font-bold text-dark-primary">
                  Select an Exam Schedule and Class
                </p>
                <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
                  Choose an examination event and class section from the dropdowns above to view
                  scheduled subjects and record student marks.
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
                    <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider block">
                      Total Papers
                    </span>
                    <span className="text-2xl font-black text-dark-primary mt-1 block">
                      {allSubjectsToShow.length}
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Completed
                    </span>
                    <span className="text-2xl font-black text-emerald-700 mt-1 block">
                      {completionStats.completed}
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                      In Progress
                    </span>
                    <span className="text-2xl font-black text-amber-700 mt-1 block">
                      {completionStats.inProgress}
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-light-border shadow-2xs">
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                      Pending
                    </span>
                    <span className="text-2xl font-black text-rose-700 mt-1 block">
                      {completionStats.pending}
                    </span>
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
                      <p className="text-xs text-dark-muted mt-2 font-semibold">
                        Loading class performance metrics...
                      </p>
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
                          .filter(
                            (e) =>
                              !e.is_absent && e.marks_obtained !== null && e.marks_obtained !== ''
                          )
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
                            ? Math.min(
                                100,
                                Math.round((evaluatedCount / classStudents.length) * 100)
                              )
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
                                    <h4 className="text-xs font-black text-dark-primary">
                                      {sub.name}
                                    </h4>
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
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.color}`}
                                >
                                  <i className={`fas ${cfg.icon} mr-1 text-[8px]`} />
                                  {cfg.label}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-dark-muted font-bold">
                                  <span>Marks Recorded</span>
                                  <span>
                                    {evaluatedCount} / {classStudents.length} ({progressPct}%)
                                  </span>
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
                                  <span className="text-xs font-black text-dark-primary">
                                    {avg || '—'}
                                  </span>
                                </div>
                                <div className="bg-white p-1.5 rounded-xl border border-light-border">
                                  <span className="text-[10px] text-dark-muted block">Highest</span>
                                  <span className="text-xs font-black text-emerald-700">
                                    {highest ?? '—'}
                                  </span>
                                </div>
                                <div className="bg-white p-1.5 rounded-xl border border-light-border">
                                  <span className="text-[10px] text-dark-muted block">Absent</span>
                                  <span className="text-xs font-black text-rose-700">
                                    {absentCount}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubjectIds([String(sub.id)]);
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
                <p className="text-base font-bold text-dark-primary">
                  Select an Exam Schedule and Class
                </p>
                <p className="text-xs text-dark-muted mt-1 max-w-md mx-auto">
                  Choose an examination event and class section from the dropdowns above to view
                  class-level score summaries.
                </p>
              </div>
            )}
          </ConditionalBlock>
        )}

        {activeTab === 'report' && (
          <ConditionalBlock name="exam-results-tab-report" roles={userRoles}>
            <ProgressReportGenerator
              schedules={schedules}
              classes={classes}
              subjects={subjects}
              initialScheduleId={selectedScheduleId}
              initialClassId={selectedClassId}
              userRoles={userRoles}
              studentSelectionMode={reportStudentScope}
              onStudentSelectionModeChange={setReportStudentScope}
              selectedStudentIds={reportSelectedStudentIds}
              onSelectedStudentIdsChange={setReportSelectedStudentIds}
              selectedTemplateId={reportTemplateId}
              onSelectedTemplateIdChange={setReportTemplateId}
              isDesignerOpen={isReportDesignerOpen}
              onIsDesignerOpenChange={setIsReportDesignerOpen}
              onTemplatesLoaded={setReportTemplates}
              hideControlBar={true}
            />
          </ConditionalBlock>
        )}
      </div>

      {/* Marking Scheme Modal Dialog */}
      {showSchemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-light-border bg-emerald-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shadow-2xs">
                  <i className="fas fa-sliders" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-primary">Marking Scheme</h3>
                  <p className="text-xs text-dark-muted mt-0.5">
                    {classes.find((c) => String(c.id) === String(selectedClassId))?.name || 'Class'} ·{' '}
                    {schedules.find((s) => String(s.id) === String(selectedScheduleId))?.name || 'Exam'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSchemeModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-200 text-dark-muted flex items-center justify-center transition-all cursor-pointer"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Quick Bulk Apply Bar */}
            <div className="p-4 bg-slate-50 border-b border-light-border shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-dark-primary flex items-center gap-1.5">
                    <i className="fas fa-bolt text-amber-500 text-xs" />
                    Apply in One Go:
                  </span>
                  <div className="flex items-center gap-1.5 bg-white border border-light-border px-2.5 py-1 rounded-xl shadow-2xs">
                    <span className="text-[11px] font-bold text-dark-muted">Max:</span>
                    <input
                      type="number"
                      value={bulkMaxMarks}
                      onChange={(e) => setBulkMaxMarks(e.target.value)}
                      className="w-14 text-xs font-bold text-dark-primary outline-none"
                      placeholder="100"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-light-border px-2.5 py-1 rounded-xl shadow-2xs">
                    <span className="text-[11px] font-bold text-dark-muted">Pass:</span>
                    <input
                      type="number"
                      value={bulkPassMarks}
                      onChange={(e) => setBulkPassMarks(e.target.value)}
                      className="w-14 text-xs font-bold text-dark-primary outline-none"
                      placeholder="35"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleBulkApplyScheme}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fas fa-check-double text-[10px]" />
                    <span>Apply to All Subjects</span>
                  </button>
                </div>
                <span className="text-[11px] text-dark-muted font-semibold">
                  {allSubjectsToShow.length} {allSubjectsToShow.length === 1 ? 'subject' : 'subjects'}
                </span>
              </div>
            </div>

            {/* Subjects Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {allSubjectsToShow.length === 0 ? (
                <div className="text-center py-10 text-dark-muted text-xs font-semibold">
                  No subjects found for this class.
                </div>
              ) : (
                <div className="border border-light-border rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-light-border text-dark-muted font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Teacher / Invigilator</th>
                        <th className="py-2.5 px-3 w-28">Max Marks</th>
                        <th className="py-2.5 px-3 w-28">Pass Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allSubjectsToShow.map((sub) => {
                        const edit = schemeEdits[String(sub.id)] || { max_marks: 100, pass_marks: 35 };
                        const slot = slots.find(
                          (s) =>
                            String(s.schedule_id) === String(selectedScheduleId) &&
                            String(s.class_id) === String(selectedClassId) &&
                            String(s.subject_id) === String(sub.id)
                        );
                        const slotTeacher = slot?.teacher_id ? teacherMap[String(slot.teacher_id)] : null;
                        const ca = classAssignments.find(
                          (a) =>
                            String(a.class_id) === String(selectedClassId) &&
                            String(a.subject_id) === String(sub.id)
                        );
                        const caTeacher = ca?.teacher_id ? teacherMap[String(ca.teacher_id)] : null;
                        const teacherDisplay = slotTeacher || caTeacher || '—';

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-dark-primary">
                              <div className="flex items-center gap-1.5">
                                <span>{sub.name}</span>
                                {sub.code && (
                                  <span className="text-[10px] text-dark-muted font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                    {sub.code}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {sub.isAdHoc ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  <i className="fas fa-tag text-[8px]" />
                                  Ad-Hoc
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                  <i className="fas fa-calendar-check text-[8px]" />
                                  Scheduled
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-dark-muted">
                              <span className="truncate max-w-[140px] block" title={teacherDisplay}>
                                {teacherDisplay}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                value={edit.max_marks ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSchemeEdits((prev) => ({
                                    ...prev,
                                    [String(sub.id)]: {
                                      ...prev[String(sub.id)],
                                      max_marks: val === '' ? '' : Number(val),
                                    },
                                  }));
                                }}
                                className="w-24 px-2.5 py-1.5 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                                placeholder="100"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={edit.pass_marks ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSchemeEdits((prev) => ({
                                    ...prev,
                                    [String(sub.id)]: {
                                      ...prev[String(sub.id)],
                                      pass_marks: val === '' ? '' : Number(val),
                                    },
                                  }));
                                }}
                                className="w-24 px-2.5 py-1.5 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                                placeholder="35"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-light-border bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-dark-muted font-medium">
                Changes apply across this class examination results.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSchemeModal(false)}
                  disabled={savingScheme}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-white transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveScheme}
                  disabled={savingScheme}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingScheme ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save text-xs" />
                      <span>Save Marking Scheme</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
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
