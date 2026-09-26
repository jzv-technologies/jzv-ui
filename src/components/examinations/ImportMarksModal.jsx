// src/components/examinations/ImportMarksModal.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

/**
 * Parses simple CSV content into headers and row objects
 */
const parseCSV = (text) => {
  const lines = text
    .split(/\r\n|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  // Helper to split a CSV line considering quotes
  const splitLine = (str) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const headers = splitLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    const row = {};
    headers.forEach((h, colIdx) => {
      row[h] = vals[colIdx] !== undefined ? vals[colIdx] : '';
    });
    rows.push(row);
  }

  return { headers, rows };
};

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
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [conflictStrategy, setConflictStrategy] = useState('override'); // 'override' | 'ignore'
  const [subjectMappings, setSubjectMappings] = useState({}); // { [colName]: subjectId }
  const [existingEntriesMap, setExistingEntriesMap] = useState({}); // { [resultId]: { [studentId]: entry } }
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Subject lookup map: subjectId -> { resultId, maxMarks, name }
  const subjectMetaMap = useMemo(() => {
    const map = {};
    subjects.forEach((sub) => {
      const res = results.find((r) => String(r.subject_id) === String(sub.id));
      map[String(sub.id)] = {
        subjectId: sub.id,
        name: sub.name,
        resultId: res?.id || null,
        maxMarks: Number(res?.max_marks) || 100,
      };
    });
    return map;
  }, [subjects, results]);

  // Load existing entries for these results so we know who already has marks
  useEffect(() => {
    if (!isOpen || results.length === 0) return;
    const fetchExisting = async () => {
      setLoadingExisting(true);
      try {
        const resultIds = results.map((r) => r.id).filter(Boolean);
        if (resultIds.length === 0) return;

        const { data, error } = await supabase
          .from('exam_result_entries')
          .select('id, result_id, student_id, marks_obtained, is_absent')
          .in('result_id', resultIds);

        if (error) throw error;

        const map = {};
        (data || []).forEach((e) => {
          const rId = String(e.result_id);
          const sId = String(e.student_id);
          if (!map[rId]) map[rId] = {};
          map[rId][sId] = e;
        });
        setExistingEntriesMap(map);
      } catch (err) {
        console.warn('Failed to load existing entries for conflict detection:', err);
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
  }, [isOpen, results]);

  // Reset modal on open/close
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFileName('');
      setHeaders([]);
      setRows([]);
      setSubjectMappings({});
      setImporting(false);
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      showToast('Please upload a valid .csv file', 'error');
      return;
    }

    setFileName(selectedFile.name);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const { headers: parsedH, rows: parsedR } = parseCSV(text);

      if (parsedH.length === 0 || parsedR.length === 0) {
        showToast('CSV file is empty or missing headers', 'error');
        return;
      }

      setHeaders(parsedH);
      setRows(parsedR);

      // Auto-map columns to subjects by matching names or IDs
      const autoMap = {};
      parsedH.forEach((col) => {
        const colClean = col.toLowerCase().trim();
        // Check if matches subject name or code
        const matched = subjects.find((s) => {
          const sName = s.name.toLowerCase().trim();
          return (
            colClean === sName ||
            colClean.includes(sName) ||
            sName.includes(colClean) ||
            colClean === `subject_${s.id}` ||
            colClean === `[${s.id}]`
          );
        });
        if (matched) {
          autoMap[col] = String(matched.id);
        }
      });
      setSubjectMappings(autoMap);
      showToast(`Loaded ${parsedR.length} rows from CSV`, 'success');
    };
    reader.readAsText(selectedFile);
  };

  // Student matching lookup index
  const studentIndex = useMemo(() => {
    const byAdm = {};
    const byRoll = {};
    const byName = {};

    students.forEach((s) => {
      if (s.admission_no) byAdm[String(s.admission_no).trim().toLowerCase()] = s;
      if (s.roll_no) byRoll[String(s.roll_no).trim()] = s;
      if (s.student_name) byName[s.student_name.trim().toLowerCase()] = s;
    });

    return { byAdm, byRoll, byName };
  }, [students]);

  const findStudentInRow = (row) => {
    // 1. Check admission number columns
    const admKeys = [
      'admission no',
      'admission_no',
      'adm no',
      'adm_no',
      'admissionno',
      'admission',
    ];
    for (const k of Object.keys(row)) {
      if (admKeys.includes(k.toLowerCase().trim())) {
        const val = String(row[k] || '')
          .trim()
          .toLowerCase();
        if (val && studentIndex.byAdm[val]) return studentIndex.byAdm[val];
      }
    }

    // 2. Check roll number columns
    const rollKeys = ['roll no', 'roll_no', 'roll', 'rollno', 's.no', 'sno'];
    for (const k of Object.keys(row)) {
      if (rollKeys.includes(k.toLowerCase().trim())) {
        const val = String(row[k] || '').trim();
        if (val && studentIndex.byRoll[val]) return studentIndex.byRoll[val];
      }
    }

    // 3. Check student name column
    const nameKeys = ['student name', 'student_name', 'name', 'student'];
    for (const k of Object.keys(row)) {
      if (nameKeys.includes(k.toLowerCase().trim())) {
        const val = String(row[k] || '')
          .trim()
          .toLowerCase();
        if (val && studentIndex.byName[val]) return studentIndex.byName[val];
      }
    }

    return null;
  };

  // Process rows and build preview items
  const previewItems = useMemo(() => {
    if (rows.length === 0 || Object.keys(subjectMappings).length === 0) return [];

    const items = [];
    const mappedCols = Object.entries(subjectMappings).filter(([_, sId]) => Boolean(sId));

    rows.forEach((row, rowIdx) => {
      const student = findStudentInRow(row);
      const studentIdent = student
        ? `${student.student_name} (${student.admission_no || `#${student.roll_no}`})`
        : `Unmatched Row ${rowIdx + 1}`;

      mappedCols.forEach(([colName, subjectId]) => {
        const subMeta = subjectMetaMap[String(subjectId)];
        if (!subMeta) return;

        const rawVal = String(row[colName] || '').trim();
        if (rawVal === '') return; // Skip completely empty columns

        const isAbsent = ['ab', 'a', 'absent'].includes(rawVal.toLowerCase());
        const numVal = isAbsent ? null : Number(rawVal);
        const isNumeric = !isAbsent && !isNaN(numVal);
        const exceedsMax = isNumeric && numVal > subMeta.maxMarks;
        const isNegative = isNumeric && numVal < 0;
        const isInvalid = !isAbsent && (!isNumeric || exceedsMax || isNegative);

        // Check if mark already exists in DB
        const resId = String(subMeta.resultId);
        const existing = student ? existingEntriesMap[resId]?.[String(student.id)] : null;
        const hasExistingMark =
          existing && (existing.marks_obtained !== null || existing.is_absent);

        let actionType = 'create';
        let actionLabel = 'New Entry';
        let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';

        if (!student) {
          actionType = 'error';
          actionLabel = 'Student Not Found';
          badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
        } else if (isInvalid) {
          actionType = 'error';
          actionLabel = exceedsMax ? `Exceeds Max (${subMeta.maxMarks})` : 'Invalid Number';
          badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
        } else if (hasExistingMark) {
          if (conflictStrategy === 'override') {
            actionType = 'override';
            actionLabel = 'Will Override';
            badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
          } else {
            actionType = 'ignore';
            actionLabel = 'Will Ignore (Preserve Existing)';
            badgeColor = 'bg-slate-100 text-slate-600 border-slate-300';
          }
        }

        items.push({
          rowIdx,
          student,
          studentIdent,
          subjectId,
          subjectName: subMeta.name,
          resultId: subMeta.resultId,
          maxMarks: subMeta.maxMarks,
          rawVal,
          marksObtained: isAbsent ? null : numVal,
          isAbsent,
          existingEntry: existing,
          actionType,
          actionLabel,
          badgeColor,
        });
      });
    });

    return items;
  }, [rows, subjectMappings, subjectMetaMap, studentIndex, existingEntriesMap, conflictStrategy]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    let toInsert = 0;
    let toOverride = 0;
    let toIgnore = 0;
    let errors = 0;

    previewItems.forEach((item) => {
      if (item.actionType === 'create') toInsert++;
      else if (item.actionType === 'override') toOverride++;
      else if (item.actionType === 'ignore') toIgnore++;
      else if (item.actionType === 'error') errors++;
    });

    return { toInsert, toOverride, toIgnore, errors, total: previewItems.length };
  }, [previewItems]);

  // Execute Import
  const handleExecuteImport = async () => {
    const validItems = previewItems.filter(
      (item) => item.actionType === 'create' || item.actionType === 'override'
    );

    if (validItems.length === 0) {
      showToast('No valid marks to import', 'warning');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Group items by whether they need update or insert
      for (const item of validItems) {
        if (!item.resultId || !item.student?.id) continue;

        const payload = {
          result_id: Number(item.resultId),
          student_id: Number(item.student.id),
          marks_obtained: item.isAbsent ? null : item.marksObtained,
          is_absent: Boolean(item.isAbsent),
        };

        if (item.existingEntry?.id) {
          // Update existing
          const { error } = await supabase
            .from('exam_result_entries')
            .update(payload)
            .eq('id', item.existingEntry.id);
          if (error) failCount++;
          else successCount++;
        } else {
          // Insert new
          const { error } = await supabase.from('exam_result_entries').insert(payload);
          if (error) failCount++;
          else successCount++;
        }
      }

      // Update result status to in_progress if still pending
      const touchedResultIds = Array.from(new Set(validItems.map((i) => i.resultId)));
      for (const rId of touchedResultIds) {
        await supabase
          .from('exam_results')
          .update({ entry_status: 'in_progress' })
          .eq('id', rId)
          .eq('entry_status', 'pending');
      }

      showToast(
        `Import complete: ${successCount} marks saved${
          failCount > 0 ? `, ${failCount} failed` : ''
        }${summaryCounts.toIgnore > 0 ? ` (${summaryCounts.toIgnore} preserved)` : ''}`,
        successCount > 0 ? 'success' : 'error'
      );

      if (onImportSuccess) onImportSuccess();
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      showToast(err.message || 'Failed to import marks', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-light-border bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shadow-2xs shrink-0">
              <i className="fas fa-upload" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-dark-primary">
                Import Examination Marks (CSV)
              </h3>
              <p className="text-[11px] font-semibold text-dark-muted">
                {selectedClass?.name} · {schedule?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-light-border text-dark-muted hover:bg-slate-200 hover:text-dark-primary flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Step 1: Upload File */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-dark-slate tracking-wider block">
              1. Upload CSV File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                fileName
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <i
                className={`fas ${
                  fileName
                    ? 'fa-file-circle-check text-emerald-600'
                    : 'fa-cloud-arrow-up text-slate-400'
                } text-2xl sm:text-3xl mb-2 block`}
              />
              {fileName ? (
                <div>
                  <p className="text-xs font-black text-emerald-800">{fileName}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    Click to change file · {rows.length} records parsed
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-dark-primary">
                    Click or drop CSV file here to upload
                  </p>
                  <p className="text-[11px] text-dark-muted mt-1">
                    Columns should include Student details (Admission No or Roll No) and Subject
                    Marks
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Conflict Resolution Strategy (Mandatory User Requirement) */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-dark-slate tracking-wider">
                2. If Mark Already Exists
              </label>
              <span className="text-[10px] text-dark-muted font-bold">Conflict Handling Mode</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  conflictStrategy === 'override'
                    ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="conflictStrategy"
                  value="override"
                  checked={conflictStrategy === 'override'}
                  onChange={() => setConflictStrategy('override')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black block">Override Existing Marks</span>
                  <span className="text-[10px] opacity-80 leading-tight block mt-0.5">
                    Replace already entered marks with new values from the CSV file.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  conflictStrategy === 'ignore'
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="conflictStrategy"
                  value="ignore"
                  checked={conflictStrategy === 'ignore'}
                  onChange={() => setConflictStrategy('ignore')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black block">Ignore / Preserve Existing</span>
                  <span className="text-[10px] opacity-80 leading-tight block mt-0.5">
                    Keep existing marks safe. Only fill marks for students currently pending or
                    empty.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Step 3: Column to Subject Mapping */}
          {headers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-dark-slate tracking-wider">
                  3. Map CSV Columns to Subjects
                </label>
                <span className="text-[10px] text-dark-muted font-bold">
                  Select which column maps to which subject
                </span>
              </div>
              <div className="bg-white border border-light-border rounded-2xl p-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-light-border text-left text-[11px] text-dark-muted font-bold">
                      <th className="pb-2">CSV Column Name</th>
                      <th className="pb-2">Sample Value</th>
                      <th className="pb-2">Map to Subject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {headers.map((col) => {
                      const sampleVal = rows[0]?.[col] || '';
                      const isMapped = Boolean(subjectMappings[col]);
                      return (
                        <tr key={col} className="hover:bg-slate-50/50">
                          <td className="py-2 font-bold text-dark-primary">{col}</td>
                          <td className="py-2 text-dark-muted font-mono text-[11px] truncate max-w-[120px]">
                            {sampleVal || '—'}
                          </td>
                          <td className="py-2">
                            <select
                              value={subjectMappings[col] || ''}
                              onChange={(e) =>
                                setSubjectMappings((prev) => ({
                                  ...prev,
                                  [col]: e.target.value,
                                }))
                              }
                              className={`text-xs font-bold rounded-xl border px-2.5 py-1.5 outline-none cursor-pointer ${
                                isMapped
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              <option value="">-- Do Not Import / Not a Subject --</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name} (Max: {subjectMetaMap[String(sub.id)]?.maxMarks || 100}
                                  )
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 4: Preview & Validation */}
          {previewItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-black uppercase text-dark-slate tracking-wider">
                  4. Import Preview ({previewItems.length} Entries)
                </label>
                <div className="flex items-center gap-2 text-[10px] font-extrabold">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {summaryCounts.toInsert} New
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {summaryCounts.toOverride} Override
                  </span>
                  {summaryCounts.toIgnore > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {summaryCounts.toIgnore} Ignored
                    </span>
                  )}
                  {summaryCounts.errors > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      {summaryCounts.errors} Invalid
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto border border-light-border rounded-2xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-light-border text-[10px] font-extrabold text-dark-muted uppercase">
                    <tr>
                      <th className="py-2 px-3 text-left">Student</th>
                      <th className="py-2 px-2 text-left">Subject</th>
                      <th className="py-2 px-2 text-center">Mark in CSV</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewItems.slice(0, 100).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-3 font-bold text-dark-primary truncate max-w-[200px]">
                          {item.studentIdent}
                        </td>
                        <td className="py-1.5 px-2 text-dark-slate">{item.subjectName}</td>
                        <td className="py-1.5 px-2 text-center font-mono font-black">
                          {item.isAbsent ? (
                            <span className="text-amber-600 font-bold">ABSENT</span>
                          ) : (
                            <span>
                              {item.marksObtained}
                              <span className="text-dark-muted font-normal text-[10px]">
                                /{item.maxMarks}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}
                          >
                            {item.actionLabel}
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
        <div className="p-4 sm:p-5 border-t border-light-border bg-slate-50 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-dark-muted hidden sm:block">
            {summaryCounts.toInsert + summaryCounts.toOverride} valid marks ready to import.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-dark-slate border border-light-border rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || summaryCounts.toInsert + summaryCounts.toOverride === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {importing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-check-double text-xs" />
                  <span>Import {summaryCounts.toInsert + summaryCounts.toOverride} Marks</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportMarksModal;
