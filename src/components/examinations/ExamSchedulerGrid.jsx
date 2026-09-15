// src/components/examinations/ExamSchedulerGrid.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

/**
 * Grid-based exam slot assignment.
 * Rows = exam dates within the schedule range
 * Columns = exam sessions (Morning, Afternoon, …)
 * Cells = subject + invigilator assignment per class
 */
const ExamSchedulerGrid = ({
  schedule,
  sessions,
  classes,
  subjects,
  teachers,
  slots,
  classSubjects,
  onRefresh,
}) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [cellForm, setCellForm] = useState(null); // { date, sessionId }
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formOverride, setFormOverride] = useState(false);
  const [formOverrideReason, setFormOverrideReason] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  // Generate date range
  const dateRange = useMemo(() => {
    if (!schedule?.start_date || !schedule?.end_date) return [];
    const dates = [];
    const cur = new Date(schedule.start_date + 'T00:00');
    const end = new Date(schedule.end_date + 'T00:00');
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [schedule]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.session_order - b.session_order),
    [sessions]
  );

  // Slots index: { date_sessionId_classId → slot }
  const slotsIndex = useMemo(() => {
    const idx = {};
    slots.forEach((s) => {
      const key = `${s.exam_date}_${s.session_id}_${s.class_id}`;
      idx[key] = s;
    });
    return idx;
  }, [slots]);

  // Active subjects for the selected class
  const activeClassSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    return classSubjects.filter(
      (cs) => String(cs.class_id) === String(selectedClassId) && cs.status === 'active'
    );
  }, [classSubjects, selectedClassId]);

  const subjectsForSelectedClass = useMemo(() => {
    const activeIds = new Set(activeClassSubjects.map((cs) => String(cs.subject_id)));
    return subjects.filter((s) => activeIds.has(String(s.id)));
  }, [subjects, activeClassSubjects]);

  // Check teacher conflict for a given date+session
  const checkTeacherConflict = useCallback(
    (teacherId, date, sessionId, excludeClassId) => {
      return slots.find(
        (s) =>
          String(s.teacher_id) === String(teacherId) &&
          s.exam_date === date &&
          String(s.session_id) === String(sessionId) &&
          String(s.class_id) !== String(excludeClassId)
      );
    },
    [slots]
  );

  const handleCellClick = (date, sessionId) => {
    if (!selectedClassId) {
      showToast('Please select a class first', 'info');
      return;
    }
    const existing = slotsIndex[`${date}_${sessionId}_${selectedClassId}`];
    setFormSubjectId(existing ? String(existing.subject_id) : '');
    setFormTeacherId(existing ? String(existing.teacher_id || '') : '');
    setFormOverride(existing?.is_override || false);
    setFormOverrideReason(existing?.override_reason || '');
    setFormNotes(existing?.notes || '');
    setConflictWarning(null);
    setCellForm({ date, sessionId, existing });
  };

  const handleTeacherChange = (teacherId, date, sessionId) => {
    setFormTeacherId(teacherId);
    if (!teacherId) {
      setConflictWarning(null);
      return;
    }
    const conflict = checkTeacherConflict(teacherId, date, sessionId, selectedClassId);
    if (conflict) {
      const conflictClass = classes.find((c) => String(c.id) === String(conflict.class_id));
      setConflictWarning(`⚠️ ${teachers.find((t) => String(t.id) === String(teacherId))?.name || 'This teacher'} is already assigned to ${conflictClass?.name || 'another class'} at this slot.`);
    } else {
      setConflictWarning(null);
    }
  };

  const handleSaveSlot = async () => {
    if (!cellForm || !formSubjectId) return;
    if (conflictWarning && !formOverride) {
      showToast('Please acknowledge the conflict or choose another teacher', 'error');
      return;
    }
    setSaving(true);
    try {
      const { existing, date, sessionId } = cellForm;
      const payload = {
        schedule_id: schedule.id,
        exam_date: date,
        session_id: sessionId,
        class_id: selectedClassId,
        subject_id: Number(formSubjectId),
        teacher_id: formTeacherId ? Number(formTeacherId) : null,
        is_override: formOverride,
        override_reason: formOverride ? formOverrideReason.trim() || null : null,
        notes: formNotes.trim() || null,
      };

      if (existing) {
        const { error } = await supabase.from('exam_schedule_slots').update(payload).eq('id', existing.id);
        if (error) throw error;
        showToast('Slot updated', 'success');
      } else {
        const { error } = await supabase.from('exam_schedule_slots').insert(payload);
        if (error) throw error;
        showToast('Slot assigned', 'success');
      }
      setCellForm(null);
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearSlot = async () => {
    if (!cellForm?.existing) return;
    if (!window.confirm('Clear this exam slot?')) return;
    try {
      const { error } = await supabase.from('exam_schedule_slots').delete().eq('id', cellForm.existing.id);
      if (error) throw error;
      showToast('Slot cleared', 'success');
      setCellForm(null);
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Clear failed', 'error');
    }
  };

  const fmtDate = (d) =>
    new Date(d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

  // Coverage for selected class
  const scheduledSubjectIds = useMemo(() => {
    if (!selectedClassId) return new Set();
    return new Set(
      slots
        .filter((s) => String(s.class_id) === String(selectedClassId))
        .map((s) => String(s.subject_id))
    );
  }, [slots, selectedClassId]);

  return (
    <div className="space-y-5">
      {/* Class selector + coverage */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-dark-slate whitespace-nowrap">View class:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300 min-w-[140px]"
          >
            <option value="">— Select class —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {selectedClassId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-200">
            <i className="fas fa-chart-pie text-rose-500 text-xs" />
            <span className="text-xs font-bold text-rose-700">
              {scheduledSubjectIds.size} / {subjectsForSelectedClass.length} subjects scheduled
            </span>
            {subjectsForSelectedClass.filter((s) => !scheduledSubjectIds.has(String(s.id))).length > 0 && (
              <span className="text-[10px] text-rose-500">
                ({subjectsForSelectedClass.filter((s) => !scheduledSubjectIds.has(String(s.id))).length} pending)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white border border-light-border rounded-2xl">
          <i className="fas fa-clock text-3xl text-slate-300 mb-3 block" />
          <p className="text-sm font-bold text-dark-deepblue">No sessions defined</p>
          <p className="text-xs text-dark-muted mt-1">Add exam sessions in the Setup tab first.</p>
        </div>
      ) : (
        <div className="bg-white border border-light-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-left font-bold text-dark-deepblue w-28 shrink-0">Date</th>
                  {sortedSessions.map((sess) => (
                    <th key={sess.id} className="py-3 px-3 text-center font-bold text-dark-deepblue min-w-[140px]">
                      <div>{sess.name}</div>
                      <div className="font-normal text-[10px] text-dark-muted mt-0.5">
                        {sess.start_time} – {sess.end_time}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dateRange.map((date) => (
                  <tr key={date} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-dark-deepblue text-[11px] whitespace-nowrap">
                      {fmtDate(date)}
                    </td>
                    {sortedSessions.map((sess) => {
                      const slot = selectedClassId
                        ? slotsIndex[`${date}_${sess.id}_${selectedClassId}`]
                        : null;
                      const sub = slot
                        ? subjects.find((s) => String(s.id) === String(slot.subject_id))
                        : null;
                      const teacher = slot?.teacher_id
                        ? teachers.find((t) => String(t.id) === String(slot.teacher_id))
                        : null;

                      return (
                        <td
                          key={sess.id}
                          onClick={() => handleCellClick(date, sess.id)}
                          className={`py-2 px-2 text-center border-l border-slate-100 transition-all cursor-pointer ${
                            slot
                              ? slot.is_override
                                ? 'bg-amber-50 hover:bg-amber-100'
                                : 'bg-emerald-50 hover:bg-emerald-100'
                              : 'hover:bg-rose-50'
                          }`}
                        >
                          {slot ? (
                            <div className="space-y-0.5">
                              <div className={`font-bold text-[11px] ${slot.is_override ? 'text-amber-800' : 'text-emerald-800'}`}>
                                {sub?.name || `Sub #${slot.subject_id}`}
                              </div>
                              {teacher && (
                                <div className="text-[10px] text-dark-muted">{teacher.name}</div>
                              )}
                              {slot.is_override && (
                                <span className="inline-block px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                  ⚠️ Override
                                </span>
                              )}
                            </div>
                          ) : selectedClassId ? (
                            <div className="text-dark-muted opacity-40 hover:opacity-70 transition-opacity">
                              <i className="fas fa-plus text-[10px]" />
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cell assignment modal */}
      {cellForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-light-border bg-rose-50">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                {fmtDate(cellForm.date)} · {sessions.find((s) => String(s.id) === String(cellForm.sessionId))?.name}
              </p>
              <h3 className="text-base font-bold text-dark-deepblue mt-0.5">
                {cellForm.existing ? 'Edit Slot' : 'Assign Exam Slot'}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1.5">Subject *</label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300"
                  required
                >
                  <option value="">— Select subject —</option>
                  {subjectsForSelectedClass.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {subjectsForSelectedClass.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No active subjects found. Add subjects in Classes Setup → Class Subjects.
                  </p>
                )}
              </div>

              {/* Teacher / Invigilator */}
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1.5">
                  Invigilator <span className="font-normal text-dark-muted">(optional)</span>
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => handleTeacherChange(e.target.value, cellForm.date, cellForm.sessionId)}
                  className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300"
                >
                  <option value="">— No invigilator —</option>
                  {teachers.filter((t) => t.is_active !== false).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {/* Conflict warning */}
                {conflictWarning && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                    <p className="text-[11px] text-amber-800 font-semibold">{conflictWarning}</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formOverride}
                        onChange={(e) => setFormOverride(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-[11px] font-bold text-amber-700">Override conflict</span>
                    </label>
                    {formOverride && (
                      <input
                        type="text"
                        placeholder="Reason for override (required)"
                        value={formOverrideReason}
                        onChange={(e) => setFormOverrideReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-dark-slate mb-1.5">Notes</label>
                <input
                  type="text"
                  placeholder="Optional notes..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={handleSaveSlot}
                disabled={saving || !formSubjectId || (conflictWarning && !formOverride)}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-2" /> : null}
                {cellForm.existing ? 'Update' : 'Assign'}
              </button>
              {cellForm.existing && (
                <button
                  onClick={handleClearSlot}
                  className="px-4 py-2.5 text-sm font-bold rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setCellForm(null)}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all"
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

export default ExamSchedulerGrid;
