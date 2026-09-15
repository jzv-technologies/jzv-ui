// src/components/timetable/ClassSubjectsManager.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    icon: 'fa-circle-check',
    bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    icon: 'fa-flag-checkered',
    bg: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
  inactive: {
    label: 'Inactive',
    icon: 'fa-circle-minus',
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

/**
 * Manages the formal class-subject list for a given class.
 * Displays as a collapsible panel inside ClassesSetup.
 */
const ClassSubjectsManager = ({ classId, className, subjects = [], classifications = [] }) => {
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Add subject form
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addStatus, setAddStatus] = useState('active');
  const [addNotes, setAddNotes] = useState('');

  // Status change in-place
  const [statusChangingId, setStatusChangingId] = useState(null);

  const fetchClassSubjects = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('class_subjects')
        .select('id, class_id, subject_id, status, start_date, end_date, notes, created_at, updated_at')
        .eq('class_id', classId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setClassSubjects(data || []);
    } catch (err) {
      console.error('Failed to load class subjects:', err);
      showToast('Failed to load class subjects', 'error');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (isExpanded) {
      fetchClassSubjects();
    }
  }, [classId, isExpanded, fetchClassSubjects]);

  // Subjects already assigned to this class
  const assignedSubjectIds = useMemo(
    () => new Set(classSubjects.map((cs) => String(cs.subject_id))),
    [classSubjects]
  );

  // Available subjects not yet assigned
  const availableSubjects = useMemo(
    () => subjects.filter((s) => !assignedSubjectIds.has(String(s.id))),
    [subjects, assignedSubjectIds]
  );

  // Group available subjects by classification
  const subjectsByClassification = useMemo(() => {
    const groups = {};
    availableSubjects.forEach((s) => {
      const classif = classifications.find((c) => String(c.id) === String(s.classification_id));
      const key = classif ? classif.name : 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [availableSubjects, classifications]);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!addSubjectId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('class_subjects').insert({
        class_id: classId,
        subject_id: Number(addSubjectId),
        status: addStatus,
        notes: addNotes.trim() || null,
      });
      if (error) throw error;
      showToast('Subject added to class', 'success');
      setAddSubjectId('');
      setAddStatus('active');
      setAddNotes('');
      await fetchClassSubjects();
    } catch (err) {
      console.error('Failed to add subject:', err);
      showToast(err.message || 'Failed to add subject', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setStatusChangingId(id);
    try {
      const { error } = await supabase
        .from('class_subjects')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      setClassSubjects((prev) =>
        prev.map((cs) => (cs.id === id ? { ...cs, status: newStatus } : cs))
      );
      showToast(`Status changed to ${newStatus}`, 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleRemove = async (cs) => {
    const subName = subjects.find((s) => String(s.id) === String(cs.subject_id))?.name || 'Subject';
    if (!window.confirm(`Remove "${subName}" from ${className}? This won't affect the timetable.`))
      return;
    try {
      const { error } = await supabase.from('class_subjects').delete().eq('id', cs.id);
      if (error) throw error;
      setClassSubjects((prev) => prev.filter((x) => x.id !== cs.id));
      showToast(`"${subName}" removed`, 'success');
    } catch (err) {
      showToast('Failed to remove subject', 'error');
    }
  };

  // Auto-populate from class_assignments
  const handleAutoPopulate = async () => {
    setSaving(true);
    try {
      const { data: assignments, error } = await supabase
        .from('class_assignments')
        .select('subject_id')
        .eq('class_id', classId);

      if (error) throw error;

      const uniqueSubjectIds = [...new Set((assignments || []).map((a) => a.subject_id))].filter(
        (sid) => !assignedSubjectIds.has(String(sid))
      );

      if (uniqueSubjectIds.length === 0) {
        showToast('All timetable subjects are already in the list', 'info');
        return;
      }

      const inserts = uniqueSubjectIds.map((sid) => ({
        class_id: classId,
        subject_id: sid,
        status: 'active',
      }));

      const { error: insertError } = await supabase.from('class_subjects').insert(inserts);
      if (insertError) throw insertError;

      showToast(`Added ${uniqueSubjectIds.length} subject(s) from timetable`, 'success');
      await fetchClassSubjects();
    } catch (err) {
      showToast(err.message || 'Auto-populate failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { active: 0, completed: 0, inactive: 0 };
    classSubjects.forEach((cs) => {
      if (counts[cs.status] !== undefined) counts[cs.status]++;
    });
    return counts;
  }, [classSubjects]);

  return (
    <div className="mt-4 border border-light-border rounded-2xl overflow-hidden">
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
            <i className="fas fa-book text-rose-600 text-xs" />
          </div>
          <div>
            <p className="text-sm font-bold text-dark-deepblue">Class Subjects</p>
            <p className="text-xs text-dark-muted">
              Formal subject list for exams &amp; tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status summary badges */}
          {!isExpanded && classSubjects.length > 0 && (
            <div className="flex gap-1.5">
              {statusCounts.active > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {statusCounts.active} active
                </span>
              )}
              {statusCounts.completed > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {statusCounts.completed} completed
                </span>
              )}
            </div>
          )}
          <i
            className={`fas fa-chevron-down text-dark-muted text-xs transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Add Subject Form */}
          <form onSubmit={handleAddSubject} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-dark-slate mb-1">Add Subject</label>
              <select
                value={addSubjectId}
                onChange={(e) => setAddSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-light-border rounded-xl focus:ring-2 focus:ring-rose-300 focus:border-rose-400 bg-white"
                required
              >
                <option value="">— Select subject —</option>
                {Object.entries(subjectsByClassification).map(([group, subs]) => (
                  <optgroup key={group} label={group}>
                    {subs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-slate mb-1">Status</label>
              <select
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value)}
                className="px-3 py-2 text-xs border border-light-border rounded-xl focus:ring-2 focus:ring-rose-300 bg-white"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving || !addSubjectId}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-50"
            >
              <i className="fas fa-plus mr-1.5" />
              Add
            </button>
            <button
              type="button"
              onClick={handleAutoPopulate}
              disabled={saving}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-light-border text-dark-slate hover:bg-slate-50 transition-all disabled:opacity-50"
              title="Auto-populate from current timetable assignments"
            >
              <i className="fas fa-wand-magic-sparkles mr-1" />
              Sync from Timetable
            </button>
          </form>

          {/* Subject List */}
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : classSubjects.length === 0 ? (
            <div className="text-center py-6 text-xs text-dark-muted">
              <i className="fas fa-book-open text-2xl mb-2 block opacity-30" />
              No subjects added yet. Use "Sync from Timetable" or add manually.
            </div>
          ) : (
            <div className="space-y-1.5">
              {classSubjects.map((cs) => {
                const sub = subjects.find((s) => String(s.id) === String(cs.subject_id));
                const cfg = STATUS_CONFIG[cs.status] || STATUS_CONFIG.active;
                const isChanging = statusChangingId === cs.id;

                return (
                  <div
                    key={cs.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl border border-light-border bg-slate-50 hover:bg-white transition-colors group"
                  >
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

                    {/* Subject name */}
                    <span className="flex-1 text-xs font-semibold text-dark-deepblue truncate">
                      {sub?.name ?? `Subject #${cs.subject_id}`}
                    </span>

                    {/* Notes */}
                    {cs.notes && (
                      <span
                        className="text-[10px] text-dark-muted italic truncate max-w-[80px]"
                        title={cs.notes}
                      >
                        {cs.notes}
                      </span>
                    )}

                    {/* Status picker */}
                    <select
                      value={cs.status}
                      onChange={(e) => handleStatusChange(cs.id, e.target.value)}
                      disabled={isChanging}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all ${cfg.bg} disabled:opacity-60`}
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="inactive">Inactive</option>
                    </select>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemove(cs)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                      title="Remove subject from class"
                    >
                      <i className="fas fa-times text-[10px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary footer */}
          {classSubjects.length > 0 && (
            <div className="flex items-center gap-4 pt-2 border-t border-light-border">
              {Object.entries(statusCounts).map(([status, count]) =>
                count > 0 ? (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
                    <span className="text-[10px] text-dark-muted capitalize">
                      {count} {status}
                    </span>
                  </div>
                ) : null
              )}
              <span className="ml-auto text-[10px] text-dark-muted">
                {classSubjects.length} total
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassSubjectsManager;
