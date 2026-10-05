// src/components/examinations/ExamRemarksTabView.jsx
import React, { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { useCanAccess } from '../portal-shared/ConditionalBlock';
import { isScheduleReportPublished } from '../../utils/examScheduleUtils';

const LOCAL_REMARKS_STORAGE_PREFIX = 'jzv_exam_remarks_';

const REMARKS_SUGGESTIONS = [
  'Outstanding performance and exemplary conduct throughout the term.',
  'Shows consistent effort and dedication to studies.',
  'Active participant in classroom discussions and group activities.',
  'Good progress observed; needs more focus on revision before exams.',
  'Shows great potential. Encouraged to participate more actively in class.',
  'Satisfactory progress. Regular practice and homework completion required.',
  'Needs to focus on punctuality and daily class attention.',
];

const RECOMMENDATIONS_SUGGESTIONS = [
  'Recommended for advanced academic enrichment programs.',
  'Continue the excellent study habits and active reading.',
  'Encouraged to practice mathematics problem-solving daily.',
  'Focus on regular handwriting and structured essay writing.',
  'Parents are encouraged to monitor daily evening study routines.',
  'Maintain high attendance and punctuality in all subjects.',
];

/**
 * ExamRemarksTabView Component
 * Displays student feedback and remarks across single class, multiple classes, or all classes.
 * Interactive dashboard tiles filter the table (Total, With Remarks, Pending).
 * Table is sorted by Class followed by Student Name.
 */
const ExamRemarksTabView = forwardRef(({
  schedule = null,
  classes = [],
  students = [],
  userRoles = [],
  selectedClassIds = [],
  onOpenUploadModal,
  isLocked = null,
}, ref) => {
  const canAccess = useCanAccess(userRoles);
  const canManageAll = userRoles.some((r) =>
    ['admin', 'management', 'coordinator', 'principal'].includes(String(r).toLowerCase().trim())
  );
  const isReportPublished = isScheduleReportPublished(schedule);
  const isTeacherLocked =
    typeof isLocked === 'boolean' ? isLocked : (isReportPublished && !canManageAll);
  const canEdit =
    !isTeacherLocked &&
    (canAccess('exam-remarks-edit') ||
      canAccess('exam-attendance-upload') ||
      canAccess('exam-mark-entry-tab'));

  // Remarks data map: { [normalizedAdmissionNo]: { remarks, recommendations, id, admission_no } }
  const [remarksMap, setRemarksMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Status Filter driven by clicking the KPI dashboard cards ('all' | 'recorded' | 'missing')
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'default', direction: 'asc' });

  // Student Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    remarks: '',
    recommendations: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const normalize = (str) => String(str || '').trim().toLowerCase();

  // Load remarks from Supabase + localStorage
  const loadRemarks = useCallback(async () => {
    if (!schedule?.id) {
      setRemarksMap({});
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_student_remarks')
        .select('*')
        .eq('schedule_id', schedule.id);

      let list = [];
      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
      } else {
        const local = localStorage.getItem(`${LOCAL_REMARKS_STORAGE_PREFIX}${schedule.id}`);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            list = Object.entries(parsed).map(([adm, val]) => ({
              admission_no: adm,
              remarks: val.remarks,
              recommendations: val.recommendations,
            }));
          } catch (_) {}
        }
      }

      const map = {};
      list.forEach((item) => {
        if (item.admission_no) {
          const norm = normalize(item.admission_no);
          map[norm] = {
            id: item.id,
            admission_no: item.admission_no,
            remarks: item.remarks || '',
            recommendations: item.recommendations || '',
          };
        }
      });
      setRemarksMap(map);
    } catch (err) {
      console.warn('[ExamRemarksTab] Error loading remarks:', err);
    } finally {
      setLoading(false);
    }
  }, [schedule?.id]);

  useEffect(() => {
    loadRemarks();
  }, [loadRemarks]);

  // Class lookup dictionary
  const classMap = useMemo(() => {
    const map = {};
    classes.forEach((c) => {
      map[String(c.id)] = c.name;
    });
    return map;
  }, [classes]);

  // Filter students based on multi-class selection:
  // If selectedClassIds is empty or contains 'all', show all classes
  const filteredByClassStudents = useMemo(() => {
    if (!selectedClassIds || selectedClassIds.length === 0 || selectedClassIds.includes('all')) {
      return students;
    }
    const classIdSet = new Set(selectedClassIds.map(String));
    return students.filter((s) => classIdSet.has(String(s.class_id)));
  }, [students, selectedClassIds]);

  // Merge student info with remarks record
  const studentRecords = useMemo(() => {
    return filteredByClassStudents.map((s) => {
      const adm = s.admission_no || s.admission_number || '';
      const normAdm = normalize(adm);
      const rem = remarksMap[normAdm] || null;
      const remarks = rem?.remarks || '';
      const recommendations = rem?.recommendations || '';
      const hasRecord = Boolean(rem && (remarks.trim() || recommendations.trim()));

      return {
        id: s.id,
        student_id: s.id,
        student_name: s.student_name || s.name || 'Unnamed',
        admission_no: adm,
        class_id: s.class_id,
        class_name: classMap[String(s.class_id)] || 'Unassigned',
        remarks,
        recommendations,
        hasRecord,
        rawRecord: rem,
      };
    });
  }, [filteredByClassStudents, remarksMap, classMap]);

  // Filter by status (clicked on KPI card) and sort by Class followed by Student Name
  const displayedRecords = useMemo(() => {
    let result = studentRecords;

    if (statusFilter === 'recorded') {
      result = result.filter((r) => r.hasRecord);
    } else if (statusFilter === 'missing') {
      result = result.filter((r) => !r.hasRecord);
    }

    // Default Sort: Class followed by Student Name
    result = [...result].sort((a, b) => {
      if (sortConfig.key === 'default' || !sortConfig.key) {
        const classComp = String(a.class_name || '').localeCompare(String(b.class_name || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (classComp !== 0) return classComp;
        return String(a.student_name || '').localeCompare(String(b.student_name || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comp : -comp;
      }

      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [studentRecords, statusFilter, sortConfig]);

  // Calculate KPIs
  const kpiStats = useMemo(() => {
    const total = studentRecords.length;
    const recorded = studentRecords.filter((r) => r.hasRecord).length;
    const missing = total - recorded;
    const completionPct = total > 0 ? Math.round((recorded / total) * 100) : 0;

    return { total, recorded, missing, completionPct };
  }, [studentRecords]);

  // Open Edit Modal for a student
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    const rem = student.rawRecord;
    setEditFormData({
      remarks: rem?.remarks || '',
      recommendations: rem?.recommendations || '',
    });
  };

  // Navigate to previous or next student in the modal
  const currentEditIndex = useMemo(() => {
    if (!editingStudent) return -1;
    return displayedRecords.findIndex((r) => String(r.id) === String(editingStudent.id));
  }, [displayedRecords, editingStudent]);

  const handleNavigateEdit = (direction) => {
    const nextIdx = currentEditIndex + direction;
    if (nextIdx >= 0 && nextIdx < displayedRecords.length) {
      handleOpenEdit(displayedRecords[nextIdx]);
    }
  };

  // Save student remarks
  const handleSaveStudentRemarks = async (autoNavigateNext = false) => {
    if (!editingStudent || !schedule?.id || isTeacherLocked) return;
    const adm = editingStudent.admission_no;
    if (!adm) {
      showToast('Student does not have an admission number', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const normAdm = normalize(adm);
      const updatedRecord = {
        schedule_id: schedule.id,
        admission_no: adm,
        remarks: editFormData.remarks.trim(),
        recommendations: editFormData.recommendations.trim(),
        updated_at: new Date().toISOString(),
      };

      // 1. Supabase upsert
      const { error } = await supabase.from('exam_student_remarks').upsert(
        updatedRecord,
        { onConflict: 'schedule_id,admission_no' }
      );

      if (error && error.code !== 'PGRST205') {
        console.warn('[ExamRemarksTab] Remote upsert error:', error.message);
      }

      // 2. localStorage fallback
      const localKey = `${LOCAL_REMARKS_STORAGE_PREFIX}${schedule.id}`;
      let cached = {};
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) cached = JSON.parse(raw);
      } catch (_) {}

      cached[adm] = {
        remarks: updatedRecord.remarks,
        recommendations: updatedRecord.recommendations,
      };
      localStorage.setItem(localKey, JSON.stringify(cached));

      // 3. Update local state
      setRemarksMap((prev) => ({
        ...prev,
        [normAdm]: {
          ...updatedRecord,
          id: prev[normAdm]?.id || 'local_' + Date.now(),
        },
      }));

      showToast(`Remarks saved for ${editingStudent.student_name}`, 'success');

      if (autoNavigateNext && currentEditIndex < displayedRecords.length - 1) {
        handleNavigateEdit(1);
      } else {
        setEditingStudent(null);
      }
    } catch (err) {
      showToast('Failed to save remarks: ' + err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Export to Excel
  const handleExport = useCallback(() => {
    if (displayedRecords.length === 0) {
      showToast('No records to export', 'info');
      return;
    }

    const exportRows = displayedRecords.map((r, idx) => ({
      'S.No': idx + 1,
      'Class': r.class_name,
      'Admission No': r.admission_no,
      'Student Name': r.student_name,
      'Teacher Remarks': r.remarks || '',
      'Recommendations': r.recommendations || '',
      'Status': r.hasRecord ? 'Recorded' : 'Pending',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Remarks');
    const fileName = `${schedule?.name || 'Exam'}_Remarks_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast(`Exported ${displayedRecords.length} student remarks`, 'success');
  }, [displayedRecords, schedule?.name]);

  // Expose export and refresh methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportData: handleExport,
    refresh: loadRemarks,
  }), [handleExport, loadRemarks]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (!schedule) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-3xl p-8 max-w-lg mx-auto my-8">
        <i className="fas fa-calendar-xmark text-4xl text-slate-300 mb-3 block" />
        <p className="text-base font-bold text-dark-primary">No Exam Selected</p>
        <p className="text-xs text-dark-muted mt-1">
          Please select an examination event from the exam selector above.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" data-feature="exam-remarks-tab-content">
      {/* Published Exam Lock Banner */}
      {isTeacherLocked && (
        <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold shadow-2xs">
          <i className="fas fa-lock text-amber-600 text-sm shrink-0" />
          <span>
            Progress Report is published for this examination. Remarks and feedback editing is locked for teachers.
          </span>
        </div>
      )}

      {/* ── Top Bar: Interactive KPI Cards (Click to filter table) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Students -> Filter: All */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`text-left bg-white border rounded-2xl p-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition-all hover:border-amber-300 hover:shadow-xs ${
            statusFilter === 'all'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
              : 'border-light-border'
          }`}
          title="Click to show all students"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base shrink-0">
              <i className="fas fa-users" />
            </div>
            <div>
              <div className="text-lg font-black text-dark-primary leading-tight">
                {kpiStats.total}
              </div>
              <div className="text-[11px] font-bold text-dark-muted">Total Students</div>
            </div>
          </div>
          {statusFilter === 'all' && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-600 text-white uppercase tracking-wider">
              Active
            </span>
          )}
        </button>

        {/* Remarks Entered -> Filter: Recorded */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'recorded' ? 'all' : 'recorded')}
          className={`text-left bg-white border rounded-2xl p-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition-all hover:border-emerald-300 hover:shadow-xs ${
            statusFilter === 'recorded'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-light-border'
          }`}
          title="Click to filter students with remarks"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shrink-0">
              <i className="fas fa-comment-dots" />
            </div>
            <div>
              <div className="text-lg font-black text-emerald-700 leading-tight">
                {kpiStats.recorded}{' '}
                <span className="text-xs font-semibold text-dark-muted">
                  ({kpiStats.completionPct}%)
                </span>
              </div>
              <div className="text-[11px] font-bold text-dark-muted">Remarks Entered</div>
            </div>
          </div>
          {statusFilter === 'recorded' && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
              Active
            </span>
          )}
        </button>

        {/* Pending Remarks -> Filter: Missing */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'missing' ? 'all' : 'missing')}
          className={`text-left bg-white border rounded-2xl p-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition-all hover:border-rose-300 hover:shadow-xs ${
            statusFilter === 'missing'
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
              : 'border-light-border'
          }`}
          title="Click to filter students with pending remarks"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shrink-0">
              <i className="fas fa-comment-slash" />
            </div>
            <div>
              <div className="text-lg font-black text-rose-700 leading-tight">
                {kpiStats.missing}
              </div>
              <div className="text-[11px] font-bold text-dark-muted">Pending Entry</div>
            </div>
          </div>
          {statusFilter === 'missing' && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider">
              Active
            </span>
          )}
        </button>

        {/* Progress Rate */}
        <div className="bg-white border border-light-border rounded-2xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shrink-0">
            <i className="fas fa-chart-pie" />
          </div>
          <div>
            <div className="text-lg font-black text-indigo-700 leading-tight">
              {kpiStats.completionPct}%
            </div>
            <div className="text-[11px] font-bold text-dark-muted">Progress Rate</div>
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-white border border-light-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-light-border text-dark-muted font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">#</th>
                <th
                  onClick={() => handleSort('class_name')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors w-32"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Class</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('admission_no')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors w-32"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Admission No</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('student_name')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors w-44"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student Name</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 min-w-[200px]">
                  <span>Teacher Remarks</span>
                </th>
                <th className="py-3 px-3.5 min-w-[200px]">
                  <span>Recommendations / Feedback</span>
                </th>
                <th className="py-3 px-3.5 text-center w-24">Status</th>
                <th className="py-3 px-3.5 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-dark-muted font-semibold">
                    <i className="fas fa-comment-slash text-2xl text-slate-300 mb-2 block" />
                    No students match the selected class or filters.
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-amber-50/20 transition-colors group"
                  >
                    <td className="py-2.5 px-3.5 text-center text-dark-muted font-bold text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-dark-slate font-bold text-[11px]">
                        {r.class_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold font-mono text-dark-primary">
                      {r.admission_no || '—'}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-dark-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 font-extrabold flex items-center justify-center text-[10px]">
                          {r.student_name.charAt(0).toUpperCase()}
                        </div>
                        <span>{r.student_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      {r.remarks ? (
                        <p className="text-dark-primary text-xs line-clamp-2" title={r.remarks}>
                          {r.remarks}
                        </p>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">No remarks entered</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {r.recommendations ? (
                        <p className="text-dark-muted text-xs line-clamp-2" title={r.recommendations}>
                          {r.recommendations}
                        </p>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">No recommendations</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      {r.hasRecord ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800">
                          <i className="fas fa-check text-[8px]" />
                          <span>Done</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-500">
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      {canEdit && !isTeacherLocked && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="px-2.5 py-1 text-xs font-bold text-amber-800 hover:text-white bg-amber-50 hover:bg-amber-600 rounded-lg transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                          title="Edit remarks for this student"
                        >
                          <i className="fas fa-pen-to-square text-[10px]" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-light-border flex items-center justify-between text-xs text-dark-muted font-semibold">
          <span>
            Showing <strong className="text-dark-primary">{displayedRecords.length}</strong> of{' '}
            <strong className="text-dark-primary">{studentRecords.length}</strong> students
            {statusFilter !== 'all' && (
              <span className="ml-2 font-normal text-amber-700">
                (Filtered by {statusFilter})
              </span>
            )}
          </span>
          <span className="text-[11px]">
            Sorted by Class &amp; Student Name
          </span>
        </div>
      </div>

      {/* ── Individual Student Remarks Edit Modal with Next/Prev ── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-light-border bg-amber-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-sm shadow-xs font-black">
                  {editingStudent.student_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-dark-primary leading-tight">
                    {editingStudent.student_name}
                  </h3>
                  <p className="text-xs text-dark-muted mt-0.5 font-bold">
                    Class: <span className="text-amber-800">{editingStudent.class_name}</span> · Adm: <span className="font-mono text-dark-primary">{editingStudent.admission_no}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="w-8 h-8 rounded-xl text-dark-muted hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Teacher Remarks Textarea */}
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1">
                  Teacher Remarks &amp; Feedback
                </label>
                <textarea
                  rows={3}
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Enter specific academic and behavioral remarks for this student..."
                  className="w-full p-3 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                  autoFocus
                />
                {/* Preset Suggestions Pills */}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-dark-muted">Suggestions:</span>
                  {REMARKS_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditFormData((prev) => ({
                        ...prev,
                        remarks: prev.remarks ? `${prev.remarks} ${suggestion}` : suggestion,
                      }))}
                      className="text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg transition-all cursor-pointer truncate max-w-[200px]"
                      title={suggestion}
                    >
                      + {suggestion.slice(0, 24)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendations Textarea */}
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1">
                  Recommendations for Improvement
                </label>
                <textarea
                  rows={3}
                  value={editFormData.recommendations}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, recommendations: e.target.value }))}
                  placeholder="Enter suggestions for parents or next steps..."
                  className="w-full p-3 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                />
                {/* Preset Suggestions Pills */}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-dark-muted">Suggestions:</span>
                  {RECOMMENDATIONS_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditFormData((prev) => ({
                        ...prev,
                        recommendations: prev.recommendations ? `${prev.recommendations} ${suggestion}` : suggestion,
                      }))}
                      className="text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded-lg transition-all cursor-pointer truncate max-w-[200px]"
                      title={suggestion}
                    >
                      + {suggestion.slice(0, 24)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Next / Previous Navigation Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentEditIndex <= 0}
                  onClick={() => handleNavigateEdit(-1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 disabled:opacity-30 cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fas fa-chevron-left text-[10px]" />
                  <span>Prev Student</span>
                </button>
                <span className="text-[11px] font-bold text-dark-muted">
                  {currentEditIndex + 1} of {displayedRecords.length}
                </span>
                <button
                  type="button"
                  disabled={currentEditIndex >= displayedRecords.length - 1}
                  onClick={() => handleNavigateEdit(1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 disabled:opacity-30 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next Student</span>
                  <i className="fas fa-chevron-right text-[10px]" />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-light-border flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-dark-muted hover:bg-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveStudentRemarks(true)}
                  disabled={savingEdit}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 transition-all cursor-pointer disabled:opacity-50"
                  title="Save and advance to next student"
                >
                  Save &amp; Next
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveStudentRemarks(false)}
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save text-xs" />
                      <span>Save Remarks</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ExamRemarksTabView;
