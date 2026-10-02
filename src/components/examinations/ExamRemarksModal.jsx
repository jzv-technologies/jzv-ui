// src/components/examinations/ExamRemarksModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

const LOCAL_REMARKS_STORAGE_PREFIX = 'jzv_exam_remarks_';

/**
 * ExamRemarksModal Component
 * Allows editing individual student remarks & recommendations with Previous / Next navigation,
 * and bulk uploading remarks via CSV or Excel (.xlsx).
 * Persists records into public.exam_student_remarks with offline localStorage fallback.
 */
const ExamRemarksModal = ({
  isOpen,
  onClose,
  schedule = null,
  students = [],
  displayedStudents = [],
  studentRemarksMap = {},
  onSaveSuccess,
  activeTemplate = {},
}) => {
  const [modalMode, setModalMode] = useState('individual'); // 'individual' | 'upload'
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste' for upload mode
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [remarksForm, setRemarksForm] = useState({ remarks: '', recommendations: '' });
  const [fileName, setFileName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const studentList = useMemo(() => {
    return displayedStudents.length > 0 ? displayedStudents : students;
  }, [displayedStudents, students]);

  // Current student index in the list
  const currentIndex = useMemo(() => {
    return studentList.findIndex((s) => String(s.id) === String(selectedStudentId));
  }, [studentList, selectedStudentId]);

  // Sync selectedStudentId when modal opens
  useEffect(() => {
    if (isOpen && studentList.length > 0 && !selectedStudentId) {
      setSelectedStudentId(String(studentList[0].id));
    }
  }, [isOpen, studentList, selectedStudentId]);

  // Sync form state when selected student changes
  useEffect(() => {
    if (selectedStudentId) {
      const existing = studentRemarksMap[selectedStudentId] || {};
      setRemarksForm({
        remarks:
          existing.remarks !== undefined
            ? existing.remarks
            : activeTemplate?.remarksText || '',
        recommendations:
          existing.recommendations !== undefined
            ? existing.recommendations
            : activeTemplate?.remarksConfig?.recommendationsText || '',
      });
    }
  }, [selectedStudentId, studentRemarksMap, activeTemplate]);

  // ESC key handler
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

  // Reset upload state on close
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
    studentList.forEach((s) => {
      const adm = s.admission_no || s.admission_number;
      if (adm) {
        map.set(normalize(adm), s);
      }
    });
    return map;
  }, [studentList]);

  // Save current remarks for individual student to DB & local cache
  const persistStudentRemarks = async (studentId, formValues) => {
    if (!studentId || !schedule?.id) return;
    const targetStudent = studentList.find((s) => String(s.id) === String(studentId));
    const admissionNo = targetStudent?.admission_no || targetStudent?.admission_number;

    const updatedMap = {
      ...studentRemarksMap,
      [String(studentId)]: { ...formValues },
    };

    // 1. Offline local storage caching fallback
    const storageKey = `${LOCAL_REMARKS_STORAGE_PREFIX}${schedule.id}`;
    const cached = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (admissionNo) {
      cached[admissionNo] = { ...formValues };
      localStorage.setItem(storageKey, JSON.stringify(cached));
    }

    // 2. Persist to Supabase if admission_no is available
    if (admissionNo) {
      try {
        const { error } = await supabase.from('exam_student_remarks').upsert(
          {
            schedule_id: schedule.id,
            admission_no: admissionNo,
            remarks: formValues.remarks || '',
            recommendations: formValues.recommendations || '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'schedule_id,admission_no' }
        );
        if (error && error.code !== 'PGRST205') {
          console.warn('[ExamRemarksModal] Remote upsert error:', error.message);
        }
      } catch (err) {
        console.warn('[ExamRemarksModal] Supabase save error:', err);
      }
    }

    onSaveSuccess?.(updatedMap);
  };

  const handleSaveCurrentStudent = async () => {
    if (!selectedStudentId) return;
    await persistStudentRemarks(selectedStudentId, remarksForm);
    showToast('Remarks saved for student', 'success');
  };

  const handlePrevStudent = async () => {
    if (currentIndex > 0) {
      // Auto-save current student before switching
      await persistStudentRemarks(selectedStudentId, remarksForm);
      const prevStudent = studentList[currentIndex - 1];
      setSelectedStudentId(String(prevStudent.id));
    }
  };

  const handleNextStudent = async () => {
    if (currentIndex < studentList.length - 1) {
      // Auto-save current student before switching
      await persistStudentRemarks(selectedStudentId, remarksForm);
      const nextStudent = studentList[currentIndex + 1];
      setSelectedStudentId(String(nextStudent.id));
    }
  };

  const handleApplyToAll = async () => {
    if (!schedule?.id || studentList.length === 0) return;
    setSaving(true);

    const updatedMap = { ...studentRemarksMap };
    const dbPayload = [];
    const storageKey = `${LOCAL_REMARKS_STORAGE_PREFIX}${schedule.id}`;
    const cached = JSON.parse(localStorage.getItem(storageKey) || '{}');

    studentList.forEach((s) => {
      const adm = s.admission_no || s.admission_number;
      updatedMap[String(s.id)] = { ...remarksForm };
      if (adm) {
        cached[adm] = { ...remarksForm };
        dbPayload.push({
          schedule_id: schedule.id,
          admission_no: adm,
          remarks: remarksForm.remarks || '',
          recommendations: remarksForm.recommendations || '',
          updated_at: new Date().toISOString(),
        });
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(cached));

    if (dbPayload.length > 0) {
      try {
        await supabase
          .from('exam_student_remarks')
          .upsert(dbPayload, { onConflict: 'schedule_id,admission_no' });
      } catch (err) {
        console.warn('[ExamRemarksModal] Batch apply error:', err);
      }
    }

    onSaveSuccess?.(updatedMap);
    setSaving(false);
    showToast(`Applied to all ${studentList.length} students`, 'success');
  };

  // ── CSV / Excel Parsing Logic for Upload Mode ───────────────────────────
  const processRawData = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      setParsedRows([]);
      return;
    }

    const getVal = (row, ...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return row[k];
        }
      }
      return '';
    };

    const parsed = [];
    rows.forEach((row, idx) => {
      const rawAdm = getVal(
        row,
        'admission_no',
        'Admission No',
        'admission_number',
        'adm_no',
        'Admission Number',
        'Student ID',
        'adm'
      );
      const admission_no = String(rawAdm || '').trim();
      if (!admission_no) return;

      const remarks = String(
        getVal(row, 'remarks', 'Remarks', 'teacher_remarks', 'feedback', 'comments', 'remark') || ''
      ).trim();
      const recommendations = String(
        getVal(
          row,
          'recommendations',
          'Recommendations',
          'action_plan',
          'recommendation',
          'suggestions'
        ) || ''
      ).trim();

      const matchedStudent = studentMap.get(normalize(admission_no));

      parsed.push({
        id: idx,
        admission_no,
        student_name: matchedStudent?.student_name || '—',
        student_id: matchedStudent?.id || null,
        remarks,
        recommendations,
        isValid: !!matchedStudent,
      });
    });

    setParsedRows(parsed);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    const isCsv = file.name.endsWith('.csv');

    if (isCsv) {
      reader.onload = (evt) => {
        try {
          const text = evt.target.result;
          const workbook = XLSX.read(text, { type: 'string' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
          processRawData(json);
        } catch (err) {
          showToast('Failed to parse CSV file: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
          processRawData(json);
        } catch (err) {
          showToast('Failed to parse Excel file: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handlePasteChange = (e) => {
    const text = e.target.value;
    setPasteContent(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }
    try {
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      processRawData(json);
    } catch (err) {
      // fallback line split
      const lines = text.trim().split('\n');
      if (lines.length > 1) {
        const headers = lines[0].split(/[,\t]/).map((h) => h.trim().toLowerCase());
        const rows = lines.slice(1).map((line) => {
          const cols = line.split(/[,\t]/).map((c) => c.trim());
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = cols[i] || '';
          });
          return obj;
        });
        processRawData(rows);
      }
    }
  };

  const handleDownloadTemplateCsv = () => {
    const headers = ['admission_no', 'remarks', 'recommendations'];
    const sampleRows = studentList.slice(0, 5).map((s, idx) => [
      s.admission_no || s.admission_number || `JZV-${100 + idx}`,
      'Demonstrates remarkable academic enthusiasm and diligence.',
      'Recommend 20 mins daily revision in core concepts.',
    ]);
    if (sampleRows.length === 0) {
      sampleRows.push(['JZV-2024-001', 'Consistent performance in class.', 'Continue daily practice.']);
    }
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `exam_remarks_template_${schedule?.id || 'schedule'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplateXlsx = () => {
    const sampleRows = studentList.slice(0, 5).map((s, idx) => ({
      admission_no: s.admission_no || s.admission_number || `JZV-${100 + idx}`,
      remarks: 'Demonstrates remarkable academic enthusiasm and diligence.',
      recommendations: 'Recommend 20 mins daily revision in core concepts.',
    }));
    if (sampleRows.length === 0) {
      sampleRows.push({
        admission_no: 'JZV-2024-001',
        remarks: 'Consistent performance in class.',
        recommendations: 'Continue daily practice.',
      });
    }
    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Remarks');
    XLSX.writeFile(workbook, `exam_remarks_template_${schedule?.id || 'schedule'}.xlsx`);
  };

  const handleSaveBulkUpload = async () => {
    if (parsedRows.length === 0 || !schedule?.id) return;
    setSaving(true);

    const validRows = parsedRows.filter((r) => r.isValid && r.admission_no);
    if (validRows.length === 0) {
      showToast('No valid student records matched by admission number.', 'warning');
      setSaving(false);
      return;
    }

    const updatedMap = { ...studentRemarksMap };
    const payload = [];
    const storageKey = `${LOCAL_REMARKS_STORAGE_PREFIX}${schedule.id}`;
    const cached = JSON.parse(localStorage.getItem(storageKey) || '{}');

    validRows.forEach((r) => {
      const adm = r.admission_no;
      if (r.student_id) {
        updatedMap[String(r.student_id)] = {
          remarks: r.remarks,
          recommendations: r.recommendations,
        };
      }
      cached[adm] = {
        remarks: r.remarks,
        recommendations: r.recommendations,
      };
      payload.push({
        schedule_id: schedule.id,
        admission_no: adm,
        remarks: r.remarks,
        recommendations: r.recommendations,
        updated_at: new Date().toISOString(),
      });
    });

    localStorage.setItem(storageKey, JSON.stringify(cached));

    try {
      const { error } = await supabase
        .from('exam_student_remarks')
        .upsert(payload, { onConflict: 'schedule_id,admission_no' });

      if (error && error.code !== 'PGRST205') {
        console.warn('[ExamRemarksModal] Remote upload error:', error.message);
      }
    } catch (err) {
      console.warn('[ExamRemarksModal] Bulk upload database exception:', err);
    }

    onSaveSuccess?.(updatedMap);
    setSaving(false);
    showToast(`Successfully saved remarks for ${validRows.length} students`, 'success');
    setModalMode('individual');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-light-border animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-light-border bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shadow-2xs">
              <i className="fas fa-comment-dots" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-dark-primary tracking-tight">
                  Student Remarks &amp; Feedback
                </h3>
                {schedule?.name && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-dark-slate">
                    {schedule.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-dark-muted font-medium">
                {modalMode === 'individual'
                  ? 'Customize individual student feedback with quick navigation'
                  : 'Bulk upload remarks from Excel or CSV file'}
              </p>
            </div>
          </div>

          {/* Mode Switch Pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalMode('individual')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalMode === 'individual'
                    ? 'bg-white text-dark-primary shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-user-pen text-[10px]" />
                <span>Edit by Student</span>
              </button>
              <button
                type="button"
                onClick={() => setModalMode('upload')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalMode === 'upload'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-file-arrow-up text-[10px]" />
                <span>Upload File / CSV</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-muted hover:text-dark-primary hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <i className="fas fa-times text-sm" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {modalMode === 'individual' ? (
            /* ── Mode 1: Individual Student Edit with Next / Prev ── */
            <div className="space-y-4">
              {/* Student Navigation Bar */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <button
                    type="button"
                    onClick={handlePrevStudent}
                    disabled={currentIndex <= 0}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-2xs shrink-0"
                    title="Previous Student"
                  >
                    <i className="fas fa-chevron-left text-xs" />
                  </button>

                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-300 bg-white text-dark-primary focus:ring-2 focus:ring-amber-300 outline-none cursor-pointer"
                  >
                    {studentList.map((s, idx) => {
                      const hasCustom = !!studentRemarksMap[String(s.id)];
                      const adm = s.admission_no || s.admission_number;
                      return (
                        <option key={s.id} value={String(s.id)}>
                          #{idx + 1}. {s.student_name || `Student ${s.id}`} {adm ? `(${adm})` : ''}{' '}
                          {hasCustom ? '★ (Custom)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={handleNextStudent}
                    disabled={currentIndex >= studentList.length - 1}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-2xs shrink-0"
                    title="Next Student"
                  >
                    <i className="fas fa-chevron-right text-xs" />
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-xl">
                    Student {currentIndex + 1} of {studentList.length}
                  </span>
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-dark-primary tracking-wider flex items-center gap-1.5">
                    <i className="fas fa-quote-left text-amber-600" />
                    Teacher's Remarks
                  </label>
                  <span className="text-[10px] text-dark-muted font-semibold">
                    Appears in Remarks Block
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={remarksForm.remarks}
                  onChange={(e) =>
                    setRemarksForm((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  placeholder="Enter remarks for this student..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-light-border bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all resize-y"
                />

                {/* Quick Remarks Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-dark-muted self-center mr-1">
                    Presets:
                  </span>
                  {[
                    'Exceptional academic performance and brilliant conduct.',
                    'Consistent effort and active participation in class discussions.',
                    'Good potential; encourage more daily revisions and practice.',
                    'Shows great improvement in analytical problem solving.',
                    'Needs regular attendance and timely coursework submission.',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRemarksForm((prev) => ({ ...prev, remarks: preset }))}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer text-left"
                    >
                      + {preset.length > 32 ? preset.slice(0, 30) + '…' : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendations Textarea */}
              <div className="space-y-1.5 pt-2 border-t border-light-border/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-dark-primary tracking-wider flex items-center gap-1.5">
                    <i className="fas fa-lightbulb text-amber-600" />
                    Recommendations &amp; Action Plan
                  </label>
                  <span className="text-[10px] text-dark-muted font-semibold">
                    Actionable Guidance
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={remarksForm.recommendations}
                  onChange={(e) =>
                    setRemarksForm((prev) => ({ ...prev, recommendations: e.target.value }))
                  }
                  placeholder="Enter specific recommendations or suggestions..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-light-border bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all resize-y"
                />

                {/* Quick Recommendations Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-dark-muted self-center mr-1">
                    Presets:
                  </span>
                  {[
                    'Encouraged to read scientific periodicals and literature.',
                    'Recommend 30 minutes daily practice in core mathematics.',
                    'Practice mock tests to enhance examination time management.',
                    'Participate actively in extracurricular STEM and debate clubs.',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setRemarksForm((prev) => ({ ...prev, recommendations: preset }))
                      }
                      className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer text-left"
                    >
                      + {preset.length > 32 ? preset.slice(0, 30) + '…' : preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Mode 2: Bulk Upload Remarks (Excel / CSV / Paste) ── */
            <div className="space-y-4">
              {/* Requirements & Template Download Banner */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <i className="fas fa-file-csv text-amber-600" />
                    <span>Upload Format Requirements</span>
                  </h4>
                  <p className="text-xs text-amber-800">
                    Include columns:{' '}
                    <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold">
                      admission_no
                    </code>
                    ,{' '}
                    <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold">
                      remarks
                    </code>
                    ,{' '}
                    <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold">
                      recommendations
                    </code>
                    .
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplateCsv}
                    className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <i className="fas fa-download text-[10px]" />
                    <span>Template (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplateXlsx}
                    className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <i className="fas fa-file-excel text-[10px] text-emerald-600" />
                    <span>Template (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Sub-tabs: File vs Paste */}
              <div className="flex items-center gap-2 border-b border-light-border pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'file'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-dark-muted hover:text-dark-primary hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-file-arrow-up" />
                  <span>File Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'paste'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-dark-muted hover:text-dark-primary hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-paste" />
                  <span>Paste CSV / TSV</span>
                </button>
              </div>

              {activeTab === 'file' ? (
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
                  <input
                    type="file"
                    id="remarks-file-input"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="remarks-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shadow-xs">
                      <i className="fas fa-cloud-arrow-up" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-amber-800 hover:underline">
                        Choose Excel or CSV file
                      </span>
                      <p className="text-[11px] text-dark-muted mt-0.5">
                        Supports .xlsx, .xls, and .csv
                      </p>
                    </div>
                    {fileName && (
                      <span className="mt-1 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <i className="fas fa-check-circle text-amber-600" />
                        {fileName}
                      </span>
                    )}
                  </label>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <textarea
                    rows={5}
                    value={pasteContent}
                    onChange={handlePasteChange}
                    placeholder="Paste CSV or tab-separated text here..."
                    className="w-full font-mono text-xs p-3 rounded-xl border border-light-border bg-slate-50 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              )}

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-dark-primary">
                    <span>Preview Parsed Records ({parsedRows.length})</span>
                    <span className="text-emerald-700">
                      {parsedRows.filter((r) => r.isValid).length} matched /{' '}
                      {parsedRows.filter((r) => !r.isValid).length} unmatched
                    </span>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-light-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-dark-slate font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Adm No</th>
                          <th className="p-2">Student Name</th>
                          <th className="p-2">Remarks</th>
                          <th className="p-2">Recommendations</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className={r.isValid ? 'bg-white' : 'bg-rose-50/50'}>
                            <td className="p-2 font-mono">{r.admission_no}</td>
                            <td className="p-2">{r.student_name}</td>
                            <td className="p-2 truncate max-w-[180px]">{r.remarks || '—'}</td>
                            <td className="p-2 truncate max-w-[180px]">
                              {r.recommendations || '—'}
                            </td>
                            <td className="p-2">
                              {r.isValid ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                  Matched
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                                  Not Found
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-light-border flex items-center justify-between shrink-0">
          {modalMode === 'individual' ? (
            <>
              <button
                type="button"
                onClick={handleApplyToAll}
                disabled={saving || studentList.length === 0}
                className="px-3.5 py-2 text-xs font-bold text-dark-slate hover:text-dark-primary bg-white hover:bg-slate-100 border border-light-border rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                title="Copy current remarks & recommendations to all students in list"
              >
                <i className="fas fa-users text-amber-600 text-xs" />
                <span>Apply to All ({studentList.length})</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-dark-muted hover:text-dark-primary transition-colors cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrentStudent}
                  disabled={saving || !selectedStudentId}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <i className="fas fa-check text-xs" />
                  <span>Save for this Student</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setModalMode('individual')}
                className="px-3.5 py-2 text-xs font-semibold text-dark-muted hover:text-dark-primary transition-colors cursor-pointer"
              >
                Back to Individual Edit
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-dark-muted hover:text-dark-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkUpload}
                  disabled={saving || parsedRows.filter((r) => r.isValid).length === 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-double text-xs" />
                      <span>
                        Save &amp; Apply Uploaded (
                        {parsedRows.filter((r) => r.isValid).length})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamRemarksModal;
