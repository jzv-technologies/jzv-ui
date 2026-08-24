import React, { useEffect, useState } from 'react';

// Exactly 12 unique colors – balanced spectrum
export const CALENDAR_COLOR_NAMES = {
  ORANGE: '#ff7f00',
  BROWN: '#923402ff',
  MAGENTA: '#e829bbff',
  PURPLE: '#811c9cff',
  RED: '#e31a1c',
  INDIGO: '#390090ff',
  BLUE: '#134bd8ff',
  TEAL: '#168999ff',
  YELLOW: '#eae440ff',
  OLIVE_GOLD: '#aaaa06ff',
  LIME_GREEN: '#73f700ff',
  FOREST_GREEN: '#0a7502ff',
};

export const CALENDAR_COLORS = Object.values(CALENDAR_COLOR_NAMES);

export const CALENDAR_EVENT_CONFIGS = {
  planned_holiday: {
    label: 'Planned Holiday',
    is_student_holiday: true,
    is_teacher_holiday: true,
    is_teaching_day: false,
    color_code: CALENDAR_COLOR_NAMES.RED,
  },
  emergency_holiday: {
    label: 'Emergency Holiday',
    is_student_holiday: true,
    is_teacher_holiday: true,
    is_teaching_day: false,
    color_code: CALENDAR_COLOR_NAMES.ORANGE,
  },
  event_day: {
    label: 'Event Day',
    is_student_holiday: false,
    is_teacher_holiday: false,
    is_teaching_day: false,
    color_code: CALENDAR_COLOR_NAMES.TEAL,
  },
  event_preparation: {
    label: 'Event Preparation',
    is_student_holiday: false,
    is_teacher_holiday: false,
    is_teaching_day: false,
    color_code: CALENDAR_COLOR_NAMES.YELLOW,
  },

  examinations: {
    label: 'Examinations',
    is_student_holiday: false,
    is_teacher_holiday: false,
    is_teaching_day: false,
    color_code: CALENDAR_COLOR_NAMES.FOREST_GREEN,
  },
  teacher_preparation: {
    label: 'Teacher Preperation',
    is_student_holiday: true,
    is_teacher_holiday: false,
    is_teaching_day: false,
    color_code: CALENDAR_COLOR_NAMES.BLUE,
  },

  parents_meeting: {
    label: 'Parents Meeting',
    is_student_holiday: false,
    is_teacher_holiday: false,
    is_teaching_day: false,
    color_code: CALENDAR_COLOR_NAMES.OLIVE_GOLD,
  },
};

export const CALENDAR_EVENT_TYPES = Object.entries(CALENDAR_EVENT_CONFIGS).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

// ----- Toggle Switch Component -----
const ToggleSwitch = ({ value, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={onChange}
    className={`
      relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
      transition-colors duration-200 ease-in-out 
      ${value ? 'bg-brand-primary' : 'bg-gray-200'}
    `}
  >
    <span
      className={`
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0
        transition duration-200 ease-in-out
        ${value ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

// ----- Date Range Picker Component (Single Calendar) -----
const DateRangePicker = ({ startDate, endDate, onSelectRange, onClose }) => {
  const pickerRef = React.useRef(null);
  const [viewDate, setViewDate] = useState(() => (startDate ? new Date(startDate) : new Date()));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDay = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const handleDateClick = (day) => {
    const selected = new Date(year, month, day);
    if (!startDate || (startDate && endDate)) {
      onSelectRange(selected, null);
    } else {
      if (selected < startDate) {
        onSelectRange(selected, startDate);
      } else {
        onSelectRange(startDate, selected);
      }
    }
  };

  const handleDoubleClick = (day, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const selected = new Date(year, month, day);
    if (startDate && !endDate && selected >= startDate) {
      onSelectRange(startDate, selected);
    } else {
      onSelectRange(selected, selected);
    }
    onClose();
  };

  const totalDays = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const cells = Array.from({ length: firstDay + totalDays }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const isInRange = (day) => {
    if (!startDate || !endDate) return false;
    const d = new Date(year, month, day);
    return d > startDate && d < endDate;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div
      ref={pickerRef}
      className="absolute left-0 top-full mt-2 p-4 bg-white rounded-2xl shadow-2xl border border-light-border w-80 max-w-[95vw] z-[150]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-7 h-7 rounded-lg border border-light-border text-gray-500 hover:text-dark-primary flex items-center justify-center text-xs cursor-pointer"
        >
          <i className="fas fa-chevron-left" />
        </button>
        <span className="text-xs font-black text-dark-primary">
          {monthName} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg border border-light-border text-gray-500 hover:text-dark-primary flex items-center justify-center text-xs cursor-pointer"
          >
            <i className="fas fa-chevron-right" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-light-border text-gray-400 hover:text-dark-primary flex items-center justify-center text-xs ml-1 cursor-pointer"
            title="Close date picker"
          >
            <i className="fas fa-xmark" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] font-black text-gray-400">
        {weekDays.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const cellDate = new Date(year, month, day);
          const start = isSameDay(cellDate, startDate);
          const end = isSameDay(cellDate, endDate);
          const inRange = isInRange(day);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(day)}
              onDoubleClick={(e) => handleDoubleClick(day, e)}
              className={`
                h-9 w-full rounded-lg text-xs font-bold transition-colors relative cursor-pointer
                ${start || end ? 'bg-brand-primary text-white font-black shadow-xs' : ''}
                ${inRange ? 'bg-brand-primary/15 text-brand-primary font-bold' : ''}
                ${!start && !end && !inRange ? 'text-gray-700 hover:bg-gray-100' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected range display & actions */}
      <div className="mt-3 pt-3 border-t border-light-border flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold text-dark-primary truncate">
          {startDate ? formatDate(startDate) : 'Select Start'}
          {endDate && ` → ${formatDate(endDate)}`}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectRange(null, null)}
            className="px-2 py-1 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-black hover:bg-brand-primary/90 cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const getMatchingEventType = (event) => {
  if (!event) return '';
  const rawType = event.event_type;

  // 1. Direct match in CALENDAR_EVENT_CONFIGS
  if (rawType && CALENDAR_EVENT_CONFIGS[rawType]) {
    return rawType;
  }

  // 2. Specific matching based on event name and toggles
  const name = (event.event_name || event.title || '').toLowerCase();
  if (name.includes('parent') || name.includes('ptm') || name.includes('meeting')) {
    return 'parents_meeting';
  }
  if (name.includes('teacher prep') || name.includes('lesson plan')) {
    return 'teacher_preparation';
  }
  if (name.includes('event prep') || name.includes('annual prep') || name.includes('sports prep')) {
    return 'event_preparation';
  }
  if (name.includes('exam') || name.includes('test') || name.includes('assessment')) {
    if (rawType === 'examination' || rawType === 'examinations') return 'examinations';
    if (event.is_student_holiday) {
      if (!event.is_teacher_holiday) return 'teacher_preparation';
      return 'planned_holiday';
    }
    return 'examinations';
  }
  if (
    name.includes('emergency') ||
    name.includes('rain') ||
    name.includes('bandh') ||
    name.includes('strike')
  ) {
    return 'emergency_holiday';
  }

  // 3. Fallback based on raw event_type from DB
  if (rawType === 'examination' || rawType === 'examinations') {
    return 'examinations';
  }
  if (rawType === 'teacher_preparation' || rawType === 'exam_preparation') {
    return 'teacher_preparation';
  }
  if (rawType === 'event_preparation') {
    return 'event_preparation';
  }
  if (rawType === 'parents_meeting') {
    return 'parents_meeting';
  }
  if (rawType === 'event_day') {
    return 'event_day';
  }
  if (
    [
      'planned_holiday',
      'festival_holiday',
      'annual_holiday',
      'public_holiday',
      'jamia_declared_holiday',
      'holiday',
      'exam_holiday',
      'exam_correction',
    ].includes(rawType)
  ) {
    return 'planned_holiday';
  }
  if (rawType === 'emergency_holiday') {
    return 'emergency_holiday';
  }
  if (rawType === 'student_holiday') {
    if (!event.is_teacher_holiday && event.is_student_holiday) {
      return 'teacher_preparation';
    }
    return 'planned_holiday';
  }
  if (rawType === 'other') {
    return 'event_day';
  }

  return '';
};

// ----- Main Modal -----
const DEFAULT_EVENT = {
  event_type: '',
  event_name: '',
  start_date: '',
  end_date: '',
  is_teaching_day: false,
  is_student_holiday: false,
  is_teacher_holiday: false,
  color_code: CALENDAR_COLOR_NAMES.RED,
};

const AcademicCalendarEventModal = ({
  event,
  academicYear,
  onClose,
  onSave,
  onDelete,
  saving = false,
}) => {
  const [draft, setDraft] = useState(DEFAULT_EVENT);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [startDateObj, setStartDateObj] = useState(null);
  const [endDateObj, setEndDateObj] = useState(null);

  useEffect(() => {
    const start = event?.start_date ? new Date(`${event.start_date}T00:00:00`) : null;
    const end = event?.end_date ? new Date(`${event.end_date}T00:00:00`) : start;
    const isExisting = Boolean(event?.id);
    const initialType = isExisting
      ? getMatchingEventType(event)
      : event?.event_type && CALENDAR_EVENT_CONFIGS[event.event_type]
        ? event.event_type
        : '';
    const cfg = CALENDAR_EVENT_CONFIGS[initialType];

    setStartDateObj(start);
    setEndDateObj(end);
    setDraft({
      ...DEFAULT_EVENT,
      ...event,
      event_type: initialType,
      event_name: event?.event_name || event?.title || '',
      start_date: event?.start_date || '',
      end_date: event?.end_date || event?.start_date || '',
      is_teaching_day: isExisting
        ? Boolean(event.is_teaching_day)
        : (cfg?.is_teaching_day ?? false),
      is_student_holiday: isExisting
        ? Boolean(event.is_student_holiday)
        : (cfg?.is_student_holiday ?? false),
      is_teacher_holiday: isExisting
        ? Boolean(event.is_teacher_holiday)
        : (cfg?.is_teacher_holiday ?? false),
      color_code: event?.color_code || cfg?.color_code || CALENDAR_COLOR_NAMES.RED,
    });
  }, [event, academicYear]);

  const update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const handleEventTypeChange = (newType) => {
    const cfg = CALENDAR_EVENT_CONFIGS[newType];
    setDraft((prev) => ({
      ...prev,
      event_type: newType,
      ...(cfg
        ? {
            is_student_holiday: cfg.is_student_holiday,
            is_teacher_holiday: cfg.is_teacher_holiday,
            is_teaching_day: cfg.is_teaching_day,
            color_code: cfg.color_code,
          }
        : {}),
    }));
  };

  const handleRangeSelect = (start, end) => {
    setStartDateObj(start);
    setEndDateObj(end);
    if (start) {
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      update('start_date', `${year}-${month}-${day}`);
    } else {
      update('start_date', '');
    }
    if (end) {
      const year = end.getFullYear();
      const month = String(end.getMonth() + 1).padStart(2, '0');
      const day = String(end.getDate()).padStart(2, '0');
      update('end_date', `${year}-${month}-${day}`);
    } else {
      update('end_date', start ? draft.start_date : '');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.event_type || !draft.event_name.trim() || !draft.start_date) return;
    onSave({
      ...draft,
      event_name: draft.event_name.trim(),
      end_date: draft.end_date || draft.start_date,
    });
  };

  const displayRange = () => {
    if (!startDateObj) return 'Select date range';
    if (startDateObj && !endDateObj) return startDateObj.toLocaleDateString();
    if (startDateObj && endDateObj && startDateObj.getTime() === endDateObj.getTime()) {
      return startDateObj.toLocaleDateString();
    }
    return `${startDateObj.toLocaleDateString()} – ${endDateObj.toLocaleDateString()}`;
  };

  const toggleTeachingDay = () => {
    setDraft((prev) => {
      const nextVal = !prev.is_teaching_day;
      if (nextVal) {
        return {
          ...prev,
          is_teaching_day: true,
          is_student_holiday: false,
          is_teacher_holiday: false,
        };
      }
      return {
        ...prev,
        is_teaching_day: false,
      };
    });
  };

  const toggleStudentHoliday = () => {
    setDraft((prev) => {
      const nextVal = !prev.is_student_holiday;
      if (nextVal) {
        return {
          ...prev,
          is_student_holiday: true,
          is_teaching_day: false,
        };
      }
      return {
        ...prev,
        is_student_holiday: false,
      };
    });
  };

  const toggleTeacherHoliday = () => {
    setDraft((prev) => {
      const nextVal = !prev.is_teacher_holiday;
      if (nextVal) {
        return {
          ...prev,
          is_teacher_holiday: true,
          is_teaching_day: false,
        };
      }
      return {
        ...prev,
        is_teacher_holiday: false,
      };
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDatePicker) {
          setShowDatePicker(false);
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDatePicker, onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-dark-almostblack/45 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-3xl border border-light-border bg-white shadow-2xl relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-border rounded-t-3xl">
          <div>
            <h3 className="text-base font-black text-dark-primary">
              {event?.id ? 'Edit Calendar Event' : 'Add Calendar Event'}
            </h3>
            <p className="text-xs font-bold text-gray-400">
              Add an event to the academic calendar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-light-border text-gray-400 hover:text-dark-primary flex items-center justify-center cursor-pointer"
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Event name */}
          <label className="text-xs font-bold text-dark-soft block">
            Event name
            <input
              required
              value={draft.event_name}
              onChange={(e) => update('event_name', e.target.value)}
              placeholder="e.g., Independence Day, Mid-term Examination"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-light-border text-xs font-semibold outline-none focus:border-brand-primary"
            />
          </label>

          {/* Event type */}
          <label className="text-xs font-bold text-dark-soft block">
            Event type <span className="text-red-500">*</span>
            <select
              required
              value={draft.event_type}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-light-border text-xs font-semibold outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="" disabled>
                -- Select Event Type --
              </option>
              {CALENDAR_EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          {/* ----- Date Range Picker ----- */}
          <div className="relative">
            <label className="text-xs font-bold text-dark-soft block mb-1">Date Range</label>
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full px-3 py-2.5 rounded-xl border border-light-border text-xs font-semibold text-left flex items-center justify-between hover:bg-gray-50 cursor-pointer"
            >
              <span className={startDateObj ? 'text-dark-primary font-bold' : 'text-gray-400'}>
                {displayRange()}
              </span>
              <i className="fas fa-calendar-alt text-gray-400" />
            </button>

            {showDatePicker && (
              <div className="absolute left-0 mt-1 z-50">
                <DateRangePicker
                  startDate={startDateObj}
                  endDate={endDateObj}
                  onSelectRange={handleRangeSelect}
                  onClose={() => setShowDatePicker(false)}
                />
              </div>
            )}
          </div>

          {/* ----- Impact Section (Toggle Switches) ----- */}
          <div className="space-y-3 pt-1">
            <p className="text-xs font-bold text-dark-soft">Impact</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Teaching Day</span>
                <ToggleSwitch value={draft.is_teaching_day} onChange={toggleTeachingDay} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Holiday for Students</span>
                <ToggleSwitch value={draft.is_student_holiday} onChange={toggleStudentHoliday} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Holiday for Teachers</span>
                <ToggleSwitch value={draft.is_teacher_holiday} onChange={toggleTeacherHoliday} />
              </div>
            </div>
          </div>

          {/* ----- Color Swatches (Single line) ----- */}
          <div>
            <label className="text-xs font-bold text-dark-soft block mb-1.5">Select Color</label>
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 py-1">
              {CALENDAR_COLORS.map((color) => {
                const isSelected = (draft.color_code || '').toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Select ${color}`}
                    onClick={() => update('color_code', color)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:scale-110 ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-brand-primary scale-110'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && (
                      <i className="fas fa-check text-white text-[10px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-light-border">
            <div>
              {event?.id && onDelete && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onDelete(event)}
                  className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  <i className="fas fa-trash-alt text-xs" />
                  <span>Delete Event</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-light-border text-xs font-bold text-dark-soft hover:bg-light-bg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black hover:bg-brand-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AcademicCalendarEventModal;
