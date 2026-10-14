import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';

/**
 * Release progress reports to parents one student at a time.
 *
 * The schedule-level "published" flag stays as the master switch saying the reports are final; this
 * panel decides which wards can actually see them, so a class can be released for the parents who
 * attended a meeting and individual students can be excluded.
 */
const ReleaseToParentsPanel = ({ schedule, classId, students = [], canRelease }) => {
  const [released, setReleased] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const scheduleId = schedule?.id || null;

  const loadReleases = useCallback(async () => {
    if (!scheduleId) {
      setReleased([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_report_releases')
        .select('student_id, class_id, released_at')
        .eq('schedule_id', scheduleId);
      if (error) throw error;
      setReleased(data || []);
    } catch (err) {
      showToast(`Could not load the release list: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const releasedIds = useMemo(() => new Set(released.map((r) => String(r.student_id))), [released]);

  const visibleStudents = useMemo(() => {
    const list = (students || []).filter((student) =>
      classId ? String(student.class_id) === String(classId) : true
    );
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter((student) =>
      `${student.student_name || ''} ${student.admission_no || ''}`.toLowerCase().includes(term)
    );
  }, [students, classId, search]);

  // Keep the selection aligned with what is on screen; everything starts unchecked so releasing is
  // always a deliberate act.
  useEffect(() => {
    setSelected([]);
  }, [classId, scheduleId]);

  const releasedInView = visibleStudents.filter((s) => releasedIds.has(String(s.id)));
  const pendingInView = visibleStudents.filter((s) => !releasedIds.has(String(s.id)));

  const toggleStudent = (id) =>
    setSelected((prev) =>
      prev.includes(String(id)) ? prev.filter((x) => x !== String(id)) : [...prev, String(id)]
    );

  const releaseStudents = async (studentIds) => {
    if (!scheduleId || studentIds.length === 0) return;
    setSaving(true);
    try {
      const rows = studentIds.map((id) => {
        const student = (students || []).find((s) => String(s.id) === String(id));
        return {
          schedule_id: scheduleId,
          class_id: student?.class_id || classId || null,
          student_id: Number(id),
        };
      });
      const { error } = await supabase
        .from('exam_report_releases')
        .upsert(rows, { onConflict: 'schedule_id,student_id', ignoreDuplicates: true });
      if (error) throw error;
      showToast(
        `${studentIds.length} ward${studentIds.length > 1 ? 's' : ''} released to parents`,
        'success'
      );
      setSelected([]);
      await loadReleases();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeReleases = async (studentIds) => {
    if (!scheduleId || studentIds.length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('exam_report_releases')
        .delete()
        .eq('schedule_id', scheduleId)
        .in('student_id', studentIds.map(Number));
      if (error) throw error;
      showToast(
        `${studentIds.length} ward${studentIds.length > 1 ? 's' : ''} removed from the release`,
        'info'
      );
      setSelected([]);
      await loadReleases();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!schedule) return null;

  return (
    <div
      className="rounded-2xl border border-light-border bg-white p-3 sm:p-4"
      data-feature="exam-report-release-panel"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-black text-dark-primary flex items-center gap-2">
            <i className="fas fa-user-check text-indigo-600" />
            Release to parents
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {loading ? '…' : `${releasedInView.length}/${visibleStudents.length} released`}
            </span>
          </h4>
          <p className="text-[11px] font-semibold text-dark-muted mt-0.5">
            {schedule.name} · choose the wards whose reports the parents may see. Use{' '}
            <strong>Release all</strong> for the whole class.
          </p>
        </div>

        {canRelease && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => releaseStudents(pendingInView.map((s) => String(s.id)))}
              disabled={saving || pendingInView.length === 0}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <i className="fas fa-globe mr-1.5" />
              Release all ({pendingInView.length})
            </button>
            <button
              onClick={() => removeReleases(releasedInView.map((s) => String(s.id)))}
              disabled={saving || releasedInView.length === 0}
              className="px-3 py-2 rounded-xl border border-light-border text-[11px] font-bold text-dark-muted hover:bg-light-lbg transition-all cursor-pointer disabled:opacity-50"
            >
              <i className="fas fa-lock mr-1.5" />
              Remove all ({releasedInView.length})
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative">
          <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-dark-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or admission no…"
            className="w-full sm:w-64 border border-light-border rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <span className="text-[11px] font-bold text-dark-muted">
          {selected.length} selected
        </span>
        {canRelease && (
          <>
            <button
              onClick={() => releaseStudents(selected)}
              disabled={saving || selected.length === 0}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Release selected
            </button>
            <button
              onClick={() => removeReleases(selected)}
              disabled={saving || selected.length === 0}
              className="px-3 py-2 rounded-xl border border-light-border text-[11px] font-bold text-dark-muted hover:bg-light-lbg transition-all cursor-pointer disabled:opacity-50"
            >
              Remove selected
            </button>
            <button
              onClick={() =>
                setSelected(
                  selected.length === visibleStudents.length ? [] : visibleStudents.map((s) => String(s.id))
                )
              }
              className="px-3 py-2 rounded-xl border border-light-border text-[11px] font-bold text-dark-muted hover:bg-light-lbg transition-all cursor-pointer"
            >
              {selected.length === visibleStudents.length ? 'Clear' : 'Select all'}
            </button>
          </>
        )}
      </div>

      <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-light-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['', 'Student', 'Admission no', 'Status', ''].map((head) => (
                <th
                  key={head}
                  className="border-b border-light-border px-3 py-2 text-left font-black text-dark-primary whitespace-nowrap"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-dark-muted">
                  No students for this class.
                </td>
              </tr>
            )}
            {visibleStudents.map((student) => {
              const isReleased = releasedIds.has(String(student.id));
              return (
                <tr key={student.id} className="hover:bg-light-lbg/50">
                  <td className="border-b border-light-border px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={selected.includes(String(student.id))}
                      onChange={() => toggleStudent(student.id)}
                      disabled={!canRelease}
                      className="accent-indigo-600"
                    />
                  </td>
                  <td className="border-b border-light-border px-3 py-1.5 font-bold text-dark-primary whitespace-nowrap">
                    {student.student_name}
                  </td>
                  <td className="border-b border-light-border px-3 py-1.5 text-dark-muted">
                    {student.admission_no || '—'}
                  </td>
                  <td className="border-b border-light-border px-3 py-1.5">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide ${
                        isReleased
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-dark-muted border-light-border'
                      }`}
                    >
                      {isReleased ? 'Released' : 'Not released'}
                    </span>
                  </td>
                  <td className="border-b border-light-border px-3 py-1.5">
                    {canRelease && (
                      <button
                        onClick={() =>
                          isReleased ? removeReleases([String(student.id)]) : releaseStudents([String(student.id)])
                        }
                        disabled={saving}
                        className="text-[10px] font-bold text-dark-muted hover:text-dark-primary transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isReleased ? 'Remove' : 'Release'}
                      </button>
                    )}
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

export default ReleaseToParentsPanel;
