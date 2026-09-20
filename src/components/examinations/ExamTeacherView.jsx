// src/components/examinations/ExamTeacherView.jsx
import React, { useMemo, useState } from 'react';
import { generateDateRange, formatDateDisplay } from '../../utils/dateUtils';
import MultiSelectDropdown from '../MultiSelectDropdown';

/**
 * Teacher-centric view of exam assignments.
 * Shows one or multiple teachers' full schedules across all classes for the selected exam.
 */
const ExamTeacherView = ({
  schedule,
  sessions,
  classes,
  subjects,
  teachers,
  slots,
  selectedTeacherIds: externalSelectedTeacherIds = [],
  onSelectTeachers: externalOnSelectTeachers,
  hideTeacherSelector = false,
}) => {
  const [internalSelectedTeacherIds, setInternalSelectedTeacherIds] = useState([]);
  const selectedTeacherIds =
    externalSelectedTeacherIds && externalSelectedTeacherIds.length > 0
      ? externalSelectedTeacherIds
      : internalSelectedTeacherIds;
  const setSelectedTeacherIds = externalOnSelectTeachers || setInternalSelectedTeacherIds;

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.session_order - b.session_order),
    [sessions]
  );

  // Date range without timezone clash
  const dateRange = useMemo(() => {
    return generateDateRange(schedule?.start_date, schedule?.end_date);
  }, [schedule]);

  // Teachers who have at least one slot in this schedule
  const activeTeachers = useMemo(() => {
    const ids = new Set(slots.filter((s) => s.teacher_id).map((s) => String(s.teacher_id)));
    return teachers.filter((t) => ids.has(String(t.id))).sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, slots]);

  // Build slots index for each selected teacher
  const teacherSlotsIndexMap = useMemo(() => {
    const map = {};
    selectedTeacherIds.forEach((teacherId) => {
      const idx = {};
      slots
        .filter((s) => String(s.teacher_id) === String(teacherId))
        .forEach((s) => {
          idx[`${s.exam_date}_${s.session_id}`] = s;
        });
      map[teacherId] = idx;
    });
    return map;
  }, [slots, selectedTeacherIds]);

  // Conflict detection for each selected teacher
  const teacherConflictsMap = useMemo(() => {
    const map = {};
    selectedTeacherIds.forEach((teacherId) => {
      const conflictKeys = new Set();
      const teacherSlots = slots.filter((s) => String(s.teacher_id) === String(teacherId));
      teacherSlots.forEach((s) => {
        const key = `${s.exam_date}_${s.session_id}`;
        const others = teacherSlots.filter(
          (o) => o.exam_date === s.exam_date && String(o.session_id) === String(s.session_id) && o.id !== s.id
        );
        if (others.length > 0) conflictKeys.add(key);
      });
      map[teacherId] = conflictKeys;
    });
    return map;
  }, [slots, selectedTeacherIds]);

  // Total assignments per teacher
  const teacherAssignmentsMap = useMemo(() => {
    const map = {};
    selectedTeacherIds.forEach((teacherId) => {
      map[teacherId] = slots.filter((s) => String(s.teacher_id) === String(teacherId)).length;
    });
    return map;
  }, [slots, selectedTeacherIds]);

  const fmtDate = (d) =>
    formatDateDisplay(d, { weekday: 'short', day: '2-digit', month: 'short' });

  // Render a single teacher's table
  const renderTeacherTable = (teacherId) => {
    const teacher = teachers.find((t) => String(t.id) === String(teacherId));
    const teacherSlotsIndex = teacherSlotsIndexMap[teacherId] || {};
    const conflicts = teacherConflictsMap[teacherId] || new Set();
    const totalAssignments = teacherAssignmentsMap[teacherId] || 0;

    return (
      <div key={teacherId} className="w-full bg-white border border-light-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        {/* Merged Teacher Header Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-light-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold shadow-2xs">
              <i className="fas fa-user-tie" />
            </div>
            <div>
              <h4 className="text-sm font-black text-dark-deepblue">{teacher?.name || 'Unknown Teacher'}</h4>
              <p className="text-xs text-dark-muted font-medium">{totalAssignments} assignment{totalAssignments === 1 ? '' : 's'}</p>
            </div>
          </div>
          {conflicts.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-xl border border-red-200 shadow-2xs">
              <i className="fas fa-triangle-exclamation text-red-500 text-xs" />
              <span className="text-xs font-bold text-red-700">{conflicts.size} conflict{conflicts.size > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Grid */}
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-dark-muted">No sessions defined for this exam.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="py-3 px-3 sm:px-4 text-left font-bold text-dark-deepblue w-28 sm:w-32 whitespace-nowrap sticky left-0 bg-slate-50 z-20 border-r border-light-border shadow-xs">
                      Date
                    </th>
                    {sortedSessions.map((sess) => (
                      <th key={sess.id} className="py-3 px-3 sm:px-4 text-center font-bold text-dark-deepblue min-w-[120px] sm:min-w-[140px]">
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
                      <td className="py-3 px-3 sm:px-4 font-semibold text-dark-deepblue text-xs whitespace-nowrap sticky left-0 bg-white z-10 border-r border-light-border shadow-xs">
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
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Teacher selector */}
      {!hideTeacherSelector && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-light-border shadow-2xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-dark-slate whitespace-nowrap">View teachers:</label>
            <MultiSelectDropdown
              label="Teachers"
              options={activeTeachers.map((t) => ({ id: t.id, label: t.name }))}
              selected={selectedTeacherIds}
              onChange={setSelectedTeacherIds}
              placeholder="Select teachers..."
              fullWidth={false}
            />
          </div>

          {selectedTeacherIds.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {selectedTeacherIds.map((teacherId) => {
                const teacher = teachers.find((t) => String(t.id) === String(teacherId));
                const totalAssignments = teacherAssignmentsMap[teacherId] || 0;
                const conflicts = teacherConflictsMap[teacherId] || new Set();
                return (
                  <div key={teacherId} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-200">
                    <i className="fas fa-calendar-check text-blue-500 text-xs" />
                    <span className="text-xs font-bold text-blue-700">{teacher?.name}: {totalAssignments} assignments</span>
                    {conflicts.size > 0 && (
                      <span className="text-xs font-bold text-red-700 ml-1">({conflicts.size} conflicts)</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Render tables for each selected teacher */}
      {selectedTeacherIds.length === 0 ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-2xl sm:rounded-3xl shadow-sm">
          <i className="fas fa-user-tie text-3xl text-slate-300 mb-3 block" />
          <p className="text-sm font-bold text-dark-deepblue">Select one or more teachers to view their exam schedules</p>
        </div>
      ) : (
        selectedTeacherIds.map((teacherId) => renderTeacherTable(teacherId))
      )}

      {/* Free teachers list - only show for first selected teacher to avoid duplication */}
      {selectedTeacherIds.length > 0 && selectedTeacherIds[0] && (
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
