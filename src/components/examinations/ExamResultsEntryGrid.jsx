// src/components/examinations/ExamResultsEntryGrid.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

/**
 * Mark entry grid for a single subject within an exam.
 * Rows = students in the class, Columns = marks, absent, remarks
 */
const ExamResultsEntryGrid = ({ result, students, onStatusUpdate }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(new Set());
  const debounceTimers = useRef({});

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
      (data || []).forEach((e) => { entryMap[String(e.student_id)] = e; });

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

  const saveEntry = useCallback(async (studentId, patch) => {
    setSaving((prev) => new Set(prev).add(studentId));
    try {
      const existing = entries.find((e) => String(e.student_id) === String(studentId));
      const payload = {
        result_id: result.id,
        student_id: Number(studentId),
        marks_obtained: patch.is_absent ? null : (patch.marks_obtained !== '' ? Number(patch.marks_obtained) : null),
        is_absent: patch.is_absent ?? existing?.is_absent ?? false,
        remarks: patch.remarks ?? existing?.remarks ?? null,
      };

      if (existing?.id) {
        const { error } = await supabase.from('exam_result_entries').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('exam_result_entries').insert(payload).select().single();
        if (error) throw error;
        setEntries((prev) =>
          prev.map((e) => (String(e.student_id) === String(studentId) ? { ...e, id: data.id, ...patch } : e))
        );
      }

      // Check if all students are entered and update result status
      const allEntries = entries.map((e) =>
        String(e.student_id) === String(studentId) ? { ...e, ...patch } : e
      );
      const allFilled = allEntries.every(
        (e) => e.is_absent || (e.marks_obtained !== '' && e.marks_obtained !== null && e.marks_obtained !== undefined)
      );

      if (allFilled && onStatusUpdate) {
        onStatusUpdate(result.id, 'completed');
      } else if (allEntries.some((e) => e.is_absent || e.marks_obtained !== '') && onStatusUpdate) {
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
  }, [entries, result.id, onStatusUpdate]);

  const handleMarksChange = (studentId, value) => {
    setEntries((prev) =>
      prev.map((e) => String(e.student_id) === String(studentId) ? { ...e, marks_obtained: value } : e)
    );
    clearTimeout(debounceTimers.current[studentId]);
    debounceTimers.current[studentId] = setTimeout(() => {
      saveEntry(studentId, { marks_obtained: value });
    }, 700);
  };

  const handleAbsentToggle = (studentId, checked) => {
    setEntries((prev) =>
      prev.map((e) => String(e.student_id) === String(studentId) ? { ...e, is_absent: checked, marks_obtained: checked ? '' : e.marks_obtained } : e)
    );
    saveEntry(studentId, { is_absent: checked, marks_obtained: checked ? null : undefined });
  };

  const handleRemarksChange = (studentId, value) => {
    setEntries((prev) =>
      prev.map((e) => String(e.student_id) === String(studentId) ? { ...e, remarks: value } : e)
    );
    clearTimeout(debounceTimers.current[`remarks_${studentId}`]);
    debounceTimers.current[`remarks_${studentId}`] = setTimeout(() => {
      saveEntry(studentId, { remarks: value });
    }, 1000);
  };

  // Summary stats
  const entered = entries.filter((e) => e.is_absent || (e.marks_obtained !== '' && e.marks_obtained !== null));
  const absentCount = entries.filter((e) => e.is_absent).length;
  const marks = entries.filter((e) => !e.is_absent && e.marks_obtained !== '' && e.marks_obtained !== null).map((e) => Number(e.marks_obtained));
  const avg = marks.length > 0 ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : '—';
  const highest = marks.length > 0 ? Math.max(...marks) : '—';
  const lowest = marks.length > 0 ? Math.min(...marks) : '—';
  const passCount = result.pass_marks
    ? marks.filter((m) => m >= Number(result.pass_marks)).length
    : null;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Entered', value: `${entered.length}/${entries.length}`, color: 'text-dark-deepblue' },
          { label: 'Average', value: avg, color: 'text-blue-600' },
          { label: 'Highest', value: highest, color: 'text-emerald-600' },
          { label: 'Absent', value: absentCount, color: 'text-red-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-50 rounded-xl px-3 py-2.5 text-center border border-light-border">
            <p className={`text-base font-extrabold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-dark-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-light-border rounded-xl overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-dark-deepblue">
              <th className="py-2.5 px-3 text-left font-bold w-8">#</th>
              <th className="py-2.5 px-3 text-left font-bold">Student</th>
              <th className="py-2.5 px-3 text-center font-bold w-24">
                Marks <span className="text-dark-muted font-normal">/ {result.max_marks}</span>
              </th>
              <th className="py-2.5 px-3 text-center font-bold w-20">Absent</th>
              <th className="py-2.5 px-3 text-left font-bold">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry, idx) => {
              const isSaving = saving.has(entry.student_id);
              const isOver = !entry.is_absent && entry.marks_obtained !== '' && entry.marks_obtained !== null && Number(entry.marks_obtained) > Number(result.max_marks);
              const isPassing = result.pass_marks && !entry.is_absent && entry.marks_obtained !== '' && Number(entry.marks_obtained) >= Number(result.pass_marks);

              return (
                <tr
                  key={entry.student_id}
                  className={`transition-colors ${
                    entry.is_absent
                      ? 'bg-red-50/40'
                      : isOver
                      ? 'bg-orange-50/50'
                      : isPassing
                      ? 'bg-emerald-50/20'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2 px-3 text-dark-muted text-[10px]">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-dark-deepblue text-[11px]">{entry.student_name}</div>
                    <div className="text-[10px] text-dark-muted">{entry.admission_no}</div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {entry.is_absent ? (
                      <span className="text-[10px] text-red-400 italic">Absent</span>
                    ) : (
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max={result.max_marks}
                          step="0.5"
                          value={entry.marks_obtained}
                          onChange={(e) => handleMarksChange(entry.student_id, e.target.value)}
                          className={`w-16 text-center px-2 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-emerald-300 ${
                            isOver ? 'border-orange-400 bg-orange-50' : 'border-light-border bg-white'
                          }`}
                        />
                        {isSaving && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={entry.is_absent}
                      onChange={(e) => handleAbsentToggle(entry.student_id, e.target.checked)}
                      className="w-4 h-4 rounded border-light-border text-red-500 focus:ring-red-300"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      placeholder="Optional..."
                      value={entry.remarks || ''}
                      onChange={(e) => handleRemarksChange(entry.student_id, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-light-border rounded-lg bg-white focus:ring-1 focus:ring-emerald-300"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExamResultsEntryGrid;
