// src/components/examinations/ExamAttendanceTabView.jsx
import React, { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { useCanAccess } from '../portal-shared/ConditionalBlock';
import { isScheduleReportPublished } from '../../utils/examScheduleUtils';

const LOCAL_ATTENDANCE_STORAGE_PREFIX = 'jzv_exam_attendance_';

/**
 * ExamAttendanceTabView Component
 * Displays student attendance records across single class, multiple classes, or all classes.
 * Interactive dashboard tiles filter the table (Total, Recorded, Pending, <75%).
 * Table is sorted by Class followed by Student Name.
 */
const ExamAttendanceTabView = forwardRef(({
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
    (canAccess('exam-attendance-edit') ||
      canAccess('exam-attendance-upload') ||
      canAccess('exam-mark-entry-tab'));

  // Attendance data map: { [normalizedAdmissionNo]: { present, absent, on_leave, total_days, id, admission_no } }
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Status Filter driven by clicking the KPI dashboard cards ('all' | 'recorded' | 'missing' | 'low')
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'default', direction: 'asc' });

  // Student Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    present: '',
    absent: '',
    on_leave: '',
    total_days: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const normalize = (str) => String(str || '').trim().toLowerCase();

  // Load attendance from Supabase + localStorage
  const loadAttendance = useCallback(async () => {
    if (!schedule?.id) {
      setAttendanceMap({});
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_attendance_entries')
        .select('*')
        .eq('schedule_id', schedule.id);

      let list = [];
      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
      } else {
        const local = localStorage.getItem(`${LOCAL_ATTENDANCE_STORAGE_PREFIX}${schedule.id}`);
        if (local) {
          try {
            list = JSON.parse(local);
          } catch (_) {}
        }
      }

      const map = {};
      list.forEach((item) => {
        if (item.admission_no) {
          const norm = normalize(item.admission_no);
          const pres = Number(item.present) || 0;
          const abs = Number(item.absent) || 0;
          const leave = Number(item.on_leave) || 0;
          const tot = item.total_days !== undefined && item.total_days !== null
            ? Number(item.total_days)
            : pres + abs + leave;
          map[norm] = {
            id: item.id,
            admission_no: item.admission_no,
            present: pres,
            absent: abs,
            on_leave: leave,
            total_days: tot,
          };
        }
      });
      setAttendanceMap(map);
    } catch (err) {
      console.warn('[ExamAttendanceTab] Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [schedule?.id]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

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

  // Merge student info with attendance record
  const studentRecords = useMemo(() => {
    return filteredByClassStudents.map((s) => {
      const adm = s.admission_no || s.admission_number || '';
      const normAdm = normalize(adm);
      const att = attendanceMap[normAdm] || null;
      const present = att ? att.present : null;
      const absent = att ? att.absent : null;
      const onLeave = att ? att.on_leave : null;
      const totalDays = att ? att.total_days : null;

      let pct = null;
      if (att && totalDays && totalDays > 0) {
        pct = Math.round((present / totalDays) * 100);
      } else if (att && (present + absent + onLeave) > 0) {
        pct = Math.round((present / (present + absent + onLeave)) * 100);
      }

      return {
        id: s.id,
        student_id: s.id,
        student_name: s.student_name || s.name || 'Unnamed',
        admission_no: adm,
        class_id: s.class_id,
        class_name: classMap[String(s.class_id)] || 'Unassigned',
        present,
        absent,
        on_leave: onLeave,
        total_days: totalDays,
        percentage: pct,
        hasRecord: att !== null,
        rawRecord: att,
      };
    });
  }, [filteredByClassStudents, attendanceMap, classMap]);

  // Filter by status (clicked on KPI card) and sort by Class followed by Student Name
  const displayedRecords = useMemo(() => {
    let result = studentRecords;

    if (statusFilter === 'recorded') {
      result = result.filter((r) => r.hasRecord);
    } else if (statusFilter === 'missing') {
      result = result.filter((r) => !r.hasRecord);
    } else if (statusFilter === 'low') {
      result = result.filter((r) => r.hasRecord && r.percentage !== null && r.percentage < 75);
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
    const recordsWithPct = studentRecords.filter((r) => r.hasRecord && r.percentage !== null);
    const avgPct =
      recordsWithPct.length > 0
        ? Math.round(
            recordsWithPct.reduce((acc, r) => acc + r.percentage, 0) / recordsWithPct.length
          )
        : null;

    return { total, recorded, missing, avgPct };
  }, [studentRecords]);

  // Open Edit Modal for a student
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    const att = student.rawRecord;
    setEditFormData({
      present: att ? String(att.present) : '',
      absent: att ? String(att.absent) : '0',
      on_leave: att ? String(att.on_leave) : '0',
      total_days: att ? String(att.total_days) : '',
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

  // Save student attendance
  const handleSaveStudentAttendance = async (autoNavigateNext = false) => {
    if (!editingStudent || !schedule?.id || isTeacherLocked) return;
    const adm = editingStudent.admission_no;
    if (!adm) {
      showToast('Student does not have an admission number', 'error');
      return;
    }

    const pres = Number(editFormData.present) || 0;
    const abs = Number(editFormData.absent) || 0;
    const leave = Number(editFormData.on_leave) || 0;
    const total = editFormData.total_days !== '' ? Number(editFormData.total_days) : pres + abs + leave;

    setSavingEdit(true);
    try {
      const normAdm = normalize(adm);
      const updatedRecord = {
        schedule_id: schedule.id,
        admission_no: adm,
        present: pres,
        absent: abs,
        on_leave: leave,
        total_days: total,
        updated_at: new Date().toISOString(),
      };

      // 1. Supabase upsert
      const { error } = await supabase.from('exam_attendance_entries').upsert(
        updatedRecord,
        { onConflict: 'schedule_id,admission_no' }
      );

      if (error && error.code !== 'PGRST205') {
        console.warn('[ExamAttendanceTab] Remote upsert error:', error.message);
      }

      // 2. localStorage fallback
      const localKey = `${LOCAL_ATTENDANCE_STORAGE_PREFIX}${schedule.id}`;
      let cachedList = [];
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) cachedList = JSON.parse(raw);
      } catch (_) {}

      const existingIdx = cachedList.findIndex((item) => normalize(item.admission_no) === normAdm);
      if (existingIdx >= 0) {
        cachedList[existingIdx] = updatedRecord;
      } else {
        cachedList.push(updatedRecord);
      }
      localStorage.setItem(localKey, JSON.stringify(cachedList));

      // 3. Update local state
      setAttendanceMap((prev) => ({
        ...prev,
        [normAdm]: {
          ...updatedRecord,
          id: prev[normAdm]?.id || 'local_' + Date.now(),
        },
      }));

      showToast(`Attendance updated for ${editingStudent.student_name}`, 'success');

      if (autoNavigateNext && currentEditIndex < displayedRecords.length - 1) {
        handleNavigateEdit(1);
      } else {
        setEditingStudent(null);
      }
    } catch (err) {
      showToast('Failed to save attendance: ' + err.message, 'error');
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
      'Present Days': r.present !== null ? r.present : '',
      'Absent Days': r.absent !== null ? r.absent : '',
      'On Leave Days': r.on_leave !== null ? r.on_leave : '',
      'Total Days': r.total_days !== null ? r.total_days : '',
      'Attendance %': r.percentage !== null ? `${r.percentage}%` : '',
      'Status': r.hasRecord ? 'Recorded' : 'Pending',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const fileName = `${schedule?.name || 'Exam'}_Attendance_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast(`Exported ${displayedRecords.length} student records`, 'success');
  }, [displayedRecords, schedule?.name]);

  // Expose export and refresh methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportData: handleExport,
    refresh: loadAttendance,
  }), [handleExport, loadAttendance]);

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
    <div className="w-full space-y-4" data-feature="exam-attendance-tab-content">
      {/* Published Exam Lock Banner */}
      {isTeacherLocked && (
        <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold shadow-2xs">
          <i className="fas fa-lock text-amber-600 text-sm shrink-0" />
          <span>
            Progress Report is published for this examination. Attendance editing is locked for teachers.
          </span>
        </div>
      )}

      {/* ── Top Bar: Interactive KPI Cards (Click to filter table) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Students -> Filter: All */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`text-left bg-white border rounded-2xl p-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition-all hover:border-indigo-300 hover:shadow-xs ${
            statusFilter === 'all'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
              : 'border-light-border'
          }`}
          title="Click to show all students"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shrink-0">
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
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase tracking-wider">
              Active
            </span>
          )}
        </button>

        {/* Recorded Attendance -> Filter: Recorded */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'recorded' ? 'all' : 'recorded')}
          className={`text-left bg-white border rounded-2xl p-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition-all hover:border-emerald-300 hover:shadow-xs ${
            statusFilter === 'recorded'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-light-border'
          }`}
          title="Click to filter recorded attendance"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shrink-0">
              <i className="fas fa-clipboard-check" />
            </div>
            <div>
              <div className="text-lg font-black text-emerald-700 leading-tight">
                {kpiStats.recorded}{' '}
                <span className="text-xs font-semibold text-dark-muted">
                  ({kpiStats.total > 0 ? Math.round((kpiStats.recorded / kpiStats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="text-[11px] font-bold text-dark-muted">Recorded</div>
            </div>
          </div>
          {statusFilter === 'recorded' && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
              Active
            </span>
          )}
        </button>

        {/* Missing Attendance -> Filter: Missing */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'missing' ? 'all' : 'missing')}
          className={`text-left bg-white border rounded-2xl p-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition-all hover:border-amber-300 hover:shadow-xs ${
            statusFilter === 'missing'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
              : 'border-light-border'
          }`}
          title="Click to filter pending attendance entries"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base shrink-0">
              <i className="fas fa-clock-rotate-left" />
            </div>
            <div>
              <div className="text-lg font-black text-amber-700 leading-tight">
                {kpiStats.missing}
              </div>
              <div className="text-[11px] font-bold text-dark-muted">Pending Entry</div>
            </div>
          </div>
          {statusFilter === 'missing' && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-600 text-white uppercase tracking-wider">
              Active
            </span>
          )}
        </button>

        {/* Average Attendance % -> Filter: Low (<75%) */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
          className={`text-left bg-white border rounded-2xl p-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition-all hover:border-purple-300 hover:shadow-xs ${
            statusFilter === 'low'
              ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20'
              : 'border-light-border'
          }`}
          title="Click to filter students with low attendance (< 75%)"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base shrink-0">
              <i className="fas fa-chart-line" />
            </div>
            <div>
              <div className="text-lg font-black text-purple-700 leading-tight">
                {kpiStats.avgPct !== null ? `${kpiStats.avgPct}%` : '—'}
              </div>
              <div className="text-[11px] font-bold text-dark-muted">Avg Rate (<span className="text-rose-600 font-black">&lt;75%</span>)</div>
            </div>
          </div>
          {statusFilter === 'low' && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-600 text-white uppercase tracking-wider">
              Active
            </span>
          )}
        </button>
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
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Admission No</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('student_name')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student Name</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('present')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Present</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('absent')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Absent</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('on_leave')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Leave</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_days')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Total Days</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('percentage')}
                  className="py-3 px-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Attendance %</span>
                    <i className="fas fa-sort text-[10px] text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-dark-muted font-semibold">
                    <i className="fas fa-user-slash text-2xl text-slate-300 mb-2 block" />
                    No students found for this class and filter.
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-indigo-50/30 transition-colors group"
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
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-[10px]">
                          {r.student_name.charAt(0).toUpperCase()}
                        </div>
                        <span>{r.student_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {r.present !== null ? r.present : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-700">
                      {r.absent !== null ? r.absent : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                      {r.on_leave !== null ? r.on_leave : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-dark-primary">
                      {r.total_days !== null ? r.total_days : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      {r.percentage !== null ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                              r.percentage >= 75
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.percentage >= 60
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {r.percentage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic font-medium">Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      {canEdit && !isTeacherLocked && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                          title="Edit attendance for this student"
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
              <span className="ml-2 font-normal text-indigo-600">
                (Filtered by {statusFilter})
              </span>
            )}
          </span>
          <span className="text-[11px]">
            Sorted by Class &amp; Student Name
          </span>
        </div>
      </div>

      {/* ── Individual Student Attendance Edit Modal with Next/Prev ── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-light-border bg-indigo-50/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-xs font-black">
                  {editingStudent.student_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-dark-primary leading-tight">
                    {editingStudent.student_name}
                  </h3>
                  <p className="text-xs text-dark-muted mt-0.5 font-bold">
                    Class: <span className="text-indigo-700">{editingStudent.class_name}</span> · Adm: <span className="font-mono text-dark-primary">{editingStudent.admission_no}</span>
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

            {/* Modal Form */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Present Days */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">
                    Present Days *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.present}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFormData((prev) => {
                        const pres = Number(val) || 0;
                        const abs = Number(prev.absent) || 0;
                        const lve = Number(prev.on_leave) || 0;
                        return {
                          ...prev,
                          present: val,
                          total_days: prev.total_days === '' ? String(pres + abs + lve) : prev.total_days,
                        };
                      });
                    }}
                    placeholder="e.g. 180"
                    className="w-full px-3 py-2 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                    autoFocus
                  />
                </div>

                {/* Absent Days */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">
                    Absent Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.absent}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, absent: e.target.value }))}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                </div>

                {/* On Leave Days */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">
                    On Leave Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.on_leave}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, on_leave: e.target.value }))}
                    placeholder="e.g. 2"
                    className="w-full px-3 py-2 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                </div>

                {/* Total Days */}
                <div>
                  <label className="block text-xs font-bold text-dark-slate mb-1">
                    Total Working Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.total_days}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, total_days: e.target.value }))}
                    placeholder="e.g. 187"
                    className="w-full px-3 py-2 text-xs font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                </div>
              </div>

              {/* Calculated Rate Preview */}
              {(() => {
                const p = Number(editFormData.present) || 0;
                const a = Number(editFormData.absent) || 0;
                const l = Number(editFormData.on_leave) || 0;
                const t = editFormData.total_days !== '' ? Number(editFormData.total_days) : p + a + l;
                const rate = t > 0 ? Math.round((p / t) * 100) : null;
                return (
                  <div className="bg-slate-50 border border-light-border rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-dark-muted">Calculated Attendance:</span>
                    <span
                      className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${
                        rate === null
                          ? 'text-slate-400 bg-slate-100'
                          : rate >= 75
                            ? 'text-emerald-700 bg-emerald-50'
                            : rate >= 60
                              ? 'text-amber-700 bg-amber-50'
                              : 'text-rose-700 bg-rose-50'
                      }`}
                    >
                      {rate !== null ? `${rate}%` : '—'}
                    </span>
                  </div>
                );
              })()}

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
            <div className="px-6 py-3.5 bg-slate-50 border-t border-light-border flex items-center justify-between">
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
                  onClick={() => handleSaveStudentAttendance(true)}
                  disabled={savingEdit}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer disabled:opacity-50"
                  title="Save and advance to next student"
                >
                  Save & Next
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveStudentAttendance(false)}
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save text-xs" />
                      <span>Save Record</span>
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

export default ExamAttendanceTabView;
