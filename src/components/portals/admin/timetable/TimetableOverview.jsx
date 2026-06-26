// src/components/portals/admin/timetable/TimetableOverview.jsx
import React, { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

// ─── Per-teacher color palette ───────────────────────────────────────────────
const TEACHER_PALETTES = [
  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  { bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF' },
  { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  { bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD' },
  { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' },
  { bg: '#F7FEE7', text: '#3F6212', border: '#D9F99D' },
  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  { bg: '#F0FDFA', text: '#115E59', border: '#99F6E4' },
];

const getTeacherPalette = (teacherId) => {
  let hash = 0;
  const str = String(teacherId);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return TEACHER_PALETTES[Math.abs(hash) % TEACHER_PALETTES.length];
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TimetableOverview = ({
  view = 'unassigned_classes',
  showBreaks = true,
  setShowBreaks,
  classes = [],
  teachers = [],
  subjects = [],
  periods = [],
  slots = [],
  assignments = [],
  // Filter props (lifted to parent TimetableAdminView)
  selClasses = [],
  selTeachers = [],
  selAssignedTeachers = [],
  selAssignedClasses = [],
  freeTeachersGender = 'all',
  assignedTeachersGender = 'all',
}) => {
  const visiblePeriods = showBreaks ? periods : periods.filter((p) => !p.is_break);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getSubjectName = (id) => subjects.find((s) => String(s.id) === String(id))?.name || '?';
  const getTeacherName = (id) => teachers.find((t) => String(t.id) === String(id))?.name || '?';
  const getClassName = (id) => classes.find((c) => String(c.id) === String(id))?.name || '?';

  const getSlot = (classId, day, periodId) =>
    slots.find(
      (s) =>
        String(s.class_id) === String(classId) &&
        s.day === day &&
        String(s.period_id) === String(periodId)
    );

  // ─── Data builders ────────────────────────────────────────────────────────
  const getUnassignedClasses = (day, periodId) =>
    classes.flatMap((cls) => {
      const slot = getSlot(cls.id, day, periodId);
      if (slot && slot.subject_id && !slot.teacher_id) {
        const subjectObj = subjects.find((s) => String(s.id) === String(slot.subject_id));
        if (subjectObj && subjectObj.requires_teacher === false) return [];
        return [{ class: cls, subjectName: getSubjectName(slot.subject_id) }];
      }
      return [];
    });

  const getFreeTeachers = (day, periodId) =>
    teachers.filter(
      (t) =>
        !slots.some(
          (s) =>
            s.day === day &&
            String(s.period_id) === String(periodId) &&
            String(s.teacher_id) === String(t.id)
        )
    );

  const getAssignedTeachers = (day, periodId) =>
    slots
      .filter(
        (s) =>
          s.day === day && String(s.period_id) === String(periodId) && s.teacher_id && s.subject_id
      )
      .map((s) => ({
        teacherName: getTeacherName(s.teacher_id),
        className: getClassName(s.class_id),
        subjectName: getSubjectName(s.subject_id),
        teacherId: s.teacher_id,
        classId: s.class_id,
        isFemale: teachers.find((t) => String(t.id) === String(s.teacher_id))?.is_male === false,
        palette: getTeacherPalette(s.teacher_id),
      }));

  // ─── Summary stats (global, for the header strip) ─────────────────────────
  const nonBreakPeriods = periods.filter((p) => !p.is_break);
  const totalSlots = classes.length * DAYS.length * nonBreakPeriods.length;
  const assignedCount = slots.filter(
    (s) =>
      s.subject_id &&
      s.teacher_id &&
      !periods.find((p) => String(p.id) === String(s.period_id))?.is_break
  ).length;
  const subjectOnlyCount = slots.filter(
    (s) =>
      s.subject_id &&
      !s.teacher_id &&
      !periods.find((p) => String(p.id) === String(s.period_id))?.is_break
  ).length;
  const unscheduledCount = totalSlots - assignedCount - subjectOnlyCount;

  // ─── View meta ────────────────────────────────────────────────────────────
  const VIEW_META = {
    unassigned_classes: {
      icon: 'fa-school',
      label: 'Unassigned Classes',
      desc: 'Classes with a subject set but no teacher',
      stripBg: 'bg-amber-50',
      stripBorder: 'border-amber-200',
      stripIcon: 'text-amber-600',
      stripText: 'text-amber-800',
    },
    free_teachers: {
      icon: 'fa-user-clock',
      label: 'Free Teachers',
      desc: 'Teachers not assigned to any class during this slot',
      stripBg: 'bg-teal-50',
      stripBorder: 'border-teal-200',
      stripIcon: 'text-teal-600',
      stripText: 'text-teal-800',
    },
    assigned_teachers: {
      icon: 'fa-chalkboard-teacher',
      label: 'Assigned Teachers',
      desc: 'All active teacher → class assignments per slot',
      stripBg: 'bg-blue-50',
      stripBorder: 'border-blue-200',
      stripIcon: 'text-blue-600',
      stripText: 'text-blue-800',
    },
  };
  const meta = VIEW_META[view] || VIEW_META.unassigned_classes;

  // ─── Per-teacher swatches for legend (assigned view) ─────────────────────
  const uniqueTeachersInSlots = [
    ...new Map(
      slots
        .filter(
          (s) =>
            s.teacher_id &&
            s.subject_id &&
            !periods.find((p) => String(p.id) === String(s.period_id))?.is_break
        )
        .map((s) => [String(s.teacher_id), s.teacher_id])
    ).values(),
  ]
    .map((tid) => {
      const t = teachers.find((x) => String(x.id) === String(tid));
      return t
        ? { id: tid, name: t.name, isFemale: t.is_male === false, palette: getTeacherPalette(tid) }
        : null;
    })
    .filter(Boolean)
    .filter((t) => {
      if (selAssignedTeachers.length > 0 && !selAssignedTeachers.includes(String(t.id))) return false;
      if (assignedTeachersGender === 'male' && t.isFemale) return false;
      if (assignedTeachersGender === 'female' && !t.isFemale) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // ─── Cell renderer ────────────────────────────────────────────────────────
  const renderCell = (day, period) => {
    if (period.is_break) {
      const nl = (period.name || '').toLowerCase();
      const icon =
        nl.includes('salah') || nl.includes('prayer') || nl.includes('namaz')
          ? 'fa-mosque'
          : nl.includes('lunch') || nl.includes('food') || nl.includes('recess')
            ? 'fa-utensils'
            : 'fa-coffee';
      return (
        <td
          key={period.id}
          className="p-2 border-r border-light-border last:border-r-0 text-center bg-light-bg/5"
          style={{ minWidth: 120, height: 80 }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-dark-muted font-bold rounded-xl border border-dashed border-light-border bg-light-bg/20">
            <i className={`fas ${icon} text-xs text-brand-soft mb-0.5`} />
            {period.name || 'Break'}
          </div>
        </td>
      );
    }

    // ── Unassigned Classes ──
    if (view === 'unassigned_classes') {
      const raw = getUnassignedClasses(day, period.id);
      const items =
        selClasses.length > 0
          ? raw.filter((item) => selClasses.includes(String(item.class.id)))
          : raw;
      const allGood = raw.length === 0;

      return (
        <td
          key={period.id}
          className="p-2 border-r border-light-border last:border-r-0 align-top"
          style={{ minWidth: 130, verticalAlign: 'top' }}
        >
          {allGood ? (
            <div className="flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl bg-emerald-50 border border-emerald-200">
              <i className="fas fa-check-circle text-emerald-500 text-base" />
              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide">
                All Assigned
              </span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center min-h-[56px] rounded-xl border border-dashed border-amber-200 bg-amber-50/30">
              <span className="text-[9px] text-amber-400 font-semibold italic">filtered out</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 min-h-[56px]">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1"
                >
                  <i className="fas fa-exclamation-circle text-amber-500 text-[9px] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-extrabold text-[9px] text-amber-900 truncate leading-tight">
                      {item.class.name}
                    </div>
                    <div className="text-[8px] font-semibold text-amber-700 truncate leading-tight opacity-80">
                      {item.subjectName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </td>
      );
    }

    // ── Free Teachers ──
    if (view === 'free_teachers') {
      const raw = getFreeTeachers(day, period.id);
      let freeList =
        selTeachers.length > 0 ? raw.filter((t) => selTeachers.includes(String(t.id))) : raw;
      if (freeTeachersGender === 'male') {
        freeList = freeList.filter((t) => t.is_male !== false);
      } else if (freeTeachersGender === 'female') {
        freeList = freeList.filter((t) => t.is_male === false);
      }
      const allBusy = raw.length === 0;

      return (
        <td
          key={period.id}
          className="p-2 border-r border-light-border last:border-r-0 align-top"
          style={{ minWidth: 130, verticalAlign: 'top' }}
        >
          {allBusy ? (
            <div className="flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl bg-red-50 border border-red-200">
              <i className="fas fa-times-circle text-red-400 text-base" />
              <span className="text-[9px] font-bold text-red-700 uppercase tracking-wide">
                All Busy
              </span>
            </div>
          ) : freeList.length === 0 ? (
            <div className="flex items-center justify-center min-h-[56px] rounded-xl border border-dashed border-teal-200 bg-teal-50/30">
              <span className="text-[9px] text-teal-400 font-semibold italic">filtered out</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 min-h-[56px]">
              {freeList.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 border ${
                    t.is_male === false
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-teal-50 border-teal-200'
                  }`}
                >
                  <i
                    className={`fas ${t.is_male === false ? 'fa-female' : 'fa-male'} text-[9px] shrink-0`}
                    style={{ color: t.is_male === false ? '#F472B6' : '#14B8A6' }}
                  />
                  <span
                    className={`font-bold text-[9px] truncate ${t.is_male === false ? 'text-purple-900' : 'text-teal-900'}`}
                  >
                    {t.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </td>
      );
    }

    // ── Assigned Teachers ──
    if (view === 'assigned_teachers') {
      const raw = getAssignedTeachers(day, period.id);
      let items = raw;
      if (selAssignedTeachers.length > 0)
        items = items.filter((a) => selAssignedTeachers.includes(String(a.teacherId)));
      if (selAssignedClasses.length > 0)
        items = items.filter((a) => selAssignedClasses.includes(String(a.classId)));
      if (assignedTeachersGender === 'male') {
        items = items.filter((a) => a.isFemale === false);
      } else if (assignedTeachersGender === 'female') {
        items = items.filter((a) => a.isFemale === true);
      }

      return (
        <td
          key={period.id}
          className="p-2 border-r border-light-border last:border-r-0 align-top"
          style={{ minWidth: 140, verticalAlign: 'top' }}
        >
          {items.length === 0 ? (
            <div className="flex items-center justify-center min-h-[56px] rounded-xl border border-dashed border-light-border">
              <span className="text-[9px] text-dark-muted font-semibold">—</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 min-h-[56px]">
              {items.map((a, i) => {
                const p = a.palette;
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: p.bg,
                      borderColor: p.border,
                      borderLeftColor: a.isFemale ? '#F472B6' : '#3B82F6',
                      borderLeftWidth: 3,
                      borderWidth: 1,
                      borderStyle: 'solid',
                    }}
                    className="rounded-lg px-2 py-1"
                  >
                    <div className="flex items-center gap-1">
                      <i
                        className={`fas ${a.isFemale ? 'fa-female' : 'fa-male'} text-[8px] shrink-0`}
                        style={{ color: a.isFemale ? '#F472B6' : '#3B82F6' }}
                      />
                      <span
                        className="font-extrabold text-[9px] truncate leading-tight"
                        style={{ color: p.text }}
                      >
                        {a.teacherName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 pl-3">
                      <span className="text-[8px] font-semibold text-dark-soft truncate">
                        {a.subjectName}{' '}
                        <i className="fas fa-arrow-right text-[7px] text-dark-muted" />{' '}
                        {a.className}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </td>
      );
    }

    return <td key={period.id} />;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {visiblePeriods.length === 0 ? (
        <div className="text-center py-16 bg-white border border-light-border rounded-3xl">
          <i className="fas fa-cogs text-4xl text-light-muted mb-3 block" />
          <p className="text-dark-soft font-semibold">No periods configured.</p>
        </div>
      ) : (
        <div className="bg-white border border-light-border rounded-3xl overflow-hidden shadow-sm">
          {/* ── Table — header aligned to match Class Schedule style ── */}
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="table-sticky-header">
                <tr className="bg-light-lbg border-b border-light-border">
                  <th
                    className="py-4 px-4 text-left font-bold text-xs text-dark-primary tracking-wider uppercase border-r border-light-border table-sticky-col table-sticky-intersection bg-light-lbg"
                    style={{ minWidth: 120 }}
                  >
                    Day
                  </th>
                  {visiblePeriods.map((period) => (
                    <th
                      key={period.id}
                      className={`py-3 px-3 text-center border-r border-light-border last:border-r-0 ${period.is_break ? 'bg-light-bg/30' : ''}`}
                      style={{ minWidth: 130 }}
                    >
                      <div className="font-extrabold text-sm text-dark-deepblue">
                        {period.name || `Period ${period.period_number}`}
                      </div>
                      {period.start_time && period.end_time && (
                        <div className="text-[10px] text-dark-soft font-semibold mt-0.5">
                          {period.start_time} - {period.end_time}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr
                    key={day}
                    className="border-b border-light-border last:border-b-0 hover:bg-light-bg/20 transition-colors bg-white"
                  >
                    <td
                      className="py-4 px-4 font-bold text-sm text-dark-deepblue border-r border-light-border bg-white table-sticky-col"
                      style={{ minWidth: 120 }}
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{DAY_SHORT[day]}</span>
                    </td>
                    {visiblePeriods.map((period) => renderCell(day, period))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Legend footer ── */}
          <div className="px-5 py-3 border-t border-light-border bg-light-bg/20 flex flex-wrap gap-3 items-center">
            {view === 'unassigned_classes' && (
              <>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-soft">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  All classes assigned
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-soft">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  Subject set, no teacher
                </div>
              </>
            )}
            {view === 'free_teachers' && (
              <>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-soft">
                  <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                  All teachers busy
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-soft">
                  <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
                  Male free
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-soft">
                  <span className="w-3 h-3 rounded-full bg-pink-400 inline-block" />
                  Female free
                </div>
              </>
            )}
            {view === 'assigned_teachers' && (
              <>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-soft">
                  <span className="w-3 h-3 rounded-full bg-pink-400 inline-block" />
                  Female (pink border)
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-soft">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                  Male (blue border)
                </div>
                {uniqueTeachersInSlots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-2 border-l border-light-border pl-2">
                    {uniqueTeachersInSlots.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border"
                        style={{
                          backgroundColor: t.palette.bg,
                          color: t.palette.text,
                          borderColor: t.palette.border,
                          borderLeftColor: t.isFemale ? '#F472B6' : '#3B82F6',
                          borderLeftWidth: 3,
                        }}
                      >
                        <i
                          className={`fas ${t.isFemale ? 'fa-female' : 'fa-male'} text-[8px]`}
                          style={{ color: t.isFemale ? '#F472B6' : '#3B82F6' }}
                        />
                        {t.name}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableOverview;
