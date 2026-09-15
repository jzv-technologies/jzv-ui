// src/components/examinations/ExamTeacherView.jsx
import React, { useMemo, useState } from 'react';

/**
 * Teacher-centric view of exam assignments.
 * Shows one teacher's full schedule across all classes for the selected exam.
 */
const ExamTeacherView = ({
  schedule,
  sessions,
  classes,
  subjects,
  teachers,
  slots,
  selectedTeacherId: externalSelectedTeacherId,
  onSelectTeacher: externalOnSelectTeacher,
  hideTeacherSelector = false,
}) => {
  const [internalSelectedTeacherId, setInternalSelectedTeacherId] = useState('');
  const selectedTeacherId =
    externalSelectedTeacherId !== undefined ? externalSelectedTeacherId : internalSelectedTeacherId;
  const setSelectedTeacherId = externalOnSelectTeacher || setInternalSelectedTeacherId;

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.session_order - b.session_order),
    [sessions]
  );

  // Date range
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

  // Teachers who have at least one slot in this schedule
  const activeTeachers = useMemo(() => {
    const ids = new Set(slots.filter((s) => s.teacher_id).map((s) => String(s.teacher_id)));
    return teachers.filter((t) => ids.has(String(t.id))).sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, slots]);

  // Selected teacher's slots, indexed by date_sessionId
  const teacherSlotsIndex = useMemo(() => {
    if (!selectedTeacherId) return {};
    const idx = {};
    slots
      .filter((s) => String(s.teacher_id) === String(selectedTeacherId))
      .forEach((s) => {
        idx[`${s.exam_date}_${s.session_id}`] = s;
      });
    return idx;
  }, [slots, selectedTeacherId]);

  // Conflict detection for selected teacher
  const conflicts = useMemo(() => {
    if (!selectedTeacherId) return new Set();
    const conflictKeys = new Set();
    const teacherSlots = slots.filter((s) => String(s.teacher_id) === String(selectedTeacherId));
    teacherSlots.forEach((s) => {
      const key = `${s.exam_date}_${s.session_id}`;
      const others = teacherSlots.filter(
        (o) => o.exam_date === s.exam_date && String(o.session_id) === String(s.session_id) && o.id !== s.id
      );
      if (others.length > 0) conflictKeys.add(key);
    });
    return conflictKeys;
  }, [slots, selectedTeacherId]);

  // Total assignments
  const totalAssignments = useMemo(() => {
    if (!selectedTeacherId) return 0;
    return slots.filter((s) => String(s.teacher_id) === String(selectedTeacherId)).length;
  }, [slots, selectedTeacherId]);

  const fmtDate = (d) =>
    new Date(d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <div className="space-y-4">
      {/* Teacher selector */}
      {!hideTeacherSelector && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-dark-slate whitespace-nowrap">View teacher:</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="px-3 py-2 text-xs border border-light-border rounded-xl bg-white focus:ring-2 focus:ring-rose-300 min-w-[180px]"
            >
              <option value="">— Select teacher —</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {selectedTeacherId && (
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-200">
                <i className="fas fa-calendar-check text-blue-500 text-xs" />
                <span className="text-xs font-bold text-blue-700">{totalAssignments} assignments</span>
              </div>
              {conflicts.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-xl border border-red-200">
                  <i className="fas fa-triangle-exclamation text-red-500 text-xs" />
                  <span className="text-xs font-bold text-red-700">{conflicts.size} conflict{conflicts.size > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {!selectedTeacherId ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm">
          <i className="fas fa-user-tie text-3xl text-slate-300 mb-3 block" />
          <p className="text-sm font-bold text-dark-deepblue">Select a teacher to view their exam schedule</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm">
          <p className="text-sm text-dark-muted">No sessions defined for this exam.</p>
        </div>
      ) : (
        <div className="w-full bg-white border border-light-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-left font-bold text-dark-deepblue w-28">Date</th>
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
                  <tr key={date} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-dark-deepblue text-[11px] whitespace-nowrap">
                      {fmtDate(date)}
                    </td>
                    {sortedSessions.map((sess) => {
                      const slot = teacherSlotsIndex[`${date}_${sess.id}`];
                      const isConflict = conflicts.has(`${date}_${sess.id}`);
                      const sub = slot ? subjects.find((s) => String(s.id) === String(slot.subject_id)) : null;
                      const cls = slot ? classes.find((c) => String(c.id) === String(slot.class_id)) : null;

                      return (
                        <td
                          key={sess.id}
                          className={`py-2 px-2 text-center border-l border-slate-100 ${
                            isConflict
                              ? 'bg-red-50'
                              : slot
                              ? 'bg-blue-50'
                              : ''
                          }`}
                        >
                          {slot ? (
                            <div className="space-y-0.5">
                              <div className={`font-bold text-[11px] ${isConflict ? 'text-red-700' : 'text-blue-800'}`}>
                                {sub?.name || `Sub #${slot.subject_id}`}
                              </div>
                              <div className="text-[10px] text-dark-muted">{cls?.name}</div>
                              {isConflict && (
                                <span className="inline-block px-1 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-300">
                                  Conflict
                                </span>
                              )}
                              {slot.is_override && (
                                <span className="inline-block px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                  Override
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
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

      {/* Free teachers list */}
      {selectedTeacherId && (
        <div className="bg-white border border-light-border rounded-2xl p-5">
          <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wide mb-3">
            Available Teachers Per Slot
          </h4>
          <p className="text-xs text-dark-muted mb-4">
            Teachers with no assignment at each date-session combination.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dateRange.slice(0, 5).map((date) =>
              sortedSessions.map((sess) => {
                const assignedTeacherIds = new Set(
                  slots
                    .filter((s) => s.exam_date === date && String(s.session_id) === String(sess.id) && s.teacher_id)
                    .map((s) => String(s.teacher_id))
                );
                const freeTeachers = teachers.filter(
                  (t) => t.is_active !== false && !assignedTeacherIds.has(String(t.id))
                );
                if (freeTeachers.length === 0) return null;
                return null; // condensed; full view in its own tab
              })
            )}
          </div>
          <p className="text-[11px] text-dark-muted italic">See "Free Teachers" tab for a full breakdown.</p>
        </div>
      )}
    </div>
  );
};

export default ExamTeacherView;
