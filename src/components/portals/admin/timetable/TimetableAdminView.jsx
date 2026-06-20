// src/components/portals/admin/timetable/TimetableAdminView.jsx
import React, { useState, useRef, useEffect } from 'react';
import TimetableOverview from './TimetableOverview';

// Helper to get a consistent color style for a subject name
export const getSubjectColor = (subjectName) => {
  if (!subjectName) return 'bg-light-bg text-dark-soft border-dashed border-light-border';
  const name = subjectName.toLowerCase();

  if (name.includes('quran') || name.includes('tahfeez') || name.includes('arabic')) {
    return 'bg-pine-100 text-pine-900 border-pine-200';
  }
  if (name.includes('math') || name.includes('algebra')) {
    return 'bg-blue-lbg text-blue-dark border-blue-200';
  }
  if (
    name.includes('science') ||
    name.includes('physics') ||
    name.includes('chemistry') ||
    name.includes('biology')
  ) {
    return 'bg-teal-lbg text-teal-dark border-teal-200';
  }
  if (name.includes('english') || name.includes('grammar') || name.includes('literature')) {
    return 'bg-pink-lbg text-pink-deep border-pink-200';
  }
  if (name.includes('computer') || name.includes('coding') || name.includes('it')) {
    return 'bg-brand-lbg text-brand-burnt border-brand-soft';
  }
  if (name.includes('islamic') || name.includes('deeniyat') || name.includes('hadith')) {
    return 'bg-olive-100 text-olive-900 border-olive-200';
  }
  if (name.includes('social') || name.includes('history') || name.includes('geography')) {
    return 'bg-orange-lbg text-orange-dark border-orange-200';
  }

  // Default fallback colors based on string hash
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-indigo-50 text-indigo-900 border-indigo-200',
    'bg-amber-50 text-amber-900 border-amber-200',
    'bg-violet-50 text-violet-900 border-violet-200',
    'bg-cyan-50 text-cyan-900 border-cyan-200',
    'bg-emerald-50 text-emerald-900 border-emerald-200',
  ];
  return colors[Math.abs(hash) % colors.length];
};

// ─── Reusable multi-select dropdown ──────────────────────────────────────────
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedCount = selected.length;

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };
  const clearAll = () => onChange([]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all whitespace-nowrap ${
          selectedCount > 0
            ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
            : 'bg-white border-light-border text-dark-primary hover:border-brand-soft hover:bg-light-lbg'
        }`}
      >
        <i className="fas fa-filter text-[9px]" />
        {label}
        {selectedCount > 0 && (
          <span className="bg-white/30 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ml-0.5">
            {selectedCount}
          </span>
        )}
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[8px] ml-0.5`} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-white border border-light-border rounded-xl shadow-xl overflow-hidden"
          style={{ minWidth: 180, maxWidth: 240 }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-light-border bg-light-lbg/50">
            <span className="text-[10px] font-extrabold text-dark-soft uppercase tracking-wide">
              {label}
            </span>
            {selectedCount > 0 && (
              <button
                onClick={clearAll}
                className="text-[9px] font-bold text-brand-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {options.length === 0 && (
              <div className="px-3 py-4 text-xs text-dark-muted text-center font-semibold">
                No options
              </div>
            )}
            {options.map((opt) => {
              const isChecked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all text-xs font-semibold hover:bg-light-lbg/60 ${
                    isChecked ? 'bg-brand-lbg/20 text-brand-primary' : 'text-dark-primary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(opt.value)}
                    className="rounded text-brand-primary focus:ring-brand-soft w-3.5 h-3.5 shrink-0"
                  />
                  {opt.prefix && (
                    <i
                      className={`fas ${opt.prefix} text-[9px] shrink-0`}
                      style={opt.prefixStyle}
                    />
                  )}
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })}
          </div>
          {selectedCount > 0 && (
            <div className="px-3 py-2 border-t border-light-border bg-light-lbg/30 text-[9px] text-dark-muted font-semibold">
              {selectedCount} of {options.length} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Assignment Popover ──────────────────────────────────────────────────────
const AssignPopover = ({
  popover,
  teachers,
  subjects,
  classes,
  slots,
  assignments,
  onAssign,
  onClose,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const { mode, day, periodId, classId, subjectId, teacherId } = popover;

  // ── Mode: assign teacher (class schedule — subject set, no teacher) ──────────
  if (mode === 'assign_teacher') {
    const subjectName = subjects.find((s) => String(s.id) === String(subjectId))?.name || 'Subject';
    const className = classes.find((c) => String(c.id) === String(classId))?.name || 'Class';

    const qualified = teachers.filter(
      (t) => t.subjects && t.subjects.some((sid) => String(sid) === String(subjectId))
    );

    const options = qualified
      .map((t) => {
        const conflictSlot = slots.find(
          (s) =>
            String(s.teacher_id) === String(t.id) &&
            s.day === day &&
            String(s.period_id) === String(periodId) &&
            String(s.class_id) !== String(classId)
        );
        const isAssignedToClass = assignments.some(
          (a) =>
            String(a.class_id) === String(classId) &&
            String(a.teacher_id) === String(t.id) &&
            String(a.subject_id) === String(subjectId)
        );
        return {
          ...t,
          isBusy: !!conflictSlot,
          conflictClass: conflictSlot
            ? classes.find((c) => String(c.id) === String(conflictSlot.class_id))?.name
            : null,
          isAssignedToClass,
        };
      })
      .sort((a, b) => {
        if (a.isAssignedToClass && !b.isAssignedToClass) return -1;
        if (!a.isAssignedToClass && b.isAssignedToClass) return 1;
        if (a.isBusy && !b.isBusy) return 1;
        if (!a.isBusy && b.isBusy) return -1;
        return a.name.localeCompare(b.name);
      });

    return (
      <div
        ref={ref}
        className="absolute z-50 bg-white border border-light-border rounded-2xl shadow-2xl w-64 overflow-hidden"
        style={{ top: 'calc(100% + 6px)', left: 0 }}
      >
        <div className="bg-brand-primary px-4 py-3 text-white">
          <div className="text-[9px] uppercase tracking-widest font-bold opacity-75 mb-0.5">
            Assign Teacher
          </div>
          <div className="text-xs font-extrabold truncate">
            {className} — {subjectName}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">{day}</div>
        </div>
        <div className="max-h-52 overflow-y-auto divide-y divide-light-border">
          {options.length === 0 && (
            <div className="p-3 text-xs text-dark-muted text-center font-semibold">
              No qualified teachers
            </div>
          )}
          {options.map((t) => (
            <button
              key={t.id}
              disabled={t.isBusy}
              onClick={() => {
                onAssign(classId, day, periodId, subjectId, t.id);
                onClose();
              }}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-all ${
                t.isBusy
                  ? 'opacity-40 cursor-not-allowed bg-light-bg/30'
                  : 'hover:bg-brand-lbg/20 cursor-pointer'
              }`}
            >
              <i
                className={`fas ${t.is_male === false ? 'fa-female text-purple-500' : 'fa-male text-blue-500'} text-xs`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-dark-primary truncate">
                  {t.name}
                  {t.isAssignedToClass && (
                    <span className="ml-1 text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                      Mapped
                    </span>
                  )}
                </div>
                {t.isBusy && (
                  <div className="text-[9px] text-red-primary font-semibold">
                    Busy in {t.conflictClass}
                  </div>
                )}
              </div>
              {!t.isBusy && <i className="fas fa-plus text-brand-primary text-[10px]" />}
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-light-border">
          <button
            onClick={onClose}
            className="w-full text-xs font-bold text-dark-muted hover:text-dark-primary transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Mode: assign class+subject (teacher schedule — free period cell) ──────────
  if (mode === 'assign_class') {
    const teacherObj = teachers.find((t) => String(t.id) === String(teacherId));
    const teacherName = teacherObj?.name || 'Teacher';
    const qualifiedSubjectIds = teacherObj?.subjects || [];

    const [selSubjectId, setSelSubjectId] = useState('');

    const getEligibleClasses = (subId) => {
      if (!subId) return [];
      return classes.filter((cls) => {
        const hasMappedAssignment = assignments.some(
          (a) =>
            String(a.class_id) === String(cls.id) &&
            String(a.subject_id) === String(subId) &&
            String(a.teacher_id) === String(teacherId)
        );
        if (!hasMappedAssignment) return false;
        const alreadyScheduled = slots.some(
          (s) =>
            String(s.class_id) === String(cls.id) &&
            s.day === day &&
            String(s.period_id) === String(periodId)
        );
        return !alreadyScheduled;
      });
    };

    const qualifiedSubjects = subjects.filter((s) =>
      qualifiedSubjectIds.some((sid) => String(sid) === String(s.id))
    );

    const eligibleClasses = getEligibleClasses(selSubjectId);

    return (
      <div
        ref={ref}
        className="absolute z-50 bg-white border border-light-border rounded-2xl shadow-2xl w-72 overflow-hidden"
        style={{ top: 'calc(100% + 6px)', left: 0 }}
      >
        <div
          className={`px-4 py-3 text-white ${teacherObj?.is_male === false ? 'bg-purple-600' : 'bg-blue-700'}`}
        >
          <div className="text-[9px] uppercase tracking-widest font-bold opacity-75 mb-0.5">
            Schedule Class
          </div>
          <div className="text-xs font-extrabold truncate">{teacherName}</div>
          <div className="text-[10px] opacity-75 mt-0.5">{day}</div>
        </div>
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-dark-soft uppercase tracking-wide mb-1">
              Subject
            </label>
            <select
              value={selSubjectId}
              onChange={(e) => setSelSubjectId(e.target.value)}
              className="w-full bg-white border border-light-border rounded-lg px-3 py-1.5 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            >
              <option value="">-- Choose Subject --</option>
              {qualifiedSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {selSubjectId && (
            <div>
              <label className="block text-[10px] font-bold text-dark-soft uppercase tracking-wide mb-1">
                Class
              </label>
              {eligibleClasses.length === 0 ? (
                <p className="text-[10px] text-dark-muted font-semibold italic">
                  No eligible classes for this subject on this day.
                </p>
              ) : (
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                  {eligibleClasses.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => {
                        onAssign(cls.id, day, periodId, selSubjectId, teacherId);
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg border border-light-border hover:bg-brand-lbg/20 hover:border-brand-soft flex items-center justify-between transition-all"
                    >
                      <span className="text-xs font-bold text-dark-primary">{cls.name}</span>
                      <i className="fas fa-plus text-brand-primary text-[10px]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-3 py-2 border-t border-light-border">
          <button
            onClick={onClose}
            className="w-full text-xs font-bold text-dark-muted hover:text-dark-primary transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// ─── Main TimetableAdminView ──────────────────────────────────────────────────
const ALL_VIEWS = ['class', 'teacher', 'unassigned_classes', 'free_teachers', 'assigned_teachers'];

const TimetableAdminView = ({
  classes = [],
  teachers = [],
  subjects = [],
  periods = [],
  slots = [],
  assignments = [],
  onRefresh,
  refreshing = false,
  lockedClassId = '',
  onUpdateSlot = null, // if provided, viewer becomes interactive
  allowedViews = ALL_VIEWS, // restrict visible tabs e.g. ['class'] for teachers
}) => {
  const defaultView = allowedViews[0] || 'class';
  const [viewType, setViewType] = useState(defaultView);
  const [viewObj, setViewObj] = useState({
    icon: 'fa-school',
    label: 'Class Schedule',
  });

  const [selectedId, setSelectedId] = useState('');
  const [showBreaks, setShowBreaks] = useState(true);
  const [popover, setPopover] = useState(null);

  // ── Filter states (lifted from TimetableOverview) ──
  const [selClasses, setSelClasses] = useState([]);
  const [selTeachers, setSelTeachers] = useState([]);
  const [selAssignedTeachers, setSelAssignedTeachers] = useState([]);
  const [selAssignedClasses, setSelAssignedClasses] = useState([]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const visiblePeriods = showBreaks ? periods : periods.filter((p) => !p.is_break);
  const isInteractive = typeof onUpdateSlot === 'function';
  const showTabSwitcher = !lockedClassId && allowedViews.length > 1;

  // ── Filter option lists ──
  const classOptions = [...classes]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ value: String(c.id), label: c.name }));

  const teacherOptions = [...teachers]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({
      value: String(t.id),
      label: t.name,
      prefix: t.is_male === false ? 'fa-female' : 'fa-male',
      prefixStyle: { color: t.is_male === false ? '#F472B6' : '#3B82F6' },
    }));

  // Reset filter state on view change
  useEffect(() => {
    setSelClasses([]);
    setSelTeachers([]);
    setSelAssignedTeachers([]);
    setSelAssignedClasses([]);
  }, [viewType]);

  // Handle default selection
  React.useEffect(() => {
    if (lockedClassId) {
      setViewType('class');
      setViewObj({
        icon: 'fa-school',
        label: 'Class Schedule',
      });
      setSelectedId(lockedClassId);
      return;
    }

    if (viewType === 'class') {
      if (classes.length > 0) {
        setSelectedId(classes[0].id);
      } else {
        setSelectedId('');
      }
    } else if (viewType === 'teacher') {
      if (teachers.length > 0) {
        setSelectedId(teachers[0].id);
      } else {
        setSelectedId('');
      }
    }
  }, [viewType, classes, teachers, lockedClassId]);

  const isGridView = viewType === 'class' || viewType === 'teacher';
  const isOverviewView = !isGridView;

  // Close popover on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setPopover(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handlePrint = () => window.print();

  const getSubjectName = (subId) =>
    subjects.find((s) => String(s.id) === String(subId))?.name || 'Unknown';
  const getTeacherName = (tId) => {
    if (!tId) return 'Not Assigned';
    return teachers.find((t) => String(t.id) === String(tId))?.name || 'Not Assigned';
  };
  const getClassName = (cId) =>
    classes.find((c) => String(c.id) === String(cId))?.name || 'Unknown';

  const getSlotDetails = (day, periodId) => {
    if (!selectedId) return null;
    if (viewType === 'class') {
      return slots.find(
        (s) =>
          String(s.class_id) === String(selectedId) &&
          s.day === day &&
          String(s.period_id) === String(periodId)
      );
    } else {
      return slots.find(
        (s) =>
          String(s.teacher_id) === String(selectedId) &&
          s.day === day &&
          String(s.period_id) === String(periodId)
      );
    }
  };

  const selectedEntityName =
    viewType === 'class' ? getClassName(selectedId) : getTeacherName(selectedId);

  const handleCellClick = (day, period, slot) => {
    if (!isInteractive) return;
    const cellKey = `${day}-${period.id}`;

    if (popover && popover.cellKey === cellKey) {
      setPopover(null);
      return;
    }

    if (viewType === 'class') {
      if (slot && slot.subject_id && !slot.teacher_id) {
        setPopover({
          mode: 'assign_teacher',
          day,
          periodId: period.id,
          classId: selectedId,
          subjectId: slot.subject_id,
          cellKey,
        });
      }
    } else {
      if (!slot || !slot.subject_id) {
        setPopover({
          mode: 'assign_class',
          day,
          periodId: period.id,
          teacherId: selectedId,
          cellKey,
        });
      }
    }
  };

  const handleAssign = (classId, day, periodId, subjectId, teacherId) => {
    if (onUpdateSlot) {
      onUpdateSlot(classId, day, periodId, subjectId, teacherId);
    }
    setPopover(null);
  };

  // Active filter count for overview views
  const hasActiveFilters =
    selClasses.length > 0 ||
    selTeachers.length > 0 ||
    selAssignedTeachers.length > 0 ||
    selAssignedClasses.length > 0;

  return (
    <div className="w-full bg-white border border-light-border rounded-3xl shadow-sm p-4 sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0 print:border-none print:shadow-none">
      {/* ── Header ── */}
      <div className="pb-2 border-b border-light-border mb-4 print:hidden">
        {/* Row 1: Title + Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
          <div>
            <h3 className="text-xl sm:text-xl font-extrabold text-dark-primary flex items-center gap-2">
              <i className={`fas ${viewObj.icon} text-brand-primary`}></i>
              {lockedClassId
                ? `Class Schedule — ${getClassName(selectedId)}`
                : `${viewObj.label} View`}
            </h3>
            <p className="text-sm  mt-0.5">
              {lockedClassId
                ? 'Weekly class schedule.'
                : isInteractive
                  ? `Admin view to manage timetable quickly`
                  : 'View schedules dynamically by Class or Teacher.'}
            </p>
          </div>

          {/*Filters (only for overview views) */}
          {isOverviewView && (
            <div className="flex flex-wrap items-center gap-2">
              {viewType === 'unassigned_classes' && (
                <MultiSelectDropdown
                  label="Classes"
                  options={classOptions}
                  selected={selClasses}
                  onChange={setSelClasses}
                />
              )}
              {viewType === 'free_teachers' && (
                <MultiSelectDropdown
                  label="Teachers"
                  options={teacherOptions}
                  selected={selTeachers}
                  onChange={setSelTeachers}
                />
              )}
              {viewType === 'assigned_teachers' && (
                <>
                  <MultiSelectDropdown
                    label="Teachers"
                    options={teacherOptions}
                    selected={selAssignedTeachers}
                    onChange={setSelAssignedTeachers}
                  />
                  <MultiSelectDropdown
                    label="Classes"
                    options={classOptions}
                    selected={selAssignedClasses}
                    onChange={setSelAssignedClasses}
                  />
                </>
              )}
            </div>
          )}

          {!lockedClassId && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Entity selector — only for grid views */}
              {viewType === 'class' && (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="bg-white border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary focus:ring-2 focus:ring-brand-soft outline-none min-w-[140px]"
                >
                  {classes.length === 0 ? (
                    <option value="">No Classes</option>
                  ) : (
                    [...classes]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))
                  )}
                </select>
              )}
              {viewType === 'teacher' && (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="bg-white border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary focus:ring-2 focus:ring-brand-soft outline-none min-w-[140px]"
                >
                  {teachers.length === 0 ? (
                    <option value="">No Teachers</option>
                  ) : (
                    [...teachers]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))
                  )}
                </select>
              )}
            </div>
          )}

          {/* Row 3: Tab switcher + entity selector */}
          {!lockedClassId && (
            <div className="flex flex-wrap items-center gap-2">
              {/* 5-mode view switcher */}
              {showTabSwitcher && (
                <div className="bg-light-lbg p-1 rounded-xl flex flex-wrap border border-light-border gap-0.5">
                  {[
                    { id: 'class', label: 'Class Schedule', icon: 'fa-building' },
                    { id: 'teacher', label: 'Teacher Schedule', icon: 'fa-user' },
                    { id: 'unassigned_classes', label: 'Unassigned Classes', icon: 'fa-school' },
                    { id: 'free_teachers', label: 'Free Teachers', icon: 'fa-user-clock' },
                    {
                      id: 'assigned_teachers',
                      label: 'Assigned Teachers',
                      icon: 'fa-chalkboard-teacher',
                    },
                  ]
                    .filter((v) => allowedViews.includes(v.id))
                    .map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setViewType(v.id);
                          setViewObj(v);
                        }}
                        title={v.label}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                          viewType === v.id
                            ? 'bg-white text-brand-primary shadow-sm'
                            : 'text-dark-soft hover:text-dark-primary'
                        }`}
                      >
                        <i className={`fas ${v.icon} text-[10px]`} />
                        {v.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Icon-only action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Show Breaks — icon toggle, only for grid views */}
            <button
              onClick={() => setShowBreaks((v) => !v)}
              title={showBreaks ? 'Hide Breaks' : 'Show Breaks'}
              className={`p-2 rounded-lg border transition-all ${
                showBreaks
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'bg-light-bg border-light-border text-dark-soft hover:bg-light-ui hover:text-dark-primary'
              }`}
            >
              <i className="fas fa-coffee text-sm" />
            </button>

            {/* Print — only for grid views */}
            {isGridView && (
              <button
                onClick={handlePrint}
                disabled={!selectedId}
                title="Print / Save as PDF"
                className="p-2 rounded-lg border border-light-border bg-light-bg text-dark-soft hover:bg-light-ui hover:text-dark-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-print text-sm" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-6 text-center">
        <h2 className="text-2xl font-bold text-black mb-1">JAMIA ZAYTOONAH VELLORE</h2>
        <h3 className="text-lg font-bold text-gray-800">
          Weekly Timetable — {viewType === 'class' ? 'Class' : 'Teacher'}: {selectedEntityName}
        </h3>
        <p className="text-xs text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* ── Overview sub-views ── */}
      {isOverviewView && (
        <TimetableOverview
          view={viewType}
          showBreaks={showBreaks}
          classes={classes}
          teachers={teachers}
          subjects={subjects}
          periods={periods}
          slots={slots}
          assignments={assignments}
          selClasses={selClasses}
          selTeachers={selTeachers}
          selAssignedTeachers={selAssignedTeachers}
          selAssignedClasses={selAssignedClasses}
        />
      )}

      {/* ── Grid views ── */}
      {isGridView && !selectedId ? (
        <div className="text-center py-12">
          <div className="text-4xl text-light-muted mb-3">
            <i className="fas fa-calendar-times"></i>
          </div>
          <p className="text-dark-soft text-lg font-semibold">No data selected to display</p>
          <p className="text-dark-muted text-sm mt-1">
            Please configure and select a class or teacher.
          </p>
        </div>
      ) : isGridView && visiblePeriods.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl text-light-muted mb-3">
            <i className="fas fa-cogs"></i>
          </div>
          <p className="text-dark-soft text-lg font-semibold">No periods configured</p>
          <p className="text-dark-muted text-sm mt-1">Please set up periods in the setup tabs.</p>
        </div>
      ) : isGridView ? (
        <div className="w-full overflow-x-auto rounded-2xl border border-light-border shadow-sm print:overflow-visible print:border-none print:shadow-none">
          <table className="w-full border-collapse min-w-[900px] print:min-w-full">
            <thead>
              <tr className="bg-light-lbg print:bg-gray-100 border-b border-light-border">
                <th className="py-4 px-4 text-left font-bold text-xs text-dark-primary tracking-wider uppercase border-r border-light-border w-[120px] print:text-black">
                  Day
                </th>
                {visiblePeriods.map((period) => (
                  <th
                    key={period.id || period.period_number}
                    className="py-3 px-3 text-center border-r border-light-border last:border-r-0 print:text-black"
                  >
                    <div className="font-extrabold text-sm text-dark-deepblue">
                      {period.name || `Period ${period.period_number}`}
                    </div>
                    {period.start_time && period.end_time && (
                      <div className="text-[10px] text-dark-soft font-semibold mt-0.5 print:text-gray-500">
                        {period.start_time} - {period.end_time}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr
                  key={day}
                  className="border-b border-light-border last:border-b-0 hover:bg-light-bg/40 transition-colors"
                >
                  <td className="py-4 px-4 font-bold text-sm text-dark-deepblue border-r border-light-border bg-light-lbg/30 print:bg-gray-50 print:text-black w-[120px]">
                    {day}
                  </td>
                  {visiblePeriods.map((period) => {
                    const isBreak = period.is_break;
                    const slot = getSlotDetails(day, period.id);
                    const isAssigned = slot && slot.subject_id;
                    const subjectName = isAssigned ? getSubjectName(slot.subject_id) : '';
                    const isTeacherAssigned = slot && slot.teacher_id;
                    const teacher = isTeacherAssigned
                      ? teachers.find((t) => String(t.id) === String(slot.teacher_id))
                      : null;
                    const isFemale = teacher && teacher.is_male === false;

                    let colorClass = '';
                    if (isAssigned) {
                      if (!isTeacherAssigned) {
                        colorClass = getSubjectColor(subjectName);
                      } else if (isFemale) {
                        colorClass = 'bg-purple-100 text-purple-900 border-purple-200';
                      } else {
                        colorClass = 'bg-blue-lbg text-blue-dark border-blue-200';
                      }
                    }

                    const cellKey = `${day}-${period.id}`;
                    const isPopoverOpen = popover && popover.cellKey === cellKey;
                    const isClickable =
                      isInteractive &&
                      !isBreak &&
                      ((viewType === 'class' && isAssigned && !isTeacherAssigned) ||
                        (viewType === 'teacher' && (!slot || !slot.subject_id)));

                    if (isBreak) {
                      const nameLower = (period.name || 'Break').toLowerCase();
                      let breakIcon = 'fa-coffee';
                      if (
                        nameLower.includes('salah') ||
                        nameLower.includes('prayer') ||
                        nameLower.includes('namaz') ||
                        nameLower.includes('zohr') ||
                        nameLower.includes('asr')
                      ) {
                        breakIcon = 'fa-mosque';
                      } else if (
                        nameLower.includes('lunch') ||
                        nameLower.includes('breakfast') ||
                        nameLower.includes('recess') ||
                        nameLower.includes('tea') ||
                        nameLower.includes('snack') ||
                        nameLower.includes('food') ||
                        nameLower.includes('tiffin')
                      ) {
                        breakIcon = 'fa-utensils';
                      }

                      return (
                        <td
                          key={period.id || period.period_number}
                          className="p-2 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] bg-light-bg/5"
                        >
                          <div className="w-full h-full rounded-xl border border-light-border bg-light-bg/15 flex flex-col items-center justify-center text-[10px] text-dark-muted font-bold">
                            <i className={`fas ${breakIcon} mb-1 text-xs text-brand-soft`}></i>
                            {period.name || 'Break'}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={period.id || period.period_number}
                        className={`p-2 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] relative ${
                          isClickable ? 'cursor-pointer hover:bg-light-bg/30' : ''
                        } ${isPopoverOpen ? 'bg-brand-lbg/10' : ''}`}
                        onClick={() => isClickable && handleCellClick(day, period, slot)}
                      >
                        {isAssigned ? (
                          <div
                            className={`w-full h-full rounded-xl p-2 border flex flex-col justify-center gap-0.5 shadow-sm transition-all duration-300 ${colorClass} ${isClickable ? 'hover:scale-95 hover:shadow-md' : ''} ${isPopoverOpen ? 'ring-2 ring-brand-primary ring-offset-1' : ''}`}
                          >
                            <span className="font-extrabold text-xs tracking-wide uppercase truncate">
                              {subjectName}
                            </span>
                            {viewType === 'class' ? (
                              !isTeacherAssigned ? (
                                <span className="text-[10px] font-bold text-red-primary flex items-center justify-center gap-1 truncate">
                                  <i className="fas fa-exclamation-triangle text-[9px] animate-pulse"></i>
                                  {isInteractive ? 'Click to assign teacher' : 'Not Assigned'}
                                </span>
                              ) : (
                                <span className="text-[10px] opacity-90 font-bold truncate">
                                  <i
                                    className={`fas ${isFemale ? 'fa-female' : 'fa-male'} mr-1 text-[9px]`}
                                  ></i>
                                  {getTeacherName(slot.teacher_id)}
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] opacity-90 font-bold truncate">
                                <i className="fas fa-school mr-1 text-[9px]"></i>
                                {getClassName(slot.class_id)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`w-full h-full rounded-xl border border-dashed flex items-center justify-center text-[10px] font-bold transition-all ${
                              isClickable
                                ? 'border-brand-soft text-brand-primary bg-brand-lbg/10 hover:bg-brand-lbg/25 hover:border-brand-primary'
                                : 'border-light-border text-dark-muted bg-light-bg/20'
                            } ${isPopoverOpen ? 'ring-2 ring-brand-primary ring-offset-1' : ''}`}
                          >
                            {isClickable ? (
                              <span className="flex items-center gap-1">
                                <i className="fas fa-plus text-[9px]" />
                                Schedule
                              </span>
                            ) : (
                              'Free'
                            )}
                          </div>
                        )}

                        {/* Inline Popover */}
                        {isPopoverOpen && (
                          <AssignPopover
                            popover={popover}
                            teachers={teachers}
                            subjects={subjects}
                            classes={classes}
                            slots={slots}
                            assignments={assignments}
                            onAssign={handleAssign}
                            onClose={() => setPopover(null)}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default TimetableAdminView;
