// src/components/examinations/ExamResultsEntryGrid.jsx
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

/**
 * Enhanced Mark Entry Grid for a single subject.
 * Features:
 * - Vertical keyboard navigation (Enter / ArrowDown to next student, ArrowUp to previous)
 * - Auto-select on focus for instant typing without backspacing
 * - 'A' / 'a' key shortcut to mark Absent and advance
 * - Quick student search by name / admission number
 * - Quick batch actions: Fill Remaining, Mark Remaining Absent, Clear All
 * - Live progress bar, grade validation, and summary metrics
 * - Mobile numeric keypad mode (inputMode="decimal")
 */
const ExamResultsEntryGrid = ({
  result,
  students,
  onStatusUpdate,
  canEdit = true,
  invigilatorName = '',
  isCoordinator = false,
  onNextSubject = null,
  hasNextSubject = false,
  nextSubjectName = '',
}) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFillValue, setQuickFillValue] = useState('');
  const [showQuickFillModal, setShowQuickFillModal] = useState(false);
  const debounceTimers = useRef({});
  const inputRefs = useRef({});

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_result_entries')
        .select('*')
        .eq('result_id', result.id);
      if (error) throw error;

      // Build a full row for every student (even if not yet entered)
      const entryMap = {};
      (data || []).forEach((e) => {
        entryMap[String(e.student_id)] = e;
      });

      const rows = students.map((stu) => ({
        student_id: stu.id,
        student_name: stu.student_name,
        admission_no: stu.admission_no,
        ...(entryMap[String(stu.id)] || {
          id: null,
          result_id: result.id,
          marks_obtained: '',
          is_absent: false,
          remarks: '',
        }),
      }));

      setEntries(rows);
    } catch (err) {
      showToast('Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  }, [result.id, students]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const saveEntry = useCallback(
    async (studentId, patch) => {
      if (!canEdit) return;
      setSaving((prev) => new Set(prev).add(studentId));
      try {
        const existing = entries.find((e) => String(e.student_id) === String(studentId));
        const payload = {
          result_id: result.id,
          student_id: Number(studentId),
          marks_obtained: patch.is_absent
            ? null
            : patch.marks_obtained !== '' && patch.marks_obtained !== null && patch.marks_obtained !== undefined
            ? Number(patch.marks_obtained)
            : null,
          is_absent: patch.is_absent ?? existing?.is_absent ?? false,
          remarks: patch.remarks ?? existing?.remarks ?? null,
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
          setEntries((prev) =>
            prev.map((e) =>
              String(e.student_id) === String(studentId) ? { ...e, id: data.id, ...patch } : e
            )
          );
        }

        // Check if all students are entered and update result status
        const allEntries = entries.map((e) =>
          String(e.student_id) === String(studentId) ? { ...e, ...patch } : e
        );
        const allFilled = allEntries.every(
          (e) =>
            e.is_absent ||
            (e.marks_obtained !== '' && e.marks_obtained !== null && e.marks_obtained !== undefined)
        );

        if (allFilled && onStatusUpdate) {
          onStatusUpdate(result.id, 'completed');
        } else if (
          allEntries.some((e) => e.is_absent || e.marks_obtained !== '') &&
          onStatusUpdate
        ) {
          onStatusUpdate(result.id, 'in_progress');
        }
      } catch (err) {
        showToast(err.message || 'Save failed', 'error');
      } finally {
        setSaving((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      }
    },
    [canEdit, entries, result.id, onStatusUpdate]
  );

  const handleMarksChange = (studentId, value) => {
    setEntries((prev) =>
      prev.map((e) =>
        String(e.student_id) === String(studentId) ? { ...e, marks_obtained: value } : e
      )
    );
    clearTimeout(debounceTimers.current[studentId]);
    debounceTimers.current[studentId] = setTimeout(() => {
      saveEntry(studentId, { marks_obtained: value });
    }, 600);
  };

  const handleAbsentToggle = (studentId, checked) => {
    setEntries((prev) =>
      prev.map((e) =>
        String(e.student_id) === String(studentId)
          ? { ...e, is_absent: checked, marks_obtained: checked ? '' : e.marks_obtained }
          : e
      )
    );
    saveEntry(studentId, { is_absent: checked, marks_obtained: checked ? null : undefined });
  };

  const handleRemarksChange = (studentId, value) => {
    setEntries((prev) =>
      prev.map((e) =>
        String(e.student_id) === String(studentId) ? { ...e, remarks: value } : e
      )
    );
    clearTimeout(debounceTimers.current[`remarks_${studentId}`]);
    debounceTimers.current[`remarks_${studentId}`] = setTimeout(() => {
      saveEntry(studentId, { remarks: value });
    }, 1000);
  };

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter(
      (e) =>
        (e.student_name || '').toLowerCase().includes(q) ||
        (e.admission_no || '').toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  // Keyboard navigation for rapid marks entry
  const handleKeyDown = (e, index, studentId) => {
    // Arrow Down or Enter or Tab: Go to next student
    if (e.key === 'Enter' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      const nextIndex = index + 1;
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
        inputRefs.current[nextIndex].select();
      }
    }
    // Arrow Up or Shift+Tab: Go to previous student
    else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      const prevIndex = index - 1;
      if (inputRefs.current[prevIndex]) {
        inputRefs.current[prevIndex].focus();
        inputRefs.current[prevIndex].select();
      }
    }
    // Key 'A' or 'a': Shortcut to mark as Absent and advance
    else if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      handleAbsentToggle(studentId, true);
      const nextIndex = index + 1;
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
        inputRefs.current[nextIndex].select();
      }
    }
  };

  // Bulk Quick Action: Fill Remaining unentered students
  const handleApplyQuickFill = async (score) => {
    if (!canEdit) return;
    const unfilled = entries.filter(
      (e) => !e.is_absent && (e.marks_obtained === '' || e.marks_obtained === null)
    );
    if (unfilled.length === 0) {
      showToast('All students already have marks or are marked absent', 'info');
      setShowQuickFillModal(false);
      return;
    }
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > Number(result.max_marks)) {
      showToast(`Please enter a valid score between 0 and ${result.max_marks}`, 'warning');
      return;
    }

    setEntries((prev) =>
      prev.map((e) =>
        !e.is_absent && (e.marks_obtained === '' || e.marks_obtained === null)
          ? { ...e, marks_obtained: numScore }
          : e
      )
    );
    setShowQuickFillModal(false);
    setQuickFillValue('');

    try {
      const promises = unfilled.map((stu) => {
        const payload = {
          result_id: result.id,
          student_id: Number(stu.student_id),
          marks_obtained: numScore,
          is_absent: false,
          remarks: stu.remarks || null,
        };
        if (stu.id) {
          return supabase.from('exam_result_entries').update(payload).eq('id', stu.id);
        } else {
          return supabase.from('exam_result_entries').insert(payload);
        }
      });
      await Promise.all(promises);
      showToast(`Updated marks for ${unfilled.length} students`, 'success');
      loadEntries();
      if (onStatusUpdate) onStatusUpdate(result.id, 'completed');
    } catch (err) {
      showToast('Error saving bulk marks: ' + err.message, 'error');
    }
  };

  // Bulk Quick Action: Mark all remaining unentered as Absent
  const handleMarkRemainingAbsent = async () => {
    if (!canEdit) return;
    const unfilled = entries.filter(
      (e) => !e.is_absent && (e.marks_obtained === '' || e.marks_obtained === null)
    );
    if (unfilled.length === 0) {
      showToast('No unentered students remaining', 'info');
      return;
    }

    setEntries((prev) =>
      prev.map((e) =>
        !e.is_absent && (e.marks_obtained === '' || e.marks_obtained === null)
          ? { ...e, is_absent: true, marks_obtained: '' }
          : e
      )
    );

    try {
      const promises = unfilled.map((stu) => {
        const payload = {
          result_id: result.id,
          student_id: Number(stu.student_id),
          marks_obtained: null,
          is_absent: true,
          remarks: stu.remarks || 'Absent',
        };
        if (stu.id) {
          return supabase.from('exam_result_entries').update(payload).eq('id', stu.id);
        } else {
          return supabase.from('exam_result_entries').insert(payload);
        }
      });
      await Promise.all(promises);
      showToast(`Marked ${unfilled.length} remaining students as Absent`, 'success');
      loadEntries();
      if (onStatusUpdate) onStatusUpdate(result.id, 'completed');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // Summary stats
  const entered = entries.filter(
    (e) => e.is_absent || (e.marks_obtained !== '' && e.marks_obtained !== null)
  );
  const absentCount = entries.filter((e) => e.is_absent).length;
  const marks = entries
    .filter((e) => !e.is_absent && e.marks_obtained !== '' && e.marks_obtained !== null)
    .map((e) => Number(e.marks_obtained));
  const avg =
    marks.length > 0 ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : '—';
  const highest = marks.length > 0 ? Math.max(...marks) : '—';
  const lowest = marks.length > 0 ? Math.min(...marks) : '—';
  const passCount = result.pass_marks
    ? marks.filter((m) => m >= Number(result.pass_marks)).length
    : null;
  const pctRecorded =
    entries.length > 0 ? Math.round((entered.length / entries.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Read-Only or Coordinator Access Banner */}
      {!canEdit ? (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 font-medium shadow-2xs">
          <div className="flex items-center gap-2.5">
            <i className="fas fa-lock text-amber-600 text-sm shrink-0" />
            <div>
              <p className="font-bold">Read-Only Mark Entry</p>
              <p className="text-[11px] text-amber-800">
                Marks for this subject can only be entered by the assigned invigilator
                {invigilatorName ? ` (${invigilatorName})` : ''} or an Academic Coordinator /
                Administrator.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
            Read-Only
          </span>
        </div>
      ) : isCoordinator && invigilatorName ? (
        <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium shadow-2xs">
          <i className="fas fa-user-shield text-emerald-600 text-xs" />
          <span>
            <strong>Coordinator Access:</strong> You can enter or update marks on behalf of
            invigilator (<strong>{invigilatorName}</strong>).
          </span>
        </div>
      ) : null}

      {/* Progress & Quick Entry Toolbar */}
      <div className="bg-white border border-light-border rounded-2xl p-4 shadow-xs space-y-3">
        {/* Top: Stats Counter & Progress Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-dark-primary">
                Progress: {entered.length} of {entries.length} Students
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  pctRecorded === 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pctRecorded}%
              </span>
            </div>
            <div className="w-48 sm:w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${pctRecorded}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs text-dark-muted font-bold flex-wrap">
            <span className="px-2.5 py-1 bg-slate-50 border border-light-border rounded-xl">
              Avg: <strong className="text-dark-primary">{avg}</strong>
            </span>
            <span className="px-2.5 py-1 bg-slate-50 border border-light-border rounded-xl">
              High: <strong className="text-emerald-700">{highest}</strong>
            </span>
            {result.pass_marks && (
              <span className="px-2.5 py-1 bg-slate-50 border border-light-border rounded-xl">
                Passed: <strong className="text-emerald-700">{passCount}/{marks.length}</strong>
              </span>
            )}
            <span className="px-2.5 py-1 bg-slate-50 border border-light-border rounded-xl">
              Absent: <strong className="text-red-600">{absentCount}</strong>
            </span>
          </div>
        </div>

        {/* Bottom Toolbar: Student Search + Quick Fill Tools */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          {/* Student Search */}
          <div className="relative flex-1 max-w-xs">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-dark-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search student or admission no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark-muted hover:text-dark-primary cursor-pointer"
              >
                <i className="fas fa-times-circle" />
              </button>
            )}
          </div>

          {/* Fast Keyboard Helper note & Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-dark-muted hidden md:inline-flex items-center gap-1 font-semibold">
              <i className="fas fa-keyboard text-slate-400" />
              <span>Use <strong>Enter/↓</strong> next, <strong>↑</strong> prev, <strong>A</strong> absent</span>
            </span>

            {canEdit && (
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setShowQuickFillModal(true)}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Fill all empty student scores at once"
                >
                  <i className="fas fa-magic text-[10px]" />
                  <span>Quick Fill</span>
                </button>

                <button
                  type="button"
                  onClick={handleMarkRemainingAbsent}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Mark all unfilled students as absent"
                >
                  <i className="fas fa-user-slash text-[10px]" />
                  <span>Mark Rest Absent</span>
                </button>
              </div>
            )}

            {hasNextSubject && onNextSubject && (
              <button
                type="button"
                onClick={onNextSubject}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-2"
                title={`Advance to next subject: ${nextSubjectName}`}
              >
                <span>Next Subject</span>
                <i className="fas fa-arrow-right text-[10px]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-light-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
              <tr className="border-b border-light-border bg-slate-50 text-dark-slate font-bold">
                <th className="py-3 px-3.5 text-left w-10">#</th>
                <th className="py-3 px-4 text-left">Student Name & Admission</th>
                <th className="py-3 px-3 text-center w-36">
                  Marks Obtained <span className="text-dark-muted font-normal">/ {result.max_marks}</span>
                </th>
                <th className="py-3 px-3 text-center w-24">Status</th>
                <th className="py-3 px-3 text-center w-20">Absent</th>
                <th className="py-3 px-4 text-left min-w-[140px]">Teacher Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-dark-muted font-semibold">
                    No students match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const isSaving = saving.has(entry.student_id);
                  const numMarks =
                    entry.marks_obtained !== '' && entry.marks_obtained !== null
                      ? Number(entry.marks_obtained)
                      : null;
                  const isOver =
                    !entry.is_absent && numMarks !== null && numMarks > Number(result.max_marks);
                  const isPassing =
                    result.pass_marks &&
                    !entry.is_absent &&
                    numMarks !== null &&
                    numMarks >= Number(result.pass_marks);
                  const isFailing =
                    result.pass_marks &&
                    !entry.is_absent &&
                    numMarks !== null &&
                    numMarks < Number(result.pass_marks);

                  return (
                    <tr
                      key={entry.student_id}
                      className={`transition-colors ${
                        entry.is_absent
                          ? 'bg-red-50/30'
                          : isOver
                          ? 'bg-orange-50/40'
                          : isPassing
                          ? 'hover:bg-emerald-50/15'
                          : isFailing
                          ? 'hover:bg-rose-50/15'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-dark-muted text-[11px] font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-dark-primary text-xs">
                          {entry.student_name}
                        </div>
                        <div className="text-[10px] text-dark-muted font-mono">
                          Adm: {entry.admission_no}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {entry.is_absent ? (
                          <span className="inline-block px-3 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                            Absent
                          </span>
                        ) : (
                          <div className="relative inline-flex items-center justify-center">
                            <input
                              ref={(el) => {
                                inputRefs.current[idx] = el;
                              }}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={result.max_marks}
                              step="0.5"
                              disabled={!canEdit}
                              placeholder="0"
                              value={entry.marks_obtained}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => handleKeyDown(e, idx, entry.student_id)}
                              onChange={(e) => handleMarksChange(entry.student_id, e.target.value)}
                              className={`w-20 text-center font-bold px-2 py-1.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition-all ${
                                isOver
                                  ? 'border-orange-400 bg-orange-50 text-orange-800'
                                  : isPassing
                                  ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900'
                                  : isFailing
                                  ? 'border-rose-300 bg-rose-50/40 text-rose-900'
                                  : 'border-light-border bg-white text-dark-primary'
                              } disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50`}
                            />
                            {isSaving && (
                              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {entry.is_absent ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                            AB
                          </span>
                        ) : numMarks !== null ? (
                          isPassing ? (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Pass
                            </span>
                          ) : isFailing ? (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                              Fail
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-dark-muted font-mono">
                              {Math.round((numMarks / Number(result.max_marks)) * 100)}%
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={entry.is_absent}
                          onChange={(e) => handleAbsentToggle(entry.student_id, e.target.checked)}
                          className="w-4 h-4 rounded border-light-border text-red-600 focus:ring-red-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Toggle Absent"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          disabled={!canEdit}
                          placeholder={canEdit ? 'Optional remarks...' : '—'}
                          value={entry.remarks || ''}
                          onChange={(e) => handleRemarksChange(entry.student_id, e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-light-border rounded-xl bg-white focus:ring-1 focus:ring-emerald-300 outline-none text-dark-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
                        />
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                <i className="fas fa-magic" />
              </div>
              <div>
                <h3 className="text-base font-bold text-dark-primary">Quick Fill Unentered</h3>
                <p className="text-xs text-dark-muted">
                  Apply a score to all students who don't have marks yet.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-dark-slate mb-1">
                Score (out of {result.max_marks})
              </label>
              <input
                type="number"
                min="0"
                max={result.max_marks}
                value={quickFillValue}
                onChange={(e) => setQuickFillValue(e.target.value)}
                placeholder={`e.g. ${result.pass_marks || 0}`}
                className="w-full px-3 py-2 text-sm font-bold border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-emerald-300"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleApplyQuickFill(quickFillValue)}
                disabled={quickFillValue === ''}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                Apply to Unfilled
              </button>
              {result.pass_marks && (
                <button
                  type="button"
                  onClick={() => handleApplyQuickFill(result.pass_marks)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-dark-slate text-xs font-bold transition-all cursor-pointer"
                >
                  Pass ({result.pass_marks})
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowQuickFillModal(false)}
                className="px-3 py-2 rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamResultsEntryGrid;
