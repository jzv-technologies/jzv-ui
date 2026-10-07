// Exam Results Manager Utilities
// Shared utility functions for the Exam Results Manager

import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import { broadcastSchedulePublishedChange } from '../../../../utils/examScheduleUtils';
import { MANAGEMENT_ROLES, TEACHER_ROLES, ALL_EDIT_ROLES, BATCH_SIZE, PAGE_SIZE } from '../constants';

/**
 * Check if user has management role
 */
export const isManagementRole = (userRoles = []) => {
  return userRoles.some((r) =>
    MANAGEMENT_ROLES.includes(String(r).toLowerCase().trim())
  );
};

/**
 * Check if user has teacher role
 */
export const isTeacherRole = (userRoles = []) => {
  return userRoles.some((r) =>
    TEACHER_ROLES.includes(String(r).toLowerCase().trim())
  );
};

/**
 * Check if user can edit marks
 */
export const canEditMarks = (userRoles = [], canAccess) => {
  return (
    canAccess('exam-results-edit-marks') ||
    canAccess('exam-mark-entry-tab') ||
    canAccess('exam-results-tab-entry') ||
    canAccess('exam-results') ||
    isManagementRole(userRoles) ||
    userRoles.some((r) => ALL_EDIT_ROLES.includes(String(r).toLowerCase().trim()))
  );
};

/**
 * Check if user can manage all marks (admin/management/coordinator/principal)
 */
export const canManageAllMarks = (userRoles = []) => {
  return isManagementRole(userRoles);
};

/**
 * Check if user can publish reports
 */
export const canPublishReport = (userRoles = [], canAccess) => {
  return (
    canAccess('exam-progress-report-publish') ||
    canAccess('exam-sched-publish') ||
    isManagementRole(userRoles)
  );
};

/**
 * Check if user can upload attendance
 */
export const canUploadAttendance = (userRoles = [], canAccess) => {
  return (
    canAccess('exam-attendance-upload') ||
    canAccess('exam-mark-entry-tab') ||
    canAccess('exam-results')
  );
};

/**
 * Check if user can upload remarks
 */
export const canUploadRemarks = (userRoles = [], canAccess) => {
  return (
    canAccess('exam-remarks-upload') ||
    canAccess('exam-mark-entry-tab') ||
    canAccess('exam-results')
  );
};

/**
 * Safe query wrapper that returns data array or empty array on error
 */
export const safeQuery = async (query) => {
  try {
    const result = await query;
    return result.data || [];
  } catch {
    return [];
  }
};

/**
 * Merge two arrays by ID, preserving existing properties
 */
export const mergeById = (prev, incoming) => {
  const byId = new Map((prev || []).map((x) => [String(x.id), x]));
  incoming.forEach((x) => {
    const existing = byId.get(String(x.id)) || {};
    const merged = { ...existing, ...x };
    if (
      (merged.classification_id === undefined || merged.classification_id === null) &&
      existing.classification_id !== undefined &&
      existing.classification_id !== null
    ) {
      merged.classification_id = existing.classification_id;
    }
    if (
      (merged.seq === undefined || merged.seq === null) &&
      existing.seq !== undefined &&
      existing.seq !== null
    ) {
      merged.seq = existing.seq;
    }
    byId.set(String(x.id), merged);
  });
  return Array.from(byId.values());
};

/**
 * Build a map from array by ID
 */
export const buildMapById = (array, idKey = 'id') => {
  const map = {};
  (array || []).forEach((item) => {
    map[String(item[idKey])] = item;
  });
  return map;
};

/**
 * Filter students by class ID and enrollment status
 */
export const filterClassStudents = (students, classId) => {
  if (!classId) return [];
  return students.filter(
    (s) => String(s.class_id) === String(classId) && s.enrollment !== 'Inactive'
  );
};

/**
 * Get scheduled subjects for a class in a schedule
 */
export const getScheduledSubjects = (slots, scheduleId, classId, subjects) => {
  if (!scheduleId || !classId) return [];
  const subjectIds = new Set(
    slots
      .filter(
        (s) =>
          String(s.schedule_id) === String(scheduleId) &&
          String(s.class_id) === String(classId)
      )
      .map((s) => String(s.subject_id))
  );
  return subjects.filter((s) => subjectIds.has(String(s.id)));
};

/**
 * Get class results for a schedule and class
 */
export const getClassResults = (results, scheduleId, classId) => {
  return results.filter(
    (r) =>
      String(r.schedule_id) === String(scheduleId) &&
      String(r.class_id) === String(classId)
  );
};

/**
 * Build class results index by subject ID
 */
export const buildClassResultsIndex = (classResults) => {
  const idx = {};
  classResults.forEach((r) => {
    idx[String(r.subject_id)] = r;
  });
  return idx;
};

/**
 * Get all results for a schedule across all classes
 */
export const getScheduleResults = (results, scheduleId) => {
  if (!scheduleId) return [];
  return results.filter((r) => String(r.schedule_id) === String(scheduleId));
};

/**
 * Get active slots for selected subjects
 */
export const getActiveSlots = (slots, scheduleId, classId, activeResults) => {
  if (!scheduleId || !classId || activeResults.length === 0) return {};
  const slotsMap = {};
  activeResults.forEach((result) => {
    const slot = slots.find(
      (s) =>
        String(s.schedule_id) === String(scheduleId) &&
        String(s.class_id) === String(classId) &&
        String(s.subject_id) === String(result.subject_id)
    );
    if (slot) {
      slotsMap[String(result.id)] = slot;
    }
  });
  return slotsMap;
};

/**
 * Check if teacher matches target teacher ID
 */
export const isMatchingTeacher = (targetTeacherId, teacherRecord, user, teacherMap) => {
  if (!targetTeacherId || !teacherRecord) return false;
  const currentIds = [
    teacherRecord.id,
    teacherRecord.teacher_id,
    teacherRecord.emp_id,
    teacherRecord.employee_id,
    user?.id,
  ]
    .filter(Boolean)
    .map(String);

  if (currentIds.includes(String(targetTeacherId))) return true;

  if (
    teacherRecord.name &&
    teacherMap[String(targetTeacherId)] &&
    teacherMap[String(targetTeacherId)].toLowerCase().trim() ===
      teacherRecord.name.toLowerCase().trim()
  ) {
    return true;
  }

  return false;
};

/**
 * Check if teacher is allocated to subject in class_assignments
 */
export const isAllocatedSubjectTeacher = (
  classAssignments,
  selectedClassId,
  subjectId,
  isMatchingTeacher
) => {
  return classAssignments.some(
    (ca) =>
      String(ca.class_id) === String(selectedClassId) &&
      String(ca.subject_id) === String(subjectId) &&
      isMatchingTeacher(ca.teacher_id)
  );
};

/**
 * Determine if user can edit marks for a subject
 */
export const canEditMarksForSubject = ({
  result,
  activeSlots,
  canAccess,
  userRoles,
  canManageAllMarks,
  isTeacherLocked,
  isMatchingTeacher,
  isAllocatedSubjectTeacher,
}) => {
  // When progress report is published, marks editing is strictly locked for teachers
  if (isTeacherLocked) return false;

  const canAccessMarkEntry = canEditMarks(userRoles, canAccess);
  if (!canAccessMarkEntry) return false;

  // Management can edit marks for any subject
  if (canManageAllMarks) return true;

  // For teachers: ONLY the assigned invigilator or allocated subject teacher
  const slot = activeSlots[String(result.id)] || activeSlots[result.id];
  const isInvigilator = Boolean(slot?.teacher_id && isMatchingTeacher(slot.teacher_id));
  const isSubjectTeacher = Boolean(isAllocatedSubjectTeacher);

  return isInvigilator || isSubjectTeacher;
};

/**
 * Build all subjects to show in Mark Entry
 */
export const buildAllSubjectsToShow = (scheduledSubjects, classResults, subjects, classResultsIndex) => {
  const ids = new Set();
  const list = [];

  // 1. Scheduled subjects in exam timetable slots
  scheduledSubjects.forEach((s) => {
    ids.add(String(s.id));
    list.push({ ...s, isAdHoc: false });
  });

  // 2. Ad-hoc subjects or subjects with existing marks
  classResults.forEach((r) => {
    const sId = String(r.subject_id);
    if (!ids.has(sId)) {
      const isExplicitAdHoc = r.is_from_schedule === false;
      const hasEnteredMarks = r.entry_status === 'completed' || r.entry_status === 'in_progress';
      if (isExplicitAdHoc || hasEnteredMarks) {
        const sub = subjects.find((s) => String(s.id) === sId);
        if (sub) {
          ids.add(sId);
          list.push({ ...sub, isAdHoc: isExplicitAdHoc });
        }
      }
    }
  });

  return list;
};

/**
 * Get available ad-hoc subjects for a class
 */
export const getAvailableAdHocSubjects = (selectedClassId, classSubjects, allSubjectsToShow, subjects) => {
  if (!selectedClassId) return [];
  const activeClassSubjectIds = new Set(
    classSubjects
      .filter(
        (cs) =>
          String(cs.class_id) === String(selectedClassId) &&
          (!cs.status || cs.status === 'active')
      )
      .map((cs) => String(cs.subject_id))
  );

  const existingSubjectIds = new Set(allSubjectsToShow.map((s) => String(s.id)));

  return subjects
    .filter(
      (s) => activeClassSubjectIds.has(String(s.id)) && !existingSubjectIds.has(String(s.id))
    )
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Calculate completion stats
 */
export const calculateCompletionStats = (allSubjectsToShow, classResultsIndex) => {
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  allSubjectsToShow.forEach((sub) => {
    const res = classResultsIndex[String(sub.id)];
    const status = res?.entry_status || 'pending';
    if (status === 'completed') completed++;
    else if (status === 'in_progress') inProgress++;
    else pending++;
  });
  return { completed, inProgress, pending };
};

/**
 * Build CSV export for marks
 */
export const buildMarksCSV = ({
  selectedClassId,
  classStudents,
  activeSubjects,
  allSubjectsToShow,
  selectedSchedule,
  selectedClass,
  classResults,
  classResultsIndex,
  summaryEntries,
}) => {
  if (!selectedClassId || classStudents.length === 0) {
    showToast('Select a class with enrolled students to export', 'warning');
    return null;
  }

  const subjectsToExport = activeSubjects.length > 0 ? activeSubjects : allSubjectsToShow;
  if (subjectsToExport.length === 0) {
    showToast('No subjects available to export for this class', 'warning');
    return null;
  }

  const headers = [
    'Roll No',
    'Admission No',
    'Student Name',
    ...subjectsToExport.map((s) => `"${s.name} [${s.id}]"`),
  ];

  const rows = classStudents.map((student) => {
    const rowVals = [
      `"${student.roll_no || ''}"`,
      `"${student.admission_no || ''}"`,
      `"${student.student_name || ''}"`,
    ];

    subjectsToExport.forEach((sub) => {
      const res = classResultsIndex[String(sub.id)];
      const entry = summaryEntries.find(
        (e) =>
          String(e.result_id) === String(res?.id) &&
          (e.admission_no
            ? String(e.admission_no) === String(student.admission_no)
            : String(e.student_id) === String(student.id))
      );
      if (entry?.is_absent) {
        rowVals.push('"ABSENT"');
      } else if (entry?.marks_obtained !== null && entry?.marks_obtained !== undefined) {
        rowVals.push(`"${entry.marks_obtained}"`);
      } else {
        rowVals.push('""');
      }
    });

    return rowVals.join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Handle schedule publish toggle
 */
export const handleTogglePublishReport = async ({
  selectedScheduleId,
  selectedSchedule,
  canManageAllMarks,
  userRoles,
  supabase,
  setSchedules,
  onSchedulePublishedChange,
  showToast,
  setPublishingReport,
}) => {
  if (!selectedScheduleId || !selectedSchedule) {
    showToast('Please select an exam schedule first', 'warning');
    return;
  }

  const willPublish = !selectedSchedule.is_report_published;

  const confirmData = {
    title: willPublish ? 'Publish Progress Report' : 'Unpublish Progress Report',
    message: willPublish
      ? `Publish progress report cards for "${selectedSchedule.name}"? Parents will immediately be able to view their ward's results in the parent portal.`
      : `Unpublish progress report cards for "${selectedSchedule.name}"? Parents will no longer be able to view report cards for this examination.`,
    confirmText: willPublish ? 'Publish to Parents' : 'Unpublish',
    type: willPublish ? 'success' : 'warning',
    onConfirm: async () => {
      setPublishingReport(true);
      try {
        const { error } = await supabase
          .from('exam_schedules')
          .update({ is_report_published: willPublish })
          .eq('id', selectedSchedule.id);

        if (error) throw error;

        setSchedules((prev) =>
          prev.map((s) =>
            String(s.id) === String(selectedSchedule.id)
              ? { ...s, is_report_published: willPublish }
              : s
          )
        );

        if (typeof onSchedulePublishedChange === 'function') {
          onSchedulePublishedChange(selectedSchedule.id, willPublish);
        }
        broadcastSchedulePublishedChange(selectedSchedule.id, willPublish);

        showToast(
          willPublish
            ? `Progress report for "${selectedSchedule.name}" published! Parents can now view results for their wards.`
            : `Progress report for "${selectedSchedule.name}" unpublished.`,
          'success'
        );
      } catch (err) {
        console.error('Failed to update progress report publication status:', err);
        showToast(err.message || 'Failed to update publication status', 'error');
      } finally {
        setPublishingReport(false);
      }
    },
  };

  return confirmData;
};

/**
 * Setup realtime subscriptions for exam_schedules
 */
export const setupRealtimeSubscriptions = (supabase, setSchedules) => {
  const channel = supabase
    .channel('exam_schedules_realtime_changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'exam_schedules' },
      (payload) => {
        if (payload.new && payload.new.id) {
          setSchedules((prev) =>
            prev.map((s) =>
              String(s.id) === String(payload.new.id) ? { ...s, ...payload.new } : s
            )
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Setup broadcast channel for cross-tab sync
 */
export const setupBroadcastChannel = (setSchedules) => {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  let bc = null;
  try {
    bc = new BroadcastChannel('exam_schedules_sync');
    bc.onmessage = (event) => {
      if (event.data?.type === 'SCHEDULE_PUBLISHED_CHANGED') {
        const { scheduleId, is_report_published } = event.data;
        if (scheduleId) {
          setSchedules((prev) =>
            prev.map((s) =>
              String(s.id) === String(scheduleId)
                ? { ...s, is_report_published: Boolean(is_report_published) }
                : s
            )
          );
        }
      }
    };
  } catch (e) {}
  return () => {
    if (bc) bc.close();
  };
};

/**
 * Setup window event listeners for schedule published changes
 */
export const setupWindowEventListeners = (setSchedules) => {
  const handlePublishedChange = (e) => {
    const { scheduleId, is_report_published } = e.detail || {};
    if (scheduleId) {
      setSchedules((prev) =>
        prev.map((s) =>
          String(s.id) === String(scheduleId)
            ? { ...s, is_report_published: Boolean(is_report_published) }
            : s
        )
      );
    }
  };
  window.addEventListener('exam-schedule-published-changed', handlePublishedChange);
  return () => window.removeEventListener('exam-schedule-published-changed', handlePublishedChange);
};

/**
 * Fetch fresh schedule row on focus/visibility change
 */
export const setupScheduleRefresh = (selectedScheduleId, setSchedules, supabase) => {
  if (!selectedScheduleId) return () => {};

  let isMounted = true;
  const fetchFreshSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_schedules')
        .select('*')
        .eq('id', Number(selectedScheduleId))
        .maybeSingle();
      if (isMounted && data && !error) {
        setSchedules((prev) =>
          prev.map((s) => (String(s.id) === String(selectedScheduleId) ? data : s))
        );
      }
    } catch (e) {
      console.warn('Failed to fetch fresh schedule row:', e);
    }
  };

  fetchFreshSchedule();

  const onFocus = () => fetchFreshSchedule();
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') fetchFreshSchedule();
  };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    isMounted = false;
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
};

/**
 * Load master data (schedules, classes, subjects, students, class_subjects)
 */
export const loadMasterData = async (supabase) => {
  const [dbSchedules, dbClasses, dbSubjects, dbStudents, dbClassSubjects] = await Promise.all([
    safeQuery(supabase.from('exam_schedules').select('*').order('start_date', { ascending: false })),
    safeQuery(supabase.from('classes').select('*').order('name')),
    safeQuery(supabase.from('syl_subjects').select('*').order('name')),
    safeQuery(
      supabase
        .from('students')
        .select('id, student_name, admission_no, class_id, enrollment')
        .order('class_id', { ascending: true })
        .order('student_name', { ascending: true })
    ),
    safeQuery(supabase.from('class_subjects').select('*')),
  ]);

  return {
    schedules: dbSchedules,
    classes: dbClasses,
    subjects: dbSubjects,
    students: dbStudents,
    classSubjects: dbClassSubjects,
  };
};

/**
 * Load schedule-specific data (slots, results)
 */
export const loadScheduleData = async (supabase, scheduleId) => {
  const [slotsRes, resultsRes, schedRes] = await Promise.all([
    supabase
      .from('exam_schedule_slots')
      .select('*')
      .eq('schedule_id', Number(scheduleId)),
    supabase.from('exam_results').select('*').eq('schedule_id', Number(scheduleId)),
    supabase
      .from('exam_schedules')
      .select('*')
      .eq('id', Number(scheduleId))
      .maybeSingle(),
  ]);

  return {
    slots: slotsRes.data || [],
    results: resultsRes.data || [],
    schedule: schedRes.data,
  };
};

/**
 * Load entry support data (teachers, class_assignments)
 */
export const loadEntrySupportData = async (supabase) => {
  const [teachersRes, assignmentsRes] = await Promise.all([
    supabase
      .from('employees')
      .select('id, name, is_active, is_teacher')
      .eq('is_active', true)
      .order('name'),
    supabase.from('class_assignments').select('*'),
  ]);

  return {
    teachers: teachersRes.data || [],
    classAssignments: assignmentsRes.data || [],
  };
};

/**
 * Load summary entries for a schedule
 */
export const loadSummaryEntries = async (supabase, scheduleResults) => {
  if (!scheduleResults.length) return [];

  const resultIds = scheduleResults.map((r) => r.id);
  let allEntries = [];

  for (let i = 0; i < resultIds.length; i += BATCH_SIZE) {
    const chunkIds = resultIds.slice(i, i + BATCH_SIZE);
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('exam_result_entries')
        .select('id, result_id, student_id, admission_no, marks_obtained, is_absent')
        .in('result_id', chunkIds)
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching summary entries chunk:', error);
        hasMore = false;
      } else if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allEntries = allEntries.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      }
    }
  }

  return allEntries;
};

/**
 * Ensure result row exists for a subject
 */
export const ensureResult = async (supabase, {
  scheduleId,
  classId,
  subjectId,
  refreshResults,
}) => {
  const { data, error } = await supabase
    .from('exam_results')
    .insert({
      schedule_id: Number(scheduleId),
      class_id: Number(classId),
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
};

/**
 * Remove subject from mark entry
 */
export const removeSubject = async (supabase, {
  subjectId,
  selectedScheduleId,
  selectedClassId,
  subjects,
  classes,
  classResultsIndex,
  refreshResults,
  showToast,
}) => {
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

  return {
    title: `Remove ${typeLabel} "${subName}"?`,
    message: hasMarks
      ? `Marks have already been entered for "${subName}" in ${className}. Removing this subject will permanently delete all entered student marks and records for this examination. Are you sure you want to proceed?`
      : `Remove "${subName}" from Mark Entry for ${className}? This will remove it from the examination schedule and mark entry.`,
    confirmText: 'Remove Subject',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: async () => {
      try {
        // 1. Delete all matching result entries and exam_results records
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

        // 2. Also remove slot from exam_schedule_slots if it was present
        await supabase
          .from('exam_schedule_slots')
          .delete()
          .eq('schedule_id', Number(selectedScheduleId))
          .eq('class_id', Number(selectedClassId))
          .eq('subject_id', Number(subjectId));

        // 3. Refresh results & slots
        await refreshResults();
        showToast(`Subject "${subName}" removed from Mark Entry`, 'success');
      } catch (err) {
        console.error('Failed to remove subject:', err);
        showToast('Failed to remove subject: ' + (err.message || err), 'error');
      }
    },
  };
};

/**
 * Save marking scheme
 */
export const saveMarkingScheme = async (supabase, {
  allSubjectsToShow,
  schemeEdits,
  selectedScheduleId,
  selectedClassId,
  classResultsIndex,
  refreshResults,
  showToast,
}) => {
  for (const sub of allSubjectsToShow) {
    const edit = schemeEdits[String(sub.id)];
    if (!edit) continue;
    const existing = classResultsIndex[String(sub.id)];
    const maxVal = Number(edit.max_marks) || 100;
    const passVal =
      edit.pass_marks !== '' && edit.pass_marks !== null ? Number(edit.pass_marks) : null;

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
};

/**
 * Add ad-hoc subject
 */
export const addAdHocSubject = async (supabase, {
  adHocSubjectId,
  adHocMaxMarks,
  adHocPassMarks,
  selectedScheduleId,
  selectedClassId,
  classResultsIndex,
  refreshResults,
  showToast,
}) => {
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
  await refreshResults();
  return addedSubId;
};

/**
 * Bulk apply marking scheme
 */
export const bulkApplyScheme = (allSubjectsToShow, bulkMaxMarks, bulkPassMarks) => {
  const maxVal = Number(bulkMaxMarks) || 100;
  const passVal = bulkPassMarks !== '' ? Number(bulkPassMarks) : null;
  const updated = {};
  allSubjectsToShow.forEach((sub) => {
    updated[String(sub.id)] = {
      max_marks: maxVal,
      pass_marks: passVal,
    };
  });
  return updated;
};