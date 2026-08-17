// src/components/portals/parent/ParentTimetableViewer.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import {
  TIMETABLE_STORAGE_KEY,
  MOCK_CLASSES,
  MOCK_PERIODS,
  MOCK_SUBJECTS,
  MOCK_TEACHERS,
  MOCK_SLOTS,
} from '../../data/mockTimetable';

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

const getBreakInfo = (period) => {
  const name = (period?.name || '').toLowerCase();
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

// ─── Matching Helpers ─────────────────────────────────────────────────────────

const matchDay = (slotDay, targetDay) => {
  if (!slotDay || !targetDay) return false;
  const sDay = String(slotDay).trim().toLowerCase();
  const tDay = String(targetDay).trim().toLowerCase();
  return sDay === tDay || sDay.startsWith(tDay.slice(0, 3)) || tDay.startsWith(sDay.slice(0, 3));
};

const matchPeriodId = (slotPeriodId, period) => {
  if (slotPeriodId === undefined || slotPeriodId === null || !period) return false;
  const sPid = String(slotPeriodId).trim();
  const pId = String(period.id !== undefined ? period.id : '').trim();
  const pNum = String(period.period_number !== undefined ? period.period_number : '').trim();

  return (
    sPid === pId ||
    sPid === pNum ||
    sPid === `p-${pNum}` ||
    sPid.replace(/^p-/, '') === pNum ||
    (pId && sPid.replace(/^p-/, '') === pId.replace(/^p-/, ''))
  );
};

const resolveSubjectName = (subjectId, explicitName, subjectsList = MOCK_SUBJECTS) => {
  if (explicitName && typeof explicitName === 'string' && explicitName.trim().length > 0) {
    return explicitName.trim();
  }
  if (!subjectId) return null;
  const sId = String(subjectId).trim();
  const strippedId = sId.replace(/^sub-/, '');

  if (Array.isArray(subjectsList)) {
    const found = subjectsList.find((sub) => {
      const subId = String(sub.id).trim();
      return (
        subId === sId ||
        subId === strippedId ||
        subId === `sub-${sId}` ||
        subId.replace(/^sub-/, '') === strippedId
      );
    });
    if (found) return found.name;
  }

  if (isNaN(Number(sId)) && !sId.startsWith('sub-')) {
    return sId;
  }
  return null;
};

const resolveTeacherName = (teacherId, explicitName, teachersList = MOCK_TEACHERS) => {
  if (explicitName && typeof explicitName === 'string' && explicitName.trim().length > 0) {
    return explicitName.trim();
  }
  if (!teacherId) return null;
  const tId = String(teacherId).trim();
  const strippedId = tId.replace(/^t-/, '');

  if (Array.isArray(teachersList)) {
    const found = teachersList.find((t) => {
      const idVal = String(t.teacher_id || t.id).trim();
      return (
        idVal === tId ||
        idVal === strippedId ||
        idVal === `t-${tId}` ||
        idVal.replace(/^t-/, '') === strippedId
      );
    });
    if (found) return found.name;
  }

  if (isNaN(Number(tId)) && !tId.startsWith('t-')) {
    return tId;
  }
  return null;
};

const formatClassName = (rawName, cId) => {
  if (rawName && typeof rawName === 'string' && rawName.trim().length > 0) {
    const trimmed = rawName.trim();
    if (trimmed.startsWith('Class ')) {
      return trimmed.replace('Class ', 'PCC ');
    }
    if (/^\d+$/.test(trimmed)) {
      return `PCC ${trimmed}`;
    }
    return trimmed;
  }
  const cleanId = String(cId || '').replace(/^c-/, '').trim();
  return `PCC ${cleanId || '4'}`;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ParentTimetableViewer = ({ student }) => {
  const [timetableData, setTimetableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBreaks, setShowBreaks] = useState(true);

  const [viewMode, setViewMode] = useState('week'); // 'today' | 'day' | 'week'
  const [selectedDay, setSelectedDay] = useState('Monday');

  const classId = student?.class_id ?? 1;

  useEffect(() => {
    fetchTimetable(classId);
  }, [classId, student]);

  const fetchTimetable = async (cId) => {
    setLoading(true);
    setError(null);

    const targetCid = cId !== undefined && cId !== null ? cId : 1;

    try {
      // ── Strategy 1: Always issue RPC network call to Supabase ──
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_class_timetable', {
        p_class_id: String(targetCid),
      });

      if (!rpcError && rpcData) {
        const dbClassName = formatClassName(rpcData.class_name, targetCid);
        const dbPeriods = rpcData.periods && rpcData.periods.length > 0 ? rpcData.periods : null;

        if (rpcData.slots && rpcData.slots.length > 0) {
          // DB has full timetable data — use it directly
          setTimetableData({
            ...rpcData,
            class_name: dbClassName,
            periods: dbPeriods || MOCK_PERIODS,
          });
          setLoading(false);
          return;
        }

        // DB has class_name/periods but no slots yet — use DB metadata with mock slots
        if (dbPeriods) {
          const localSlots = MOCK_SLOTS
            .filter((s) => {
              const sCid = String(s.class_id).replace(/^c-/, '');
              return sCid === String(targetCid) || sCid === '1';
            })
            .map((s) => ({
              day: s.day,
              period_id: s.period_id,
              subject_id: s.subject_id,
              teacher_id: s.teacher_id,
              subject_name: resolveSubjectName(s.subject_id, null, MOCK_SUBJECTS),
              teacher_name: resolveTeacherName(s.teacher_id, null, MOCK_TEACHERS),
            }));

          if (localSlots.length > 0) {
            setTimetableData({
              class_name: dbClassName,
              periods: dbPeriods,
              slots: localSlots,
            });
            setLoading(false);
            return;
          }
        }
      }

      // ── Strategy 2: Direct REST network queries to Supabase DB tables ──
      try {
        const isNumericId = !isNaN(Number(targetCid));
        const classQuery = isNumericId
          ? supabase.from('classes').select('id, name').eq('id', targetCid).maybeSingle()
          : supabase.from('classes').select('id, name').limit(1).single();

        const [
          { data: classRow },
          { data: periodsRows },
          { data: slotsRows },
          { data: subjectsRows },
          { data: teachersRows },
        ] = await Promise.all([
          classQuery,
          supabase.from('periods').select('*').order('period_number', { ascending: true }),
          supabase.from('timetable_slots').select('*'),
          supabase.from('syl_subjects').select('id, name'),
          supabase.from('teachers').select('*'),
        ]);

        if (periodsRows && periodsRows.length > 0 && slotsRows && slotsRows.length > 0) {
          const matchingSlots = slotsRows.filter(
            (s) =>
              String(s.class_id) === String(targetCid) ||
              (classRow && String(s.class_id) === String(classRow.id))
          );
          const activeSlots = matchingSlots.length > 0 ? matchingSlots : slotsRows;

          setTimetableData({
            class_name: formatClassName(classRow?.name, targetCid),
            periods: periodsRows,
            slots: activeSlots.map((slot) => ({
              day: slot.day,
              period_id: slot.period_id,
              subject_id: slot.subject_id,
              teacher_id: slot.teacher_id,
              subject_name: resolveSubjectName(slot.subject_id, null, subjectsRows),
              teacher_name: resolveTeacherName(slot.teacher_id, null, teachersRows),
            })),
          });
          setLoading(false);
          return;
        }
      } catch (directErr) {
        console.warn('[ParentTimetableViewer] Direct query network fallback:', directErr);
      }

      // Strategy 3: Mock / LocalStorage fallback
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

      const matchedClass = localClasses.find(
        (c) =>
          String(c.id) === String(cId) ||
          String(c.id) === `c-${cId}` ||
          (cId && String(cId).startsWith('c-') && String(c.id) === String(cId).replace('c-', '')) ||
          (c.name && String(c.name).toLowerCase() === `class ${cId}`.toLowerCase()) ||
          (c.name && String(c.name).toLowerCase() === `pcc ${cId}`.toLowerCase())
      );

      const targetClassId = matchedClass ? matchedClass.id : cId;
      const targetClassName = formatClassName(matchedClass ? matchedClass.name : null, cId);

      let classSlots = localSlots
        .filter((s) => {
          const sCid = String(s.class_id).trim();
          const targetCid = String(targetClassId).trim();
          const rawCid = String(cId).trim();
          return (
            sCid === rawCid ||
            sCid === targetCid ||
            sCid === `c-${rawCid}` ||
            sCid === `c-${targetCid}` ||
            sCid.replace(/^c-/, '') === rawCid.replace(/^c-/, '') ||
            sCid.replace(/^c-/, '') === targetCid.replace(/^c-/, '')
          );
        })
        .map((s) => ({
          day: s.day,
          period_id: s.period_id,
          subject_id: s.subject_id,
          teacher_id: s.teacher_id,
          subject_name: resolveSubjectName(s.subject_id, s.subject_name, localSubjects),
          teacher_name: resolveTeacherName(s.teacher_id, s.teacher_name, localTeachers),
        }));

      if (classSlots.length === 0 && localSlots.length > 0) {
        const fallbackClassId = localSlots[0]?.class_id || 'c-1';
        classSlots = localSlots
          .filter(
            (s) =>
              String(s.class_id) === String(fallbackClassId) ||
              String(s.class_id) === 'c-1' ||
              String(s.class_id) === '1'
          )
          .map((s) => ({
            day: s.day,
            period_id: s.period_id,
            subject_id: s.subject_id,
            teacher_id: s.teacher_id,
            subject_name: resolveSubjectName(s.subject_id, s.subject_name, localSubjects),
            teacher_name: resolveTeacherName(s.teacher_id, s.teacher_name, localTeachers),
          }));
      }

      setTimetableData({
        class_name: targetClassName,
        periods: localPeriods,
        slots: classSlots,
      });
      setLoading(false);
    } catch (err) {
      console.error('[ParentTimetableViewer] fetch error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

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

  if (!classId && classId !== 0) {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-light-border rounded-[2rem] shadow-sm gap-4">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-dark-soft text-sm font-medium animate-pulse">Loading class schedule…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-sm">
        <i className="fas fa-calendar-times text-4xl text-rose-400 mb-4 block" />
        <p className="text-dark-soft text-lg font-semibold">Schedule Not Available</p>
        <p className="text-dark-muted text-sm mt-2 max-w-sm mx-auto">
          The class timetable hasn't been set up yet. Please check back later or contact the school office.
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

  if (!timetableData || !timetableData.slots || timetableData.slots.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-light-border rounded-3xl p-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
          <i className="fas fa-clock text-2xl text-emerald-500" />
        </div>
        <p className="text-dark-soft text-lg font-semibold">Schedule Coming Soon</p>
        <p className="text-dark-muted text-sm mt-2 max-w-sm mx-auto">
          The timetable for {student.student_name} will be available once the school sets up the class schedule. Check back soon!
        </p>
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

  // Ensure periods array covers all 1 to 15 periods (or max period in slots)
  const allPeriods = Array.isArray(periods) && periods.length > 0 ? periods : MOCK_PERIODS;
  const maxPeriodInSlots = Math.max(
    ...allPeriods.map((p) => p.period_number || 0),
    ...(slots || []).map((s) => {
      const pidStr = String(s.period_id || '').replace(/^p-/, '');
      const num = Number(pidStr);
      return isNaN(num) ? 0 : num;
    }),
    15
  );

  const fullPeriods = [];
  for (let i = 1; i <= maxPeriodInSlots; i++) {
    const existingP = allPeriods.find(
      (p) => p.period_number === i || String(p.id) === `p-${i}` || String(p.id) === String(i)
    );
    if (existingP) {
      fullPeriods.push(existingP);
    } else {
      fullPeriods.push({
        id: `p-${i}`,
        period_number: i,
        name: `Period ${i}`,
        start_time: '',
        end_time: '',
        is_break: false,
      });
    }
  }

  const visiblePeriods = showBreaks ? fullPeriods : fullPeriods.filter((p) => !p.is_break);

  const getDisplayDays = () => {
    if (viewMode === 'week') return DAYS;
    if (viewMode === 'today') {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      return DAYS.includes(today) ? [today] : ['Monday'];
    }
    if (viewMode === 'day' && selectedDay) {
      return DAYS.includes(selectedDay) ? [selectedDay] : ['Monday'];
    }
    return DAYS;
  };

  const displayDays = getDisplayDays();

  const getSlot = (day, period) => {
    if (!slots || !Array.isArray(slots)) return null;
    return slots.find((s) => matchDay(s.day, day) && matchPeriodId(s.period_id, period));
  };

  const periodColumnWidth = 120;
  const dayCellWidth = 110;
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
            {class_name ? ` · ${class_name}` : ''}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

          <label className="flex items-center gap-1.5 text-xs font-semibold text-dark-soft cursor-pointer select-none bg-light-lbg border border-light-border rounded-xl px-2 sm:px-3 py-1.5">
            <input
              type="checkbox"
              checked={showBreaks}
              onChange={() => setShowBreaks((v) => !v)}
              className="accent-emerald-600 w-3.5 h-3.5 sm:w-4 sm:h-4"
            />
            <span className="hidden xs:inline">Show</span> Breaks
          </label>

          <button
            onClick={() => fetchTimetable(classId)}
            className="flex items-center gap-1.5 text-xs font-semibold text-dark-soft bg-light-lbg border border-light-border rounded-xl px-2 sm:px-3 py-1.5 hover:bg-white hover:text-brand-primary transition-all"
          >
            <i className="fas fa-sync-alt" />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto sm:mx-0 rounded-2xl border border-light-border">
        <div style={{ minWidth: `${tableMinWidth}px` }}>
          <table className="w-full text-xs sm:text-sm border-collapse">
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
                    key={period.id || idx}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${
                      isBreak ? 'bg-amber-50/60' : ''
                    } hover:bg-brand-lbg/30 transition-colors`}
                  >
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
                      const slot = getSlot(day, period);
                      const subjName = resolveSubjectName(
                        slot?.subject_id,
                        slot?.subject_name,
                        MOCK_SUBJECTS
                      );
                      const teachName = resolveTeacherName(
                        slot?.teacher_id,
                        slot?.teacher_name,
                        MOCK_TEACHERS
                      );

                      if (!subjName) {
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
                      const colorCls = getSubjectColor(subjName);
                      return (
                        <td
                          key={day}
                          className="py-1.5 sm:py-2 px-1 sm:px-2 border-b border-light-border"
                        >
                          <div
                            className={`rounded-lg border px-1 sm:px-2 py-1 text-center ${colorCls}`}
                          >
                            <div className="text-[9px] sm:text-[11px] font-bold leading-tight">
                              {subjName}
                            </div>
                            {teachName && (
                              <div className="text-[7px] sm:text-[9px] opacity-80 mt-0.5 truncate">
                                {teachName}
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

      <p className="text-[10px] sm:text-[11px] text-dark-muted mt-3 sm:mt-4 text-right">
        <i className="fas fa-info-circle mr-1" />
        Schedule is subject to change. Contact school for updates.
      </p>
    </div>
  );
};

export default ParentTimetableViewer;
