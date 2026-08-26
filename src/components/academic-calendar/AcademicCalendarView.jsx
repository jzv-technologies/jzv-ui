import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import AcademicCalendarEventModal, {
  CALENDAR_EVENT_CONFIGS,
  CALENDAR_EVENT_TYPES,
} from './AcademicCalendarEventModal';
import ConfirmModal from '../ConfirmModal';

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_DAY_SCHEDULE = {
  Sunday: 'weekly_off',
  Monday: 'teaching',
  Tuesday: 'teaching',
  Wednesday: 'teaching',
  Thursday: 'teaching',
  Friday: 'teaching',
  Saturday: 'activity',
};

// --- Helper: Check if a date is a weekend based on weekly_off_days ---
const isDateWeekend = (date, weeklyOffDays = ['Sunday']) => {
  if (!date) return false;
  const dayName = WEEK_DAYS[date.getDay()];
  return (weeklyOffDays || []).includes(dayName);
};

// --- Helper: Convert academic month index (0=June, 11=May) to Gregorian ---
const getGregorianFromAcademic = (academicIndex, baseYear) => {
  const month = (5 + academicIndex) % 12;
  const yearOffset = academicIndex > 6 ? 1 : 0;
  return { year: baseYear + yearOffset, month };
};

const getAcademicYearLabel = (baseYear) => `${baseYear}-${String(baseYear + 1).slice(-2)}`;

// --- Helper: Compute day-by-day month summary with strict event_type rules ---
export const computeMonthSummary = (
  year,
  month,
  events = [],
  weeklyOffDays = ['Sunday'],
  defaultTeachingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  activityDays = ['Saturday']
) => {
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based (1..12)
  let totalDays = daysInMonth;
  let weekendDays = 0;
  let studentHolidays = 0;
  let teacherHolidays = 0;
  let examDays = 0;
  let workingDays = 0;
  let teachingDays = 0;
  let activityDaysCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayName = WEEK_DAYS[dateObj.getDay()];
    const isWeekend = (weeklyOffDays || []).includes(dayName);
    const isDefaultTeachingDay = (defaultTeachingDays || []).includes(dayName);
    const isDefaultActivityDay = (activityDays || []).includes(dayName);

    // Find all events overlapping this day
    const dayEvents = events.filter((event) => {
      const start = new Date(`${event.start_date}T00:00:00`);
      const end = new Date(`${event.end_date || event.start_date}T00:00:00`);
      return start <= dateObj && end >= dateObj;
    });

    if (isWeekend) {
      weekendDays++;
    }

    // Student Holiday determination:
    const isStudentHoliday = dayEvents.some(
      (e) =>
        Boolean(e.is_student_holiday) ||
        ['planned_holiday', 'emergency_holiday', 'teacher_preparation', 'student_holiday'].includes(
          e.event_type
        ) ||
        (Boolean(e.ignore_attendence) && !e.is_teaching_day)
    );

    // Teacher Holiday determination:
    const isTeacherHoliday = dayEvents.some(
      (e) =>
        Boolean(e.is_teacher_holiday) ||
        ['planned_holiday', 'emergency_holiday', 'teacher_holiday'].includes(e.event_type)
    );

    // Teaching Day determination:
    const hasExplicitTeaching = dayEvents.some((e) => e.is_teaching_day === true);
    const hasExplicitNonTeaching = dayEvents.some((e) => e.is_teaching_day === false);

    // Exam determination strictly by event_type (never event_name):
    const isExam = dayEvents.some(
      (e) => e.event_type === 'examinations' || e.event_type === 'examination'
    );

    if (!isWeekend) {
      if (isStudentHoliday) {
        studentHolidays++;
      }
      if (isTeacherHoliday) {
        teacherHolidays++;
      }
    }

    if (!isWeekend || hasExplicitTeaching) {
      if (isExam) {
        examDays++;
      }
    }

    // Working Day determination:
    // working_days = total_days - weekend_days - teacher_holidays
    if (!isWeekend && !isTeacherHoliday) {
      workingDays++;
    }

    if (hasExplicitTeaching) {
      teachingDays++;
    } else if (!isWeekend && !isStudentHoliday) {
      if (isDefaultTeachingDay && !hasExplicitNonTeaching) {
        teachingDays++;
      }
    }

    // Activity Day determination:
    if (
      !isWeekend &&
      !isStudentHoliday &&
      isDefaultActivityDay &&
      !hasExplicitTeaching &&
      !hasExplicitNonTeaching
    ) {
      activityDaysCount++;
    }
  }

  return {
    year,
    month,
    total_days: totalDays,
    weekend_days: weekendDays,
    student_holidays: studentHolidays,
    teacher_holidays: teacherHolidays,
    holidays: studentHolidays,
    exam_days: examDays,
    working_days: workingDays,
    teaching_days: teachingDays,
    activity_days: activityDaysCount,
  };
};

const AcademicCalendarView = ({ canEdit = false }) => {
  const [events, setEvents] = useState([]);
  const [calendarMonths, setCalendarMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Academic month state
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const initialBaseYear = currentMonth >= 5 ? currentYear : currentYear - 1;
  const initialAcademicIndex = (currentMonth - 5 + 12) % 12;

  const [academicIndex, setAcademicIndex] = useState(initialAcademicIndex);
  const [baseYear, setBaseYear] = useState(initialBaseYear);
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'year' | 'events'
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);

  // Unified Day Schedule state (matrix configuration)
  const [daySchedule, setDaySchedule] = useState(DEFAULT_DAY_SCHEDULE);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Touch gesture references for mobile calendar swiping
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  // Derived classifications from unified daySchedule
  const weeklyOffDays = useMemo(
    () => WEEK_DAYS.filter((d) => daySchedule[d] === 'weekly_off'),
    [daySchedule]
  );
  const defaultTeachingDays = useMemo(
    () => WEEK_DAYS.filter((d) => daySchedule[d] === 'teaching'),
    [daySchedule]
  );
  const activityDays = useMemo(
    () => WEEK_DAYS.filter((d) => daySchedule[d] === 'activity'),
    [daySchedule]
  );

  // ----- Data loading -----
  const loadEvents = async () => {
    setLoading(true);
    setError('');
    const [{ data, error: fetchError }, { data: months, error: monthError }] = await Promise.all([
      supabase.from('academic_events').select('*').order('start_date', { ascending: true }),
      supabase
        .from('academic_calendar')
        .select('*')
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
    ]);
    if (fetchError || monthError) setError((fetchError || monthError).message);
    else {
      setEvents(data || []);
      setCalendarMonths(months || []);

      const firstMonth = months?.[0];
      if (firstMonth) {
        if (firstMonth.day_schedule && typeof firstMonth.day_schedule === 'object') {
          setDaySchedule({ ...DEFAULT_DAY_SCHEDULE, ...firstMonth.day_schedule });
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // ----- Navigation & utils -----
  const currentGregorian = getGregorianFromAcademic(academicIndex, baseYear);
  const currentYearMonth = { year: currentGregorian.year, month: currentGregorian.month + 1 };

  const navigateMonth = (delta) => {
    let newIndex = academicIndex + delta;
    let newBaseYear = baseYear;
    if (newIndex < 0) {
      newIndex = 11;
      newBaseYear = baseYear - 1;
    } else if (newIndex > 11) {
      newIndex = 0;
      newBaseYear = baseYear + 1;
    }
    setAcademicIndex(newIndex);
    setBaseYear(newBaseYear);
  };

  const navigateYear = (delta) => {
    setBaseYear((prev) => prev + delta);
  };

  const monthSummary = useMemo(() => {
    return computeMonthSummary(
      currentYearMonth.year,
      currentYearMonth.month,
      events,
      weeklyOffDays,
      defaultTeachingDays,
      activityDays
    );
  }, [currentYearMonth, events, weeklyOffDays, defaultTeachingDays, activityDays]);

  const yearSummary = useMemo(() => {
    let totalDays = 0;
    let workingDays = 0;
    let teachingDays = 0;
    let activityDaysTotal = 0;
    let weekendDays = 0;
    let studentHolidays = 0;
    let teacherHolidays = 0;
    let examDays = 0;

    for (let idx = 0; idx < 12; idx++) {
      const { year: gYear, month: gMonth } = getGregorianFromAcademic(idx, baseYear);
      const mSummary = computeMonthSummary(
        gYear,
        gMonth + 1,
        events,
        weeklyOffDays,
        defaultTeachingDays,
        activityDays
      );
      totalDays += mSummary.total_days;
      workingDays += mSummary.working_days;
      teachingDays += mSummary.teaching_days;
      activityDaysTotal += mSummary.activity_days;
      weekendDays += mSummary.weekend_days;
      studentHolidays += mSummary.student_holidays;
      teacherHolidays += mSummary.teacher_holidays;
      examDays += mSummary.exam_days;
    }

    return {
      total_days: totalDays,
      working_days: workingDays,
      teaching_days: teachingDays,
      activity_days: activityDaysTotal,
      weekend_days: weekendDays,
      student_holidays: studentHolidays,
      teacher_holidays: teacherHolidays,
      exam_days: examDays,
    };
  }, [baseYear, events, weeklyOffDays, defaultTeachingDays, activityDays]);

  const getCalendarCells = (year, monthIndex) => {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: firstDay + daysInMonth }, (_, index) =>
      index < firstDay ? null : new Date(year, monthIndex, index - firstDay + 1)
    );
  };

  // Events for single month
  const visibleEvents = useMemo(() => {
    const { year, month } = currentGregorian;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    return events.filter((event) => {
      const startsBeforeEnd = new Date(`${event.start_date}T00:00:00`) <= monthEnd;
      const endsAfterStart =
        new Date(`${event.end_date || event.start_date}T00:00:00`) >= monthStart;
      const matchesType =
        typeFilter === 'all' ||
        event.event_type === typeFilter ||
        (typeFilter === 'examinations' && event.event_type === 'examination') ||
        (typeFilter === 'planned_holiday' && event.event_type === 'student_holiday') ||
        (typeFilter === 'teacher_preparation' && event.event_type === 'exam_preparation');

      return matchesType && startsBeforeEnd && endsAfterStart;
    });
  }, [events, currentGregorian, typeFilter]);

  // Events for entire academic year (June 1st to May 31st)
  const ayStartDate = useMemo(() => new Date(baseYear, 5, 1), [baseYear]);
  const ayEndDate = useMemo(() => new Date(baseYear + 1, 4, 31, 23, 59, 59), [baseYear]);

  const yearlyEvents = useMemo(() => {
    return events
      .filter((event) => {
        const start = new Date(`${event.start_date}T00:00:00`);
        const end = new Date(`${event.end_date || event.start_date}T00:00:00`);
        const isInAY = start <= ayEndDate && end >= ayStartDate;
        const matchesType =
          typeFilter === 'all' ||
          event.event_type === typeFilter ||
          (typeFilter === 'examinations' && event.event_type === 'examination') ||
          (typeFilter === 'planned_holiday' && event.event_type === 'student_holiday') ||
          (typeFilter === 'teacher_preparation' && event.event_type === 'exam_preparation');

        return isInAY && matchesType;
      })
      .sort((a, b) => new Date(`${a.start_date}T00:00:00`) - new Date(`${b.start_date}T00:00:00`));
  }, [events, ayStartDate, ayEndDate, typeFilter]);

  // Group yearly events by month for clean presentation
  const yearlyEventsGroupedByMonth = useMemo(() => {
    const groups = [];
    for (let idx = 0; idx < 12; idx++) {
      const { year: gYear, month: gMonth } = getGregorianFromAcademic(idx, baseYear);
      const monthStart = new Date(gYear, gMonth, 1);
      const monthEnd = new Date(gYear, gMonth + 1, 0, 23, 59, 59);

      const monthEventsList = yearlyEvents.filter((event) => {
        const start = new Date(`${event.start_date}T00:00:00`);
        const end = new Date(`${event.end_date || event.start_date}T00:00:00`);
        return start <= monthEnd && end >= monthStart;
      });

      if (monthEventsList.length > 0) {
        groups.push({
          academicIndex: idx,
          monthName: new Date(gYear, gMonth, 1).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          }),
          events: monthEventsList,
        });
      }
    }
    return groups;
  }, [yearlyEvents, baseYear]);

  // ----- Mobile Touch Swiping -----
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    if (e.changedTouches && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      const minSwipeDistance = 45;

      // Check if horizontal swipe is dominant
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0) {
          navigateMonth(1);
        } else {
          navigateMonth(-1);
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // ----- CRUD operations -----
  const saveEvent = async (draft) => {
    setSaving(true);

    const startDate = new Date(`${draft.start_date}T00:00:00`);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;

    let calendarRow = calendarMonths.find((row) => row.year === year && row.month === month);

    if (!calendarRow) {
      const totalDays = new Date(year, month - 1, 0).getDate();
      const { data, error } = await supabase
        .from('academic_calendar')
        .insert({
          year,
          month,
          ay: `${year}-${String(year + 1).slice(-2)}`,
          total_days: totalDays,
          working_days: 0,
          teaching_days: 0,
          activity_days: 0,
          weekend_days: 0,
          student_holidays: 0,
          teacher_holidays: 0,
          holidays: 0,
          exam_days: 0,
          day_schedule: daySchedule,
        })
        .select()
        .single();

      if (error) {
        showToast(`Failed to create calendar month: ${error.message}`, 'error');
        setSaving(false);
        return;
      }
      calendarRow = data;
      await loadEvents();
    }

    if (!calendarRow || !calendarRow.id) {
      showToast('Could not find or create a calendar entry for this month.', 'error');
      setSaving(false);
      return;
    }

    const payload = {
      ac_id: calendarRow.id,
      start_date: draft.start_date,
      end_date: draft.end_date || draft.start_date,
      event_type: draft.event_type,
      event_name: (draft.event_name || '').trim(),
      is_teaching_day: Boolean(draft.is_teaching_day),
      is_student_holiday: Boolean(draft.is_student_holiday),
      is_teacher_holiday: Boolean(draft.is_teacher_holiday),
      ignore_attendence: Boolean(draft.ignore_attendence),
      color_code: draft.color_code || '#2563eb',
      updated_at: new Date().toISOString(),
    };

    const isEditingExisting = Boolean(editingEvent && editingEvent.id);
    const request = isEditingExisting
      ? supabase.from('academic_events').update(payload).eq('id', editingEvent.id)
      : supabase.from('academic_events').insert([{ ...payload, created_by: null }]);

    const { error: saveError } = await request;
    if (saveError) {
      showToast(`Failed to save calendar event: ${saveError.message}`, 'error');
    } else {
      showToast('Calendar event saved.', 'success');
      setEditingEvent(null);
      await loadEvents();
    }
    setSaving(false);
  };

  const saveCalendarRules = async () => {
    setSaving(true);
    const { error: rulesError } = await supabase
      .from('academic_calendar')
      .update({
        day_schedule: daySchedule,
      })
      .in(
        'id',
        calendarMonths.map((row) => row.id)
      );
    if (rulesError) showToast(`Failed to save calendar rules: ${rulesError.message}`, 'error');
    else {
      showToast('Calendar rules updated successfully.', 'success');
      setShowRulesModal(false);
      await loadEvents();
    }
    setSaving(false);
  };

  const deleteEvent = (eventOrId) => {
    const eventId = typeof eventOrId === 'object' ? eventOrId.id : eventOrId;
    const eventName = typeof eventOrId === 'object' ? eventOrId.event_name : 'this event';
    setConfirmConfig({
      title: 'Delete Calendar Event',
      message: `Are you sure you want to delete "${eventName}"?\nThis action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setConfirmConfig(null);
        setSaving(true);
        const { error: deleteError } = await supabase
          .from('academic_events')
          .delete()
          .eq('id', eventId);
        if (deleteError) {
          showToast(`Failed to delete event: ${deleteError.message}`, 'error');
        } else {
          showToast('Calendar event deleted.', 'success');
          setEditingEvent(null);
          await loadEvents();
        }
        setSaving(false);
      },
    });
  };

  // ----- Date click handler for quick event creation -----
  const handleDateClick = (date) => {
    if (!canEdit || !date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setEditingEvent({ start_date: dateStr, end_date: dateStr });
  };

  // Apply matrix preset
  const applyPreset = (type) => {
    if (type === 'standard') {
      setDaySchedule({
        Sunday: 'weekly_off',
        Monday: 'teaching',
        Tuesday: 'teaching',
        Wednesday: 'teaching',
        Thursday: 'teaching',
        Friday: 'teaching',
        Saturday: 'activity',
      });
    } else if (type === '6day') {
      setDaySchedule({
        Sunday: 'weekly_off',
        Monday: 'teaching',
        Tuesday: 'teaching',
        Wednesday: 'teaching',
        Thursday: 'teaching',
        Friday: 'teaching',
        Saturday: 'teaching',
      });
    } else if (type === '5day') {
      setDaySchedule({
        Sunday: 'weekly_off',
        Monday: 'teaching',
        Tuesday: 'teaching',
        Wednesday: 'teaching',
        Thursday: 'teaching',
        Friday: 'teaching',
        Saturday: 'weekly_off',
      });
    }
  };

  // Calculate duration in days
  const getEventDuration = (start, end) => {
    if (!start) return 1;
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end || start}T00:00:00`);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  // ----- Renderers -----
  const renderMonthGrid = () => {
    const { year, month } = currentGregorian;
    const cells = getCalendarCells(year, month);

    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="bg-white rounded-2xl border border-light-border shadow-xs overflow-hidden select-none"
      >
        <div className="grid grid-cols-7 bg-gray-50/80 border-b border-light-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((date, index) => {
            const isWeekend = isDateWeekend(date, weeklyOffDays);
            const dayName = date ? WEEK_DAYS[date.getDay()] : null;
            const isDefaultTeaching = dayName ? defaultTeachingDays.includes(dayName) : false;
            const isDefaultActivity = dayName ? activityDays.includes(dayName) : false;

            const rawDayEvents = date
              ? visibleEvents.filter((event) => {
                  const start = new Date(`${event.start_date}T00:00:00`);
                  const end = new Date(`${event.end_date || event.start_date}T00:00:00`);
                  return start <= date && end >= date;
                })
              : [];

            const isStudentHolidayOnDate = rawDayEvents.some(
              (e) =>
                Boolean(e.is_student_holiday) ||
                [
                  'student_holiday',
                  'planned_holiday',
                  'emergency_holiday',
                  'teacher_preparation',
                ].includes(e.event_type) ||
                (Boolean(e.ignore_attendence) && !e.is_teaching_day)
            );
            const isTeacherDutyOnDate = rawDayEvents.some(
              (e) =>
                !e.is_teaching_day &&
                (Boolean(e.is_student_holiday) ||
                  ['student_holiday', 'teacher_preparation'].includes(e.event_type)) &&
                !e.is_teacher_holiday &&
                !['planned_holiday', 'emergency_holiday'].includes(e.event_type)
            );

            // Weekend rule: do not display the event on weekend if it is a holiday or if all 3 toggles are OFF
            const dayEvents = rawDayEvents.filter((event) => {
              if (!isWeekend) return true;
              const isHoliday =
                event.is_student_holiday || event.is_teacher_holiday || event.ignore_attendence;
              const isAllThreeOff =
                !event.is_teaching_day &&
                !event.is_student_holiday &&
                !event.is_teacher_holiday &&
                !event.ignore_attendence;
              if (isHoliday || isAllThreeOff) {
                return false;
              }
              return true;
            });

            const hasEvents = dayEvents.length > 0;

            // Background determination with Activity Day support
            let cellBgClass = 'bg-white rounded-xl';
            if (date) {
              if (isWeekend) {
                cellBgClass =
                  'bg-red-50/70 hover:bg-red-100/70 border-red-200/80 text-red-600 rounded-xl cursor-pointer';
              } else if (isDefaultTeaching && !hasEvents) {
                cellBgClass =
                  'bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200/70 rounded-xl cursor-pointer';
              } else if (isDefaultActivity && !hasEvents) {
                cellBgClass =
                  'bg-violet-50/60 hover:bg-violet-100/60 border-violet-200/70 rounded-xl cursor-pointer';
              } else {
                cellBgClass =
                  'bg-white hover:bg-gray-50/90 border-blue-200/60 rounded-xl cursor-pointer';
              }
            }

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`min-h-[72px] sm:min-h-[88px] border p-1.5 transition-colors flex flex-col justify-between ${cellBgClass}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black ${
                      isWeekend
                        ? 'text-red-600'
                        : isDefaultTeaching && !hasEvents
                          ? 'text-emerald-700 font-black'
                          : isDefaultActivity && !hasEvents
                            ? 'text-violet-700 font-black'
                            : 'text-gray-500'
                    }`}
                  >
                    {date?.getDate() || ''}
                  </span>
                  {date && (
                    <div className="flex items-center gap-1 text-[10px]">
                      {isStudentHolidayOnDate && (
                        <i
                          className="fa-solid fa-users-slash text-red-500"
                          title="Student Holiday"
                        />
                      )}
                      {isTeacherDutyOnDate && (
                        <i
                          className="fa-solid fa-person-chalkboard text-emerald-600"
                          title="Non-Teaching Day / Teachers on duty"
                        />
                      )}
                      {isDefaultActivity && !hasEvents && !isWeekend && (
                        <span
                          className="text-[8px] font-extrabold text-violet-600 bg-violet-100/80 px-1 rounded-sm"
                          title="Activity Day"
                        >
                          Activity
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 mt-0.5 flex-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canEdit) setEditingEvent(event);
                      }}
                      className="truncate rounded-sm px-1 py-0.5 text-[8px] font-bold text-white leading-tight cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: event.color_code || '#2563eb' }}
                      title={event.event_name}
                    >
                      {event.event_name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const year = baseYear;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 12 }, (_, idx) => {
          const { year: gYear, month: gMonth } = getGregorianFromAcademic(idx, year);
          const monthEvents = events.filter((event) => {
            const start = new Date(`${event.start_date}T00:00:00`);
            const end = new Date(`${event.end_date || event.start_date}T00:00:00`);
            return (
              start <= new Date(gYear, gMonth + 1, 0) &&
              end >= new Date(gYear, gMonth, 1) &&
              (typeFilter === 'all' || event.event_type === typeFilter)
            );
          });
          const summaryForMonth = computeMonthSummary(
            gYear,
            gMonth + 1,
            events,
            weeklyOffDays,
            defaultTeachingDays,
            activityDays
          );
          const cells = getCalendarCells(gYear, gMonth);

          return (
            <div
              key={idx}
              onClick={() => {
                setAcademicIndex(idx);
                setViewMode('month');
              }}
              className="bg-white rounded-2xl border border-light-border shadow-xs hover:shadow-md hover:border-brand-primary/40 transition-all p-3 cursor-pointer group"
              title={`Click to open ${new Date(gYear, gMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-black text-dark-primary group-hover:text-brand-primary transition-colors flex items-center gap-1.5">
                  <span>
                    {new Date(gYear, gMonth, 1).toLocaleDateString(undefined, { month: 'long' })}
                  </span>
                  <i className="fas fa-arrow-up-right-from-square text-[10px] text-gray-300 group-hover:text-brand-primary transition-colors" />
                </h2>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {summaryForMonth.teaching_days} teaching
                  </span>
                  {summaryForMonth.activity_days > 0 && (
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full">
                      {summaryForMonth.activity_days} act
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <span key={i} className="text-[8px] font-black text-gray-300">
                    {day}
                  </span>
                ))}
                {cells.map((date, i) => {
                  const isWeekend = isDateWeekend(date, weeklyOffDays);
                  const dayName = date ? WEEK_DAYS[date.getDay()] : null;
                  const isDefaultTeaching = dayName ? defaultTeachingDays.includes(dayName) : false;
                  const isDefaultActivity = dayName ? activityDays.includes(dayName) : false;

                  const dayEvents = date
                    ? monthEvents.filter((event) => {
                        const start = new Date(`${event.start_date}T00:00:00`);
                        const end = new Date(`${event.end_date || event.start_date}T00:00:00`);
                        return start <= date && end >= date;
                      })
                    : [];

                  const visibleDayEvents = dayEvents.filter((event) => {
                    if (!isWeekend) return true;
                    const isHoliday =
                      event.is_student_holiday ||
                      event.is_teacher_holiday ||
                      event.ignore_attendence;
                    const isAllThreeOff =
                      !event.is_teaching_day &&
                      !event.is_student_holiday &&
                      !event.is_teacher_holiday &&
                      !event.ignore_attendence;
                    if (isHoliday || isAllThreeOff) return false;
                    return true;
                  });

                  const activeEvent = visibleDayEvents[0];
                  const color = activeEvent?.color_code;

                  let dateClasses = 'text-gray-700 hover:bg-gray-100';
                  if (activeEvent) {
                    dateClasses = 'shadow-2xs font-extrabold';
                  } else if (isWeekend) {
                    dateClasses = 'text-red-500 bg-red-100/60 font-black';
                  } else if (isDefaultTeaching && !dayEvents.length) {
                    dateClasses =
                      'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/60 font-bold';
                  } else if (isDefaultActivity && !dayEvents.length) {
                    dateClasses =
                      'text-violet-700 bg-violet-50/70 hover:bg-violet-100/60 font-bold';
                  }

                  return (
                    <span
                      key={i}
                      style={color ? { backgroundColor: color, color: '#ffffff' } : {}}
                      title={
                        activeEvent
                          ? `${date?.toLocaleDateString()}: ${activeEvent.event_name}`
                          : isDefaultActivity && !dayEvents.length
                            ? `${date?.toLocaleDateString()}: Activity Day`
                            : ''
                      }
                      className={`min-h-6 rounded-md flex items-center justify-center text-[9px] font-bold transition-all ${
                        date ? dateClasses : 'text-transparent'
                      }`}
                    >
                      {date?.getDate() || ''}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ----- Events Only View (Entire Academic Year List) -----
  const renderEventsOnlyView = () => {
    return (
      <div className="space-y-6">
        {/* Header Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-light-border shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black">
              <i className="fas fa-list-check" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-dark-primary">
                All Academic Events (AY {getAcademicYearLabel(baseYear)})
              </h2>
              <p className="text-xs font-semibold text-gray-400">
                {yearlyEvents.length} {yearlyEvents.length === 1 ? 'event' : 'events'} found across
                the entire academic year.
              </p>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditingEvent({})}
              className="px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-black inline-flex items-center gap-1.5 shadow-xs hover:bg-brand-primary/90 transition cursor-pointer self-start sm:self-auto"
            >
              <i className="fas fa-plus text-xs" /> Add New Event
            </button>
          )}
        </div>

        {/* Grouped Month Timeline */}
        {yearlyEventsGroupedByMonth.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-light-border p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center text-xl">
              <i className="fas fa-calendar-xmark" />
            </div>
            <h3 className="text-sm font-black text-dark-primary">
              No events found for AY {getAcademicYearLabel(baseYear)}
            </h3>
            <p className="text-xs font-semibold text-gray-400 max-w-sm mx-auto">
              There are no scheduled events matching the selected filter in this academic year.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditingEvent({})}
                className="mt-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-brand-primary/90 transition"
              >
                <i className="fas fa-plus text-xs" /> Create First Event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {yearlyEventsGroupedByMonth.map((group) => (
              <div key={group.monthName} className="space-y-3">
                {/* Month Group Header */}
                <div className="flex items-center justify-between border-b border-light-border pb-2 px-1">
                  <h3
                    onClick={() => {
                      setAcademicIndex(group.academicIndex);
                      setViewMode('month');
                    }}
                    className="text-xs sm:text-sm font-black text-dark-primary flex items-center gap-2 cursor-pointer hover:text-brand-primary transition-colors group"
                  >
                    <i className="fas fa-calendar-day text-brand-primary" />
                    <span>{group.monthName}</span>
                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-brand-primary transition-colors">
                      ({group.events.length} {group.events.length === 1 ? 'event' : 'events'})
                    </span>
                    <i className="fas fa-arrow-up-right-from-square text-[9px] text-gray-300 group-hover:text-brand-primary transition-colors" />
                  </h3>
                </div>

                {/* Event Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.events.map((event) => {
                    const eventCfg = CALENDAR_EVENT_CONFIGS[event.event_type];
                    const durationDays = getEventDuration(event.start_date, event.end_date);

                    return (
                      <div
                        key={event.id}
                        className="bg-white rounded-2xl border border-light-border p-4 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
                        style={{
                          borderLeftColor: event.color_code || '#2563eb',
                          borderLeftWidth: 5,
                        }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-black text-dark-primary">
                                {event.event_name}
                              </h4>
                              <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: event.color_code || '#2563eb' }}
                                />
                                <span>
                                  {eventCfg?.label ||
                                    CALENDAR_EVENT_TYPES.find((t) => t.value === event.event_type)
                                      ?.label ||
                                    'Event'}
                                </span>
                              </p>
                            </div>

                            {canEdit && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingEvent(event)}
                                  title="Edit event"
                                  className="w-7 h-7 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer flex items-center justify-center"
                                >
                                  <i className="fas fa-edit text-xs" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteEvent(event)}
                                  title="Delete event"
                                  className="w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer flex items-center justify-center"
                                >
                                  <i className="fas fa-trash text-xs" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Date Range & Duration */}
                          <div className="flex items-center gap-2 text-xs font-bold text-brand-primary">
                            <i className="far fa-clock text-[11px]" />
                            <span>
                              {formatDate(event.start_date)}
                              {event.end_date && event.end_date !== event.start_date
                                ? ` – ${formatDate(event.end_date)}`
                                : ''}
                            </span>
                            <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded-md">
                              {durationDays} {durationDays === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>

                        {/* Impact Tags */}
                        <div className="mt-3 pt-2.5 border-t border-light-border/60 flex flex-wrap gap-1.5 items-center">
                          {event.is_teaching_day && (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              👨‍🏫 Teaching Day
                            </span>
                          )}
                          {event.is_student_holiday && (
                            <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              🎓 Student Holiday
                            </span>
                          )}
                          {event.is_teacher_holiday && (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              🧑‍🏫 Teacher Holiday
                            </span>
                          )}
                          {event.ignore_attendence && (
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              ⏱️ Ignore Attendance
                            </span>
                          )}
                          {!event.is_student_holiday &&
                            !event.is_teacher_holiday &&
                            !event.ignore_attendence && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                📋 Attendance Required
                              </span>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ----- Main JSX -----
  return (
    <div className="min-h-[calc(100vh-160px)] bg-light-bg p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
        {/* Responsive Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-light-border shadow-xs">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-2xl font-black text-dark-primary flex items-center gap-2 tracking-tight">
              <i className="fas fa-calendar-days text-brand-primary" /> Academic Calendar
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View Mode Toggle (Monthly / Yearly / Events Only) */}
            <div className="flex rounded-xl border border-light-border bg-gray-50/80 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-dark-soft hover:text-dark-primary'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setViewMode('year')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === 'year'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-dark-soft hover:text-dark-primary'
                }`}
              >
                Yearly
              </button>
              <button
                type="button"
                onClick={() => setViewMode('events')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === 'events'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-dark-soft hover:text-dark-primary'
                }`}
              >
                Events Only
              </button>
            </div>

            {/* Filter Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary focus:border-brand-primary outline-none cursor-pointer"
            >
              <option value="all">All Event Types</option>
              {CALENDAR_EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Settings Icon / Calendar Rules Modal Trigger */}
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                title="Calendar Rules & Day Matrix"
                className="h-9 px-3 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:border-brand-primary/30 text-xs font-black inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <i className="fas fa-gear text-xs text-brand-primary" />
                <span className="hidden sm:inline">Rules</span>
              </button>
            )}

            {/* Add Event Button */}
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditingEvent({})}
                className="h-9 px-3.5 rounded-xl bg-brand-primary text-white text-xs font-black inline-flex items-center gap-1.5 shadow-xs hover:bg-brand-primary/90 transition cursor-pointer ml-auto sm:ml-0"
              >
                <i className="fas fa-plus text-xs" /> <span>Add Event</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats Tiles (Monthly or Cumulative Academic Year) */}
        {((viewMode === 'month' && monthSummary) ||
          ((viewMode === 'year' || viewMode === 'events') && yearSummary)) &&
          (() => {
            const currentSummary = viewMode === 'month' ? monthSummary : yearSummary;
            const isYearly = viewMode === 'year' || viewMode === 'events';
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-dark-soft flex items-center gap-1.5">
                    <i
                      className={`fas ${isYearly ? 'fa-chart-pie text-brand-primary' : 'fa-calendar-day text-brand-primary'}`}
                    />
                    {isYearly
                      ? `Cumulative Summary (AY ${getAcademicYearLabel(baseYear)})`
                      : `Monthly Summary (${new Date(currentGregorian.year, currentGregorian.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })})`}
                  </span>
                  {isYearly && (
                    <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                      12 Months Total
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
                  {[
                    ['📅 Total Days', currentSummary.total_days, 'text-blue-600'],
                    ['💼 Working Days', currentSummary.working_days, 'text-emerald-600'],
                    ['📖 Teaching Days', currentSummary.teaching_days, 'text-indigo-600'],
                    ['🎨 Activity Days', currentSummary.activity_days || 0, 'text-violet-600'],
                    ['🌙 Weekends', currentSummary.weekend_days, 'text-purple-600'],
                    ['🎓 Student Hols', currentSummary.student_holidays || 0, 'text-rose-600'],
                    ['🧑‍🏫 Teacher Hols', currentSummary.teacher_holidays || 0, 'text-amber-600'],
                    ['🎯 Examinations', currentSummary.exam_days || 0, 'text-teal-600'],
                  ].map(([label, value, color]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-light-border bg-white px-3 py-2.5 shadow-xs hover:shadow-sm transition"
                    >
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 truncate">
                        {label}
                      </p>
                      <p className={`text-base sm:text-lg font-black mt-0.5 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {/* Navigation Bar Above Content */}
        {viewMode === 'month' ? (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-light-border px-3 sm:px-4 py-2.5 shadow-xs">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:border-brand-primary/30 flex items-center justify-center transition cursor-pointer"
              title="Previous Month (or swipe right)"
            >
              <i className="fas fa-chevron-left text-xs" />
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
              <span className="text-sm sm:text-base font-black text-dark-primary tracking-tight">
                {new Date(currentGregorian.year, currentGregorian.month, 1).toLocaleDateString(
                  undefined,
                  { month: 'long' }
                )}{' '}
                {currentGregorian.year}
              </span>
              <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                AY {getAcademicYearLabel(baseYear)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:border-brand-primary/30 flex items-center justify-center transition cursor-pointer"
              title="Next Month (or swipe left)"
            >
              <i className="fas fa-chevron-right text-xs" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-light-border px-3 sm:px-4 py-2.5 shadow-xs">
            <button
              type="button"
              onClick={() => navigateYear(-1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:border-brand-primary/30 flex items-center justify-center transition cursor-pointer"
              title="Previous Academic Year"
            >
              <i className="fas fa-chevron-left text-xs" />
            </button>
            <div className="flex items-center gap-2 text-center">
              <span className="text-sm sm:text-base font-black text-dark-primary tracking-tight">
                Academic Year {getAcademicYearLabel(baseYear)}
              </span>
              {viewMode === 'events' && (
                <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                  Events View
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigateYear(1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:border-brand-primary/30 flex items-center justify-center transition cursor-pointer"
              title="Next Academic Year"
            >
              <i className="fas fa-chevron-right text-xs" />
            </button>
          </div>
        )}

        {/* Main Content Branch */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-light-border p-12 text-center text-xs font-bold text-gray-400">
            <i className="fas fa-spinner fa-spin mr-2" />
            Loading calendar...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-xs font-bold text-red-700">
            Unable to load calendar: {error}
          </div>
        ) : viewMode === 'events' ? (
          renderEventsOnlyView()
        ) : viewMode === 'year' ? (
          renderYearView()
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {renderMonthGrid()}

            {visibleEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-light-border p-8 text-center text-xs font-bold text-gray-400">
                No calendar events for this month.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white rounded-2xl border border-light-border p-4 shadow-xs hover:shadow-sm transition"
                    style={{ borderLeftColor: event.color_code || '#2563eb', borderLeftWidth: 5 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black text-dark-primary">
                          {event.event_name}
                        </h2>
                        <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: event.color_code || '#2563eb' }}
                          />
                          <span>
                            {CALENDAR_EVENT_TYPES.find((t) => t.value === event.event_type)?.label ||
                              'Event'}
                          </span>
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingEvent(event)}
                            title="Edit event"
                            className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEvent(event)}
                            title="Delete event"
                            className="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-brand-primary mt-2">
                      {formatDate(event.start_date)}
                      {event.end_date && event.end_date !== event.start_date
                        ? ` – ${formatDate(event.end_date)}`
                        : ''}
                    </p>
                    <p className="text-xs font-semibold text-dark-soft mt-2 leading-relaxed flex flex-wrap gap-1.5 items-center">
                      {event.is_teaching_day && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          👨‍🏫 Teaching Day
                        </span>
                      )}
                      {event.is_student_holiday && (
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          🎓 Student Holiday
                        </span>
                      )}
                      {event.is_teacher_holiday && (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          🧑‍🏫 Teacher Holiday
                        </span>
                      )}
                      {event.ignore_attendence && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          ⏱️ Ignore Attendance
                        </span>
                      )}
                      {!event.is_student_holiday &&
                        !event.is_teacher_holiday &&
                        !event.ignore_attendence && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            📋 Attendance Required
                          </span>
                        )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Rules Settings Modal (Matrix Grid) */}
      {canEdit && showRulesModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRulesModal(false);
          }}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-dark-almostblack/45 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-light-border bg-white shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-light-border">
              <div>
                <h3 className="text-base font-black text-dark-primary flex items-center gap-2">
                  <i className="fas fa-sliders text-brand-primary" /> Calendar Rules & Day Matrix
                </h3>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">
                  Assign each weekday to a single classification (Teaching, Activity, or Weekly
                  Off).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-9 h-9 rounded-xl border border-light-border text-gray-400 hover:text-dark-primary flex items-center justify-center cursor-pointer"
              >
                <i className="fas fa-xmark" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Presets */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block mb-2">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('standard')}
                    className="px-3 py-1.5 rounded-xl border border-light-border bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary/30 text-xs font-bold text-dark-primary transition cursor-pointer"
                  >
                    ⚡ Mon–Fri Teaching, Sat Activity, Sun Off
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('6day')}
                    className="px-3 py-1.5 rounded-xl border border-light-border bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary/30 text-xs font-bold text-dark-primary transition cursor-pointer"
                  >
                    ⚡ 6-Day Teaching (Mon–Sat)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('5day')}
                    className="px-3 py-1.5 rounded-xl border border-light-border bg-gray-50 hover:bg-brand-primary/10 hover:border-brand-primary/30 text-xs font-bold text-dark-primary transition cursor-pointer"
                  >
                    ⚡ 5-Day Teaching (Sat–Sun Off)
                  </button>
                </div>
              </div>

              {/* Matrix Grid */}
              <div className="rounded-2xl border border-light-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/90 border-b border-light-border text-[11px] font-black text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Day</th>
                      <th className="py-3 px-3 text-center text-emerald-700">📖 Teaching</th>
                      <th className="py-3 px-3 text-center text-violet-700">🎨 Activity</th>
                      <th className="py-3 px-3 text-center text-rose-700">🌙 Weekly Off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border">
                    {WEEK_DAYS.map((day) => {
                      const currentVal = daySchedule[day] || 'teaching';
                      return (
                        <tr
                          key={day}
                          className="hover:bg-gray-50/50 transition text-xs font-bold text-dark-primary"
                        >
                          <td className="py-3 px-4 font-black flex items-center gap-2">
                            <span>{day}</span>
                          </td>

                          {/* Teaching Day Radio */}
                          <td className="py-3 px-3 text-center">
                            <label className="inline-flex items-center justify-center p-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`day-class-${day}`}
                                checked={currentVal === 'teaching'}
                                onChange={() =>
                                  setDaySchedule((prev) => ({ ...prev, [day]: 'teaching' }))
                                }
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </label>
                          </td>

                          {/* Activity Day Radio */}
                          <td className="py-3 px-3 text-center">
                            <label className="inline-flex items-center justify-center p-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`day-class-${day}`}
                                checked={currentVal === 'activity'}
                                onChange={() =>
                                  setDaySchedule((prev) => ({ ...prev, [day]: 'activity' }))
                                }
                                className="w-4 h-4 text-violet-600 focus:ring-violet-500 cursor-pointer"
                              />
                            </label>
                          </td>

                          {/* Weekly Off Radio */}
                          <td className="py-3 px-3 text-center">
                            <label className="inline-flex items-center justify-center p-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`day-class-${day}`}
                                checked={currentVal === 'weekly_off'}
                                onChange={() =>
                                  setDaySchedule((prev) => ({ ...prev, [day]: 'weekly_off' }))
                                }
                                className="w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                              />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Schedule Summary Pills */}
              <div className="bg-light-bg rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-dark-soft">
                  <span className="font-bold">📖 Teaching Days:</span>
                  <span className="font-black text-emerald-700">
                    {defaultTeachingDays.join(', ') || 'None'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-dark-soft">
                  <span className="font-bold">🎨 Activity Days:</span>
                  <span className="font-black text-violet-700">
                    {activityDays.join(', ') || 'None'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-dark-soft">
                  <span className="font-bold">🌙 Weekly Off Days:</span>
                  <span className="font-black text-rose-700">
                    {weeklyOffDays.join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-light-border bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 rounded-xl border border-light-border text-xs font-bold text-dark-soft hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCalendarRules}
                disabled={saving || weeklyOffDays.length === 0}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black shadow-xs hover:bg-brand-primary/90 disabled:opacity-50 transition cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Matrix Rules'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Event Edit/Add */}
      {canEdit && editingEvent && (
        <AcademicCalendarEventModal
          event={editingEvent}
          academicYear={getAcademicYearLabel(baseYear)}
          onClose={() => setEditingEvent(null)}
          onSave={saveEvent}
          onDelete={deleteEvent}
          saving={saving}
        />
      )}

      {/* Confirmation Modal */}
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

export default AcademicCalendarView;
