import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

/**
 * ExamAttendanceUploadModal
 * Modal for uploading attendance data via CSV.
 * Extracted from the original ReportCardGenerator.jsx
 */
const ExamAttendanceUploadModal = ({
  isOpen,
  onClose,
  schedule,
  students,
  displayedStudents,
  attendanceMap,
  onUploadSuccess,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const admIdx = headers.indexOf('admission_no');
        const presentIdx = headers.indexOf('present');
        const absentIdx = headers.indexOf('absent');
        const leaveIdx = headers.indexOf('leave');
        const totalIdx = headers.indexOf('total_working_days');

        if (admIdx === -1) throw new Error('CSV must contain admission_no column');

        const preview = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          if (cols.length <= admIdx) continue;
          const adm = cols[admIdx].toLowerCase();
          const student = students.find((s) => String(s.admission_no || '').trim().toLowerCase() === adm);
          if (!student) continue;
          preview.push({
            admission_no: adm,
            student_name: student.student_name,
            present: presentIdx !== -1 ? Number(cols[presentIdx]) || 0 : 0,
            absent: absentIdx !== -1 ? Number(cols[absentIdx]) || 0 : 0,
            leave: leaveIdx !== -1 ? Number(cols[leaveIdx]) || 0 : 0,
            total_working_days: totalIdx !== -1 ? Number(cols[totalIdx]) || 200 : 200,
          });
        }
        setPreviewData(preview);
      } catch (err) {
        showToast('Invalid CSV format: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (previewData.length === 0) return;
    setIsUploading(true);
    try {
      const updates = previewData.map((row) => ({
        schedule_id: schedule.id,
        admission_no: row.admission_no,
        student_id: students.find((s) => String(s.admission_no || '').trim().toLowerCase() === row.admission_no)?.id,
        class_id: students.find((s) => String(s.admission_no || '').trim().toLowerCase() === row.admission_no)?.class_id,
        present: row.present,
        absent: row.absent,
        leave: row.leave,
        total_working_days: row.total_working_days,
      }));

      const { error } = await supabase.from('exam_attendance_entries').upsert(updates, { onConflict: 'schedule_id,admission_no' });
      if (error) throw error;

      showToast(`Attendance uploaded for ${updates.length} students`, 'success');
      onUploadSuccess();
      onClose();
    } catch (err) {
      console.error('Attendance upload failed:', err);
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-light-border bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shadow-2xs">
              <i className="fas fa-chart-gantt" />
            </div>
            <div>
              <h3 className="text-sm font-black text-dark-primary">Attendance Upload</h3>
              <p className="text-xs text-dark-muted">Upload attendance data for {schedule?.name || 'this examination'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark-slate mb-2">Select CSV File</label>
            <p className="text-[10px] text-dark-muted mb-2">Columns: admission_no, present, absent, leave, total_working_days</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white font-bold cursor-pointer"
            />
          </div>

          {previewData.length > 0 && (
            <div className="border border-light-border rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-light-border">
                <span className="text-xs font-bold text-dark-primary">Preview ({previewData.length} students)</span>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-dark-muted font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-2 text-left">Admission No</th>
                      <th className="p-2 text-left">Student Name</th>
                      <th className="p-2 text-center">Present</th>
                      <th className="p-2 text-center">Absent</th>
                      <th className="p-2 text-center">Leave</th>
                      <th className="p-2 text-center">Total Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border">
                    {previewData.slice(0, 20).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono">{row.admission_no}</td>
                        <td className="p-2">{row.student_name}</td>
                        <td className="p-2 text-center text-emerald-700 font-bold">{row.present}</td>
                        <td className="p-2 text-center text-rose-700 font-bold">{row.absent}</td>
                        <td className="p-2 text-center text-amber-700 font-bold">{row.leave}</td>
                        <td className="p-2 text-center font-mono">{row.total_working_days}</td>
                      </tr>
                    ))}
                    {previewData.length > 20 && (
                      <tr>
                        <td colSpan={6} className="p-2 text-center text-dark-muted text-[10px]">... and {previewData.length - 20} more rows</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-light-border bg-slate-50/50 rounded-b-2xl flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-100 cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleUpload} disabled={isUploading || previewData.length === 0} className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 shadow-xs">
            {isUploading ? 'Uploading...' : 'Upload Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamAttendanceUploadModal;