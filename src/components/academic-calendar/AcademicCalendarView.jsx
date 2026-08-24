import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import AcademicCalendarEventModal, { CALENDAR_EVENT_TYPES } from './AcademicCalendarEventModal';

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- Helper: Check if a date is a weekend based on weekly_off_days ---
const isDateWeekend = (date, weeklyOffDays) => {
  if (!date) return false;
  const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayMap[date.getDay()];
  return weeklyOffDays.includes(dayName);
};

// --- Helper: Convert academic month index (0=June, 11=May) to Gregorian ---
const getGregorianFromAcademic = (academicIndex, baseYear) => {
  const month = (5 + academicIndex) % 12;
  const yearOffset = academicIndex > 6 ? 1 : 0;
  return { year: baseYear + yearOffset, month };
};

const getAcademicYearLabel = (baseYear) => `${baseYear}-${String(baseYear + 1).slice(-2)}`;

const AcademicCalendarView = ({ canEdit = false }) => {
  const [events, setEvents] = useState([]);
  const [calendarMonths, setCalendarMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Academic month state
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const initialBaseYear = currentMonth >= 5 ? currentYear : currentYear - 1;
  const initialAcademicIndex = (currentMonth - 5 + 12) % 12;

  const [academicIndex, setAcademicIndex] = useState(initialAcademicIndex);
  const [baseYear, setBaseYear] = useState(initialBaseYear);
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('month');
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [weeklyOffDays, setWeeklyOffDays] = useState(['Saturday', 'Sunday']);
  const [defaultTeachingDays, setDefaultTeachingDays] = useState(20);

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
      if (months?.[0]?.weekly_off_days) setWeeklyOffDays(months[0].weekly_off_days);
      if (months?.[0]?.default_teaching_days != null) {
        setDefaultTeachingDays(months[0].default_teaching_days);
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

  const monthLabel = () => {
    const { year, month } = currentGregorian;
    const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long' });
    const ayLabel = getAcademicYearLabel(baseYear);
    return `${monthName} ${year} (AY ${ayLabel})`;
  };

  const monthSummary = calendarMonths.find(
    (row) => row.year === currentYearMonth.year && row.month === currentYearMonth.month
  );

  const getCalendarCells = (year, monthIndex) => {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: firstDay + daysInMonth }, (_, index) =>
      index < firstDay ? null : new Date(year, monthIndex, index - firstDay + 1)
    );
  };

  const visibleEvents = useMemo(() => {
    const { year, month } = currentGregorian;
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const normalizeEventType = (type) => {
      if (
        [
          'student_holiday',
          'teacher_holiday',
          'examination',
          'exam_preparation',
          'teaching_day',
          'other',
        ].includes(type)
      ) {
        return type;
      }
      if (
        [
          'festival_holiday',
          'annual_holiday',
          'public_holiday',
          'jamia_declared_holiday',
          'holiday',
          'exam_holiday',
          'exam_correction',
        ].includes(type)
      ) {
        return 'student_holiday';
      }
      if (type === 'examinations') return 'examination';
      if (type === 'exam_preparation' || type === 'teacher_preparation') return 'exam_preparation';
      return 'other';
    };

    return events.filter((event) => {
      const startsBeforeEnd = new Date(`${event.start_date}T00:00:00`) <= monthEnd;
      const endsAfterStart =
        new Date(`${event.end_date || event.start_date}T00:00:00`) >= monthStart;
      const matchesType =
        typeFilter === 'all' ||
        event.event_type === typeFilter ||
        normalizeEventType(typeFilter) === event.event_type;

      return matchesType && startsBeforeEnd && endsAfterStart;
    });
  }, [events, currentGregorian, typeFilter]);

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
          teaching_days: defaultTeachingDays,
          weekend_days: 0,
          holidays: 0,
          exam_days: 0,
          weekly_off_days: weeklyOffDays,
          default_teaching_days: defaultTeachingDays,
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

    const normalizeEventType = (type) => {
      if (
        [
          'student_holiday',
          'teacher_holiday',
          'examination',
          'exam_preparation',
          'teaching_day',
          'other',
        ].includes(type)
      ) {
        return type;
      }
      if (
        [
          'festival_holiday',
          'annual_holiday',
          'public_holiday',
          'jamia_declared_holiday',
          'holiday',
          'exam_holiday',
          'exam_correction',
        ].includes(type)
      ) {
        return 'student_holiday';
      }
      if (type === 'examinations') return 'examination';
      if (type === 'exam_preparation' || type === 'teacher_preparation') return 'exam_preparation';
      return 'other';
    };

    const payload = {
      ac_id: calendarRow.id,
      start_date: draft.start_date,
      end_date: draft.end_date || draft.start_date,
      event_type: normalizeEventType(draft.event_type),
      event_name: (draft.event_name || '').trim(),
      is_teaching_day: Boolean(draft.is_teaching_day),
      is_student_holiday: Boolean(draft.is_student_holiday),
      is_teacher_holiday: Boolean(draft.is_teacher_holiday),
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
        weekly_off_days: weeklyOffDays,
        default_teaching_days: Number(defaultTeachingDays) || 0,
      })
      .in(
        'id',
        calendarMonths.map((row) => row.id)
      );
    if (rulesError) showToast(`Failed to save calendar rules: ${rulesError.message}`, 'error');
    else {
      showToast('Calendar rules saved.', 'success');
      await loadEvents();
    }
    setSaving(false);
  };

  const deleteEvent = async (event) => {
    if (!window.confirm(`Delete ${event.event_name}?`)) return;
    const { error: deleteError } = await supabase
      .from('academic_events')
      .delete()
      .eq('id', event.id);
    if (deleteError) showToast(`Failed to delete event: ${deleteError.message}`, 'error');
    else {
      showToast('Calendar event deleted.', 'success');
      await loadEvents();
    }
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

  // ----- Renderers -----
  const renderMonthGrid = () => {
    const { year, month } = currentGregorian;
    const cells = getCalendarCells(year, month);

    return (
      <div className="bg-white rounded-2xl border border-light-border shadow-sm overflow-hidden">
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
            const dayEvents = date
              ? visibleEvents.filter(
                  (event) =>
                    new Date(`${event.start_date}T00:00:00`) <= date &&
                    new Date(`${event.end_date || event.start_date}T00:00:00`) >= date
                )
              : [];

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`min-h-[72px] sm:min-h-[88px] border p-1.5 transition-colors ${
                  date
                    ? isWeekend
                      ? 'bg-red-200/50 hover:bg-red-200/80 border-red-300 rounded-xl cursor-pointer'
                      : 'bg-white hover:bg-gray-50/80 border-blue-300 rounded-xl cursor-pointer'
                    : 'bg-white rounded-xl'
                }`}
              >
                <span
                  className={`text-[10px] font-black ${
                    isWeekend ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {date?.getDate() || ''}
                </span>
                <div className="space-y-0.5 mt-0.5">
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
          const cells = getCalendarCells(gYear, gMonth);

          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-light-border shadow-sm hover:shadow-md transition p-3"
            >
              <h2 className="text-sm font-black text-dark-primary mb-2">
                {new Date(gYear, gMonth, 1).toLocaleDateString(undefined, { month: 'long' })}
              </h2>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <span key={i} className="text-[8px] font-black text-gray-300">
                    {day}
                  </span>
                ))}
                {cells.map((date, i) => {
                  const isWeekend = isDateWeekend(date, weeklyOffDays);
                  const hasEvent =
                    date &&
                    monthEvents.some(
                      (event) =>
                        new Date(`${event.start_date}T00:00:00`) <= date &&
                        new Date(`${event.end_date || event.start_date}T00:00:00`) >= date
                    );
                  return (
                    <span
                      key={i}
                      className={`min-h-6 rounded-sm flex items-center justify-center text-[9px] font-semibold ${
                        hasEvent
                          ? 'bg-brand-primary/15 text-brand-primary'
                          : isWeekend
                            ? 'text-gray-300'
                            : 'text-gray-600'
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

  // ----- Main JSX -----
  return (
    <div className="min-h-[calc(100vh-160px)] bg-light-bg p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-calendar-days text-brand-primary" /> Academic Calendar
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="w-9 h-9 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:border-brand-primary/30 transition"
              >
                <i className="fas fa-chevron-left" />
              </button>
              <span className="min-w-40 text-center text-sm font-black text-dark-primary">
                {monthLabel()}
              </span>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="w-9 h-9 rounded-xl border border-light-border bg-white text-dark-soft hover:text-brand-primary hover:border-brand-primary/30 transition"
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
            <div className="flex rounded-xl border border-light-border bg-white p-1 sm:ml-auto">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  viewMode === 'month'
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-dark-soft hover:bg-gray-50'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setViewMode('year')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  viewMode === 'year'
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-dark-soft hover:bg-gray-50'
                }`}
              >
                Yearly
              </button>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="sm:ml-auto px-3 py-2 rounded-xl border border-light-border bg-white text-xs font-bold text-dark-primary focus:border-brand-primary outline-none"
            >
              <option value="all">All Event Types</option>
              {CALENDAR_EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditingEvent({})}
              className="px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-black inline-flex items-center gap-2 shadow-sm hover:shadow-md transition"
            >
              <i className="fas fa-plus" /> Add Event
            </button>
          )}
        </div>

        {/* Monthly Summary Stats */}
        {viewMode === 'month' && monthSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ['📅 Total Days', monthSummary.total_days, 'text-blue-600'],
              ['✅ Working Days', monthSummary.working_days, 'text-emerald-600'],
              ['📖 Teaching Days', monthSummary.teaching_days, 'text-indigo-600'],
              ['🌙 Weekends', monthSummary.weekend_days, 'text-purple-600'],
              [
                '🎯 Holidays / Exams',
                `${monthSummary.holidays || 0} / ${monthSummary.exam_days || 0}`,
                'text-amber-600',
              ],
            ].map(([label, value, color]) => (
              <div
                key={label}
                className="rounded-xl border border-light-border bg-white px-3 py-2.5 shadow-sm hover:shadow-md transition"
              >
                <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                  {label}
                </p>
                <p className={`text-base font-black mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Calendar Rules (Edit) */}
        {canEdit && (
          <section className="rounded-2xl border border-light-border bg-white p-4 space-y-3 shadow-sm">
            <div>
              <h2 className="text-sm font-black text-dark-primary">📋 Calendar Rules</h2>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Choose weekly off days and the default monthly teaching-day target.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {WEEK_DAYS.map((day) => (
                <label
                  key={day}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-light-border px-2.5 py-1.5 text-xs font-bold text-dark-soft hover:bg-gray-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={weeklyOffDays.includes(day)}
                    onChange={() =>
                      setWeeklyOffDays((prev) =>
                        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                      )
                    }
                    className="h-3.5 w-3.5 rounded text-brand-primary"
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
              <label className="inline-flex items-center gap-2 text-xs font-bold text-dark-soft">
                Default teaching days
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={defaultTeachingDays}
                  onChange={(e) => setDefaultTeachingDays(e.target.value)}
                  className="w-16 rounded-lg border border-light-border px-2 py-1.5 text-xs font-bold focus:border-brand-primary outline-none"
                />
              </label>
              <button
                type="button"
                onClick={saveCalendarRules}
                disabled={saving || weeklyOffDays.length === 0}
                className="rounded-xl bg-brand-primary px-4 py-1.5 text-xs font-black text-white shadow-sm hover:bg-brand-primary/90 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Save Rules'}
              </button>
            </div>
          </section>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-light-border p-12 text-center text-xs font-bold text-gray-400">
            <i className="fas fa-spinner fa-spin mr-2" />
            Loading calendar...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-xs font-bold text-red-700">
            Unable to load calendar: {error}
          </div>
        ) : viewMode === 'year' ? (
          renderYearView()
        ) : (
          <div className="space-y-5">
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
                    className="bg-white rounded-2xl border border-light-border p-4 shadow-sm hover:shadow-md transition"
                    style={{ borderLeftColor: event.color_code || '#2563eb', borderLeftWidth: 5 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-black text-gray-400">
                          {CALENDAR_EVENT_TYPES.find((t) => t.value === event.event_type)?.label ||
                            'Other'}
                        </p>
                        <h2 className="text-sm font-black text-dark-primary mt-1">
                          {event.event_name}
                        </h2>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingEvent(event)}
                            title="Edit event"
                            className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEvent(event)}
                            title="Delete event"
                            className="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition"
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
                    <p className="text-xs font-semibold text-dark-soft mt-2 leading-relaxed">
                      {event.is_teaching_day && '👨‍🏫 Teaching Day '}
                      {event.is_student_holiday && '🎓 Student Holiday '}
                      {event.is_teacher_holiday && '🧑‍🏫 Teacher Holiday '}
                      {!event.is_teaching_day &&
                        !event.is_student_holiday &&
                        !event.is_teacher_holiday &&
                        '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {canEdit && editingEvent && (
        <AcademicCalendarEventModal
          event={editingEvent}
          academicYear={getAcademicYearLabel(baseYear)}
          onClose={() => setEditingEvent(null)}
          onSave={saveEvent}
          saving={saving}
        />
      )}
    </div>
  );
};

export default AcademicCalendarView;
