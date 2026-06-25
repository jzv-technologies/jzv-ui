// src/components/portals/admin/timetable/TimetableAdminView.jsx
import React, { useState, useRef, useEffect } from 'react';
import TimetableOverview from './TimetableOverview';
import TimetableScheduler from './TimetableScheduler';
import ConfirmModal from '../../../ConfirmModal';
import { renderSubjectOptionsGroupedByClassification } from './TimetableSetupTabs';

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

// ─── Reusable single-select dropdown ─────────────────────────────────────────
const SingleSelectDropdown = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(selected));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all bg-white border-light-border text-dark-primary hover:border-brand-soft hover:bg-light-lbg min-w-[150px] shadow-sm"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : label}</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[8px] ml-2 text-dark-soft`} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-white border border-light-border rounded-2xl shadow-xl overflow-hidden divide-y divide-light-border"
          style={{ minWidth: 220 }}
        >
          <div className="max-h-60 overflow-y-auto">
            {options.length === 0 && (
              <div className="px-3 py-4 text-xs text-dark-muted text-center font-semibold">
                No options
              </div>
            )}
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(selected);
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 transition-all flex flex-col justify-center gap-0.5 border-none outline-none ${
                    isSelected
                      ? 'bg-brand-lbg/30 text-brand-primary font-bold'
                      : 'text-dark-primary hover:bg-light-lbg/60'
                  }`}
                >
                  <span className="text-xs font-extrabold">{opt.label}</span>
                  {opt.subLabel && (
                    <span className="text-[10px] text-dark-muted font-semibold">
                      {opt.subLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  classifications = [],
  classes,
  slots,
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  assignments,
  onAssign,
  onClose,
}) => {
  const ref = useRef(null);
  
  const [selSubjectId, setSelSubjectId] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedNewClassId, setSelectedNewClassId] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (popover) {
      setSelSubjectId('');
      setSelectedClassId('');
      setSelectedNewClassId('');
      if (popover.day) {
        setSelectedDays([popover.day]);
      } else {
        setSelectedDays([]);
      }
    }
  }, [popover]);

  const { mode, day, periodId, classId, subjectId, teacherId } = popover;

  const getEligibleClasses = (subId, tId) => {
    if (!subId) return [];
    return classes
      .map((cls) => {
        const hasMappedAssignment = assignments.some(
          (a) =>
            String(a.class_id) === String(cls.id) &&
            String(a.subject_id) === String(subId) &&
            String(a.teacher_id) === String(tId)
        );
        return {
          ...cls,
          isMapped: hasMappedAssignment,
        };
      })
      .sort((a, b) => {
        if (a.isMapped && !b.isMapped) return -1;
        if (!a.isMapped && b.isMapped) return 1;
        return a.name.localeCompare(b.name);
      });
  };

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
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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

  // ── Mode: unassign teacher (teacher schedule — assigned cell click) ──────────
  if (mode === 'unassign_teacher') {
    const teacherObj = teachers.find((t) => String(t.id) === String(teacherId));
    const teacherName = teacherObj?.name || 'Teacher';
    const className = classes.find((c) => String(c.id) === String(classId))?.name || 'Class';
    const subjectName = subjects.find((s) => String(s.id) === String(subjectId))?.name || 'Subject';

    const scheduledDays = slots
      .filter(
        (s) =>
          String(s.class_id) === String(classId) &&
          String(s.period_id) === String(periodId) &&
          String(s.teacher_id) === String(teacherId)
      )
      .map((s) => s.day);

    const eligibleClasses = getEligibleClasses(subjectId, teacherId).filter(
      (cls) => String(cls.id) !== String(classId)
    );

    return (
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute z-50 bg-white border border-light-border rounded-2xl shadow-2xl w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ top: 'calc(100% + 6px)', left: 0 }}
      >
        <div className="bg-red-600 px-4 py-3 text-white">
          <div className="text-[9px] uppercase tracking-widest font-bold opacity-75 mb-0.5">
            Unassign Teacher
          </div>
          <div className="text-xs font-extrabold truncate">{teacherName}</div>
          <div className="text-[10px] opacity-75 mt-0.5 font-semibold">
            {className} — {subjectName}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs font-semibold text-dark-soft">
            Choose whether to unassign this teacher from this slot for <strong>{day}</strong> only,
            or for <strong>all days</strong> of this weekly period.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onAssign(classId, day, periodId, subjectId, null);
                onClose();
              }}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Unassign for {day} Only
            </button>
            <button
              onClick={() => {
                onAssign(classId, scheduledDays, periodId, subjectId, null);
                onClose();
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Unassign for All Days ({scheduledDays.join(', ')})
            </button>
          </div>
        </div>

        {/* Change Class Section */}
        <div className="p-4 border-t border-light-border bg-gray-50/50 space-y-3">
          <h4 className="text-[10px] font-bold text-dark-soft uppercase tracking-wide">
            Change Class
          </h4>
          {eligibleClasses.length === 0 ? (
            <p className="text-[10px] text-dark-muted font-semibold italic">
              No other eligible classes for this subject.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1 max-h-28 overflow-y-auto p-0.5">
                {eligibleClasses.map((cls) => {
                  const isSelected = String(selectedNewClassId) === String(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedNewClassId(cls.id)}
                      className={`text-center px-1.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                        isSelected
                          ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                          : 'border-light-border bg-white hover:bg-brand-lbg/10 hover:border-brand-soft cursor-pointer text-dark-primary'
                      }`}
                    >
                      <div className="truncate" title={cls.name}>{cls.name}</div>
                    </button>
                  );
                })}
              </div>

              {selectedNewClassId && (
                <button
                  type="button"
                  onClick={() => {
                    // First unassign from the old class for this day
                    onAssign(classId, day, periodId, null, null);
                    // Then assign to the new class for this day
                    onAssign(selectedNewClassId, day, periodId, subjectId, teacherId);
                    onClose();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-exchange-alt"></i> Confirm Change
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-3 py-2 border-t border-light-border bg-white">
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

    const qualifiedSubjects = subjects.filter((s) =>
      qualifiedSubjectIds.some((sid) => String(sid) === String(s.id))
    );

    const eligibleClasses = getEligibleClasses(selSubjectId, teacherId);

    return (
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute z-50 bg-white border border-light-border rounded-2xl shadow-2xl w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
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
              onChange={(e) => {
                setSelSubjectId(e.target.value);
                setSelectedClassId(''); // Reset selected class when subject changes
              }}
              className="w-full bg-white border border-light-border rounded-lg px-3 py-1.5 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
            >
              <option value="">-- Choose Subject --</option>
              {renderSubjectOptionsGroupedByClassification(qualifiedSubjects, classifications)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-soft uppercase tracking-wide mb-1.5">
              Days to Schedule
            </label>
            <div className="flex flex-wrap gap-1">
              {days.map((d) => {
                const isSelected = selectedDays.includes(d);
                const isBusyOnDay = slots.some(
                  (s) =>
                    String(s.teacher_id) === String(teacherId) &&
                    s.day === d &&
                    String(s.period_id) === String(periodId)
                );
                return (
                  <label
                    key={d}
                    className={`flex items-center justify-center px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-primary border-brand-primary text-white'
                        : 'bg-white border-light-border text-dark-primary hover:bg-light-lbg'
                    } ${isBusyOnDay && !isSelected ? 'opacity-50' : ''}`}
                    title={isBusyOnDay ? `Busy on ${d}` : ''}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedDays((prev) =>
                          prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                        );
                      }}
                      className="hidden"
                    />
                    <span>{d.substring(0, 3)}</span>
                    {isBusyOnDay && (
                      <span className={`text-[8px] ml-0.5 ${isSelected ? 'text-white/80' : 'text-red-primary'} font-bold`}>
                        (Busy)
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {selSubjectId && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-dark-soft uppercase tracking-wide mb-1">
                  Class
                </label>
                {eligibleClasses.length === 0 ? (
                  <p className="text-[10px] text-dark-muted font-semibold italic">
                    No eligible classes for this subject.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto p-0.5">
                    {eligibleClasses.map((cls) => {
                      const isSelected = String(selectedClassId) === String(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          disabled={selectedDays.length === 0}
                          onClick={() => setSelectedClassId(cls.id)}
                          className={`text-center px-1.5 py-2 rounded-lg border text-[10px] font-bold transition-all relative ${
                            selectedDays.length === 0
                              ? 'opacity-40 cursor-not-allowed bg-light-bg/25 border-light-border'
                              : isSelected
                              ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                              : 'border-light-border bg-white hover:bg-brand-lbg/10 hover:border-brand-soft cursor-pointer text-dark-primary'
                          }`}
                        >
                          <div className="truncate" title={cls.name}>{cls.name}</div>
                          {cls.isMapped && !isSelected && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-white" title="Mapped" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedClassId && (
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onAssign(selectedClassId, selectedDays, periodId, selSubjectId, teacherId);
                      onClose();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <i className="fas fa-plus-circle"></i> Add Schedule
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-3 py-2 border-t border-light-border bg-white">
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
const ALL_VIEWS = [
  'scheduler',
  'teacher',
  'unassigned_classes',
  'free_teachers',
  'assigned_teachers',
];

const viewOptionsMap = {
  scheduler: { id: 'scheduler', label: 'Scheduler Grid', icon: 'fa-th-large' },
  class: { id: 'class', label: 'Class Schedule', icon: 'fa-building' },
  teacher: { id: 'teacher', label: 'Teacher Schedule', icon: 'fa-user' },
  unassigned_classes: { id: 'unassigned_classes', label: 'Unassigned Classes', icon: 'fa-school' },
  free_teachers: { id: 'free_teachers', label: 'Free Teachers', icon: 'fa-user-clock' },
  assigned_teachers: {
    id: 'assigned_teachers',
    label: 'Assigned Teachers',
    icon: 'fa-chalkboard-teacher',
  },
};

const TimetableAdminView = ({
  classes = [],
  teachers = [],
  subjects = [],
  classifications = [],
  periods = [],
  slots = [],
  assignments = [],
  onRefresh,
  refreshing = false,
  lockedClassId = '',
  onUpdateSlot = null, // if provided, viewer becomes interactive
  onMoveSlot = null,
  onClearSlots = null,
  allowedViews = ALL_VIEWS, // restrict visible tabs e.g. ['class'] for teachers
  seasonsConfig = null, // seasons configuration
}) => {
  const filteredViews = allowedViews;
  const defaultView = filteredViews[0] || 'scheduler';
  const [viewType, setViewType] = useState(defaultView);
  const viewObj = viewOptionsMap[viewType] || viewOptionsMap['scheduler'];

  const [selectedId, setSelectedId] = useState('');
  const [showBreaks, setShowBreaks] = useState(true);
  const [popover, setPopover] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // ── Filter states (lifted from TimetableOverview) ──
  const [selClasses, setSelClasses] = useState([]);
  const [selTeachers, setSelTeachers] = useState([]);
  const [selAssignedTeachers, setSelAssignedTeachers] = useState([]);
  const [selAssignedClasses, setSelAssignedClasses] = useState([]);

  const activeSeasonId = seasonsConfig?.active_season_id || 'summer';
  const weekdayConfig = seasonsConfig?.seasons?.[activeSeasonId]?.weekday_config || {
    Monday: 'Weekday',
    Tuesday: 'Weekday',
    Wednesday: 'Weekday',
    Thursday: 'Weekday',
    Friday: 'Weekday',
    Saturday: 'Working Weekend',
    Sunday: 'Holiday Weekend'
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const visiblePeriods = showBreaks ? periods : periods.filter((p) => !p.is_break);
  const isInteractive = typeof onUpdateSlot === 'function';
  const showTabSwitcher = !lockedClassId && filteredViews.length > 1;

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
      setSelectedId(lockedClassId);
      return;
    }

    if (viewType === 'scheduler' || viewType === 'class') {
      if (classes.length > 0) {
        const isValid = classes.some((c) => String(c.id) === String(selectedId));
        if (!isValid) {
          const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name));
          setSelectedId(sortedClasses[0].id);
        }
      } else {
        setSelectedId('');
      }
    } else if (viewType === 'teacher') {
      if (teachers.length > 0) {
        const isValid = teachers.some((t) => String(t.id) === String(selectedId));
        if (!isValid) {
          const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
          setSelectedId(sortedTeachers[0].id);
        }
      } else {
        setSelectedId('');
      }
    }
  }, [viewType, classes, teachers, lockedClassId, selectedId]);

  const isSchedulerView = viewType === 'scheduler';
  const isGridView = viewType === 'class' || viewType === 'teacher';
  const isOverviewView = !isGridView && !isSchedulerView;

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

  const getCompletionPercentage = (classId) => {
    const nonBreakPeriods = periods.filter((p) => !p.is_break);
    const totalSlots = 6 * nonBreakPeriods.length;
    if (totalSlots === 0) return 0;
    const nonBreakPeriodIds = nonBreakPeriods.map((p) => String(p.id));
    const assignedSlots = slots.filter(
      (s) =>
        String(s.class_id) === String(classId) &&
        s.subject_id &&
        nonBreakPeriodIds.includes(String(s.period_id))
    ).length;
    return Math.round((assignedSlots / totalSlots) * 100);
  };

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
      } else {
        setPopover({
          mode: 'unassign_teacher',
          day,
          periodId: period.id,
          classId: slot.class_id,
          subjectId: slot.subject_id,
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
    <div className="w-full bg-light-lbg/50 border border-light-border rounded-3xl shadow-sm p-4 sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0 print:border-none print:shadow-none">
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
            <p className="text-sm mt-0.5 text-dark-soft">
              {lockedClassId
                ? 'Weekly class schedule.'
                : viewType === 'scheduler'
                  ? `Schedule completed: ${getCompletionPercentage(selectedId)}% (${
                      slots.filter(
                        (s) =>
                          String(s.class_id) === String(selectedId) &&
                          s.subject_id &&
                          !periods.find((p) => String(p.id) === String(s.period_id))?.is_break
                      ).length
                    } / ${days.length * periods.filter((p) => !p.is_break).length} slots assigned)`
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
              {(viewType === 'class' || viewType === 'scheduler') && (
                <SingleSelectDropdown
                  label="Select Class"
                  selected={selectedId}
                  onChange={setSelectedId}
                  options={[...classes]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((cls) => {
                      const pct = getCompletionPercentage(cls.id);
                      const assigned = slots.filter(
                        (s) =>
                          String(s.class_id) === String(cls.id) &&
                          s.subject_id &&
                          !periods.find((p) => String(p.id) === String(s.period_id))?.is_break
                      ).length;
                      const total = days.length * periods.filter((p) => !p.is_break).length;
                      return {
                        value: String(cls.id),
                        label: cls.name,
                        subLabel:
                          viewType === 'scheduler'
                            ? `${pct}% completed - ${assigned} of ${total}`
                            : null,
                      };
                    })}
                />
              )}
              {viewType === 'teacher' && (
                <SingleSelectDropdown
                  label="Select Teacher"
                  selected={selectedId}
                  onChange={setSelectedId}
                  options={[...teachers]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((t) => ({
                      value: String(t.id),
                      label: t.name,
                    }))}
                />
              )}
            </div>
          )}

          {/* Row 3: Tab switcher + entity selector */}
          {!lockedClassId && (
            <div className="flex flex-wrap items-center gap-2">
              {/* 6-mode view switcher */}
              {showTabSwitcher && (
                <div className="bg-light-lbg p-1 rounded-xl flex flex-wrap border border-light-border gap-0.5">
                  {[
                    { id: 'scheduler', label: 'Scheduler Grid', icon: 'fa-th-large' },
                    { id: 'teacher', label: 'Teacher Schedule', icon: 'fa-user' },
                    { id: 'unassigned_classes', label: 'Unassigned Classes', icon: 'fa-school' },
                    { id: 'free_teachers', label: 'Free Teachers', icon: 'fa-user-clock' },
                    {
                      id: 'assigned_teachers',
                      label: 'Assigned Teachers',
                      icon: 'fa-chalkboard-teacher',
                    },
                  ]
                    .filter((v) => filteredViews.includes(v.id))
                    .map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setViewType(v.id);
                        }}
                        title={v.label}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                          viewType === v.id
                            ? 'text-white bg-brand-primary shadow-sm'
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

            {/* Print — for all views */}
            <button
              onClick={handlePrint}
              disabled={(viewType === 'scheduler' || viewType === 'teacher' || viewType === 'class') && !selectedId}
              title="Print / Save as PDF"
              className="p-2 rounded-lg border border-light-border bg-light-bg text-dark-soft hover:bg-light-ui hover:text-dark-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-print text-sm" />
            </button>

            {/* Clear Multiple Slots — only for class schedule / scheduler views */}
            {(viewType === 'class' || viewType === 'scheduler') && selectedId && typeof onClearSlots === 'function' && (
              <button
                onClick={() => setIsClearModalOpen(true)}
                title="Clear Multiple Slots"
                className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center justify-center"
              >
                <i className="fas fa-eraser text-sm" />
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
        <>
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
                {days.map((day) => {
                  const dayType = weekdayConfig[day] || 'Weekday';
                  const isHoliday = dayType === 'Holiday Weekend';

                  return (
                    <tr key={day} className="border-b border-light-border last:border-b-0 bg-white ">
                      <td className="py-4 px-4 font-bold text-sm text-dark-deepblue border-r border-light-border print:bg-gray-50 print:text-black w-[120px]">
                        {day}
                      </td>
                      {isHoliday ? (
                        <td
                          colSpan={visiblePeriods.length}
                          className="p-2 bg-gray-100/50 text-center text-xs font-bold text-dark-soft italic select-none"
                        >
                          <div className="w-full py-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center gap-2">
                            <i className="fas fa-umbrella-beach text-gray-400"></i>
                            <span>Holiday (Weekend)</span>
                          </div>
                        </td>
                      ) : (
                        visiblePeriods.map((period) => {
                          const isBreak = period.is_break;
                          const isWorkingWeekend = dayType === 'Working Weekend';
                          const isWeekendApplicable = period.applicable_on_weekends;
                          const isPeriodDisabled = isWorkingWeekend && !isWeekendApplicable;

                          if (isPeriodDisabled) {
                            return (
                              <td
                                key={period.id || period.period_number}
                                className="p-2 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] bg-gray-50/40 select-none"
                              >
                                <div className="w-full h-full rounded-xl border border-dashed border-gray-200 bg-gray-50/20 flex flex-col items-center justify-center text-[10px] text-dark-muted font-bold">
                                  <i className="fas fa-ban mb-1 text-[10px] text-gray-400"></i>
                                  Not Applicable
                                </div>
                              </td>
                            );
                          }

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
                              (viewType === 'teacher' && (!slot || !slot.subject_id)) ||
                              (viewType === 'teacher' && isAssigned));

                          if (isBreak) {
                            const nameLower = (period.name || 'Break').toLowerCase();
                            const breakIcon = period.icon || (
                              nameLower.includes('salah') ||
                              nameLower.includes('prayer') ||
                              nameLower.includes('namaz') ||
                              nameLower.includes('zohr') ||
                              nameLower.includes('asr')
                                ? 'fa-mosque'
                                : nameLower.includes('lunch') ||
                                  nameLower.includes('breakfast') ||
                                  nameLower.includes('recess') ||
                                  nameLower.includes('tea') ||
                                  nameLower.includes('snack') ||
                                  nameLower.includes('food') ||
                                  nameLower.includes('tiffin')
                                ? 'fa-utensils'
                                : 'fa-coffee'
                            );

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
                                  classifications={classifications}
                                  classes={classes}
                                  slots={slots}
                                  days={days.filter((d) => {
                                    const dType = weekdayConfig[d] || 'Weekday';
                                    if (dType === 'Holiday Weekend') return false;
                                    if (dType === 'Working Weekend') {
                                      const currentPeriodObj = periods.find(
                                        (p) => String(p.id) === String(period.id)
                                      );
                                      return currentPeriodObj?.applicable_on_weekends;
                                    }
                                    return true;
                                  })}
                                  assignments={assignments}
                                  onAssign={handleAssign}
                                  onClose={() => setPopover(null)}
                                />
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedId && (
            <div className="mt-6 print:hidden">
              <AllocationSummaryTable
                viewType={viewType}
                selectedId={selectedId}
                slots={slots}
                subjects={subjects}
                teachers={teachers}
                classes={classes}
                assignments={assignments}
              />
            </div>
          )}
        </>
      ) : null}

      {/* ── Scheduler Grid View ── */}
      {viewType === 'scheduler' && (
        <div className="w-full space-y-6">
          <TimetableScheduler
            classId={selectedId}
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            classifications={classifications}
            periods={periods}
            slots={slots}
            assignments={assignments}
            onUpdateSlot={onUpdateSlot}
            onMoveSlot={onMoveSlot}
            showBreaks={showBreaks}
            seasonsConfig={seasonsConfig}
          />
          {selectedId && (
            <div className="print:hidden">
              <AllocationSummaryTable
                viewType={viewType}
                selectedId={selectedId}
                slots={slots}
                subjects={subjects}
                teachers={teachers}
                classes={classes}
                assignments={assignments}
              />
            </div>
          )}
        </div>
      )}

      {/* Clear Slots Modal */}
      {isClearModalOpen && (
        <ClearSlotsModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          days={days}
          periods={periods}
          className={selectedEntityName}
          onClear={(selectedDays, selectedPeriodIds) => {
            if (onClearSlots) {
              onClearSlots(selectedId, selectedDays, selectedPeriodIds);
            }
          }}
        />
      )}
    </div>
  );
};

const AllocationSummaryTable = ({
  viewType,
  selectedId,
  slots,
  subjects,
  teachers,
  classes,
  assignments,
}) => {
  const getSubjectName = (subId) =>
    subjects.find((s) => String(s.id) === String(subId))?.name || 'Unknown';
  const getClassName = (cId) =>
    classes.find((c) => String(c.id) === String(cId))?.name || 'Unknown';

  if (viewType === 'class' || viewType === 'scheduler') {
    const classSlots = slots.filter(
      (s) => String(s.class_id) === String(selectedId) && s.subject_id
    );
    const classAssignments = assignments.filter((a) => String(a.class_id) === String(selectedId));

    const uniqueSubIds = [
      ...new Set([
        ...classAssignments.map((a) => String(a.subject_id)),
        ...classSlots.map((s) => String(s.subject_id)),
      ]),
    ];

    const rows = uniqueSubIds
      .map((subId) => {
        const subject = subjects.find((s) => String(s.id) === String(subId));
        if (!subject) return null;

        const count = classSlots.filter((s) => String(s.subject_id) === String(subId)).length;

        return {
          id: subId,
          subjectName: subject.name,
          count,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 animate-in fade-in duration-300 print:hidden">
        <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <i className="fas fa-chart-pie text-brand-primary"></i>
          Weekly Period Allocations per Subject
        </h4>
        {rows.length === 0 ? (
          <div className="text-xs italic text-dark-muted py-2">
            No subjects assigned or scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-light-border/60 hover:bg-light-lbg/60 transition-colors"
              >
                <span className="text-xs text-dark-primary truncate">
                  {row.subjectName} (
                  <span className="text-pink-primary">
                    {row.count} {row.count === 1 ? 'period' : 'periods'}
                  </span>
                  )
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (viewType === 'teacher') {
    const teacherSlots = slots.filter(
      (s) => String(s.teacher_id) === String(selectedId) && s.subject_id
    );
    const teacherAssignments = assignments.filter(
      (a) => String(a.teacher_id) === String(selectedId)
    );

    const subjectGroupsMap = new Map();
    teacherAssignments.forEach((a) => {
      const subId = String(a.subject_id);
      const cId = String(a.class_id);
      if (!subjectGroupsMap.has(subId)) {
        subjectGroupsMap.set(subId, {
          subjectId: subId,
          subjectName: getSubjectName(subId),
          classesMap: new Map(),
        });
      }
      const group = subjectGroupsMap.get(subId);
      if (!group.classesMap.has(cId)) {
        group.classesMap.set(cId, {
          classId: cId,
          className: getClassName(cId),
          count: 0,
        });
      }
    });
    teacherSlots.forEach((s) => {
      const subId = String(s.subject_id);
      const cId = String(s.class_id);
      if (!subjectGroupsMap.has(subId)) {
        subjectGroupsMap.set(subId, {
          subjectId: subId,
          subjectName: getSubjectName(subId),
          classesMap: new Map(),
        });
      }
      const group = subjectGroupsMap.get(subId);
      if (!group.classesMap.has(cId)) {
        group.classesMap.set(cId, {
          classId: cId,
          className: getClassName(cId),
          count: 0,
        });
      }
      group.classesMap.get(cId).count += 1;
    });

    const groups = Array.from(subjectGroupsMap.values())
      .map((group) => {
        const classesList = Array.from(group.classesMap.values()).sort((a, b) =>
          a.className.localeCompare(b.className)
        );
        const totalCount = classesList.reduce((sum, c) => sum + c.count, 0);
        return {
          subjectId: group.subjectId,
          subjectName: group.subjectName,
          totalCount,
          classes: classesList,
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    return (
      <div className="bg-white border border-light-border rounded-2xl shadow-sm p-4 animate-in fade-in duration-300 print:hidden">
        <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <i className="fas fa-chart-pie text-brand-primary"></i>
          Weekly Teaching Allocations Summary
        </h4>
        {groups.length === 0 ? (
          <div className="text-xs italic text-dark-muted py-2">
            No classes or subjects scheduled for this teacher.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {groups.map((group) => (
              <div
                key={group.subjectId}
                className="flex flex-col gap-1.5 p-3 rounded-xl border bg-green-lbg/40 border-light-border/60 hover:bg-light-lbg/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${getSubjectColor(group.subjectName)}`}
                  ></span>
                  <span className="text-xs font-bold text-dark-primary truncate">
                    {group.subjectName} - (
                    <span className="text-pink-primary">
                      {group.totalCount} - {group.totalCount === 1 ? 'period' : 'periods'}
                    </span>
                    )
                  </span>
                </div>
                {group.classes.length > 0 && (
                  <div className="pl-4 space-y-1 border-l border-light-border/60">
                    {group.classes.map((cls) => (
                      <div
                        key={cls.classId}
                        className="text-[10px] text-dark-soft font-semibold truncate"
                      >
                        {cls.className} - ({cls.count} - {cls.count === 1 ? 'period' : 'periods'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const ClearSlotsModal = ({
  isOpen,
  onClose,
  days,
  periods,
  className,
  onClear,
}) => {
  const [selDays, setSelDays] = useState([]);
  const [selPeriods, setSelPeriods] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelDays([]);
      setSelPeriods([]);
      setConfirmConfig(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmConfig) {
          setConfirmConfig(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmConfig, onClose]);

  if (!isOpen) return null;

  const handleSelectAllDays = () => setSelDays([...days]);
  const handleClearAllDays = () => setSelDays([]);

  const handleSelectAllPeriods = () => setSelPeriods(periods.map((p) => String(p.id)));
  const handleClearAllPeriods = () => setSelPeriods([]);

  const handleToggleDay = (d) => {
    setSelDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleTogglePeriod = (pId) => {
    setSelPeriods((prev) => (prev.includes(pId) ? prev.filter((x) => x !== pId) : [...prev, pId]));
  };

  const handleClearSlotsSubmit = () => {
    if (selDays.length === 0) {
      alert('Please select at least one day.');
      return;
    }
    if (selPeriods.length === 0) {
      alert('Please select at least one period.');
      return;
    }

    setConfirmConfig({
      title: 'Clear Timetable Slots',
      message: `Are you sure you want to permanently clear the scheduled slots for Class ${className} on the selected days (${selDays.join(', ')}) and periods? This action cannot be undone.`,
      confirmText: 'Clear Slots',
      type: 'danger',
      onConfirm: () => {
        onClear(selDays, selPeriods);
        setConfirmConfig(null);
        onClose();
      },
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-primary/60 backdrop-blur-sm animate-in fade-in duration-250">
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-light-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="bg-red-600 px-6 py-4 text-white flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <i className="fas fa-eraser"></i>
                Clear Multiple Slots
              </h3>
              <p className="text-xs text-white/80 mt-0.5 font-semibold">Class: {className}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors border-none bg-transparent"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {/* Days Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-light-border pb-1">
                <label className="text-xs font-bold text-dark-primary uppercase tracking-wider">
                  Select Days
                </label>
                <div className="flex gap-2 text-[10px] font-bold">
                  <button onClick={handleSelectAllDays} className="text-brand-primary hover:underline">
                    Select All
                  </button>
                  <span className="text-dark-muted">|</span>
                  <button onClick={handleClearAllDays} className="text-dark-muted hover:underline">
                    Clear All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {days.map((d) => {
                  const isChecked = selDays.includes(d);
                  return (
                    <label
                      key={d}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-red-50 border-red-200 text-red-700 font-bold'
                          : 'bg-white border-light-border text-dark-primary hover:bg-light-lbg/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleDay(d)}
                        className="rounded text-red-600 focus:ring-red-soft w-4 h-4 shrink-0"
                      />
                      <span>{d}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Periods Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-light-border pb-1">
                <label className="text-xs font-bold text-dark-primary uppercase tracking-wider">
                  Select Periods
                </label>
                <div className="flex gap-2 text-[10px] font-bold">
                  <button onClick={handleSelectAllPeriods} className="text-brand-primary hover:underline">
                    Select All
                  </button>
                  <span className="text-dark-muted">|</span>
                  <button onClick={handleClearAllPeriods} className="text-dark-muted hover:underline">
                    Clear All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {periods.map((p) => {
                  const isChecked = selPeriods.includes(String(p.id));
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-red-50 border-red-200 text-red-700 font-bold'
                          : 'bg-white border-light-border text-dark-primary hover:bg-light-lbg/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePeriod(String(p.id))}
                        className="rounded text-red-600 focus:ring-red-soft w-4 h-4 shrink-0"
                      />
                      <div className="truncate">
                        <span className="font-bold">{p.name || `Period ${p.period_number}`}</span>
                        {p.is_break && (
                          <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                            Break
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-light-lbg px-6 py-4 flex justify-end gap-2.5 border-t border-light-border">
            <button
              onClick={onClose}
              className="bg-light-ui text-dark-soft hover:bg-light-border px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleClearSlotsSubmit}
              disabled={selDays.length === 0 || selPeriods.length === 0}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 animate-pulse-once"
            >
              <i className="fas fa-trash-alt"></i>
              Clear Selected Slots
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </>
  );
};

export default TimetableAdminView;
