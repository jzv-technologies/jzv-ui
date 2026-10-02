// src/components/examinations/ExamAttendanceUploadModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

const LOCAL_ATTENDANCE_STORAGE_PREFIX = 'jzv_exam_attendance_';

/**
 * ExamAttendanceUploadModal Component
 * Allows uploading student attendance records (Present, Absent, On Leave)
 * mapped to the active Examination Schedule via CSV or Excel (.xlsx).
 * Persists records into public.exam_attendance_entries with fallback caching.
 */
const ExamAttendanceUploadModal = ({
  isOpen,
  onClose,
  schedule = null,
  students = [],
  onUploadSuccess,
}) => {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste'
  const [fileName, setFileName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setPasteContent('');
      setParsedRows([]);
      setSaving(false);
    }
  }, [isOpen]);

  const normalize = (str) =>
    String(str || '')
      .trim()
      .toLowerCase();

  // Create student lookup map by admission number
  const studentMap = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      if (s.admission_no) {
        map.set(normalize(s.admission_no), s);
      }
    });
    return map;
  }, [students]);

  // Helper to extract values from multiple possible column aliases
  const getVal = (row, ...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return row[k];
      }
    }
    return '';
  };

  const processRawRows = (rawRows) => {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      showToast('No data rows found in file.', 'error');
      setParsedRows([]);
      return;
    }

    const processed = [];
    rawRows.forEach((row, idx) => {
      const admission_no = String(
        getVal(
          row,
          'admission_no',
          'Admission No',
          'Admission Number',
          'Adm No',
          'adm_no',
          'AdmissionNo',
          'admission_number'
        )
      ).trim();

      if (!admission_no) return;

      const rawPresent = getVal(row, 'present', 'Present', 'Present Days', 'present_days', 'days_present');
      const rawAbsent = getVal(row, 'absent', 'Absent', 'Absent Days', 'absent_days', 'days_absent');
      const rawLeave = getVal(
        row,
        'on_leave',
        'On Leave',
        'on leave',
        'leave',
        'Leave',
        'Leave Days',
        'leave_days',
        'on_leave_days'
      );

      const present = Number(rawPresent) || 0;
      const absent = Number(rawAbsent) || 0;
      const on_leave = Number(rawLeave) || 0;
      const total_days = present + absent + on_leave;

      const matchedStudent = studentMap.get(normalize(admission_no));

      processed.push({
        rowIndex: idx + 1,
        admission_no,
        student_name: matchedStudent?.student_name || '—',
        present,
        absent,
        on_leave,
        total_days,
        pct: total_days > 0 ? Math.round((present / total_days) * 100) : 0,
        isMatched: !!matchedStudent,
      });
    });

    setParsedRows(processed);
    if (processed.length > 0) {
      showToast(`Parsed ${processed.length} attendance records successfully.`, 'success');
    } else {
      showToast('No valid attendance rows found. Column "admission_no" is required.', 'error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        processRawRows(rawData);
      } catch (err) {
        showToast('Error reading file: ' + err.message, 'error');
        setParsedRows([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleParsePaste = () => {
    if (!pasteContent.trim()) {
      showToast('Please paste CSV text to parse.', 'error');
      return;
    }

    try {
      const workbook = XLSX.read(pasteContent, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      processRawRows(rawData);
    } catch (err) {
      showToast('Error parsing pasted CSV: ' + err.message, 'error');
    }
  };

  // Download Sample Template (.csv)
  const handleDownloadTemplateCsv = () => {
    const headers = ['admission_no', 'present', 'absent', 'on_leave'];
    const sampleRows = students.slice(0, 3).map((s, idx) => [
      s.admission_no || `JZV-2024-${100 + idx}`,
      180 - idx * 5,
      12 + idx * 3,
      8 + idx * 2,
    ]);

    if (sampleRows.length === 0) {
      sampleRows.push(['JZV-2024-001', 180, 12, 8], ['JZV-2024-002', 195, 3, 2]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `exam_attendance_template_${schedule?.id || 'schedule'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Sample Template (.xlsx)
  const handleDownloadTemplateXlsx = () => {
    const sampleRows = students.slice(0, 4).map((s, idx) => ({
      admission_no: s.admission_no || `JZV-2024-${100 + idx}`,
      present: 180 - idx * 5,
      absent: 12 + idx * 3,
      on_leave: 8 + idx * 2,
    }));

    if (sampleRows.length === 0) {
      sampleRows.push(
        { admission_no: 'JZV-2024-001', present: 180, absent: 12, on_leave: 8 },
        { admission_no: 'JZV-2024-002', present: 195, absent: 3, on_leave: 2 }
      );
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(
      workbook,
      `exam_attendance_template_${schedule?.id || 'schedule'}.xlsx`
    );
  };

  const handleSaveAttendance = async () => {
    if (!schedule?.id) {
      showToast('Please select a valid Examination Schedule first.', 'error');
      return;
    }
    if (parsedRows.length === 0) {
      showToast('No valid rows to save.', 'error');
      return;
    }

    setSaving(true);
    const scheduleId = Number(schedule.id);

    const payload = parsedRows.map((r) => ({
      schedule_id: scheduleId,
      admission_no: r.admission_no,
      present: r.present,
      absent: r.absent,
      on_leave: r.on_leave,
      updated_at: new Date().toISOString(),
    }));

    try {
      const { data, error } = await supabase
        .from('exam_attendance_entries')
        .upsert(payload, { onConflict: 'schedule_id,admission_no' })
        .select();

      if (error) {
        // Check if table missing
        if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          console.warn('[ExamAttendanceUpload] Table exam_attendance_entries not yet migrated. Storing in local cache.');
          const storageKey = `${LOCAL_ATTENDANCE_STORAGE_PREFIX}${scheduleId}`;
          localStorage.setItem(storageKey, JSON.stringify(payload));
          showToast(
            'Attendance saved locally! Note: Execute /debug-files/execute-query.sql in Supabase SQL editor to create the permanent table.',
            'info'
          );
          onUploadSuccess?.(payload);
          onClose?.();
          return;
        }
        throw error;
      }

      // Also update local cache for instant offline responsiveness
      const storageKey = `${LOCAL_ATTENDANCE_STORAGE_PREFIX}${scheduleId}`;
      localStorage.setItem(storageKey, JSON.stringify(payload));

      showToast(
        `Successfully saved attendance for ${data?.length || payload.length} students in "${schedule.name}".`,
        'success'
      );
      onUploadSuccess?.(payload);
      onClose?.();
    } catch (err) {
      console.error('Failed to upsert exam attendance:', err);
      // Fallback to local storage
      const storageKey = `${LOCAL_ATTENDANCE_STORAGE_PREFIX}${scheduleId}`;
      localStorage.setItem(storageKey, JSON.stringify(payload));
      showToast(
        `Database notice: ${err.message}. Attendance saved to local cache for "${schedule.name}".`,
        'warning'
      );
      onUploadSuccess?.(payload);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-light-border bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 shadow-2xs">
              <i className="fas fa-calendar-check" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-dark-primary tracking-tight truncate">
                Upload Student Attendance
              </h3>
              <p className="text-xs text-dark-muted truncate flex items-center gap-1.5">
                <span>Mapped to Exam:</span>
                <span className="font-bold text-dark-slate">
                  {schedule?.name || 'Selected Schedule'}
                </span>
                {schedule?.academic_year && (
                  <span className="px-1.5 py-0.2 bg-slate-200 text-dark-slate rounded text-[10px] font-bold">
                    {schedule.academic_year}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Instructions and Download Template Bar */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fas fa-info-circle text-emerald-600" />
                <span>File Format Requirements</span>
              </h4>
              <p className="text-xs text-emerald-800">
                Upload CSV or Excel containing columns: <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded font-bold">admission_no</code>, <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded font-bold">present</code>, <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded font-bold">absent</code>, <code className="font-mono bg-emerald-100/70 px-1 py-0.5 rounded font-bold">on_leave</code>.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <i className="fas fa-file-csv text-emerald-600" />
                <span>Sample CSV</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateXlsx}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <i className="fas fa-file-excel text-emerald-600" />
                <span>Sample Excel</span>
              </button>
            </div>
          </div>

          {/* Input Method Tabs */}
          <div className="flex items-center gap-2 border-b border-light-border pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'file'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-dark-muted hover:text-dark-primary hover:bg-slate-100'
              }`}
            >
              <i className="fas fa-file-arrow-up" />
              <span>Upload File (.xlsx / .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-dark-muted hover:text-dark-primary hover:bg-slate-100'
              }`}
            >
              <i className="fas fa-paste" />
              <span>Paste CSV Text</span>
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'file' && (
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors">
              <input
                type="file"
                id="attendance-file-input"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="sr-only"
              />
              <label
                htmlFor="attendance-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
                  <i className="fas fa-cloud-arrow-up" />
                </div>
                <div>
                  <span className="text-xs font-black text-dark-primary block">
                    {fileName ? fileName : 'Choose an Excel or CSV attendance file'}
                  </span>
                  <span className="text-[11px] text-dark-muted">
                    Click to browse or drag and drop spreadsheet
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Tab 2: Paste CSV */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <textarea
                rows={5}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="admission_no,present,absent,on_leave&#10;JZV-2024-001,180,12,8&#10;JZV-2024-002,195,3,2"
                className="w-full px-3 py-2 text-xs font-mono border border-light-border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
              />
              <button
                type="button"
                onClick={handleParsePaste}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <i className="fas fa-check" />
                <span>Parse CSV Content</span>
              </button>
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-dark-primary uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-list-check text-emerald-600" />
                  <span>Preview Attendance Records ({parsedRows.length})</span>
                </h4>
                <span className="text-[11px] text-dark-muted font-semibold">
                  {parsedRows.filter((r) => r.isMatched).length} matched with enrolled students
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-light-border rounded-2xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-dark-muted font-black text-[10px] uppercase tracking-wider sticky top-0 border-b border-light-border">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 text-center">Present</th>
                      <th className="py-2.5 px-3 text-center">Absent</th>
                      <th className="py-2.5 px-3 text-center">On Leave</th>
                      <th className="py-2.5 px-3 text-center">Total Days</th>
                      <th className="py-2.5 px-3 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border font-medium">
                    {parsedRows.map((r, i) => (
                      <tr key={r.admission_no + i} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-dark-muted font-mono">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-dark-primary">
                          {r.admission_no}
                        </td>
                        <td className="py-2 px-3 text-dark-slate">
                          {r.student_name}
                          {!r.isMatched && (
                            <span className="ml-1 text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                              Unmatched
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700 font-mono">
                          {r.present}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-rose-600 font-mono">
                          {r.absent}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-amber-600 font-mono">
                          {r.on_leave}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-dark-slate font-mono">
                          {r.total_days}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                              r.pct >= 90
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : r.pct >= 75
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {r.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-light-border flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-dark-muted hover:text-dark-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={parsedRows.length === 0 || saving}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin text-xs" />
                <span>Saving Attendance...</span>
              </>
            ) : (
              <>
                <i className="fas fa-cloud-arrow-up text-xs" />
                <span>Upload & Save Attendance ({parsedRows.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamAttendanceUploadModal;
