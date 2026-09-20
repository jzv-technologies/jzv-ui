// src/components/examinations/ExamSchedulerGrid.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import ConfirmModal from '../ConfirmModal';
import { generateDateRange, formatDateDisplay } from '../../utils/dateUtils';
import MultiSelectDropdown from '../MultiSelectDropdown';

/**
 * Grid-based exam slot assignment.
 * Supports:
 * - Single Class view: timetable for selected class(es)
 * - All Classes view: multi-table view with one table per class
 * - Class-aware slot assigning, updating, conflict checks, and clearing
 * - Strict role-based editing enforcement
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
  readOnly = false,
  userRoles = [],
  selectedClassIds: externalSelectedClassIds = [],
  onSelectClasses: externalOnSelectClasses,
  hideClassSelector = false,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
}) => {
  const [internalSelectedClassIds, setInternalSelectedClassIds] = useState([]);
  const selectedClassIds =
    externalSelectedClassIds && externalSelectedClassIds.length > 0
      ? externalSelectedClassIds
      : internalSelectedClassIds;
  const setSelectedClassIds = externalOnSelectClasses || setInternalSelectedClassIds;

  // For backward compatibility - use first selected class as primary
  const selectedClassId = selectedClassIds[0] || '';

  const [internalViewMode, setInternalViewMode] = useState('all');
  const viewMode = externalViewMode !== undefined ? externalViewMode : internalViewMode;
  const setViewMode = externalOnViewModeChange || setInternalViewMode;

  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [cellForm, setCellForm] = useState(null); // { date, sessionId, classId, existing, isReadOnly }
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formOverride, setFormOverride] = useState(false);
  const [formOverrideReason, setFormOverrideReason] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [confirmModalData, setConfirmModalData] = useState(null);

  // Read-only state driven by prop from parent capability check
  const isEffectivelyReadOnly = Boolean(readOnly);

  // Generate date range without timezone clash
  const dateRange = useMemo(() => {
    return generateDateRange(schedule?.start_date, schedule?.end_date);
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

  // Active form class context
  const activeFormClassId = cellForm?.classId || selectedClassId;
  const activeFormClass = useMemo(
    () => classes.find((c) => String(c.id) === String(activeFormClassId)),
    [classes, activeFormClassId]
  );

  // Active subjects for the current form class
  const subjectsForActiveForm = useMemo(() => {
    if (!activeFormClassId) return subjects;
    const activeIds = new Set(
      classSubjects
        .filter((cs) => String(cs.class_id) === String(activeFormClassId) && cs.status === 'active')
        .map((cs) => String(cs.subject_id))
    );
    const filtered = subjects.filter((s) => activeIds.has(String(s.id)));
    return filtered.length > 0 ? filtered : subjects;
  }, [classSubjects, activeFormClassId, subjects]);

  // Per-class coverage calculation
  const getClassCoverage = useCallback(
    (classId) => {
      const activeIds = classSubjects
        .filter((cs) => String(cs.class_id) === String(classId) && cs.status === 'active')
        .map((cs) => String(cs.subject_id));
      const scheduledIds = new Set(
        slots.filter((s) => String(s.class_id) === String(classId)).map((s) => String(s.subject_id))
      );
      const scheduledCount = activeIds.filter((id) => scheduledIds.has(id)).length;
      return {
        total: activeIds.length,
        scheduled: scheduledCount,
        isComplete: activeIds.length > 0 && scheduledCount >= activeIds.length,
      };
    },
    [classSubjects, slots]
  );

  // Check teacher conflict for a given date+session, excluding the current class
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

  const handleCellClick = (date, sessionId, targetClassId = selectedClassId) => {
    if (!targetClassId) {
      showToast('Please select a class first', 'info');
      return;
    }
    const existing = slotsIndex[`${date}_${sessionId}_${targetClassId}`];
    if (isEffectivelyReadOnly) {
      if (existing) {
        setCellForm({ date, sessionId, classId: targetClassId, existing, isReadOnly: true });
      }
      return;
    }
    setFormSubjectId(existing ? String(existing.subject_id) : '');
    setFormTeacherId(existing ? String(existing.teacher_id || '') : '');
    setFormOverride(existing?.is_override || false);
    setFormOverrideReason(existing?.override_reason || '');
    setFormNotes(existing?.notes || '');
    setConflictWarning(null);
    setCellForm({ date, sessionId, classId: targetClassId, existing, isReadOnly: false });
  };

  const handleTeacherChange = (teacherId, date, sessionId, targetClassId) => {
    setFormTeacherId(teacherId);
    if (!teacherId) {
      setConflictWarning(null);
      return;
    }
    const classIdToCheck = targetClassId || cellForm?.classId || selectedClassId;
    const conflict = checkTeacherConflict(teacherId, date, sessionId, classIdToCheck);
    if (conflict) {
      const conflictClass = classes.find((c) => String(c.id) === String(conflict.class_id));
      setConflictWarning(
        `⚠️ ${
          teachers.find((t) => String(t.id) === String(teacherId))?.name || 'This teacher'
        } is already assigned to ${conflictClass?.name || 'another class'} at this slot.`
      );
    } else {
      setConflictWarning(null);
    }
  };

  const handleSaveSlot = async () => {
    if (!cellForm || !formSubjectId) return;
    if (isEffectivelyReadOnly || cellForm.isReadOnly) {
      showToast('You do not have permission to edit exam slots', 'error');
      return;
    }
    if (conflictWarning && !formOverride) {
      showToast('Please acknowledge the conflict or choose another teacher', 'error');
      return;
    }
    const targetClassId = cellForm.classId || selectedClassId;
    if (!targetClassId) {
      showToast('Target class is missing', 'error');
      return;
    }
    setSaving(true);
    try {
      const { existing, date, sessionId } = cellForm;
      const payload = {
        schedule_id: schedule.id,
        exam_date: date,
        session_id: sessionId,
        class_id: targetClassId,
        subject_id: Number(formSubjectId),
        teacher_id: formTeacherId ? Number(formTeacherId) : null,
        is_override: formOverride,
        override_reason: formOverride ? formOverrideReason.trim() || null : null,
        notes: formNotes.trim() || null,
      };

      if (existing) {
        const { error } = await supabase
          .from('exam_schedule_slots')
          .update(payload)
          .eq('id', existing.id);
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

  const handleRequestClearSlot = () => {
    if (isEffectivelyReadOnly || cellForm?.isReadOnly || !cellForm?.existing) {
      showToast('You do not have permission to clear exam slots', 'error');
      return;
    }
    setConfirmModalData({
      title: 'Clear Exam Slot',
      message:
        'Are you sure you want to clear this exam slot? The assigned subject and invigilator will be removed.',
      confirmText: 'Clear Slot',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModalData(null);
        await executeClearSlot();
      },
    });
  };

  const executeClearSlot = async () => {
    if (isEffectivelyReadOnly || cellForm?.isReadOnly || !cellForm?.existing) return;
    try {
      const { error } = await supabase
        .from('exam_schedule_slots')
        .delete()
        .eq('id', cellForm.existing.id);
      if (error) throw error;
      showToast('Slot cleared', 'success');
      setCellForm(null);
      onRefresh();
    } catch (err) {
      showToast(err.message || 'Clear failed', 'error');
    }
  };

  const fmtDate = (d) =>
    formatDateDisplay(d, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });

  const subjectName = useCallback(
    (id) => subjects.find((s) => String(s.id) === String(id))?.name || `Subject #${id}`,
    [subjects]
  );

  const teacherName = useCallback(
    (id) => teachers.find((t) => String(t.id) === String(id))?.name || 'Unknown Teacher',
    [teachers]
  );

  // Filter classes for "All Classes" view
  const filteredClasses = useMemo(() => {
    if (!classSearchQuery.trim()) return classes;
    const q = classSearchQuery.toLowerCase().trim();
    return classes.filter((c) => c.name.toLowerCase().includes(q));
  }, [classes, classSearchQuery]);

  // Render a responsive grid table for a given class
  const renderGridTable = (targetClass, isStandalone = false) => {
    if (!targetClass) {
      return (
        <div className="text-center py-12 bg-white border border-light-border rounded-2xl sm:rounded-3xl p-6">
          <i className="fas fa-chalkboard text-3xl text-slate-300 mb-2 block" />
          <p className="text-sm font-bold text-dark-deepblue">No class selected</p>
          <p className="text-xs text-dark-muted mt-1">
            Please select a class above to view or edit its exam timetable.
          </p>
        </div>
      );
    }

    const coverage = getClassCoverage(targetClass.id);

    return (
      <div
        key={targetClass.id}
        id={`class-table-${targetClass.id}`}
        className="w-full bg-white border border-light-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md"
      >
        {/* Class Card Header for All Classes multi-table mode */}
        {!isStandalone && (
          <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-light-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold shadow-2xs">
                <i className="fas fa-chalkboard" />
              </div>
              <div>
                <h4 className="text-sm font-black text-dark-deepblue tracking-tight">
                  {targetClass.name}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end w-full sm:w-auto">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
                  coverage.isComplete
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : coverage.scheduled > 0
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-dark-muted border-light-border'
                }`}
              >
                <i
                  className={`fas ${
                    coverage.isComplete
                      ? 'fa-circle-check text-emerald-500'
                      : coverage.scheduled > 0
                        ? 'fa-clock text-amber-500'
                        : 'fa-circle-notch text-slate-400'
                  } text-[10px]`}
                />
                {coverage.scheduled} / {coverage.total} subjects scheduled
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedClassId(String(targetClass.id));
                  setViewMode('single');
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                title="Focus on this class in single-table view"
              >
                <i className="fas fa-expand text-[10px]" />
                <span className="hidden sm:inline">Focus Class</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto relative">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-light-border bg-slate-50/90 text-dark-slate font-bold">
                <th className="py-3 px-3 sm:px-4 text-left w-28 sm:w-32 whitespace-nowrap sticky left-0 bg-slate-50 z-20 border-r border-light-border shadow-xs">
                  Date
                </th>
                {sortedSessions.map((s) => (
                  <th
                    key={s.id}
                    className="py-3 px-3 sm:px-4 text-center min-w-[120px] sm:min-w-[140px]"
                  >
                    <div>{s.name}</div>
                    {s.start_time && (
                      <div className="text-[10px] font-normal text-dark-muted">
                        {s.start_time.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border">
              {dateRange.map((date) => (
                <tr key={date} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-3 sm:px-4 font-semibold text-dark-deepblue whitespace-nowrap sticky left-0 bg-white z-10 border-r border-light-border shadow-xs">
                    {fmtDate(date)}
                  </td>
                  {sortedSessions.map((sess) => {
                    const slot = slotsIndex[`${date}_${sess.id}_${targetClass.id}`];
                    const hasConflict =
                      slot?.teacher_id &&
                      checkTeacherConflict(slot.teacher_id, date, sess.id, targetClass.id);

                    return (
                      <td
                        key={sess.id}
                        onClick={() => handleCellClick(date, sess.id, targetClass.id)}
                        className={`py-2 px-3 text-center border-l border-light-border transition-all ${
                          isEffectivelyReadOnly
                            ? slot
                              ? 'cursor-pointer hover:bg-rose-50/40'
                              : 'cursor-default'
                            : 'cursor-pointer hover:bg-rose-50/60'
                        } ${slot ? 'bg-rose-50/30' : ''}`}
                      >
                        {slot ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-dark-deepblue text-xs leading-tight">
                              {subjectName(slot.subject_id)}
                            </p>
                            {slot.teacher_id && (
                              <p
                                className={`text-[11px] ${
                                  hasConflict ? 'text-amber-600 font-bold' : 'text-dark-muted'
                                }`}
                              >
                                {hasConflict && (
                                  <i className="fas fa-triangle-exclamation mr-1 text-amber-500" />
                                )}
                                {teacherName(slot.teacher_id)}
                              </p>
                            )}
                            {slot.is_override && (
                              <span className="inline-block px-1 rounded text-[9px] bg-amber-100 text-amber-700 font-bold">
                                Override
                              </span>
                            )}
                          </div>
                        ) : !isEffectivelyReadOnly ? (
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
    );
  };

  return (
    <div className="space-y-4">
      {/* Standalone Class selector + coverage + view toggle (if not embedded in manager) */}
      {!hideClassSelector && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-light-border shadow-2xs">
          <div className="flex items-center gap-2">
            {/* View toggle - All Classes first, then Selected Class */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-light-border">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-layer-group text-[10px]" />
                <span>All Classes</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                <i className="fas fa-chalkboard text-[10px]" />
                <span>Selected Class</span>
              </button>
            </div>

            {viewMode === 'single' && (
              <MultiSelectDropdown
                label="Classes"
                options={classes.map((c) => ({ id: c.id, label: c.name }))}
                selected={selectedClassIds}
                onChange={setSelectedClassIds}
                placeholder="Select classes..."
                fullWidth={false}
              />
            )}
          </div>

          {viewMode === 'single' && selectedClassIds.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-200 flex-wrap">
              {selectedClassIds.map((classId) => {
                const cls = classes.find((c) => String(c.id) === String(classId));
                const coverage = getClassCoverage(classId);
                return (
                  <span key={classId} className="text-xs font-bold text-rose-700">
                    {cls?.name}: {coverage.scheduled} / {coverage.total} subjects
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Read-Only Banner */}
      {isEffectivelyReadOnly && (
        <div className="bg-amber-50/80 border border-amber-200 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 font-medium shadow-2xs">
          <div className="flex items-center gap-2">
            <i className="fas fa-lock text-amber-600" />
            <span>
              <strong>Read-Only View:</strong> You have view-only access to the exam schedule. Edits
              can only be made by Academic Coordinators or Administrators.
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
            Read-Only
          </span>
        </div>
      )}

      {/* Sessions and Timetable Grids */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white border border-light-border rounded-2xl sm:rounded-3xl">
          <i className="fas fa-clock text-3xl text-slate-300 mb-3 block" />
          <p className="text-sm font-bold text-dark-deepblue">No sessions defined</p>
          <p className="text-xs text-dark-muted mt-1">Add exam sessions in the Setup tab first.</p>
        </div>
      ) : viewMode === 'all' ? (
        <div className="space-y-4">
          {/* Quick Toolbar for All Classes View */}
          <div className="bg-white border border-light-border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
              <div className="relative w-full">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted text-xs" />
                <input
                  type="text"
                  placeholder="Filter classes..."
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-light-border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-300 outline-none transition-all"
                />
              </div>
              {classSearchQuery && (
                <button
                  type="button"
                  onClick={() => setClassSearchQuery('')}
                  className="text-xs text-dark-muted hover:text-dark-primary cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick jump pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
              <span className="text-[10px] font-bold text-dark-muted whitespace-nowrap uppercase tracking-wider">
                Jump to:
              </span>
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`class-table-${c.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-dark-slate transition-all whitespace-nowrap cursor-pointer"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Render multiple tables: one table per class */}
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12 bg-white border border-light-border rounded-2xl">
              <p className="text-sm font-bold text-dark-muted">
                No classes match &quot;{classSearchQuery}&quot;
              </p>
            </div>
          ) : (
            filteredClasses.map((cls) => renderGridTable(cls, false))
          )}
        </div>
      ) : // Single view mode - render tables for all selected classes
      selectedClassIds.length === 0 ? (
        <div className="text-center py-12 bg-white border border-light-border rounded-2xl sm:rounded-3xl">
          <i className="fas fa-chalkboard text-3xl text-slate-300 mb-3 block" />
          <p className="text-sm font-bold text-dark-deepblue">No class selected</p>
          <p className="text-xs text-dark-muted mt-1">
            Please select one or more classes above to view or edit their exam timetable.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedClassIds.map((classId) => {
            const cls = classes.find((c) => String(c.id) === String(classId));
            return renderGridTable(cls, true);
          })}
        </div>
      )}

      {/* Cell assignment / read-only details modal */}
      {cellForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md my-auto overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 sm:px-6 py-4 border-b border-light-border bg-rose-50 shrink-0">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                {activeFormClass?.name ? `${activeFormClass.name} · ` : ''}
                {fmtDate(cellForm.date)} ·{' '}
                {sessions.find((s) => String(s.id) === String(cellForm.sessionId))?.name}
              </p>
              <h3 className="text-base font-bold text-dark-deepblue mt-0.5">
                {cellForm.isReadOnly
                  ? 'Slot Details'
                  : cellForm.existing
                    ? 'Edit Slot'
                    : 'Assign Exam Slot'}
              </h3>
            </div>

            {cellForm.isReadOnly ? (
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                <div className="bg-slate-50 p-4 rounded-xl border border-light-border space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-dark-muted uppercase">Class</span>
                    <p className="text-sm font-bold text-dark-primary">
                      {activeFormClass?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-dark-muted uppercase">Subject</span>
                    <p className="text-sm font-bold text-dark-primary">
                      {subjects.find((s) => String(s.id) === String(cellForm.existing?.subject_id))
                        ?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-dark-muted uppercase">
                      Invigilator
                    </span>
                    <p className="text-sm font-bold text-dark-primary">
                      {teachers.find((t) => String(t.id) === String(cellForm.existing?.teacher_id))
                        ?.name || 'No invigilator assigned'}
                    </p>
                  </div>
                  {cellForm.existing?.notes && (
                    <div>
                      <span className="text-[10px] font-bold text-dark-muted uppercase">Notes</span>
                      <p className="text-xs text-dark-primary">{cellForm.existing.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCellForm(null)}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-dark-primary transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-dark-slate mb-1.5">
                      Subject *
                    </label>
                    <select
                      value={formSubjectId}
                      onChange={(e) => setFormSubjectId(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300"
                      required
                    >
                      <option value="">— Select subject —</option>
                      {subjectsForActiveForm.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {subjectsForActiveForm.length === 0 && (
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
                      onChange={(e) =>
                        handleTeacherChange(
                          e.target.value,
                          cellForm.date,
                          cellForm.sessionId,
                          cellForm.classId
                        )
                      }
                      className="w-full px-3 py-2.5 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300"
                    >
                      <option value="">— No invigilator —</option>
                      {teachers
                        .filter((t) => t.is_active !== false)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>

                    {/* Conflict warning */}
                    {conflictWarning && (
                      <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                        <p className="text-[11px] text-amber-800 font-semibold">
                          {conflictWarning}
                        </p>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formOverride}
                            onChange={(e) => setFormOverride(e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-[11px] font-bold text-amber-700">
                            Override conflict
                          </span>
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

                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 shrink-0 border-t border-slate-100 sm:border-0">
                  <button
                    type="button"
                    onClick={() => setCellForm(null)}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-light-border text-dark-muted hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  {cellForm.existing && !isEffectivelyReadOnly && !cellForm.isReadOnly && (
                    <button
                      type="button"
                      onClick={handleRequestClearSlot}
                      className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
                    >
                      Clear Slot
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveSlot}
                    disabled={saving || !formSubjectId || (conflictWarning && !formOverride)}
                    className="flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {saving ? <i className="fas fa-spinner fa-spin mr-2" /> : null}
                    {cellForm.existing ? 'Update Slot' : 'Assign Slot'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmModalData && (
        <ConfirmModal
          isOpen={!!confirmModalData}
          title={confirmModalData.title}
          message={confirmModalData.message}
          type={confirmModalData.type || 'danger'}
          confirmText={confirmModalData.confirmText || 'Confirm'}
          cancelText={confirmModalData.cancelText || 'Cancel'}
          onConfirm={confirmModalData.onConfirm}
          onCancel={() => setConfirmModalData(null)}
        />
      )}
    </div>
  );
};

export default ExamSchedulerGrid;
