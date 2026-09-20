// src/components/examinations/ExamResultsEntryGrid.jsx
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import { ConditionalBlock } from '../portal-shared/ConditionalBlock';

/**
 * Multi-Subject Mark Entry Grid
 * Displays all selected subjects in a single comprehensive table view.
 * 
 * Capabilities:
 * - Columns for all selected subjects side-by-side
 * - Per-subject column editing permission (subject teacher, invigilator, coordinator)
 * - Read-only display with lock indicator for unauthorized subjects
 * - Keyboard navigation (Enter / ArrowDown to next student, ArrowRight / Tab to next subject)
 * - Quick batch actions: Fill Remaining, Mark Remaining Absent
 * - Live calculations: Student Total, %, Pass/Fail status
 * - Instant debounced saving to Supabase with real-time feedback
 */
const ExamResultsEntryGrid = ({
  results = [], // Array of result objects
  subjects = [], // Array of subject objects
  students = [],
  onStatusUpdate,
  canEditMap = {}, // Object mapping resultId -> boolean
  invigilatorNames = {}, // Object mapping resultId -> invigilator name
  canOverrideInvigilator = false,
  isCoordinator = false,
  userRoles = [],
}) => {
  // allEntries structure: { [resultId]: { [studentId]: entryObject } }
  const [allEntries, setAllEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingCells, setSavingCells] = useState(new Set()); // Set of "resultId_studentId"
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickFillModal, setShowQuickFillModal] = useState(false);
  const [quickFillSubjectId, setQuickFillSubjectId] = useState(results[0]?.id || '');
  const [quickFillValue, setQuickFillValue] = useState('');

  const debounceTimers = useRef({});
  const inputRefs = useRef({}); // "rowIdx_colIdx" -> input DOM element

  // Load entries for all selected results from DB
  const loadAllEntries = useCallback(async () => {
    if (!results || results.length === 0) {
      setAllEntries({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const resultIds = results.map((r) => r.id);
      const { data, error } = await supabase
        .from('exam_result_entries')
        .select('*')
        .in('result_id', resultIds);

      if (error) throw error;

      const entriesMap = {};
      results.forEach((r) => {
        entriesMap[String(r.id)] = {};
      });

      (data || []).forEach((entry) => {
        const rId = String(entry.result_id);
        const sId = String(entry.student_id);
        if (entriesMap[rId]) {
          entriesMap[rId][sId] = entry;
        }
      });

      setAllEntries(entriesMap);
    } catch (err) {
      console.error('Failed to load exam entries:', err);
      showToast('Failed to load marks entries', 'error');
    } finally {
      setLoading(false);
    }
  }, [results]);

  useEffect(() => {
    loadAllEntries();
  }, [loadAllEntries]);

  // Save a single entry to DB
  const saveCellEntry = useCallback(
    async (resultId, studentId, patch) => {
      const cellKey = `${resultId}_${studentId}`;
      setSavingCells((prev) => new Set(prev).add(cellKey));

      try {
        const currentResultEntries = allEntries[String(resultId)] || {};
        const existing = currentResultEntries[String(studentId)];

        const marksVal =
          patch.marks_obtained !== undefined ? patch.marks_obtained : existing?.marks_obtained;
        const isAbsentVal =
          patch.is_absent !== undefined ? patch.is_absent : existing?.is_absent || false;
        const remarksVal =
          patch.remarks !== undefined ? patch.remarks : existing?.remarks || null;

        const payload = {
          result_id: Number(resultId),
          student_id: Number(studentId),
          marks_obtained:
            isAbsentVal || marksVal === '' || marksVal === null || marksVal === undefined
              ? null
              : Number(marksVal),
          is_absent: Boolean(isAbsentVal),
          remarks: remarksVal,
        };

        if (existing?.id) {
          const { error } = await supabase
            .from('exam_result_entries')
            .update(payload)
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('exam_result_entries')
            .insert(payload)
            .select()
            .single();
          if (error) throw error;

          // Update local ID
          setAllEntries((prev) => {
            const next = { ...prev };
            if (!next[String(resultId)]) next[String(resultId)] = {};
            next[String(resultId)] = {
              ...next[String(resultId)],
              [String(studentId)]: { ...payload, id: data.id },
            };
            return next;
          });
        }

        // Check if all students for this result are filled
        const updatedEntries = {
          ...currentResultEntries,
          [String(studentId)]: { ...(existing || {}), ...payload },
        };
        const allStudentIds = students.map((s) => String(s.id));
        const allFilled = allStudentIds.every((sId) => {
          const e = updatedEntries[sId];
          return e && (e.is_absent || (e.marks_obtained !== null && e.marks_obtained !== ''));
        });

        if (allFilled && onStatusUpdate) {
          onStatusUpdate(Number(resultId), 'completed');
        } else if (
          allStudentIds.some((sId) => {
            const e = updatedEntries[sId];
            return e && (e.is_absent || e.marks_obtained !== null);
          }) &&
          onStatusUpdate
        ) {
          onStatusUpdate(Number(resultId), 'in_progress');
        }
      } catch (err) {
        console.error('Save cell error:', err);
        showToast('Save failed: ' + err.message, 'error');
      } finally {
        setSavingCells((prev) => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
      }
    },
    [allEntries, students, onStatusUpdate]
  );

  // Handle local marks edit with debouncing
  const handleMarksChange = (resultId, studentId, value) => {
    // Update local state immediately for responsive typing
    setAllEntries((prev) => {
      const next = { ...prev };
      const currentRes = next[String(resultId)] ? { ...next[String(resultId)] } : {};
      const existing = currentRes[String(studentId)] || { student_id: studentId, result_id: resultId };
      currentRes[String(studentId)] = { ...existing, marks_obtained: value, is_absent: false };
      next[String(resultId)] = currentRes;
      return next;
    });

    const timerKey = `${resultId}_${studentId}`;
    clearTimeout(debounceTimers.current[timerKey]);
    debounceTimers.current[timerKey] = setTimeout(() => {
      saveCellEntry(resultId, studentId, { marks_obtained: value, is_absent: false });
    }, 500);
  };

  // Toggle absent state
  const handleAbsentToggle = (resultId, studentId) => {
    const current = allEntries[String(resultId)]?.[String(studentId)];
    const newAbsent = !current?.is_absent;

    setAllEntries((prev) => {
      const next = { ...prev };
      const currentRes = next[String(resultId)] ? { ...next[String(resultId)] } : {};
      const existing = currentRes[String(studentId)] || { student_id: studentId, result_id: resultId };
      currentRes[String(studentId)] = {
        ...existing,
        is_absent: newAbsent,
        marks_obtained: newAbsent ? '' : existing.marks_obtained,
      };
      next[String(resultId)] = currentRes;
      return next;
    });

    saveCellEntry(resultId, studentId, {
      is_absent: newAbsent,
      marks_obtained: newAbsent ? null : current?.marks_obtained,
    });
  };

  // Keyboard navigation across cells
  const handleKeyDown = (e, rowIdx, colIdx, resultId, studentId) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRefs.current[`${rowIdx + 1}_${colIdx}`];
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = inputRefs.current[`${rowIdx - 1}_${colIdx}`];
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
      const nextColInput = inputRefs.current[`${rowIdx}_${colIdx + 1}`];
      if (nextColInput) {
        e.preventDefault();
        nextColInput.focus();
      }
    } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
      const prevColInput = inputRefs.current[`${rowIdx}_${colIdx - 1}`];
      if (prevColInput) {
        e.preventDefault();
        prevColInput.focus();
      }
    } else if (e.key === 'a' || e.key === 'A') {
      // Shortcut to toggle absent
      e.preventDefault();
      handleAbsentToggle(resultId, studentId);
      // Advance to next row
      const nextInput = inputRefs.current[`${rowIdx + 1}_${colIdx}`];
      if (nextInput) nextInput.focus();
    }
  };

  // Quick fill handler
  const handleQuickFill = async () => {
    if (!quickFillSubjectId || quickFillValue === '') return;
    const targetResult = results.find((r) => String(r.id) === String(quickFillSubjectId));
    if (!targetResult || !canEditMap[targetResult.id]) {
      showToast('You do not have permission to edit marks for this subject', 'error');
      return;
    }

    const currentResEntries = allEntries[String(targetResult.id)] || {};
    const unfilledStudents = students.filter((stu) => {
      const e = currentResEntries[String(stu.id)];
      return !e || (!e.is_absent && (e.marks_obtained === '' || e.marks_obtained === null));
    });

    if (unfilledStudents.length === 0) {
      showToast('No unfilled students remaining for this subject', 'info');
      setShowQuickFillModal(false);
      return;
    }

    try {
      const promises = unfilledStudents.map((stu) => {
        const existing = currentResEntries[String(stu.id)];
        const payload = {
          result_id: targetResult.id,
          student_id: stu.id,
          marks_obtained: Number(quickFillValue),
          is_absent: false,
        };
        if (existing?.id) {
          return supabase.from('exam_result_entries').update(payload).eq('id', existing.id);
        } else {
          return supabase.from('exam_result_entries').insert(payload);
        }
      });

      await Promise.all(promises);
      showToast(`Filled marks for ${unfilledStudents.length} students`, 'success');
      setShowQuickFillModal(false);
      setQuickFillValue('');
      loadAllEntries();
    } catch (err) {
      showToast('Quick fill error: ' + err.message, 'error');
    }
  };

  // Mark all remaining unfilled students as absent for editable subjects
  const handleMarkRemainingAbsent = async (targetResultId) => {
    const targetResult = results.find((r) => String(r.id) === String(targetResultId));
    if (!targetResult || !canEditMap[targetResult.id]) return;

    const currentResEntries = allEntries[String(targetResult.id)] || {};
    const unfilled = students.filter((stu) => {
      const e = currentResEntries[String(stu.id)];
      return !e || (!e.is_absent && (e.marks_obtained === '' || e.marks_obtained === null));
    });

    if (unfilled.length === 0) {
      showToast('No unentered students remaining', 'info');
      return;
    }

    try {
      const promises = unfilled.map((stu) => {
        const existing = currentResEntries[String(stu.id)];
        const payload = {
          result_id: targetResult.id,
          student_id: stu.id,
          marks_obtained: null,
          is_absent: true,
          remarks: 'Absent',
        };
        if (existing?.id) {
          return supabase.from('exam_result_entries').update(payload).eq('id', existing.id);
        } else {
          return supabase.from('exam_result_entries').insert(payload);
        }
      });
      await Promise.all(promises);
      showToast(`Marked ${unfilled.length} students as absent`, 'success');
      loadAllEntries();
      if (onStatusUpdate) onStatusUpdate(targetResult.id, 'completed');
    } catch (err) {
      showToast('Error marking absent: ' + err.message, 'error');
    }
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.student_name || '').toLowerCase().includes(q) ||
        (s.admission_no || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Overall statistics across all selected results
  const overallStats = useMemo(() => {
    let totalPossible = 0;
    let totalFilled = 0;
    let totalAbsent = 0;

    results.forEach((r) => {
      const resEntries = allEntries[String(r.id)] || {};
      students.forEach((stu) => {
        totalPossible++;
        const e = resEntries[String(stu.id)];
        if (e) {
          if (e.is_absent) {
            totalFilled++;
            totalAbsent++;
          } else if (e.marks_obtained !== '' && e.marks_obtained !== null) {
            totalFilled++;
          }
        }
      });
    });

    const pct = totalPossible > 0 ? Math.round((totalFilled / totalPossible) * 100) : 0;
    return { totalPossible, totalFilled, totalAbsent, pct };
  }, [results, students, allEntries]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls & Progress Bar */}
      <div className="bg-white border border-light-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-dark-primary">
                Marks Register Progress: {overallStats.totalFilled} of {overallStats.totalPossible} Entries
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  overallStats.pct === 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {overallStats.pct}% Complete
              </span>
            </div>
            <div className="w-48 sm:w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${overallStats.pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search filter */}
            <div className="relative w-full sm:w-60">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-dark-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search student or adm no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark-muted hover:text-dark-primary cursor-pointer"
                >
                  <i className="fas fa-times-circle" />
                </button>
              )}
            </div>

            {/* Quick Fill Button */}
            {results.some((r) => canEditMap[r.id]) && (
              <ConditionalBlock name="exam-results-quick-fill" roles={userRoles}>
                <button
                  type="button"
                  onClick={() => setShowQuickFillModal(true)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Quick fill marks for unfilled students"
                >
                  <i className="fas fa-magic text-[10px]" />
                  <span>Quick Fill</span>
                </button>
              </ConditionalBlock>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Subject Table */}
      <div className="bg-white border border-light-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto relative max-h-[700px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-20 shadow-2xs">
              <tr className="border-b border-light-border text-dark-slate font-bold">
                {/* Fixed Columns: Index & Student */}
                <th className="py-3 px-3 text-left w-8 sticky left-0 bg-slate-50 z-30">#</th>
                <th className="py-3 px-4 text-left sticky left-8 bg-slate-50 z-30 border-r border-light-border shadow-xs min-w-[160px] sm:min-w-[200px]">
                  Student Details
                </th>

                {/* Dynamic Subject Columns */}
                {results.map((result, colIdx) => {
                  const subject = subjects[colIdx];
                  const canEdit = canEditMap[result.id];
                  const invigName = invigilatorNames[result.id];

                  return (
                    <th
                      key={result.id}
                      className="py-3 px-3 text-center border-r border-slate-200 min-w-[160px] max-w-[220px]"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-black text-dark-primary text-xs">
                          {subject?.name || `Sub #${result.subject_id}`}
                        </span>
                        {!canEdit && (
                          <span title="Read-only: You do not have permission to edit marks for this subject">
                            <i className="fas fa-lock text-slate-400 text-[10px]" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-dark-muted font-normal mt-0.5">
                        <span>Max: <strong>{result.max_marks}</strong></span>
                        {result.pass_marks && (
                          <span>· Pass: <strong>{result.pass_marks}</strong></span>
                        )}
                      </div>
                      {invigName && (
                        <div className="text-[9px] text-emerald-700 font-semibold truncate mt-0.5">
                          Invig: {invigName}
                        </div>
                      )}
                      {canEdit && (
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMarkRemainingAbsent(result.id)}
                            className="text-[9px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded cursor-pointer"
                            title="Mark remaining empty students as absent"
                          >
                            Mark Rest Absent
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}

                {/* Summary Columns */}
                <th className="py-3 px-3 text-center w-24 bg-slate-100/70 border-r border-slate-200">
                  Total
                </th>
                <th className="py-3 px-3 text-center w-20 bg-slate-100/70 border-r border-slate-200">
                  %
                </th>
                <th className="py-3 px-3 text-center w-20 bg-slate-100/70">
                  Result
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-light-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={results.length + 5}
                    className="text-center py-12 text-xs text-dark-muted font-semibold"
                  >
                    No students found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, rowIdx) => {
                  let studentObtainedTotal = 0;
                  let studentMaxTotal = 0;
                  let hasAnyFail = false;
                  let allSubjectsEntered = true;

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Row number */}
                      <td className="py-2.5 px-3 text-dark-muted text-[11px] font-mono font-bold sticky left-0 bg-white z-10">
                        {rowIdx + 1}
                      </td>

                      {/* Student info */}
                      <td className="py-2.5 px-4 sticky left-8 bg-white z-10 border-r border-light-border shadow-xs">
                        <div className="font-bold text-dark-primary text-xs truncate max-w-[150px] sm:max-w-[190px]">
                          {stu.student_name}
                        </div>
                        <div className="text-[10px] text-dark-muted font-mono truncate">
                          Adm: {stu.admission_no}
                        </div>
                      </td>

                      {/* Subject Mark Columns */}
                      {results.map((result, colIdx) => {
                        const canEdit = canEditMap[result.id];
                        const cellKey = `${result.id}_${stu.id}`;
                        const entry = allEntries[String(result.id)]?.[String(stu.id)];
                        const isSaving = savingCells.has(cellKey);

                        const marks = entry?.marks_obtained;
                        const isAbsent = Boolean(entry?.is_absent);
                        const numMarks = marks !== '' && marks !== null && marks !== undefined ? Number(marks) : null;

                        const isOver = !isAbsent && numMarks !== null && numMarks > Number(result.max_marks);
                        const isPassing =
                          result.pass_marks &&
                          !isAbsent &&
                          numMarks !== null &&
                          numMarks >= Number(result.pass_marks);
                        const isFailing =
                          result.pass_marks &&
                          !isAbsent &&
                          numMarks !== null &&
                          numMarks < Number(result.pass_marks);

                        // Accumulate summary totals
                        if (isAbsent) {
                          studentMaxTotal += Number(result.max_marks);
                          hasAnyFail = true;
                        } else if (numMarks !== null) {
                          studentObtainedTotal += numMarks;
                          studentMaxTotal += Number(result.max_marks);
                          if (isFailing) hasAnyFail = true;
                        } else {
                          allSubjectsEntered = false;
                          studentMaxTotal += Number(result.max_marks);
                        }

                        return (
                          <td
                            key={result.id}
                            className={`py-2 px-2 text-center border-r border-slate-100 ${
                              isAbsent
                                ? 'bg-red-50/40'
                                : isOver
                                  ? 'bg-amber-50/40'
                                  : isFailing
                                    ? 'bg-rose-50/20'
                                    : ''
                            }`}
                          >
                            {canEdit ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="relative inline-flex items-center justify-center">
                                  <input
                                    ref={(el) => {
                                      inputRefs.current[`${rowIdx}_${colIdx}`] = el;
                                    }}
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max={result.max_marks}
                                    step="0.5"
                                    disabled={isAbsent}
                                    placeholder="—"
                                    value={isAbsent ? '' : marks ?? ''}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) =>
                                      handleKeyDown(e, rowIdx, colIdx, result.id, stu.id)
                                    }
                                    onChange={(e) =>
                                      handleMarksChange(result.id, stu.id, e.target.value)
                                    }
                                    className={`w-16 text-center font-bold px-1.5 py-1 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition-all ${
                                      isAbsent
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : isOver
                                          ? 'border-orange-400 bg-orange-50 text-orange-800'
                                          : isPassing
                                            ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900'
                                            : isFailing
                                              ? 'border-rose-300 bg-rose-50/40 text-rose-900'
                                              : 'border-light-border bg-white text-dark-primary'
                                    }`}
                                  />
                                  {isSaving && (
                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                  )}
                                </div>

                                {/* Absent toggle button */}
                                <button
                                  type="button"
                                  onClick={() => handleAbsentToggle(result.id, stu.id)}
                                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                    isAbsent
                                      ? 'bg-red-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                  }`}
                                  title={isAbsent ? 'Unmark absent' : 'Mark absent (or press "A")'}
                                >
                                  {isAbsent ? 'Abs' : 'A'}
                                </button>
                              </div>
                            ) : (
                              /* Read-only cell */
                              <div className="text-center font-bold text-xs py-1">
                                {isAbsent ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">
                                    Absent
                                  </span>
                                ) : numMarks !== null ? (
                                  <span
                                    className={
                                      isPassing
                                        ? 'text-emerald-700'
                                        : isFailing
                                          ? 'text-rose-700'
                                          : 'text-dark-primary'
                                    }
                                  >
                                    {numMarks}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary: Total Marks */}
                      <td className="py-2 px-2 text-center bg-slate-50/60 border-r border-slate-200 font-bold text-xs">
                        <span className="text-dark-primary">{studentObtainedTotal}</span>
                        <span className="text-[10px] text-dark-muted font-normal"> / {studentMaxTotal}</span>
                      </td>

                      {/* Summary: Percentage */}
                      <td className="py-2 px-2 text-center bg-slate-50/60 border-r border-slate-200 font-black text-xs">
                        {studentMaxTotal > 0
                          ? `${((studentObtainedTotal / studentMaxTotal) * 100).toFixed(1)}%`
                          : '—'}
                      </td>

                      {/* Summary: Pass/Fail */}
                      <td className="py-2 px-2 text-center bg-slate-50/60">
                        {hasAnyFail ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            Fail
                          </span>
                        ) : allSubjectsEntered ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Pass
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-dark-muted">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Fill Modal */}
      {showQuickFillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-dark-primary flex items-center gap-2">
                <i className="fas fa-magic text-emerald-600" />
                <span>Quick Fill Marks</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickFillModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <p className="text-xs text-dark-muted">
              Fills all unentered student marks for the selected subject at once.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1">Target Subject</label>
                <select
                  value={quickFillSubjectId}
                  onChange={(e) => setQuickFillSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                >
                  {results
                    .filter((r) => canEditMap[r.id])
                    .map((r, idx) => (
                      <option key={r.id} value={r.id}>
                        {subjects[idx]?.name || `Subject #${r.subject_id}`} (Max: {r.max_marks})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1">Score to Fill</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={quickFillValue}
                  onChange={(e) => setQuickFillValue(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-full px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-light-border">
              <button
                type="button"
                onClick={() => setShowQuickFillModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickFill}
                disabled={quickFillValue === ''}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                Apply Fill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamResultsEntryGrid;
