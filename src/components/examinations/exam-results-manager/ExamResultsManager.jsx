import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';
import { ConditionalBlock, useCanAccess } from '../../portal-shared/ConditionalBlock';
import MultiSelectDropdown from '../../MultiSelectDropdown';
import { getAdminConfig } from '../../../utils/adminConfigUtils';
import { DEFAULT_TEMPLATE } from '../ReportCardDesigner';
import { isScheduleReportPublished, broadcastSchedulePublishedChange } from '../../../utils/examScheduleUtils';
import ExamAttendanceUploadModal from '../ExamAttendanceUploadModal';
import ExamRemarksModal from '../ExamRemarksModal';

// Import hooks
import { useMasterData } from './hooks/useMasterData';
import { useScheduleData } from './hooks/useScheduleData';
import { useEntrySupport } from './hooks/useEntrySupport';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useAccessControl } from './hooks/useAccessControl';
import { useSummaryEntries } from './hooks/useSummaryEntries';

// Import components
import { HeaderBar, TabBar, SaveModeToggle } from './components';

// Import tabs
import { EntryTab, SummaryTab, AttendanceTab, RemarksTab, ReportTab } from './tabs';

// Import modals
import {
  MarkingSchemeModal,
  AdHocSubjectModal,
  OfflineMarkSheetModal,
  ImportMarksModal,
  ConfirmModal,
} from './modals';

// Import constants
import {
  ENTRY_STATUS_CONFIG,
  WORKSPACE_TABS,
  REPORT_TYPES,
  PAPER_SIZES,
  ORIENTATIONS,
  SAVE_MODES,
  REMARKS_MODAL_MODES,
  MANAGEMENT_ROLES,
  TEACHER_ROLES,
  ALL_EDIT_ROLES,
  DEFAULT_MAX_MARKS,
  DEFAULT_PASS_MARKS,
} from './constants';

// Import utilities
import {
  isManagementRole,
  canEditMarks as checkCanEditMarks,
  canPublishReport as checkCanPublishReport,
  canUploadAttendance as checkCanUploadAttendance,
  canUploadRemarks as checkCanUploadRemarks,
  isMatchingTeacher,
  isAllocatedSubjectTeacher,
  canEditMarksForSubject,
  buildAllSubjectsToShow,
  getAvailableAdHocSubjects,
  calculateCompletionStats,
  buildMarksCSV,
  downloadCSV,
  handleTogglePublishReport as createTogglePublishReportConfirm,
  setupRealtimeSubscriptions,
  setupBroadcastChannel,
  setupWindowEventListeners,
  setupScheduleRefresh,
  loadMasterData,
  loadScheduleData,
  loadEntrySupportData,
  loadSummaryEntries,
  ensureResult,
  removeSubject,
  saveMarkingScheme,
  addAdHocSubject,
  bulkApplyScheme,
} from './utils';

const ExamResultsManager = ({
  userRoles = [],
  user,
  teacherRecord,
  initialTab = null,
  allowedTabs = null,
}) => {
  const canAccess = useCanAccess(userRoles);

  // Capability driven strictly by management roles
  const canManageAllMarks = isManagementRole(userRoles);
  const canPublishReport = checkCanPublishReport(userRoles, canAccess);
  const canUploadAttendance = checkCanUploadAttendance(userRoles, canAccess);
  const canUploadRemarks = checkCanUploadRemarks(userRoles, canAccess);

  const isReportOnly =
    initialTab === 'report' ||
    (Array.isArray(allowedTabs) && allowedTabs.length === 1 && allowedTabs[0] === 'report') ||
    (Array.isArray(allowedTabs) &&
      allowedTabs.includes('report') &&
      !allowedTabs.includes('entry') &&
      !allowedTabs.includes('attendance'));

  // Workspace Tabs
  const workspaceTabs = useMemo(() => {
    if (isReportOnly) {
      return [
        {
          id: 'report',
          componentName: 'exam-results-tab-report',
          label: 'Progress Reports',
          icon: 'fa-file-invoice',
        },
      ];
    }

    const allTabs = [
      {
        id: 'entry',
        componentName: 'exam-mark-entry-tab',
        label: 'Marks Entry',
        icon: 'fa-clipboard-check',
      },
      {
        id: 'summary',
        componentName: 'exam-results-tab-summary',
        label: 'Class Summary',
        icon: 'fa-chart-pie',
      },
      {
        id: 'attendance',
        componentName: 'exam-results-tab-attendance',
        label: 'Attendance',
        icon: 'fa-calendar-check',
      },
      {
        id: 'remarks',
        componentName: 'exam-results-tab-remarks',
        label: 'Remarks & Feedback',
        icon: 'fa-comment-dots',
      },
    ];

    if (Array.isArray(allowedTabs) && allowedTabs.length > 0) {
      return allTabs.filter((t) => allowedTabs.includes(t.id));
    }
    return allTabs;
  }, [allowedTabs, isReportOnly]);

  const availableTabs = useMemo(() => {
    return workspaceTabs.filter((tab) => {
      if (tab.id === 'attendance') {
        return (
          canAccess('exam-results-tab-attendance') ||
          canAccess('exam-attendance-tab') ||
          canAccess('exam-attendance-upload') ||
          canAccess('exam-mark-entry-tab') ||
          canAccess('exam-results')
        );
      }
      if (tab.id === 'remarks') {
        return (
          canAccess('exam-results-tab-remarks') ||
          canAccess('exam-remarks-tab') ||
          canAccess('exam-remarks-upload') ||
          canAccess('exam-mark-entry-tab') ||
          canAccess('exam-results')
        );
      }
      return canAccess(tab.componentName);
    });
  }, [workspaceTabs, canAccess]);

  const [activeTab, setActiveTab] = useState(() => {
    if (isReportOnly || initialTab === 'report') return 'report';
    if (initialTab) {
      if (
        initialTab === 'entry' &&
        canAccess('exam-mark-entry-tab') &&
        (!allowedTabs || allowedTabs.includes('entry'))
      )
        return 'entry';
      if (
        initialTab === 'summary' &&
        canAccess('exam-results-tab-summary') &&
        (!allowedTabs || allowedTabs.includes('summary'))
      )
        return 'summary';
      if (initialTab === 'attendance' && (!allowedTabs || allowedTabs.includes('attendance')))
        return 'attendance';
      if (initialTab === 'remarks' && (!allowedTabs || allowedTabs.includes('remarks')))
        return 'remarks';
      if (
        initialTab === 'report' &&
        canAccess('exam-results-tab-report') &&
        (!allowedTabs || allowedTabs.includes('report'))
      )
        return 'report';
      if (
        canAccess(`exam-results-tab-${initialTab}`) &&
        (!allowedTabs || allowedTabs.includes(initialTab))
      )
        return initialTab;
      if (canAccess(initialTab) && (!allowedTabs || allowedTabs.includes(initialTab)))
        return initialTab;
    }
    if (Array.isArray(allowedTabs) && allowedTabs.length > 0) {
      return allowedTabs[0];
    }
    if (canAccess('exam-mark-entry-tab')) return 'entry';
    return availableTabs[0]?.id || 'entry';
  });

  // Ensure activeTab is always one of the permitted availableTabs
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // UI State
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [attendanceClassIds, setAttendanceClassIds] = useState([]);
  const [remarksClassIds, setRemarksClassIds] = useState([]);
  const [remarksModalMode, setRemarksModalMode] = useState('individual');
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [adHocSubjectId, setAdHocSubjectId] = useState('');
  const [adHocMaxMarks, setAdHocMaxMarks] = useState('100');
  const [adHocPassMarks, setAdHocPassMarks] = useState('');
  const [savingAdHoc, setSavingAdHoc] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showPrintSheetModal, setShowPrintSheetModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [schemeEdits, setSchemeEdits] = useState({});
  const [bulkMaxMarks, setBulkMaxMarks] = useState('100');
  const [bulkPassMarks, setBulkPassMarks] = useState('35');
  const [savingScheme, setSavingScheme] = useState(false);
  const [reportType, setReportType] = useState('progress');
  const [rankHolderClassIds, setRankHolderClassIds] = useState([]);
  const [reportSelectedStudentIds, setReportSelectedStudentIds] = useState([]);
  const [reportTemplates, setReportTemplates] = useState([DEFAULT_TEMPLATE]);
  const [reportTemplateId, setReportTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const [paperSize, setPaperSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [remarksCount, setRemarksCount] = useState(0);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [publishingReport, setPublishingReport] = useState(false);
  const [saveMode, setSaveMode] = useState('auto');
  const [pendingChanges, setPendingChanges] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showQuickFillModal, setShowQuickFillModal] = useState(false);
  const [quickFillSubjectId, setQuickFillSubjectId] = useState('');
  const [quickFillValue, setQuickFillValue] = useState('');
  const [summaryClassFilter, setSummaryClassFilter] = useState('');
  const [isAllExpanded, setIsAllExpanded] = useState(true);
  const attendanceTabRef = useRef(null);
  const remarksTabRef = useRef(null);

  // Master data
  const {
    schedules,
    setSchedules,
    classes,
    setClasses,
    subjects,
    setSubjects,
    students,
    setStudents,
    classSubjects,
    setClassSubjects,
    loading,
    setLoading,
    refresh: refreshMasterData,
  } = useMasterData();

  // Auto-select first schedule if none selected
  useEffect(() => {
    if (schedules.length > 0 && !selectedScheduleId) {
      setSelectedScheduleId(String(schedules[0].id));
    }
  }, [schedules, selectedScheduleId]);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => String(s.id) === String(selectedScheduleId)) || null,
    [schedules, selectedScheduleId]
  );

  const isReportPublished = isScheduleReportPublished(selectedSchedule);
  const isTeacherLocked = isReportPublished && !canManageAllMarks;

  const needsScheduleData = activeTab === 'entry' || activeTab === 'summary';
  const needsEntrySupport = activeTab === 'entry';

  const {
    slots,
    setSlots,
    results,
    setResults,
    scheduleDataFor,
    setScheduleDataFor,
    scheduleLoading,
    setScheduleLoading,
    refreshResults,
  } = useScheduleData({ selectedScheduleId, needsScheduleData });

  const scheduleReady =
    Boolean(selectedScheduleId) && scheduleDataFor === String(selectedScheduleId);

  const {
    teachers,
    setTeachers,
    classAssignments,
    setClassAssignments,
    entrySupportReady,
    setEntrySupportReady,
  } = useEntrySupport({ needsEntrySupport });

  const scheduleResults = useMemo(() => {
    if (!selectedScheduleId) return [];
    return results.filter((r) => String(r.schedule_id) === String(selectedScheduleId));
  }, [results, selectedScheduleId]);

  const {
    summaryEntries,
    setSummaryEntries,
    summaryLoading,
    setSummaryLoading,
  } = useSummaryEntries({ activeTab, selectedScheduleId, scheduleResults });

  // Real-time sync
  useRealtimeSync({ selectedScheduleId, setSchedules });

  const teacherMap = useMemo(() => {
    const map = {};
    teachers.forEach((t) => {
      map[String(t.id)] = t.name;
    });
    return map;
  }, [teachers]);

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(
      (s) => String(s.class_id) === String(selectedClassId) && s.enrollment !== 'Inactive'
    );
  }, [students, selectedClassId]);

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


  const allSubjectsToShow = useMemo(() => {
    return buildAllSubjectsToShow(scheduledSubjects, classResults, subjects, classResultsIndex);
  }, [scheduledSubjects, classResults, subjects, classResultsIndex]);

  const availableAdHocSubjects = useMemo(() => {
    return getAvailableAdHocSubjects(selectedClassId, classSubjects, allSubjectsToShow, subjects);
  }, [selectedClassId, classSubjects, allSubjectsToShow, subjects]);

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

  const {
    isMatchingTeacher,
    isAllocatedSubjectTeacher,
    canEditMarksForSubject,
  } = useAccessControl({
    userRoles,
    user,
    teacherRecord,
    teacherMap,
    classAssignments,
    selectedClassId,
    activeResults,
    activeSlots,
    isTeacherLocked,
  });

  const completionStats = useMemo(() => {
    return calculateCompletionStats(allSubjectsToShow, classResultsIndex);
  }, [allSubjectsToShow, classResultsIndex]);

  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === String(selectedClassId)) || null,
    [classes, selectedClassId]
  );


  // Load report card templates
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

  // Sync selected students when class changes
  const prevClassIdForStudentsRef = useRef(null);
  useEffect(() => {
    if (!selectedClassId) {
      setReportSelectedStudentIds([]);
      prevClassIdForStudentsRef.current = null;
      return;
    }
    if (prevClassIdForStudentsRef.current !== selectedClassId) {
      prevClassIdForStudentsRef.current = selectedClassId;
      if (classStudents.length > 0) {
        setReportSelectedStudentIds(classStudents.map((s) => String(s.id)));
      } else {
        setReportSelectedStudentIds([]);
      }
    }
  }, [selectedClassId, classStudents]);

  // Ensure result rows exist for all selected subjects
  useEffect(() => {
    if (
      !selectedScheduleId ||
      !selectedClassId ||
      selectedSubjectIds.length === 0 ||
      !scheduleReady
    )
      return;
    const initMissing = async () => {
      let created = false;
      for (const sId of selectedSubjectIds) {
        if (!classResultsIndex[String(sId)]) {
          await ensureResult(supabase, {
            scheduleId: selectedScheduleId,
            classId: selectedClassId,
            subjectId: sId,
            refreshResults,
          });
          created = true;
        }
      }
      if (created) {
        await refreshResults();
      }
    };
    initMissing();
  }, [
    selectedScheduleId,
    selectedClassId,
    selectedSubjectIds,
    classResultsIndex,
    refreshResults,
    scheduleReady,
  ]);

  // Handle subject selection
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
      const existingRes = classResultsIndex[String(adHocSubjectId)];
      let error = null;
      if (existingRes) {
        const res = await supabase
          .from('exam_results')
          .update({
            max_marks: Number(adHocMaxMarks) || 100,
            pass_marks: adHocPassMarks ? Number(adHocPassMarks) : null,
            is_from_schedule: false,
          })
          .eq('id', existingRes.id);
        error = res.error;
      } else {
        const res = await supabase.from('exam_results').insert({
          schedule_id: Number(selectedScheduleId),
          class_id: Number(selectedClassId),
          subject_id: Number(adHocSubjectId),
          max_marks: Number(adHocMaxMarks) || 100,
          pass_marks: adHocPassMarks ? Number(adHocPassMarks) : null,
          is_from_schedule: false,
          entry_status: 'pending',
        });
        error = res.error;
      }
      if (error) throw error;
      const addedSubId = String(adHocSubjectId);
      showToast('Ad-hoc subject added', 'success');
      setShowAdHocForm(false);
      setAdHocSubjectId('');
      setAdHocMaxMarks('100');
      setAdHocPassMarks('');
      await refreshResults();
      setSelectedSubjectIds((prev) => (prev.includes(addedSubId) ? prev : [...prev, addedSubId]));
    } catch (err) {
      showToast(err.message || 'Failed to add ad-hoc subject', 'error');
    } finally {
      setSavingAdHoc(false);
    }
  };

  const handleRemoveSubject = useCallback(
    (subjectId) => {
      const sIdStr = String(subjectId);
      const sub = subjects.find((s) => String(s.id) === sIdStr);
      const subName = sub?.name || `Subject #${subjectId}`;
      const cls = classes.find((c) => String(c.id) === String(selectedClassId));
      const className = cls?.name || 'Class';

      const existingResult = classResultsIndex[sIdStr];
      const hasMarks =
        existingResult &&
        (existingResult.entry_status === 'completed' ||
          existingResult.entry_status === 'in_progress');

      const isAdHoc = sub?.isAdHoc ?? (existingResult ? !existingResult.is_from_schedule : false);
      const typeLabel = isAdHoc ? 'Ad-Hoc Subject' : 'Scheduled Subject';

      setConfirmModalData({
        title: `Remove ${typeLabel} "${subName}"?`,
        message: hasMarks
          ? `Marks have already been entered for "${subName}" in ${className}. Removing this subject will permanently delete all entered student marks and records for this examination. Are you sure you want to proceed?`
          : `Remove "${subName}" from Mark Entry for ${className}? This will remove it from the examination schedule and mark entry.`,
        confirmText: 'Remove Subject',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: async () => {
          setConfirmModalData(null);
          try {
            const { data: matchingResults } = await supabase
              .from('exam_results')
              .select('id')
              .eq('schedule_id', Number(selectedScheduleId))
              .eq('class_id', Number(selectedClassId))
              .eq('subject_id', Number(subjectId));

            if (matchingResults && matchingResults.length > 0) {
              const resIds = matchingResults.map((r) => r.id);
              await supabase.from('exam_result_entries').delete().in('result_id', resIds);

              const { error: resErr } = await supabase
                .from('exam_results')
                .delete()
                .in('id', resIds);

              if (resErr) throw resErr;
            }

            await supabase
              .from('exam_schedule_slots')
              .delete()
              .eq('schedule_id', Number(selectedScheduleId))
              .eq('class_id', Number(selectedClassId))
              .eq('subject_id', Number(subjectId));

            setSelectedSubjectIds((prev) => prev.filter((id) => id !== sIdStr));

            setSchemeEdits((prev) => {
              const updated = { ...prev };
              delete updated[sIdStr];
              return updated;
            });

            await refreshResults();
            showToast(`Subject "${subName}" removed from Mark Entry`, 'success');
          } catch (err) {
            console.error('Failed to remove subject:', err);
            showToast('Failed to remove subject: ' + (err.message || err), 'error');
          }
        },
      });
    },
    [subjects, classes, selectedClassId, selectedScheduleId, classResultsIndex, refreshResults]
  );

  const handleExportMarks = useCallback(async () => {
    if (!selectedClassId || classStudents.length === 0) {
      showToast('Select a class with enrolled students to export', 'warning');
      return;
    }

    const subjectsToExport = activeSubjects.length > 0 ? activeSubjects : allSubjectsToShow;
    if (subjectsToExport.length === 0) {
      showToast('No subjects available to export for this class', 'warning');
      return;
    }

    let entriesToUse = summaryEntries;
    if (entriesToUse.length === 0 && classResults.length > 0) {
      try {
        const resultIds = classResults.map((r) => r.id);
        const { data } = await supabase
          .from('exam_result_entries')
          .select('*')
          .in('result_id', resultIds);
        entriesToUse = data || [];
      } catch (err) {
        console.warn('Could not pre-fetch marks for export:', err);
      }
    }

    const csvContent = buildMarksCSV({
      selectedClassId,
      classStudents,
      activeSubjects,
      allSubjectsToShow,
      selectedSchedule,
      selectedClass,
      classResults,
      classResultsIndex,
      summaryEntries,
    });

    if (!csvContent) return;

    downloadCSV(csvContent, `Marks_${(selectedSchedule?.name || 'Exam').replace(/\s+/g, '_')}_${(selectedClass?.name || 'Class').replace(/\s+/g, '_')}.csv`);
    showToast(`Exported marks for ${classStudents.length} students`, 'success');
  }, [
    selectedClassId,
    classStudents,
    activeSubjects,
    allSubjectsToShow,
    selectedSchedule,
    selectedClass,
    classResults,
    classResultsIndex,
    summaryEntries,
  ]);

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

  // Auto-select all students for class in Progress Reports
  useEffect(() => {
    if (!selectedClassId || classStudents.length === 0) {
      setReportSelectedStudentIds([]);
      return;
    }

    setReportSelectedStudentIds((prev) => {
      const valid = prev.filter((id) => classStudents.some((s) => String(s.id) === String(id)));
      return valid.length > 0 ? valid : classStudents.map((s) => String(s.id));
    });
  }, [selectedClassId, classStudents]);

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
    const updated = bulkApplyScheme(allSubjectsToShow, bulkMaxMarks, bulkPassMarks);
    setSchemeEdits(updated);
    showToast(`Applied ${Number(bulkMaxMarks) || 100} Max Marks to all ${allSubjectsToShow.length} subjects`, 'info');
  };

  const handleSaveScheme = async () => {
    setSavingScheme(true);
    try {
      await saveMarkingScheme(supabase, {
        allSubjectsToShow,
        schemeEdits,
        selectedScheduleId,
        selectedClassId,
        classResultsIndex,
        refreshResults,
        showToast,
      });
      setShowSchemeModal(false);
    } catch (err) {
      showToast('Failed to save marking scheme: ' + err.message, 'error');
    } finally {
      setSavingScheme(false);
    }
  };

  // Save All Pending Changes (for manual save mode)
  const saveAllPendingChanges = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    const changesToSave = { ...pendingChanges };
    window.dispatchEvent(new CustomEvent('exam-results-save-all', { detail: { changesToSave } }));
  }, [pendingChanges, hasUnsavedChanges]);

  const handleQuickFill = useCallback(async () => {
    if (!quickFillSubjectId || quickFillValue === '') return;
    const targetResult = activeResults.find((r) => String(r.id) === String(quickFillSubjectId));
    if (
      !targetResult ||
      !(canEditMarksForSubject[targetResult.id] ?? canEditMarksForSubject[String(targetResult.id)])
    ) {
      showToast('You do not have permission to edit marks for this subject', 'error');
      return;
    }

    window.dispatchEvent(
      new CustomEvent('exam-results-quick-fill', {
        detail: {
          subjectId: quickFillSubjectId,
          value: quickFillValue,
          targetResult,
        },
      })
    );

    setShowQuickFillModal(false);
    setQuickFillValue('');
  }, [quickFillSubjectId, quickFillValue, activeResults, canEditMarksForSubject]);

  const handleTogglePublishReport = useCallback(async () => {
    const confirmData = await createTogglePublishReportConfirm({
      selectedScheduleId,
      selectedSchedule,
      canManageAllMarks,
      userRoles,
      supabase,
      setSchedules,
      onSchedulePublishedChange: (schedId, isPub) => {
        setSchedules((prev) =>
          prev.map((s) =>
            String(s.id) === String(schedId) ? { ...s, is_report_published: isPub } : s
          )
        );
      },
      showToast,
      setPublishingReport,
    });
    if (confirmData) {
      setConfirmModalData(confirmData);
    }
  }, [selectedScheduleId, selectedSchedule, canManageAllMarks, userRoles, setSchedules, setPublishingReport]);

  if (loading || canAccess.loading) {
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
      className="w-full flex flex-col min-h-[500px] m-0 p-0 animate-in fade-in duration-300 print:min-h-0 print:p-0 print:m-0 print:block"
      data-feature="exam-results"
    >
      <HeaderBar
        isReportOnly={isReportOnly}
        selectedSchedule={selectedSchedule}
        schedules={schedules}
        selectedScheduleId={selectedScheduleId}
        setSelectedScheduleId={setSelectedScheduleId}
        canManageAllMarks={canManageAllMarks}
        userRoles={userRoles}
        teacherRecord={teacherRecord}
        canPublishReport={canPublishReport}
        isScheduleReportPublished={isScheduleReportPublished}
        publishingReport={publishingReport}
        onTogglePublishReport={handleTogglePublishReport}
        onRefreshResults={refreshResults}
      />

      <TabBar
        availableTabs={availableTabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedScheduleId={selectedScheduleId}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        classes={classes}
        allSubjectsToShow={allSubjectsToShow}
        selectedSubjectIds={selectedSubjectIds}
        setSelectedSubjectIds={setSelectedSubjectIds}
        handleRemoveSubject={handleRemoveSubject}
        canManageAllMarks={canManageAllMarks}
        isTeacherLocked={isTeacherLocked}
        scheduleReady={scheduleReady}
        classStudents={classStudents}
        studentSearchQuery={studentSearchQuery}
        setStudentSearchQuery={setStudentSearchQuery}
        attendanceClassIds={attendanceClassIds}
        setAttendanceClassIds={setAttendanceClassIds}
        remarksClassIds={remarksClassIds}
        setRemarksClassIds={setRemarksClassIds}
        rankHolderClassIds={rankHolderClassIds}
        setRankHolderClassIds={setRankHolderClassIds}
        reportType={reportType}
        setReportType={setReportType}
        summaryClassFilter={summaryClassFilter}
        setSummaryClassFilter={setSummaryClassFilter}
        isAllExpanded={isAllExpanded}
        setIsAllExpanded={setIsAllExpanded}
        reportSelectedStudentIds={reportSelectedStudentIds}
        setReportSelectedStudentIds={setReportSelectedStudentIds}
        reportTemplates={reportTemplates}
        reportTemplateId={reportTemplateId}
        setReportTemplateId={setReportTemplateId}
        paperSize={paperSize}
        setPaperSize={setPaperSize}
        orientation={orientation}
        setOrientation={setOrientation}
        onPrint={() => window.print()}
        attendanceTabRef={attendanceTabRef}
        remarksTabRef={remarksTabRef}
        onOpenAttendanceUpload={() => setIsAttendanceModalOpen(true)}
        onOpenRemarksUpload={() => {
          setRemarksModalMode('upload');
          setIsRemarksModalOpen(true);
        }}
        onOpenRemarksIndividual={() => {
          setRemarksModalMode('individual');
          setIsRemarksModalOpen(true);
        }}
        onExportAttendance={() => attendanceTabRef.current?.exportData?.()}
        onExportRemarks={() => remarksTabRef.current?.exportData?.()}
        onRefreshAttendance={() => {
          attendanceTabRef.current?.refresh?.();
          showToast('Attendance refreshed', 'success');
        }}
        onRefreshRemarks={() => {
          remarksTabRef.current?.refresh?.();
          showToast('Remarks refreshed', 'success');
        }}
        canUploadAttendance={canUploadAttendance}
        canUploadRemarks={canUploadRemarks}
        userRoles={userRoles}
        saveMode={saveMode}
        setSaveMode={setSaveMode}
        hasUnsavedChanges={hasUnsavedChanges}
        saveAllPendingChanges={saveAllPendingChanges}
        showQuickFillModal={showQuickFillModal}
        setShowQuickFillModal={setShowQuickFillModal}
        quickFillSubjectId={quickFillSubjectId}
        setQuickFillSubjectId={setQuickFillSubjectId}
        quickFillValue={quickFillValue}
        setQuickFillValue={setQuickFillValue}
        handleQuickFill={handleQuickFill}
        onOpenSchemeModal={handleOpenSchemeModal}
        onOpenPrintSheetModal={() => setShowPrintSheetModal(true)}
        onOpenImportModal={() => setShowImportModal(true)}
        onExportMarks={handleExportMarks}
        activeResults={activeResults}
        canEditMarksForSubject={canEditMarksForSubject}
      />

      <div className="w-full p-1 sm:p-2 md:p-3 print:p-0 print:m-0" data-feature="exam-results-content">
        {activeTab === 'entry' && (
          <EntryTab
            selectedScheduleId={selectedScheduleId}
            selectedClassId={selectedClassId}
            scheduleReady={scheduleReady}
            entrySupportReady={entrySupportReady}
            activeResults={activeResults}
            activeSubjects={activeSubjects}
            classStudents={classStudents}
            canEditMarksForSubject={canEditMarksForSubject}
            activeInvigilatorNames={activeInvigilatorNames}
            canManageAllMarks={canManageAllMarks}
            userRoles={userRoles}
            studentSearchQuery={studentSearchQuery}
            onReload={refreshResults}
            saveMode={saveMode}
            setSaveMode={setSaveMode}
            pendingChanges={pendingChanges}
            setPendingChanges={setPendingChanges}
            hasUnsavedChanges={hasUnsavedChanges}
            setHasUnsavedChanges={setHasUnsavedChanges}
            showQuickFillModal={showQuickFillModal}
            setShowQuickFillModal={setShowQuickFillModal}
            quickFillSubjectId={quickFillSubjectId}
            setQuickFillSubjectId={setQuickFillSubjectId}
            quickFillValue={quickFillValue}
            setQuickFillValue={setQuickFillValue}
            saveAllPendingChanges={saveAllPendingChanges}
            handleQuickFill={handleQuickFill}
            onRemoveSubject={handleRemoveSubject}
            canRemoveSubject={canManageAllMarks && !isTeacherLocked}
            isTeacherLocked={isTeacherLocked}
            onStatusUpdate={handleStatusUpdate}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            selectedScheduleId={selectedScheduleId}
            scheduleReady={scheduleReady}
            scheduleLoading={scheduleLoading}
            schedules={schedules}
            classes={classes}
            subjects={subjects}
            students={students}
            slots={slots}
            results={results}
            summaryEntries={summaryEntries}
            summaryLoading={summaryLoading}
            onOpenEntryRegister={(classId, subjectId) => {
              setSelectedClassId(String(classId));
              setSelectedSubjectIds([String(subjectId)]);
              setActiveTab('entry');
            }}
            onRefresh={async () => {
              await refreshResults();
              showToast('Results refreshed', 'success');
            }}
            userRoles={userRoles}
            ENTRY_STATUS_CONFIG={ENTRY_STATUS_CONFIG}
            filterClassId={summaryClassFilter}
            isAllExpanded={isAllExpanded}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceTab
            selectedSchedule={selectedSchedule}
            schedules={schedules}
            classes={classes}
            students={students}
            userRoles={userRoles}
            selectedClassIds={attendanceClassIds}
            onClassIdsChange={setAttendanceClassIds}
            onOpenUploadModal={() => setIsAttendanceModalOpen(true)}
            isLocked={isTeacherLocked}
            attendanceTabRef={attendanceTabRef}
          />
        )}

        {activeTab === 'remarks' && (
          <RemarksTab
            selectedSchedule={selectedSchedule}
            schedules={schedules}
            classes={classes}
            students={students}
            userRoles={userRoles}
            selectedClassIds={remarksClassIds}
            onClassIdsChange={setRemarksClassIds}
            onOpenUploadModal={() => {
              setRemarksModalMode('upload');
              setIsRemarksModalOpen(true);
            }}
            isLocked={isTeacherLocked}
            remarksTabRef={remarksTabRef}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab
            schedules={schedules}
            classes={classes}
            subjects={subjects}
            students={students}
            selectedScheduleId={selectedScheduleId}
            selectedClassId={selectedClassId}
            rankHolderClassIds={rankHolderClassIds}
            reportType={reportType}
            userRoles={userRoles}
            reportSelectedStudentIds={reportSelectedStudentIds}
            setReportSelectedStudentIds={setReportSelectedStudentIds}
            reportTemplateId={reportTemplateId}
            setReportTemplateId={setReportTemplateId}
            reportTemplates={reportTemplates}
            setReportTemplates={setReportTemplates}
            paperSize={paperSize}
            setPaperSize={setPaperSize}
            orientation={orientation}
            setOrientation={setOrientation}
            hideControlBar={true}
            isAttendanceModalOpen={isAttendanceModalOpen}
            onAttendanceModalOpenChange={setIsAttendanceModalOpen}
            isRemarksModalOpen={isRemarksModalOpen}
            onRemarksModalOpenChange={setIsRemarksModalOpen}
            onAttendanceCountChange={setAttendanceCount}
            onRemarksCountChange={setRemarksCount}
            onSchedulePublishedChange={(schedId, isPub) => {
              setSchedules((prev) =>
                prev.map((s) =>
                  String(s.id) === String(schedId) ? { ...s, is_report_published: isPub } : s
                )
              );
            }}
          />
        )}
      </div>

      {/* Modals */}
      <MarkingSchemeModal
        isOpen={showSchemeModal}
        onClose={() => setShowSchemeModal(false)}
        allSubjectsToShow={allSubjectsToShow}
        schemeEdits={schemeEdits}
        setSchemeEdits={setSchemeEdits}
        selectedScheduleId={selectedScheduleId}
        selectedClassId={selectedClassId}
        classResultsIndex={classResultsIndex}
        refreshResults={refreshResults}
        isTeacherLocked={isTeacherLocked}
        userRoles={userRoles}
        slots={slots}
        teacherMap={teacherMap}
        classAssignments={classAssignments}
        handleRemoveSubject={handleRemoveSubject}
      />

      <AdHocSubjectModal
        isOpen={showAdHocForm}
        onClose={() => setShowAdHocForm(false)}
        availableAdHocSubjects={availableAdHocSubjects}
        adHocSubjectId={adHocSubjectId}
        setAdHocSubjectId={setAdHocSubjectId}
        adHocMaxMarks={adHocMaxMarks}
        setAdHocMaxMarks={setAdHocMaxMarks}
        adHocPassMarks={adHocPassMarks}
        setAdHocPassMarks={setAdHocPassMarks}
        selectedScheduleId={selectedScheduleId}
        selectedClassId={selectedClassId}
        classResultsIndex={classResultsIndex}
        refreshResults={refreshResults}
        isTeacherLocked={isTeacherLocked}
      />

      <OfflineMarkSheetModal
        isOpen={showPrintSheetModal}
        onClose={() => setShowPrintSheetModal(false)}
        schedule={selectedSchedule}
        selectedClass={selectedClass}
        subjects={activeSubjects.length > 0 ? activeSubjects : allSubjectsToShow}
        students={classStudents}
      />

      <ImportMarksModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        schedule={selectedSchedule}
        selectedClass={selectedClass}
        subjects={allSubjectsToShow}
        results={classResults}
        students={classStudents}
        onImportSuccess={async () => {
          await refreshResults();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(confirmModalData)}
        title={confirmModalData?.title}
        message={confirmModalData?.message}
        confirmText={confirmModalData?.confirmText}
        cancelText={confirmModalData?.cancelText || 'Cancel'}
        type={confirmModalData?.type || 'warning'}
        onConfirm={confirmModalData?.onConfirm}
        onCancel={() => setConfirmModalData(null)}
      />

      {/* Attendance Upload Modal */}
      {isAttendanceModalOpen && (
        <ExamAttendanceUploadModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          schedule={selectedSchedule}
          students={students}
          displayedStudents={
            activeTab === 'entry' || activeTab === 'report'
              ? classStudents
              : attendanceClassIds.length > 0 && !attendanceClassIds.includes('all')
                ? students.filter((s) => attendanceClassIds.includes(String(s.class_id)))
                : students
          }
          onUploadSuccess={async () => {
            await attendanceTabRef.current?.refresh?.();
            await refreshResults();
            showToast('Attendance updated successfully', 'success');
          }}
        />
      )}

      {/* Remarks & Feedback Modal */}
      {isRemarksModalOpen && (
        <ExamRemarksModal
          isOpen={isRemarksModalOpen}
          onClose={() => setIsRemarksModalOpen(false)}
          schedule={selectedSchedule}
          students={students}
          displayedStudents={
            activeTab === 'entry' || activeTab === 'report'
              ? classStudents
              : remarksClassIds.length > 0 && !remarksClassIds.includes('all')
                ? students.filter((s) => remarksClassIds.includes(String(s.class_id)))
                : students
          }
          initialMode={remarksModalMode}
          onSaveSuccess={async () => {
            await remarksTabRef.current?.refresh?.();
            await refreshResults();
            showToast('Remarks updated successfully', 'success');
          }}
        />
      )}
    </div>
  );
};

export default ExamResultsManager;