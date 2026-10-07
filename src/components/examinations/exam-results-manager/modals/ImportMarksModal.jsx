import React, { useState } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

/**
 * ImportMarksModal
 * Modal for importing marks from CSV with override/ignore options
 */
const ImportMarksModal = ({
  isOpen,
  onClose,
  schedule,
  selectedClass,
  subjects = [],
  results = [],
  students = [],
  onImportSuccess,
}) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [subjectIndices, setSubjectIndices] = useState({});
  const [importMode, setImportMode] = useState('override'); // 'override' | 'ignore'
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setImportResult(null);
    setSubjectIndices({});

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

        const admIdx = headers.indexOf('admission_no');
        const indices = {};
        subjects.forEach((sub) => {
          const idx = headers.indexOf(sub.name.toLowerCase());
          if (idx !== -1) indices[sub.id] = idx;
        });

        if (admIdx === -1) throw new Error('CSV must contain admission_no column');

        const preview = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          if (cols.length <= admIdx) continue;
          const adm = cols[admIdx].toLowerCase();
          const student = students.find(
            (s) => String(s.admission_no || '').trim().toLowerCase() === adm
          );
          if (!student) continue;

          const row = { admission_no: adm, student_name: student.student_name };
          Object.entries(indices).forEach(([subId, idx]) => {
            row[subId] = cols[idx] || '';
          });
          preview.push(row);
        }
        setSubjectIndices(indices);
        setPreviewData(preview);
      } catch (err) {
        showToast('Invalid CSV format: ' + err.message, 'error');
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) return;
    setIsImporting(true);
    try {
      const subjectIds = Object.keys(subjectIndices);
      const updates = [];

      for (const row of previewData) {
        const student = students.find(
          (s) => String(s.admission_no || '').trim().toLowerCase() === row.admission_no
        );
        if (!student) continue;

        for (const subId of subjectIds) {
          const marks = row[subId];
          if (marks === '' || marks === undefined) continue;

          const res = results.find(
            (r) => String(r.class_id) === String(selectedClass.id) && String(r.subject_id) === subId
          );
          if (!res) continue;

          const existingEntry = await supabase
            .from('exam_result_entries')
            .select('*')
            .eq('result_id', res.id)
            .eq('admission_no', row.admission_no)
            .maybeSingle();

          if (existingEntry.data) {
            if (importMode === 'override') {
              updates.push({
                id: existingEntry.data.id,
                marks_obtained: Number(marks),
                is_absent: false,
              });
            }
          } else {
            updates.push({
              result_id: res.id,
              student_id: student.id,
              admission_no: row.admission_no,
              marks_obtained: Number(marks),
              is_absent: false,
            });
          }
        }
      }

      if (updates.length > 0) {
        const { error } = await supabase.from('exam_result_entries').upsert(updates);
        if (error) throw error;
      }

      setImportResult({ success: updates.length, mode: importMode });
      showToast(`Imported ${updates.length} mark entries (${importMode} mode)`, 'success');
      onImportSuccess();
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-light-border bg-emerald-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shadow-2xs">
              <i className="fas fa-upload" />
            </div>
            <div>
              <h3 className="text-base font-bold text-dark-primary">Import Marks from CSV</h3>
              <p className="text-xs text-dark-muted mt-0.5">
                {schedule?.name} · {selectedClass?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200 text-dark-muted flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-dark-slate mb-2">Select CSV File</label>
            <p className="text-[10px] text-dark-muted mb-2">
              Columns: admission_no, [Subject Name 1], [Subject Name 2], ...
            </p>
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
                      {subjects.map((s) => (
                        <th key={s.id} className="p-2 text-center">{s.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border">
                    {previewData.slice(0, 20).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono">{row.admission_no}</td>
                        <td className="p-2">{row.student_name}</td>
                        {subjects.map((s) => (
                          <td key={s.id} className="p-2 text-center font-mono">
                            {row[s.id] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {previewData.length > 20 && (
                      <tr>
                        <td colSpan={2 + subjects.length} className="p-2 text-center text-dark-muted text-[10px]">
                          ... and {previewData.length - 20} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="override"
                checked={importMode === 'override'}
                onChange={() => setImportMode('override')}
                className="text-emerald-600 focus:ring-emerald-400"
              />
              <span className="text-xs font-bold text-dark-primary">Override existing marks</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="ignore"
                checked={importMode === 'ignore'}
                onChange={() => setImportMode('ignore')}
                className="text-emerald-600 focus:ring-emerald-400"
              />
              <span className="text-xs font-bold text-dark-primary">Ignore existing marks</span>
            </label>
          </div>

          {importResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
              Successfully imported {importResult.success} mark entries ({importResult.mode} mode)
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-light-border bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-white transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || !file || previewData.length === 0}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isImporting ? (
              <>
                <i className="fas fa-spinner fa-spin text-xs" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <i className="fas fa-download text-xs" />
                <span>Import Marks</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportMarksModal;