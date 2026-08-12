// src/components/portals/admin/timetable/TimetableScheduler.jsx
import React, { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import ConfirmModal from '../ConfirmModal';
import { getSubjectColor } from './TimetableAdminView';
import { renderSubjectOptionsGroupedByClassification } from './TimetableSetupTabs';
import { CARD_THEMES } from '../../utils/cardTheme';

const TimetableScheduler = ({
  classId,
  classes = [],
  teachers = [],
  subjects = [],
  classifications = [],
  periods = [],
  slots = [],
  assignments = [],
  onUpdateSlot,
  onMoveSlot,
  onClearSlots,
  onMoveColumn,
  showBreaks = true,
  seasonsConfig = null,
  isTransposed = false,
}) => {
  const [editingSlot, setEditingSlot] = useState(null); // { day, periodId, periodNumber, subjectId, teacherId }
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [popover, setPopover] = useState(null); // { type, cellKey, targetElement, currentAssignData }
  const [movingSlot, setMovingSlot] = useState(null); // { day, periodId, classId, subjectId, teacherId }
  const [movingColumnPeriodId, setMovingColumnPeriodId] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && editingSlot) {
        setEditingSlot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSlot]);

  const activeSeasonId = seasonsConfig?.active_season_id || 'summer';
  const weekdayConfig = seasonsConfig?.seasons?.[activeSeasonId]?.weekday_config || {
    Monday: 'Weekday',
    Tuesday: 'Weekday',
    Wednesday: 'Weekday',
    Thursday: 'Weekday',
    Friday: 'Weekday',
    Saturday: 'Working Weekend',
    Sunday: 'Holiday Weekend',
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentClass = classes.find((c) => String(c.id) === String(classId));
  const visiblePeriods = showBreaks ? periods : periods.filter((p) => !p.is_break);
  const isReadOnly = !onUpdateSlot;

  if (!currentClass) {
    return (
      <div className="text-center py-16 bg-light-bg/10 border border-dashed border-light-border rounded-xl">
        <p className="text-dark-muted font-bold">Please select or add a class first.</p>
      </div>
    );
  }

  // Get slot details for current class
  const getSlotDetails = (day, periodId) => {
    return slots.find(
      (s) =>
        String(s.class_id) === String(classId) &&
        s.day === day &&
        String(s.period_id) === String(periodId)
    );
  };

  const renderCell = (day, period, key) => {
    const dayType = weekdayConfig[day] || 'Weekday';
    const isBreak = period.is_break;
    const isWorkingWeekend = dayType === 'Working Weekend';
    const isWeekendApplicable = period.applicable_on_weekends;
    const isPeriodDisabled = isWorkingWeekend && !isWeekendApplicable;

    if (isPeriodDisabled) {
      return (
        <td
          key={key}
          className="p-1.5 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] bg-gray-50/40 select-none"
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
    const subjectObj = isAssigned
      ? subjects.find((s) => String(s.id) === String(slot.subject_id))
      : null;
    const requiresTeacher = subjectObj
      ? subjectObj.requires_teacher !== false
      : true;

    const clsObj =
      subjectObj && subjectObj.classification_id
        ? classifications.find(
            (c) => String(c.id) === String(subjectObj.classification_id)
          )
        : null;
    const themeStr = clsObj ? clsObj.theme : null;
    const themeStyles =
      themeStr && CARD_THEMES[themeStr] ? CARD_THEMES[themeStr] : null;

    let colorClass = '';
    if (isAssigned) {
      if (themeStyles) {
        colorClass = `bg-${themeStyles.bg} text-${themeStyles.color}`;
      } else if (!isTeacherAssigned) {
        colorClass = getSubjectColor(subjectName);
      } else if (isFemale) {
        colorClass = 'bg-pink-100 text-pink-primary border-pink-200';
      } else {
        colorClass = 'bg-light-lbg text-dark-charcoal border-light-border';
      }
    }

    if (isBreak) {
      const nameLower = (period.name || 'Break').toLowerCase();
      const breakIcon =
        period.icon ||
        (nameLower.includes('salah') ||
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
            : 'fa-coffee');

      return (
        <td
          key={key}
          className="p-1.5 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] bg-light-bg/5 select-none"
        >
          <div className="w-full h-full rounded-xl border border-light-border bg-light-bg/15 flex flex-col items-center justify-center text-[10px] text-dark-muted font-bold">
            <i className={`fas ${breakIcon} mb-1 text-xs text-brand-soft`}></i>
            {period.name || 'Break'}
          </div>
        </td>
      );
    }

    const isSourceCell =
      movingSlot &&
      movingSlot.day === day &&
      String(movingSlot.periodId) === String(period.id);

    return (
      <td
        key={key}
        onClick={() => !isReadOnly && handleCellClick(day, period)}
        className={`p-1.5 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] ${
          isReadOnly
            ? ''
            : 'cursor-pointer group hover:bg-light-bg/40 transition-colors'
        } ${movingSlot ? 'hover:bg-brand-lbg/10' : ''}`}
      >
        {isAssigned ? (
          <div
            className={`w-full h-full rounded-xl p-2 flex flex-col justify-center gap-0.5 shadow-sm transition-all duration-300 ${
              isSourceCell
                ? 'opacity-40 border border-dashed bg-brand-lbg/10'
                : `${colorClass} ${themeStyles ? `border-l-[6px] border-l-${themeStyles.color}` : 'border'}`
            } ${
              !isReadOnly && !movingSlot
                ? 'group-hover:scale-95'
                : !isReadOnly && movingSlot
                  ? 'group-hover:scale-95 group-hover:border-brand-primary'
                  : ''
            } relative`}
          >
            <span className="font-extrabold text-[10px] tracking-wide uppercase truncate">
              {subjectName}
            </span>
            {!isTeacherAssigned && requiresTeacher ? (
              <span className="text-[9px] font-bold truncate text-red-primary flex items-center justify-center gap-1">
                <i className="fas fa-exclamation-triangle text-[8px] animate-pulse"></i>
                Not Assigned
              </span>
            ) : isTeacherAssigned ? (
              <span
                className={`text-[9px] opacity-90 font-bold truncate ${isFemale ? 'text-pink-primary' : 'text-dark-charcoal'}`}
              >
                {isFemale && <i className="fas fa-female mr-1 text-[8px]"></i>}
                {getTeacherName(slot.teacher_id)}
              </span>
            ) : (
              <span className="text-[9px] opacity-90 font-bold truncate text-dark-muted">
                No Teacher Required
              </span>
            )}

            {/* Move Button */}
            {!isReadOnly && !movingSlot && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartMove(day, period.id, slot);
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/80 hover:bg-white text-dark-primary hover:text-brand-primary w-5 h-5 rounded-md flex items-center justify-center transition-all shadow-sm"
                title="Move Slot to another period"
              >
                <i className="fas fa-arrows-alt text-[10px]"></i>
              </button>
            )}
          </div>
        ) : (
          <div
            className={`w-full h-full rounded-xl border border-dashed flex items-center justify-center text-[10px] text-dark-muted font-bold transition-all ${
              !isReadOnly && movingSlot
                ? 'border-brand-soft text-brand-primary bg-brand-lbg/5 hover:bg-brand-lbg/15 hover:border-brand-primary cursor-pointer'
                : !isReadOnly
                  ? 'border-light-border bg-light-bg/10 group-hover:border-brand-soft group-hover:bg-brand-lbg/10'
                  : 'border-light-border bg-light-bg/5'
            }`}
          >
            {isReadOnly ? (
              'Free'
            ) : movingSlot ? (
              <span className="flex items-center gap-1">
                <i className="fas fa-check text-[9px]"></i> Place here
              </span>
            ) : (
              '+ Assign'
            )}
          </div>
        )}
      </td>
    );
  };

  const getSubjectName = (subId) =>
    subjects.find((s) => String(s.id) === String(subId))?.name || 'Unknown';
  const getTeacherName = (tId) => {
    if (!tId) return 'Not Assigned';
    return teachers.find((t) => String(t.id) === String(tId))?.name || 'Not Assigned';
  };
  const getClassName = (cId) =>
    classes.find((c) => String(c.id) === String(cId))?.name || 'Unknown';

  const handleStartMove = (day, periodId, slot) => {
    setMovingSlot({
      day,
      periodId,
      subjectId: slot.subject_id,
      teacherId: slot.teacher_id,
    });
    showToast('Move mode active. Click any target cell in the grid to place the slot.', 'info');
  };

  const handleCompleteMove = (targetDay, targetPeriodId) => {
    if (!movingSlot) return;

    // Clicked same cell -> cancel
    if (movingSlot.day === targetDay && String(movingSlot.periodId) === String(targetPeriodId)) {
      setMovingSlot(null);
      return;
    }

    const targetSlot = getSlotDetails(targetDay, targetPeriodId);
    const hasAssignedSubject = targetSlot && targetSlot.subject_id;

    // Check teacher conflicts
    let teacherConflicted = false;
    let conflictClassName = '';
    if (movingSlot.teacherId) {
      const conflict = slots.find(
        (s) =>
          String(s.class_id) !== String(classId) &&
          s.day === targetDay &&
          String(s.period_id) === String(targetPeriodId) &&
          String(s.teacher_id) === String(movingSlot.teacherId)
      );
      if (conflict) {
        teacherConflicted = true;
        conflictClassName = getClassName(conflict.class_id);
      }
    }

    const executeMove = () => {
      if (onMoveSlot) {
        onMoveSlot(classId, movingSlot.day, movingSlot.periodId, targetDay, targetPeriodId);
      }
      setMovingSlot(null);
    };

    const checkTeacherConflictThenProceed = () => {
      if (teacherConflicted) {
        const teacherName = getTeacherName(movingSlot.teacherId);
        setConfirmConfig({
          title: 'Teacher Conflict Warning',
          message: `Warning: Teacher ${teacherName} is already occupied in ${conflictClassName} on ${targetDay} at this period. Do you want to proceed anyway?`,
          confirmText: 'Proceed',
          type: 'warning',
          onConfirm: () => {
            setConfirmConfig(null);
            executeMove();
          },
          onCancel: () => {
            setConfirmConfig(null);
            setMovingSlot(null);
          },
        });
      } else {
        executeMove();
      }
    };

    if (hasAssignedSubject) {
      const targetSubName = getSubjectName(targetSlot.subject_id);
      setConfirmConfig({
        title: 'Override Target Slot?',
        message: `The target slot is already assigned to "${targetSubName}". Are you sure you want to override it?`,
        confirmText: 'Override',
        type: 'danger',
        onConfirm: () => {
          setConfirmConfig(null);
          checkTeacherConflictThenProceed();
        },
        onCancel: () => {
          setConfirmConfig(null);
          setMovingSlot(null);
        },
      });
    } else {
      checkTeacherConflictThenProceed();
    }
  };

  const handleCellClick = (day, period) => {
    if (isReadOnly) return;
    if (movingSlot) {
      handleCompleteMove(day, period.id);
      return;
    }

    const slot = getSlotDetails(day, period.id);
    setEditingSlot({
      day,
      periodId: period.id,
      periodNumber: period.period_number,
      subjectId: slot?.subject_id || '',
      teacherId: slot?.teacher_id || '',
    });
    setSelectedSubjectId(slot?.subject_id || '');
    setSelectedTeacherId(slot?.teacher_id || '');
    setSelectedDays([day]);
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubjectId(subjectId);
    setSelectedTeacherId(''); // Reset teacher selection when subject changes
  };

  const handleSaveSlot = () => {
    if (!editingSlot) return;

    if (selectedDays.length === 0) {
      showToast('Please select at least one day to assign.', 'error');
      return;
    }

    // Validate (double check validation in logic)
    if (selectedTeacherId && selectedSubjectId) {
      const teacher = teachers.find((t) => String(t.id) === String(selectedTeacherId));
      if (!teacher || !teacher.subjects.some((sid) => String(sid) === String(selectedSubjectId))) {
        showToast('Selected teacher is not qualified to teach this subject.', 'error');
        return;
      }

      // Check conflicts: is teacher busy in another class on any of the selected days?
      const conflicts = [];
      for (const day of selectedDays) {
        const conflictingSlot = slots.find(
          (s) =>
            String(s.class_id) !== String(classId) &&
            s.day === day &&
            String(s.period_id) === String(editingSlot.periodId) &&
            String(s.teacher_id) === String(selectedTeacherId)
        );
        if (conflictingSlot) {
          conflicts.push({ day, className: getClassName(conflictingSlot.class_id) });
        }
      }

      if (conflicts.length > 0) {
        const conflictMessages = conflicts
          .map((c) => `${c.day} (Busy in ${c.className})`)
          .join('\n');
        showToast(
          `Conflict Detected: Teacher ${teacher.name} is already assigned on:\n${conflictMessages}`,
          'error'
        );
        return;
      }
    }

    onUpdateSlot(
      classId,
      selectedDays,
      editingSlot.periodId,
      selectedSubjectId || null,
      selectedTeacherId || null
    );
    setEditingSlot(null);
  };

  // Helper to determine teacher options & availability
  const getTeacherOptions = () => {
    if (!selectedSubjectId || !editingSlot) return [];

    // 1. Filter teachers who are qualified for this subject (only active or currently assigned)
    const qualified = teachers.filter(
      (t) =>
        (t.is_active !== false || String(t.id) === String(editingSlot.teacherId)) &&
        t.subjects &&
        t.subjects.some((sid) => String(sid) === String(selectedSubjectId))
    );

    // 2. Map and identify busy conflicts
    return qualified.map((t) => {
      // Find if this teacher is assigned to another class at the same day/period
      const conflictingSlot = slots.find(
        (s) =>
          String(s.class_id) !== String(classId) &&
          s.day === editingSlot.day &&
          String(s.period_id) === String(editingSlot.periodId) &&
          String(s.teacher_id) === String(t.id)
      );

      const isAssignedToThisClass = assignments.some(
        (a) =>
          String(a.class_id) === String(classId) &&
          String(a.teacher_id) === String(t.id) &&
          String(a.subject_id) === String(selectedSubjectId)
      );

      return {
        ...t,
        isConflicted: !!conflictingSlot,
        conflictingClassName: conflictingSlot ? getClassName(conflictingSlot.class_id) : '',
        isAssignedToThisClass,
      };
    });
  };

  const teacherOptions = getTeacherOptions();
  const sortedTeacherOptions = [...teacherOptions].sort((a, b) => {
    // Show assigned-to-this-class first, then unconflicted, then conflicted
    if (a.isAssignedToThisClass && !b.isAssignedToThisClass) return -1;
    if (!a.isAssignedToThisClass && b.isAssignedToThisClass) return 1;
    if (a.isConflicted && !b.isConflicted) return 1;
    if (!a.isConflicted && b.isConflicted) return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      {/* Move mode banner */}
      {movingSlot && (
        <div className="bg-brand-lbg/30 border border-brand-soft rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 animate-bounce">
              <i className="fas fa-arrows-alt"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-dark-primary">
                Moving slot:{' '}
                <span className="text-brand-primary uppercase font-extrabold">
                  {getSubjectName(movingSlot.subjectId)}
                </span>{' '}
                ({getTeacherName(movingSlot.teacherId)})
              </div>
              <p className="text-[10px] text-dark-soft font-semibold mt-0.5">
                From {movingSlot.day}, Period{' '}
                {periods.find((p) => String(p.id) === String(movingSlot.periodId))?.name ||
                  'Unknown'}
                . Click any cell in the grid to place it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMovingSlot(null)}
            className="bg-white hover:bg-light-ui border border-light-border px-3 py-1.5 rounded-lg text-xs font-bold text-dark-soft transition-all shrink-0 shadow-sm animate-pulse"
          >
            Cancel Move
          </button>
        </div>
      )}

      {/* Move Column banner */}
      {movingColumnPeriodId && (
        <div className="bg-brand-lbg/30 border border-brand-soft rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 animate-bounce">
              <i className="fas fa-columns"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-dark-primary">
                Moving Column:{' '}
                <span className="text-brand-primary uppercase font-extrabold">
                  {periods.find((p) => String(p.id) === String(movingColumnPeriodId))?.name ||
                    'Unknown'}
                </span>
              </div>
              <p className="text-[10px] text-dark-soft font-semibold mt-0.5">
                Click another period column header to move all assignments to it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMovingColumnPeriodId(null)}
            className="bg-white hover:bg-light-ui border border-light-border px-3 py-1.5 rounded-lg text-xs font-bold text-dark-soft transition-all shrink-0 shadow-sm animate-pulse"
          >
            Cancel Move
          </button>
        </div>
      )}

      {/* Grid view */}
      {visiblePeriods.length === 0 ? (
        <div className="text-center py-12 bg-white border border-light-border rounded-3xl">
          <p className="text-dark-muted font-bold text-sm">
            Please set up periods in Settings first.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-light-border bg-white shadow-sm">
          {isTransposed ? (
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="table-sticky-header">
                <tr className="bg-light-lbg border-b border-light-border">
                  <th className="py-4 px-4 text-left font-bold text-xs text-dark-primary tracking-wider uppercase border-r border-light-border w-[120px] table-sticky-col table-sticky-intersection bg-light-lbg">
                    Period / Day
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className="py-3 px-3 text-center border-r border-light-border last:border-r-0 bg-light-lbg"
                    >
                      <div className="font-extrabold text-sm text-dark-deepblue">
                        {day}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePeriods.map((period, periodIdx) => {
                  const isBreak = period.is_break;
                  return (
                    <tr key={period.id || period.period_number} className="border-b border-light-border last:border-b-0 hover:bg-light-bg/20 transition-colors bg-white">
                      <td className="py-4 px-4 font-bold text-sm text-dark-deepblue border-r border-light-border bg-white table-sticky-col w-[120px]">
                        <div className="font-extrabold text-sm text-dark-deepblue">
                          {period.name || `Period ${period.period_number}`}
                        </div>
                        {period.start_time && period.end_time && (
                          <div className="text-[10px] text-dark-soft font-semibold mt-0.5">
                            {period.start_time} - {period.end_time}
                          </div>
                        )}
                      </td>

                      {isBreak ? (
                        <>
                          <td
                            colSpan={days.filter((d) => (weekdayConfig[d] || 'Weekday') !== 'Holiday Weekend').length}
                            className="p-1.5 text-center min-w-[120px] h-[80px] bg-light-bg/5 select-none"
                          >
                            <div className="w-full h-full rounded-xl border border-light-border bg-light-bg/15 flex flex-col items-center justify-center text-[10px] text-dark-muted font-bold">
                              <i className="fas fa-coffee mb-1 text-xs text-brand-soft"></i>
                              {period.name || 'Break'}
                            </div>
                          </td>
                        </>
                      ) : (
                        days.map((day) => {
                          const dayType = weekdayConfig[day] || 'Weekday';
                          const isHoliday = dayType === 'Holiday Weekend';

                          if (isHoliday) {
                            if (periodIdx === 0) {
                              return (
                                <td
                                  key={day}
                                  rowSpan={visiblePeriods.length}
                                  className="p-1.5 bg-gray-100/50 text-center text-xs font-bold text-dark-soft italic select-none"
                                >
                                  <div className="w-full py-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center gap-2">
                                    <i className="fas fa-umbrella-beach text-gray-400"></i>
                                    <span>Holiday (Weekend)</span>
                                  </div>
                                </td>
                              );
                            }
                            return null;
                          }

                          return renderCell(day, period, day);
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="table-sticky-header">
                <tr className="bg-light-lbg border-b border-light-border">
                  <th className="py-4 px-4 text-left font-bold text-xs text-dark-primary tracking-wider uppercase border-r border-light-border w-[120px] table-sticky-col table-sticky-intersection bg-light-lbg">
                    Day
                  </th>
                  {visiblePeriods.map((period) => (
                    <th
                      key={period.id || period.period_number}
                      className={`py-3 px-3 text-center border-r border-light-border last:border-r-0 group relative select-none ${movingColumnPeriodId === period.id ? 'ring-2 ring-brand-primary bg-brand-lbg/20 z-10' : 'bg-light-lbg'} ${!isReadOnly && onMoveColumn ? 'cursor-pointer hover:bg-light-bg/20' : ''}`}
                      onClick={() => {
                        if (!isReadOnly && onMoveColumn) {
                          if (movingColumnPeriodId && movingColumnPeriodId !== period.id) {
                            onMoveColumn(classId, movingColumnPeriodId, period.id);
                            setMovingColumnPeriodId(null);
                          } else {
                            setMovingColumnPeriodId((prev) =>
                              prev === period.id ? null : period.id
                            );
                          }
                        }
                      }}
                    >
                      <div className="font-extrabold text-sm text-dark-deepblue">
                        {period.name || `Period ${period.period_number}`}
                      </div>
                      {period.start_time && period.end_time && (
                        <div className="text-[10px] text-dark-soft font-semibold mt-0.5">
                          {period.start_time} - {period.end_time}
                        </div>
                      )}
                      {!isReadOnly && onMoveColumn && !movingColumnPeriodId && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            title="Move Column"
                            className="text-brand-primary hover:text-brand-dark p-1 pointer-events-none"
                          >
                            <i className="fas fa-arrows-alt-h text-[10px]"></i>
                          </button>
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
                    <tr
                      key={day}
                      className="border-b border-light-border last:border-b-0 hover:bg-light-bg/20 transition-colors bg-white"
                    >
                      <td className="py-4 px-4 font-bold text-sm text-dark-deepblue border-r border-light-border bg-white table-sticky-col w-[120px]">
                        {day}
                      </td>
                      {isHoliday ? (
                        <td
                          colSpan={visiblePeriods.length}
                          className="p-1.5 bg-gray-100/50 text-center text-xs font-bold text-dark-soft italic select-none"
                        >
                          <div className="w-full py-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center gap-2">
                            <i className="fas fa-umbrella-beach text-gray-400"></i>
                            <span>Holiday (Weekend)</span>
                          </div>
                        </td>
                      ) : (
                        visiblePeriods.map((period) => renderCell(day, period, period.id || period.period_number))
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit Slot Modal / Dialog */}
      {editingSlot && (
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-primary p-6 text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold opacity-80">
                  Edit Timetable Slot
                </span>
                <h3 className="text-lg font-bold">
                  {currentClass.name} — {editingSlot.day}, Period {editingSlot.periodNumber}
                </h3>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="text-white/80 hover:text-white transition-all text-xl"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Select Subject */}
              <div>
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
                  Select Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                >
                  <option value="">-- Free Period (None) --</option>
                  {renderSubjectOptionsGroupedByClassification(
                    subjects,
                    classifications,
                    (sub) => {
                      const isMapped = assignments.some(
                        (a) =>
                          String(a.class_id) === String(classId) &&
                          String(a.subject_id) === String(sub.id)
                      );
                      return isMapped ? `${sub.name} (Assigned to Class)` : sub.name;
                    },
                    selectedSubjectId
                  )}
                </select>
              </div>

              {/* Select Teacher */}
              <div>
                <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide mb-1.5">
                  Select Teacher
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  disabled={!selectedSubjectId}
                  className="w-full bg-white border border-light-border rounded-xl px-4 py-2.5 text-sm font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft disabled:opacity-50 disabled:bg-light-bg"
                >
                  <option value="">-- Choose Teacher --</option>
                  {sortedTeacherOptions.map((t) => {
                    let label = t.name;
                    if (t.isAssignedToThisClass) {
                      label += ' (Assigned to Class)';
                    }
                    if (t.isConflicted) {
                      label += ` (Busy in ${t.conflictingClassName})`;
                    }
                    return (
                      <option key={t.id} value={t.id} disabled={t.isConflicted}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {selectedSubjectId && teacherOptions.length === 0 && (
                  <p className="text-red-primary text-[11px] font-bold mt-1">
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    No teachers are qualified to teach this subject!
                  </p>
                )}
              </div>

              {/* Select Days to Apply */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-dark-soft uppercase tracking-wide">
                    Apply to Days
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const validDaysForPeriod = days.filter((d) => {
                        const dType = weekdayConfig[d] || 'Weekday';
                        if (dType === 'Holiday Weekend') return false;
                        if (dType === 'Working Weekend') {
                          const currentPeriod = periods.find(
                            (p) => String(p.id) === String(editingSlot.periodId)
                          );
                          return currentPeriod?.applicable_on_weekends;
                        }
                        return true;
                      });
                      if (selectedDays.length === validDaysForPeriod.length) {
                        setSelectedDays([editingSlot.day]);
                      } else {
                        setSelectedDays(validDaysForPeriod);
                      }
                    }}
                    className="text-[10px] font-extrabold text-brand-primary hover:text-brand-dark transition-all hover:underline uppercase tracking-wide"
                  >
                    {(() => {
                      const validDaysForPeriod = days.filter((d) => {
                        const dType = weekdayConfig[d] || 'Weekday';
                        if (dType === 'Holiday Weekend') return false;
                        if (dType === 'Working Weekend') {
                          const currentPeriod = periods.find(
                            (p) => String(p.id) === String(editingSlot.periodId)
                          );
                          return currentPeriod?.applicable_on_weekends;
                        }
                        return true;
                      });
                      return selectedDays.length === validDaysForPeriod.length
                        ? 'Reset to single day'
                        : 'Select All Days';
                    })()}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {days
                    .filter((d) => {
                      const dType = weekdayConfig[d] || 'Weekday';
                      if (dType === 'Holiday Weekend') return false;
                      if (dType === 'Working Weekend') {
                        const currentPeriod = periods.find(
                          (p) => String(p.id) === String(editingSlot.periodId)
                        );
                        return currentPeriod?.applicable_on_weekends;
                      }
                      return true;
                    })
                    .map((d) => {
                      const isSelected = selectedDays.includes(d);
                      return (
                        <button
                          type="button"
                          key={d}
                          onClick={() => {
                            setSelectedDays((prev) =>
                              prev.includes(d) ? prev.filter((day) => day !== d) : [...prev, d]
                            );
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold select-none transition-all ${
                            isSelected
                              ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                              : 'bg-white border-light-border text-dark-soft hover:bg-light-bg/40'
                          }`}
                        >
                          {d.substring(0, 3)}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="bg-light-lbg/40 px-6 py-4 flex justify-between gap-3 border-t border-light-border">
              <button
                type="button"
                onClick={() => {
                  if (selectedDays.length === 0) {
                    showToast('Please select at least one day to clear.', 'error');
                    return;
                  }
                  const dayNames = selectedDays.join(', ');
                  setConfirmConfig({
                    title: 'Clear Slots',
                    message: `Are you sure you want to clear assignments for ${dayNames}?`,
                    confirmText: 'Clear',
                    type: 'danger',
                    onConfirm: () => {
                      setConfirmConfig(null);
                      onUpdateSlot(classId, selectedDays, editingSlot.periodId, null, null);
                      setEditingSlot(null);
                    },
                  });
                }}
                className="text-red-primary hover:text-red-dark hover:bg-red-lbg/50 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-red-soft"
              >
                Clear Slot(s)
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="bg-light-ui text-dark-soft hover:bg-light-border px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlot}
                  className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Save Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
};

export default TimetableScheduler;
