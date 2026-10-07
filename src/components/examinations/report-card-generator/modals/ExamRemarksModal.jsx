import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

/**
 * ExamRemarksModal
 * Modal for editing individual student remarks with Next/Prev navigation and bulk upload.
 * Extracted from the original ReportCardGenerator.jsx
 */
const ExamRemarksModal = ({
  isOpen,
  onClose,
  schedule,
  students,
  displayedStudents,
  studentRemarksMap,
  onSaveSuccess,
  activeTemplate,
}) => {
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);
  const [remarksForm, setRemarksForm] = useState({ remarks: '', recommendations: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const currentStudent = displayedStudents[selectedStudentIdx];
  const totalStudents = displayedStudents.length;

  useEffect(() => {
    if (isOpen && currentStudent) {
      const existing = studentRemarksMap[String(currentStudent.id)] || {};
      setRemarksForm({
        remarks: existing.remarks || '',
        recommendations: existing.recommendations || '',
      });
    }
  }, [isOpen, currentStudent, studentRemarksMap]);

  const handleSave = async () => {
    if (!currentStudent) return;
    setIsSaving(true);
    try {
      const adm = String(currentStudent.admission_no || '').trim().toLowerCase();
      const payload = {
        schedule_id: schedule.id,
        admission_no: adm,
        student_id: currentStudent.id,
        class_id: currentStudent.class_id,
        remarks: remarksForm.remarks,
        recommendations: remarksForm.recommendations,
      };

      const { error } = await supabase.from('exam_student_remarks').upsert(payload, { onConflict: 'schedule_id,admission_no' });
      if (error) throw error;

      const updatedMap = { ...studentRemarksMap, [String(currentStudent.id)]: { ...remarksForm } };
      onSaveSuccess(updatedMap);
      showToast(`Remarks saved for ${currentStudent.student_name}`, 'success');
    } catch (err) {
      console.error('Failed to save remarks:', err);
      showToast('Failed to save remarks', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (selectedStudentIdx < totalStudents - 1) {
      setSelectedStudentIdx((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (selectedStudentIdx > 0) {
      setSelectedStudentIdx((i) => i - 1);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);
    setIsBulkUploading(true);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const admIdx = headers.indexOf('admission_no');
      const remarksIdx = headers.indexOf('remarks');
      const recIdx = headers.indexOf('recommendations');

      if (admIdx === -1) throw new Error('CSV must contain admission_no column');

      const updates = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length <= admIdx) continue;
        const adm = cols[admIdx].toLowerCase();
        const student = students.find((s) => String(s.admission_no || '').trim().toLowerCase() === adm);
        if (!student) continue;
        updates.push({
          schedule_id: schedule.id,
          admission_no: adm,
          student_id: student.id,
          class_id: student.class_id,
          remarks: remarksIdx !== -1 ? cols[remarksIdx] : '',
          recommendations: recIdx !== -1 ? cols[recIdx] : '',
        });
      }

      if (updates.length > 0) {
        const { error } = await supabase.from('exam_student_remarks').upsert(updates, { onConflict: 'schedule_id,admission_no' });
        if (error) throw error;
      }

      showToast(`Bulk uploaded remarks for ${updates.length} students`, 'success');
      onSaveSuccess({});
    } catch (err) {
      console.error('Bulk upload failed:', err);
      showToast(err.message || 'Bulk upload failed', 'error');
    } finally {
      setIsBulkUploading(false);
      setBulkFile(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-border bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base shadow-2xs">
              <i className="fas fa-comment-dots" />
            </div>
            <div>
              <h3 className="text-sm font-black text-dark-primary">Teacher Remarks & Recommendations</h3>
              <p className="text-xs text-dark-muted">Edit individual student remarks for {schedule?.name || 'this examination'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Student Navigation */}
        <div className="px-4 py-3 border-b border-light-border bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={handlePrev} disabled={selectedStudentIdx === 0} className="p-2 rounded-lg border border-light-border bg-white text-dark-muted hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all">
              <i className="fas fa-chevron-left" />
            </button>
            <span className="text-xs font-bold text-dark-primary min-w-[120px] text-center">
              {currentStudent ? `${currentStudent.student_name} (${currentStudent.admission_no})` : 'No students'}
            </span>
            <button type="button" onClick={handleNext} disabled={selectedStudentIdx >= totalStudents - 1} className="p-2 rounded-lg border border-light-border bg-white text-dark-muted hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all">
              <i className="fas fa-chevron-right" />
            </button>
          </div>
          <span className="text-[10px] font-mono font-bold text-dark-muted">{selectedStudentIdx + 1} / {totalStudents}</span>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark-slate mb-1">Remarks</label>
            <textarea
              value={remarksForm.remarks}
              onChange={(e) => setRemarksForm({ ...remarksForm, remarks: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white font-bold focus:ring-2 focus:ring-rose-300 outline-none resize-none"
              placeholder="Enter teacher remarks for this student..."
            />
          </div>

          {activeTemplate.remarksConfig?.showRecommendations !== false && (
            <div>
              <label className="block text-xs font-bold text-dark-slate mb-1">Recommendations & Action Plan</label>
              <textarea
                value={remarksForm.recommendations}
                onChange={(e) => setRemarksForm({ ...remarksForm, recommendations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white font-bold focus:ring-2 focus:ring-rose-300 outline-none resize-none"
                placeholder="Enter recommendations for this student..."
              />
            </div>
          )}

          {/* Bulk Upload */}
          <div className="pt-4 border-t border-light-border">
            <h4 className="text-xs font-black text-dark-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <i className="fas fa-file-upload text-amber-600" />
              Bulk Upload (CSV)
            </h4>
            <p className="text-[10px] text-dark-muted mb-2">CSV columns: admission_no, remarks, recommendations</p>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                className="flex-1 px-3 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold cursor-pointer"
              />
              <button
                type="button"
                onClick={() => document.querySelector('input[type="file"]').click()}
                disabled={isBulkUploading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isBulkUploading ? 'Uploading...' : 'Upload CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-light-border bg-slate-50/50 rounded-b-2xl flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-100 cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving || !currentStudent} className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50 shadow-xs">
            {isSaving ? 'Saving...' : 'Save & Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamRemarksModal;