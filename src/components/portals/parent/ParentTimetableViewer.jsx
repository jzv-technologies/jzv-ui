// src/components/portals/parent/ParentTimetableViewer.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import {
  TIMETABLE_STORAGE_KEY,
  MOCK_CLASSES,
  MOCK_PERIODS,
  MOCK_SUBJECTS,
  MOCK_TEACHERS,
  MOCK_SLOTS,
} from '../../../data/mockTimetable';

// ─── Inline Timetable Grid for Parent View ───────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SUBJECT_COLORS = [
  {
    match: ['quran', 'tahfeez', 'arabic'],
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  { match: ['math', 'algebra'], cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  {
    match: ['science', 'physics', 'chemistry', 'biology'],
    cls: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  { match: ['english', 'grammar', 'literature'], cls: 'bg-pink-50 text-pink-800 border-pink-200' },
  { match: ['computer', 'coding', 'it'], cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  {
    match: ['islamic', 'deeniyat', 'hadith', 'fiqh'],
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    match: ['social', 'history', 'geography'],
    cls: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  { match: ['urdu', 'hindi'], cls: 'bg-violet-50 text-violet-800 border-violet-200' },
];
const DEFAULT_COLORS = [
  'bg-slate-50 text-slate-800 border-slate-200',
  'bg-rose-50 text-rose-800 border-rose-200',
  'bg-cyan-50 text-cyan-800 border-cyan-200',
  'bg-lime-50 text-lime-800 border-lime-200',
];

const getSubjectColor = (name) => {
  if (!name) return 'bg-gray-50 text-gray-400 border-dashed border-gray-200';
  const lower = name.toLowerCase();
  for (const { match, cls } of SUBJECT_COLORS) {
    if (match.some((m) => lower.includes(m))) return cls;
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
};

// ─── Helper to get break icon and label ──────────────────────────────────────
const getBreakInfo = (period) => {
  const name = period.name.toLowerCase();
  if (name.includes('lunch') || name.includes('breakfast')) {
    return { icon: 'fa-utensils', label: 'Lunch' };
  } else if (
    name.includes('salah') ||
    name.includes('prayer') ||
    name.includes('dhuhr') ||
    name.includes('asr')
  ) {
    return { icon: 'fa-mosque', label: 'Salah' };
  } else {
    return { icon: 'fa-coffee', label: 'Break' };
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ParentTimetableViewer = ({ student }) => {
  const [timetableData, setTimetableData] = useState(null); // { className, periods, days, slots }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBreaks, setShowBreaks] = useState(true);

  // New state for view controls
  const [viewMode, setViewMode] = useState('today'); // 'today' | 'day' | 'week'
  const [selectedDay, setSelectedDay] = useState('Monday');

  const classId = student?.class_id;

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    fetchTimetable(classId);
  }, [classId]);

  const fetchTimetable = async (cId) => {
    setLoading(true);
    setError(null);

    try {
      // ── Strategy 1: Try the RPC function (bypasses RLS, works for parents) ──
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_class_timetable', {
        p_class_id: cId,
      });

      if (!rpcError && rpcData) {
        // RPC returned data — parse it
        // Expected shape: { class_name, periods: [...], slots: [...] }
        setTimetableData(rpcData);
        setLoading(false);
        return;
      }

      // ── Strategy 2: Direct queries (works if RLS allows anon read) ──
      const [
        { data: classRow },
        { data: periodsRows },
        { data: slotsRows },
        { data: subjectsRows },
        { data: teachersRows },
      ] = await Promise.all([
        supabase.from('classes').select('id, name').eq('id', cId).single(),
        supabase.from('periods').select('*').order('period_number', { ascending: true }),
        supabase.from('timetable_slots').select('*').eq('class_id', cId),
        supabase.from('syl_subjects').select('id, name'),
        supabase.from('teachers').select('id, name').eq('is_active', true),
      ]);

      if (classRow && periodsRows && slotsRows !== null) {
        const subjectMap = {};
        (subjectsRows || []).forEach((s) => {
          subjectMap[String(s.id)] = s.name;
        });
        const teacherMap = {};
        (teachersRows || []).forEach((t) => {
          teacherMap[String(t.id)] = t.name;
        });

        setTimetableData({
          class_name: classRow.name,
          periods: periodsRows,
          slots: (slotsRows || []).map((slot) => ({
            day: slot.day,
            period_id: slot.period_id,
            subject_name: subjectMap[String(slot.subject_id)] || null,
            teacher_name: teacherMap[String(slot.teacher_id)] || null,
          })),
        });
        setLoading(false);
        return;
      }

      // ── Strategy 3: localStorage / mock fallback ──
      // Used when RPC doesn't exist yet OR for mock/demo student class IDs.
      const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
      let localData = null;
      if (raw) {
        try {
          localData = JSON.parse(raw);
        } catch (_) {}
      }

      const localClasses = localData?.classes || MOCK_CLASSES;
      const localPeriods = localData?.periods || MOCK_PERIODS;
      const localSlots =
        localData?.slots && localData.slots.length > 0 ? localData.slots : MOCK_SLOTS;
      const localSubjects =
        localData?.subjects && localData.subjects.length > 0 ? localData.subjects : MOCK_SUBJECTS;
      const localTeachers =
        localData?.teachers && localData.teachers.length > 0 ? localData.teachers : MOCK_TEACHERS;

      const matchedClass = localClasses.find((c) => String(c.id) === String(cId));

      if (matchedClass) {
        const classSlots = localSlots
          .filter((s) => String(s.class_id) === String(cId))
          .map((s) => ({
            day: s.day,
            period_id: s.period_id,
            subject_name:
              localSubjects.find((sub) => String(sub.id) === String(s.subject_id))?.name || null,
            teacher_name:
              localTeachers.find((t) => String(t.id) === String(s.teacher_id))?.name || null,
          }));
        setTimetableData({
          class_name: matchedClass.name,
          periods: localPeriods,
          slots: classSlots,
        });
        setLoading(false);
        return;
      }

      // Strategy 4 (real DB students, RPC not yet set up):
      // The class_id is a real numeric DB ID but timetable tables are RLS-restricted.
      // Show "pending setup" state — timetable will be available once admin configures access.
      // This is NOT a technical error, so we set timetableData with empty slots.
      setTimetableData({
        class_name: `Class ${cId}`,
        periods: MOCK_PERIODS,
        slots: [],
        _pendingSetup: true,
      });
      setLoading(false);
    } catch (err) {
      console.error('[ParentTimetableViewer] fetch error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Guard: student not set ──
  if (!student) {
    return (
      <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-sm">
        <i className="fas fa-user-graduate text-4xl text-light-muted mb-4 block" />
        <p className="text-dark-soft text-lg font-semibold">No student selected</p>
        <p className="text-dark-muted text-sm mt-1">
          Please select a student profile to view the class schedule.
        </p>
      </div>
    );
  }

  // ── Guard: no class assigned ──
  if (!classId) {
    return (
      <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-sm">
        <i className="fas fa-exclamation-triangle text-4xl text-amber-400 mb-4 block" />
        <p className="text-dark-soft text-lg font-semibold">No Class Associated</p>
        <p className="text-dark-muted text-sm mt-1">
          {student.student_name} is not yet assigned to a class.
        </p>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-light-border rounded-[2rem] shadow-sm gap-4">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-dark-soft text-sm font-medium animate-pulse">Loading class schedule…</p>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-sm">
        <i className="fas fa-calendar-times text-4xl text-rose-400 mb-4 block" />
        <p className="text-dark-soft text-lg font-semibold">Schedule Not Available</p>
        <p className="text-dark-muted text-sm mt-2 max-w-sm mx-auto">
          The class timetable hasn't been set up yet. Please check back later or contact the school
          office.
        </p>
        <button
          onClick={() => fetchTimetable(classId)}
          className="mt-6 px-5 py-2 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          <i className="fas fa-redo mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  // ── No timetable slots ──
  if (!timetableData || !timetableData.slots || timetableData.slots.length === 0) {
    const isPendingSetup = timetableData?._pendingSetup;
    return (
      <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
          <i
            className={`fas ${isPendingSetup ? 'fa-clock' : 'fa-calendar-plus'} text-2xl ${isPendingSetup ? 'text-emerald-500' : 'text-light-muted'}`}
          />
        </div>
        <p className="text-dark-soft text-lg font-semibold">
          {isPendingSetup ? 'Schedule Coming Soon' : 'Schedule Not Configured'}
        </p>
        <p className="text-dark-muted text-sm mt-2 max-w-sm mx-auto">
          {isPendingSetup
            ? `The timetable for ${student.student_name} will be available once the school sets up the class schedule. Check back soon!`
            : `The timetable for ${timetableData?.class_name || 'this class'} has not been added yet.`}
        </p>
        {isPendingSetup && (
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <i className="fas fa-info-circle" />
            Student ID: {student.admission_no} · Class ID: {classId}
          </div>
        )}
        <button
          onClick={() => fetchTimetable(classId)}
          className="mt-5 px-5 py-2 bg-light-lbg border border-light-border text-dark-soft text-sm font-semibold rounded-xl hover:bg-white hover:text-brand-primary transition-all"
        >
          <i className="fas fa-sync-alt mr-2" />
          Check Again
        </button>
      </div>
    );
  }

  // ── Render timetable grid ──
  const { class_name, periods, slots } = timetableData;
  const visiblePeriods = showBreaks ? periods : periods.filter((p) => !p.is_break);

  // --- View logic ---
  const getDisplayDays = () => {
    if (viewMode === 'week') return DAYS;
    if (viewMode === 'today') {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      return DAYS.includes(today) ? [today] : [];
    }
    if (viewMode === 'day' && selectedDay) {
      return DAYS.includes(selectedDay) ? [selectedDay] : [];
    }
    return [];
  };

  const displayDays = getDisplayDays();
  const filteredSlots = slots.filter((s) => displayDays.includes(s.day));

  const getSlot = (day, periodId) =>
    filteredSlots.find((s) => s.day === day && String(s.period_id) === String(periodId));

  // If no days to display (e.g., today is Sunday)
  if (displayDays.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-sm">
        <i className="fas fa-calendar-day text-4xl text-amber-400 mb-4 block" />
        <p className="text-dark-soft text-lg font-semibold">No Schedule for Today</p>
        <p className="text-dark-muted text-sm mt-2 max-w-sm mx-auto">
          Today is not a madrasa day. Please select a different day or view the full week.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setViewMode('week')}
            className="px-4 py-2 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:opacity-90"
          >
            View Full Week
          </button>
          <button
            onClick={() => setViewMode('day')}
            className="px-4 py-2 bg-light-lbg border border-light-border text-dark-soft text-sm font-semibold rounded-xl hover:bg-white"
          >
            Select a Day
          </button>
        </div>
      </div>
    );
  }

  // Dynamic table min-width based on number of days
  const periodColumnWidth = 120; // approximate width for period column
  const dayCellWidth = 110; // approximate width per day
  const tableMinWidth = Math.max(320, periodColumnWidth + displayDays.length * dayCellWidth);

  return (
    <div className="w-full bg-white border border-light-border rounded-3xl shadow-sm p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-4 border-b border-light-border mb-4 md:mb-6">
        <div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-dark-primary flex items-center gap-2">
            <i className="fas fa-calendar-week text-emerald-600" />
            Class Schedule
          </h3>
          <p className="text-xs sm:text-sm text-dark-soft mt-0.5">
            {student.student_name}
            {student.admission_no ? ` · Adm# ${student.admission_no}` : ''}
          </p>
        </div>

        {/* Controls - Responsive wrap */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-xl border border-light-border overflow-hidden bg-light-lbg text-xs font-semibold">
            <button
              onClick={() => setViewMode('today')}
              className={`px-2 sm:px-3 py-1.5 transition-colors ${
                viewMode === 'today'
                  ? 'bg-brand-primary text-white'
                  : 'text-dark-soft hover:bg-white/50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-2 sm:px-3 py-1.5 transition-colors ${
                viewMode === 'day'
                  ? 'bg-brand-primary text-white'
                  : 'text-dark-soft hover:bg-white/50'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2 sm:px-3 py-1.5 transition-colors ${
                viewMode === 'week'
                  ? 'bg-brand-primary text-white'
                  : 'text-dark-soft hover:bg-white/50'
              }`}
            >
              Week
            </button>
          </div>

          {/* Day selector (only in 'day' mode) */}
          {viewMode === 'day' && (
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="text-xs font-semibold border border-light-border rounded-xl px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 max-w-[120px] sm:max-w-none"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {/* Break toggle */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-dark-soft cursor-pointer select-none bg-light-lbg border border-light-border rounded-xl px-2 sm:px-3 py-1.5">
            <input
              type="checkbox"
              checked={showBreaks}
              onChange={() => setShowBreaks((v) => !v)}
              className="accent-emerald-600 w-3.5 h-3.5 sm:w-4 sm:h-4"
            />
            <span className="hidden xs:inline">Show</span> Breaks
          </label>

          {/* Refresh */}
          <button
            onClick={() => fetchTimetable(classId)}
            className="flex items-center gap-1.5 text-xs font-semibold text-dark-soft bg-light-lbg border border-light-border rounded-xl px-2 sm:px-3 py-1.5 hover:bg-white hover:text-brand-primary transition-all"
          >
            <i className="fas fa-sync-alt" />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid with horizontal scroll on mobile */}
      <div className="overflow-x-auto sm:mx-0 rounded-2xl border border-light-border">
        <div style={{ minWidth: `${tableMinWidth}px` }}>
          <table className="w-full text-xs sm:text-sm border-collapse p-10">
            <thead>
              <tr className="bg-light-lbg">
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-dark-soft uppercase tracking-wide border-b border-light-border w-20 sm:w-28">
                  Period
                </th>
                {displayDays.map((day) => (
                  <th
                    key={day}
                    className="py-2 sm:py-3 px-1 sm:px-2 text-center text-[10px] sm:text-xs font-bold text-dark-soft uppercase tracking-wide border-b border-light-border"
                  >
                    {day.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePeriods.map((period, idx) => {
                const isBreak = period.is_break;
                const breakInfo = isBreak ? getBreakInfo(period) : null;
                return (
                  <tr
                    key={period.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${isBreak ? 'bg-amber-50/60' : ''} hover:bg-brand-lbg/30 transition-colors`}
                  >
                    {/* Period label — NO ICON or break label */}
                    <td className="py-1.5 sm:py-2 px-2 sm:px-4 border-b border-light-border">
                      <div className="font-bold text-dark-primary text-[10px] sm:text-xs leading-tight">
                        {period.name}
                      </div>
                      {(period.start_time || period.end_time) && (
                        <div className="text-dark-muted text-[8px] sm:text-[10px] mt-0.5 leading-tight">
                          {period.start_time} – {period.end_time}
                        </div>
                      )}
                    </td>

                    {/* Day cells */}
                    {displayDays.map((day) => {
                      if (isBreak) {
                        return (
                          <td
                            key={day}
                            className="py-1.5 sm:py-2 px-1 sm:px-2 border-b border-light-border text-center"
                          >
                            <div className="flex items-center justify-center gap-1 text-amber-600">
                              <i className={`fas ${breakInfo.icon} text-[10px] sm:text-xs`} />
                              <span className="text-[8px] sm:text-xs font-medium">
                                {breakInfo.label}
                              </span>
                            </div>
                          </td>
                        );
                      }
                      const slot = getSlot(day, period.id);
                      if (!slot || !slot.subject_name) {
                        return (
                          <td
                            key={day}
                            className="py-1.5 sm:py-2 px-1 sm:px-2 border-b border-light-border"
                          >
                            <div className="flex items-center justify-center">
                              <span className="text-[8px] sm:text-[10px] text-dark-muted italic">
                                Free
                              </span>
                            </div>
                          </td>
                        );
                      }
                      const colorCls = getSubjectColor(slot.subject_name);
                      return (
                        <td
                          key={day}
                          className="py-1.5 sm:py-2 px-1 sm:px-2 border-b border-light-border"
                        >
                          <div
                            className={`rounded-lg border px-1 sm:px-2 py-1 text-center ${colorCls}`}
                          >
                            <div className="text-[9px] sm:text-[11px] font-bold leading-tight">
                              {slot.subject_name}
                            </div>
                            {slot.teacher_name && (
                              <div className="text-[7px] sm:text-[9px] opacity-80 mt-0.5 truncate">
                                {slot.teacher_name}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend note */}
      <p className="text-[10px] sm:text-[11px] text-dark-muted mt-3 sm:mt-4 text-right">
        <i className="fas fa-info-circle mr-1" />
        Schedule is subject to change. Contact school for updates.
      </p>
    </div>
  );
};

export default ParentTimetableViewer;
