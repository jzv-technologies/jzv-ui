import React, { useState, useMemo } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';

const TimelinePanel = ({
  selectedClassId,
  selectedSubjectId,
  selectedBookId,
  allLessons,
  progressRecords,
  setProgressRecords,
  planningMode,
  setPlanningMode,
  activeTargetDate,
  setActiveTargetDate,
  activeTargetWeek,
  setActiveTargetWeek,
  onAddLessonClick,
  onLogWork,
}) => {
  const [timelineDays, setTimelineDays] = useState(14);
  const [timelineWeeks, setTimelineWeeks] = useState(4);
  const [draggedOverTarget, setDraggedOverTarget] = useState(null);
  const [customWeekDates, setCustomWeekDates] = useState({});
  const [updatingReplanId, setUpdatingReplanId] = useState(null);
  const [replanDate, setReplanDate] = useState('');
  const [updateMode, setUpdateMode] = useState('replan'); // 'replan' | 'carry_forward'

  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const m = new Date(d.setDate(diff));
    m.setMinutes(m.getMinutes() - m.getTimezoneOffset());
    return m.toISOString().split('T')[0];
  });

  const startDate = useMemo(() => new Date(startDateStr), [startDateStr]);

  const timelineDates = useMemo(() => {
    const dates = [];
    let d = new Date(startDate);
    const safeDays = isNaN(Number(timelineDays)) ? 14 : Number(timelineDays);
    const safeWeeks = isNaN(Number(timelineWeeks)) ? 4 : Number(timelineWeeks);
    const daysToShow = planningMode === 'date' ? safeDays : safeWeeks * 7;
    for (let i = 0; i < Math.min(daysToShow, 100); i++) {
      if (d.getDay() !== 0) dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [startDate, timelineDays, timelineWeeks, planningMode]);

  const timelineWeeksList = useMemo(() => {
    const dates = [];
    let d = new Date(startDate);
    const safeWeeks = isNaN(Number(timelineWeeks)) ? 4 : Number(timelineWeeks);
    for (let i = 0; i < safeWeeks; i++) {
      if (customWeekDates[i]) {
        dates.push(new Date(customWeekDates[i]));
      } else {
        dates.push(new Date(d));
      }
      d.setDate(d.getDate() + 7);
    }
    return dates;
  }, [startDate, timelineWeeks, customWeekDates]);

  // 2. Helpers
  const getLocalISODate = (d) => {
    const local = new Date(d);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    return local.toISOString().split('T')[0];
  };
  const formatCustomDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const getWeekdayColorStyles = (date) => {
    const day = date.getDay();
    switch (day) {
      case 1:
        return { bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-800' };
      case 2:
        return { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-800' };
      case 3:
        return { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-800' };
      case 4:
        return { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-800' };
      case 5:
        return { bg: 'bg-purple-50 border-purple-100', text: 'text-purple-800' };
      default:
        return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
    }
  };
  const getWeekColorStyles = (index) => {
    const mod = index % 5;
    switch (mod) {
      case 0:
        return { bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-800' };
      case 1:
        return { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-800' };
      case 2:
        return { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-800' };
      case 3:
        return { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-800' };
      case 4:
        return { bg: 'bg-purple-50 border-purple-100', text: 'text-purple-800' };
      default:
        return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
    }
  };

  const getFullLessonPath = (lesson) => {
    if (!lesson) return '';
    const parts = [];
    if (lesson.level1) parts.push(lesson.level1);
    if (lesson.level2) parts.push(lesson.level2);
    if (lesson.level3) parts.push(lesson.level3);
    return parts.join(' > ');
  };

  const renderStatusBadge = (record, lesson = null, onReplanClick = null) => {
    const isRevision = lesson?.level1?.toLowerCase().includes('_revision');

    // Check violation
    let statusWarning = null;
    if (record.status !== 'completed') {
      const today = getLocalISODate(new Date());
      const endD = record.target_end_date
        ? String(record.target_end_date).split('T')[0]
        : record.target_start_date
          ? String(record.target_start_date).split('T')[0]
          : null;
      if (record.due_date && today > String(record.due_date).split('T')[0]) {
        statusWarning = 'violated';
      } else if (endD && today > endD) {
        statusWarning = 'replan';
      }
    }

    if (statusWarning === 'violated') {
      return (
        <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm">
          <i className="fas fa-exclamation-triangle"></i> Violated
        </span>
      );
    }
    if (statusWarning === 'replan') {
      const clickableProps = onReplanClick
        ? {
            onClick: (e) => {
              e.stopPropagation();
              onReplanClick(record);
            },
            className:
              'cursor-pointer hover:bg-orange-200 text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm transition-colors',
            title: 'Click to update date',
          }
        : {
            className:
              'text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm',
          };
      return (
        <span {...clickableProps}>
          <i className="fas fa-clock"></i> Re-plan Required
        </span>
      );
    }

    if (isRevision && record.status === 'completed') {
      return (
        <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm">
          Revision
        </span>
      );
    }
    if (record.status === 'completed')
      return (
        <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm">
          Completed
        </span>
      );
    if (record.status === 'in_progress')
      return (
        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm">
          In Progress ({record.completion_percentage}%)
        </span>
      );
    return (
      <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 shadow-sm">
        Planned
      </span>
    );
  };

  const renderDateUpdateIcon = (record) => {
    if (record.status === 'completed') return null;
    if (!record.target_start_date) return null;

    const startStr = String(record.target_start_date).split('T')[0];
    const todayStr = getLocalISODate(new Date());

    let mode = null;
    let title = '';

    if (startStr > todayStr) {
      mode = 'replan';
      title = 'Re-plan';
    } else if (startStr < todayStr && record.status === 'in_progress') {
      mode = 'carry_forward';
      title = 'Carry Forward';
    } else if (startStr < todayStr && record.status === 'planned') {
      mode = 'replan';
      title = 'Re-plan';
    } else {
      return null;
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setUpdatingReplanId(record.id);
          setReplanDate(getLocalISODate(new Date()));
          setUpdateMode(mode);
        }}
        className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors ml-1 focus:outline-none"
        title={title}
      >
        <i className="fas fa-calendar-edit"></i>
      </button>
    );
  };

  const getActiveTargetName = () => {
    if (planningMode === 'date' && activeTargetDate) {
      return new Date(activeTargetDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    if (planningMode === 'week' && activeTargetWeek) {
      return `Week ${activeTargetWeek}`;
    }
    return null;
  };

  const handleDropAssign = async (e, dropDateStr, isWeekMode = false) => {
    e.preventDefault();
    setDraggedOverTarget(null);
    const lessonId = e.dataTransfer.getData('text/plain');
    if (!lessonId) return;

    try {
      const existing = progressRecords.find(
        (p) =>
          String(p.class_id) === String(selectedClassId) && String(p.lesson_id) === String(lessonId)
      );

      let newStart = dropDateStr;
      let newEnd = dropDateStr;

      if (isWeekMode) {
        const endD = new Date(dropDateStr);
        endD.setDate(endD.getDate() + 5); // Saturday
        newEnd = getLocalISODate(endD);
      } else if (existing && existing.target_start_date && existing.target_end_date) {
        const diffTime = new Date(existing.target_end_date) - new Date(existing.target_start_date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          const endD = new Date(dropDateStr);
          endD.setDate(endD.getDate() + diffDays);
          newEnd = getLocalISODate(endD);
        }
      }

      const upsertData = {
        id: existing ? existing.id : undefined,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        book_id: selectedBookId,
        lesson_id: lessonId,
        target_start_date: newStart,
        target_end_date: newEnd,
        academic_week: existing ? existing.academic_week : null,
        status: existing && existing.status !== 'not_started' ? existing.status : 'planned',
      };

      if (!upsertData.id) upsertData.id = crypto.randomUUID();

      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(upsertData, { onConflict: 'class_id, lesson_id', ignoreDuplicates: false })
        .select(
          'id, class_id, subject_id, book_id, lesson_id, target_start_date, target_end_date, due_date, academic_week, status, completion_percentage'
        )
        .single();

      if (error) throw error;

      const updatedRecords = [...progressRecords];
      const index = updatedRecords.findIndex((r) => String(r.id) === String(data.id));
      if (index >= 0) {
        updatedRecords[index] = data;
      } else {
        updatedRecords.push(data);
      }
      setProgressRecords(updatedRecords);
      showToast('Lesson assigned successfully!', 'success');
    } catch (err) {
      showToast('Failed to assign lesson: ' + err.message, 'error');
    }
  };

  const handleUnplanLesson = async (e, record) => {
    e.stopPropagation();
    const confirmed = window.confirm('Delete planned lesson?');
    if (!confirmed) return;
    try {
      if (record.status === 'planned') {
        const { error } = await supabase.from('lesson_progress').delete().eq('id', record.id);

        if (error) throw error;

        const updatedRecords = progressRecords.filter((r) => r.id !== record.id);
        setProgressRecords(updatedRecords);
        showToast('Lesson plan deleted.', 'success');
        return;
      }

      const upsertData = {
        ...record,
        target_start_date: null,
        target_end_date: null,
        academic_week: null,
      };

      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(upsertData, { onConflict: 'class_id, lesson_id' })
        .select(
          'id, class_id, subject_id, book_id, lesson_id, target_start_date, target_end_date, due_date, academic_week, status, completion_percentage'
        )
        .single();

      if (error) throw error;

      const updatedRecords = progressRecords.map((r) => (r.id === data.id ? data : r));
      setProgressRecords(updatedRecords);
      showToast('Lesson removed from plan.', 'success');
    } catch (err) {
      showToast('Failed to remove planned lesson: ' + err.message, 'error');
    }
  };

  const handleUpdateReplan = async (record) => {
    if (!replanDate) {
      showToast('Please select a new date.', 'error');
      return;
    }
    try {
      let newStart = record.target_start_date;
      let newEnd = record.target_end_date;

      if (updateMode === 'carry_forward') {
        newEnd = replanDate;
      } else {
        newStart = replanDate;
        const startD = record.target_start_date
          ? new Date(String(record.target_start_date).split('T')[0])
          : new Date();
        const endD = record.target_end_date
          ? new Date(String(record.target_end_date).split('T')[0])
          : startD;
        const diffTime = endD - startD;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const newEndD = new Date(newStart);
        newEndD.setDate(newEndD.getDate() + (diffDays > 0 ? diffDays : 0));
        newEnd = getLocalISODate(newEndD);
      }

      const upsertData = {
        ...record,
        target_start_date: newStart,
        target_end_date: newEnd,
        status: 'planned',
        carry_forward_count: (record.carry_forward_count || 0) + 1,
      };

      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(upsertData, { onConflict: 'class_id, lesson_id' })
        .select(
          'id, class_id, subject_id, book_id, lesson_id, target_start_date, target_end_date, due_date, academic_week, status, completion_percentage'
        )
        .single();

      if (error) throw error;

      const updatedRecords = progressRecords.map((r) => (r.id === data.id ? data : r));
      setProgressRecords(updatedRecords);
      showToast('Lesson dates updated successfully!', 'success');
      setUpdatingReplanId(null);
    } catch (err) {
      showToast('Failed to update dates: ' + err.message, 'error');
    }
  };

  if (!selectedClassId || !selectedSubjectId || !selectedBookId) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-gray-50/50">
        <i className="fas fa-calendar-alt text-4xl text-gray-300 mb-3"></i>
        <h3 className="text-sm font-bold text-gray-500">Timeline view</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          Select a class, subject, and book to view the timeline schedule here.
        </p>
      </div>
    );
  }

  const actionRequiredRecords = progressRecords.filter((p) => {
    if (
      String(p.class_id) !== String(selectedClassId) ||
      String(p.subject_id) !== String(selectedSubjectId)
    )
      return false;
    if (p.status === 'completed') return false;
    const today = getLocalISODate(new Date());
    const endD = p.target_end_date
      ? String(p.target_end_date).split('T')[0]
      : p.target_start_date
        ? String(p.target_start_date).split('T')[0]
        : null;

    if (p.due_date && today > String(p.due_date).split('T')[0]) return true; // Violated
    if (endD && today > endD) return true; // Replan Required
    return false;
  });

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Timeline Controls Header */}
      <div className="p-3 border-b bg-gray-50 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">
              {planningMode === 'date' ? 'Daily Timeline' : 'Weekly Timeline'}
            </span>
            {getActiveTargetName() && (
              <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow-sm">
                Target: {getActiveTargetName()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {planningMode === 'date' && (
            <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1 rounded-lg border border-indigo-100 flex-1 sm:flex-initial justify-between">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                Start From:
              </label>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="text-xs font-bold border-none bg-transparent outline-none cursor-pointer text-indigo-700"
              />
            </div>
          )}
          {planningMode === 'date' ? (
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm flex-1 sm:flex-initial justify-between">
              <button
                onClick={() => setTimelineDays((p) => Math.max(1, p - 1))}
                className="text-gray-400 hover:text-indigo-600 px-2.5 py-1"
              >
                <i className="fas fa-minus text-[10px]"></i>
              </button>
              <span className="text-[11px] font-bold text-gray-600 w-12 text-center">
                {timelineDays} Days
              </span>
              <button
                onClick={() => setTimelineDays((p) => Math.min(30, p + 1))}
                className="text-gray-400 hover:text-indigo-600 px-2.5 py-1"
              >
                <i className="fas fa-plus text-[10px]"></i>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm flex-1 sm:flex-initial justify-between">
              <button
                onClick={() => setTimelineWeeks((p) => Math.max(1, p - 1))}
                className="text-gray-400 hover:text-indigo-600 px-2.5 py-1"
              >
                <i className="fas fa-minus text-[10px]"></i>
              </button>
              <span className="text-[11px] font-bold text-gray-600 w-12 text-center">
                {timelineWeeks} Wks
              </span>
              <button
                onClick={() => setTimelineWeeks((p) => Math.min(10, p + 1))}
                className="text-gray-400 hover:text-indigo-600 px-2.5 py-1"
              >
                <i className="fas fa-plus text-[10px]"></i>
              </button>
            </div>
          )}

          <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
            <button
              onClick={() => setPlanningMode('date')}
              className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${planningMode === 'date' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Days
            </button>
            <button
              onClick={() => setPlanningMode('week')}
              className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${planningMode === 'week' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Weeks
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Timeline Grid */}
      <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50/50 pb-24 relative">
        {/* Action Required Pinned Section */}
        {actionRequiredRecords.length > 0 && (
          <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-3 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i> Action Required
            </h3>
            <div className="space-y-2">
              {actionRequiredRecords.map((record) => {
                const lesson = allLessons.find((l) => String(l.id) === String(record.lesson_id));
                const fullPath = getFullLessonPath(lesson);
                return (
                  <div
                    key={`action-${record.id}`}
                    className="flex justify-between items-center p-2.5 bg-white border border-orange-200 rounded-lg shadow-sm"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div
                        className="font-semibold text-gray-800 text-xs truncate"
                        title={fullPath}
                      >
                        {fullPath}
                      </div>
                      {updatingReplanId === record.id && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-500">
                            {updateMode === 'carry_forward' ? 'New End Date:' : 'New Start Date:'}
                          </span>
                          <input
                            type="date"
                            value={replanDate}
                            onChange={(e) => setReplanDate(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 outline-none"
                          />
                          <button
                            onClick={() => handleUpdateReplan(record)}
                            className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded hover:bg-emerald-200"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setUpdatingReplanId(null)}
                            className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {renderStatusBadge(record, lesson, (rec) => {
                        setUpdatingReplanId(rec.id);
                        setReplanDate(getLocalISODate(new Date()));
                        setUpdateMode('replan');
                      })}

                      {!updatingReplanId && (
                        <button
                          onClick={() => onLogWork(record)}
                          className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded transition-colors text-[10px] font-bold uppercase tracking-wide border border-indigo-100 text-center"
                        >
                          Log Work
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {planningMode === 'date' &&
          timelineDates.map((date) => {
            const dateStr = getLocalISODate(date);
            const recordsForDate = progressRecords.filter((p) => {
              if (
                !p.target_start_date ||
                String(p.class_id) !== String(selectedClassId) ||
                String(p.subject_id) !== String(selectedSubjectId)
              )
                return false;
              const start = String(p.target_start_date).split('T')[0];
              const end = p.target_end_date ? String(p.target_end_date).split('T')[0] : start;

              return dateStr >= start && dateStr <= end;
            });

            const isSelected = activeTargetDate === dateStr;
            const isDraggedOver = draggedOverTarget === dateStr;
            const isToday = dateStr === getLocalISODate(new Date());
            const colorStyles = getWeekdayColorStyles(date);

            return (
              <div
                key={dateStr}
                onClick={() => setActiveTargetDate((prev) => (prev === dateStr ? null : dateStr))}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDraggedOverTarget(dateStr);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setDraggedOverTarget(null)}
                onDrop={(e) => handleDropAssign(e, dateStr)}
                className={`bg-white rounded-xl p-3 shadow-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-indigo-600 border border-transparent bg-indigo-50/20'
                    : 'border border-gray-200'
                } ${isDraggedOver ? 'border-2 border-dashed border-indigo-500 bg-indigo-50' : ''} ${
                  isToday ? 'border-l-4 border-l-emerald-500 shadow-md ring-1 ring-emerald-300' : ''
                }`}
              >
                {/* Card Header */}
                <div
                  className={`flex justify-between items-center mb-3 border-b pb-2 flex-wrap gap-2 ${colorStyles.bg} -mx-3 -mt-3 p-2 rounded-t-xl`}
                >
                  <span
                    className={`font-bold flex items-center gap-1.5 text-sm ${colorStyles.text}`}
                  >
                    {isSelected && <i className="fas fa-map-pin text-indigo-600 text-sm"></i>}
                    {date.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {isToday && (
                      <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 shadow-sm">
                        Today
                      </span>
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddLessonClick) onAddLessonClick('date', dateStr);
                    }}
                    className="bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                  >
                    <i className="fas fa-plus text-[10px]"></i> Add Lesson
                  </button>
                </div>

                {/* Card Content (Progress Records) */}
                {recordsForDate.length === 0 ? (
                  <div className="text-xs text-gray-400 italic py-2 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    Drag a syllabus item here to plan it.
                  </div>
                ) : (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {recordsForDate.map((record) => {
                      const lesson = allLessons.find(
                        (l) => String(l.id) === String(record.lesson_id)
                      );
                      const fullPath = getFullLessonPath(lesson);

                      return (
                        <div
                          key={record.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(record.lesson_id));
                          }}
                          className="p-2.5 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow group flex items-start justify-between cursor-grab active:cursor-grabbing gap-2"
                        >
                          <div className="flex-1 min-w-0 pr-1">
                            <div
                              className="font-semibold text-gray-800 text-xs leading-tight mb-1 truncate"
                              title={fullPath}
                            >
                              {fullPath}
                            </div>
                            {updatingReplanId === record.id ? (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-500">
                                  {updateMode === 'carry_forward'
                                    ? 'New End Date:'
                                    : 'New Start Date:'}
                                </span>
                                <input
                                  type="date"
                                  value={replanDate}
                                  onChange={(e) => setReplanDate(e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 outline-none"
                                />
                                <button
                                  onClick={() => handleUpdateReplan(record)}
                                  className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded hover:bg-emerald-200"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setUpdatingReplanId(null)}
                                  className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {renderStatusBadge(record, lesson)}
                                {renderDateUpdateIcon(record)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLogWork(record);
                              }}
                              className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-300 p-1.5 rounded transition-colors text-[11px] font-bold"
                              title="Log Work"
                            >
                              <i className="fas fa-list-check"></i> Update Progress
                            </button>
                            {!updatingReplanId && record.status === 'planned' && (
                              <button
                                onClick={(e) => {
                                  handleUnplanLesson(e, record);
                                }}
                                className="text-red-500 hover:text-red-700   rounded transition-colors text-xl"
                                title="Remove from plan"
                              >
                                <i className="fas fa-circle-xmark"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        {planningMode === 'week' &&
          timelineWeeksList.map((weekDate, index) => {
            const weekStartStr = getLocalISODate(weekDate);
            const endD = new Date(weekDate);
            endD.setDate(endD.getDate() + 5); // Saturday
            const weekEndStr = getLocalISODate(endD);

            const recordsForWeek = progressRecords.filter((p) => {
              if (
                !p.target_start_date ||
                String(p.class_id) !== String(selectedClassId) ||
                String(p.subject_id) !== String(selectedSubjectId)
              )
                return false;
              const recStart = String(p.target_start_date).split('T')[0];
              const recEnd = p.target_end_date ? String(p.target_end_date).split('T')[0] : recStart;

              const weekStartTime = new Date(weekStartStr).getTime();
              const weekEndTime = new Date(weekEndStr).getTime();
              const recStartTime = new Date(recStart).getTime();
              const recEndTime = new Date(recEnd).getTime();
              return recStartTime <= weekEndTime && recEndTime >= weekStartTime;
            });

            const isSelected = activeTargetWeek === weekStartStr;
            const isDraggedOver = draggedOverTarget === weekStartStr;
            const colorStyles = getWeekColorStyles(index); // rotate based on index

            return (
              <div
                key={`week-${index}`}
                onClick={() =>
                  setActiveTargetWeek((prev) => (prev === weekStartStr ? null : weekStartStr))
                }
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDraggedOverTarget(weekStartStr);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setDraggedOverTarget(null)}
                onDrop={(e) => handleDropAssign(e, weekStartStr, true)}
                className={`bg-white rounded-xl p-3 shadow-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50/20'
                    : 'border border-gray-200'
                } ${isDraggedOver ? 'border-2 border-dashed border-indigo-500 bg-indigo-50' : ''}`}
              >
                <div
                  className={`flex justify-between items-center mb-3 border-b pb-2 flex-wrap gap-2 ${colorStyles.bg} -mx-3 -mt-3 p-2 rounded-t-xl`}
                >
                  <div
                    className={`font-bold flex items-center gap-1.5 text-xs sm:text-sm ${colorStyles.text} flex-wrap`}
                  >
                    {isSelected && <i className="fas fa-map-pin text-indigo-600 text-sm"></i>}
                    <span className="whitespace-nowrap">Week Start:</span>
                    <input
                      type="date"
                      value={weekStartStr}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setCustomWeekDates((prev) => ({ ...prev, [index]: e.target.value }))
                      }
                      className="bg-white/50 border border-black/10 rounded px-1 py-0.5 text-xs outline-none cursor-pointer"
                    />
                    <span className="whitespace-nowrap">- End: {formatCustomDate(endD)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddLessonClick) onAddLessonClick('week', weekStartStr);
                    }}
                    className="bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                  >
                    <i className="fas fa-plus text-[10px]"></i> Add Lesson
                  </button>
                </div>

                {recordsForWeek.length === 0 ? (
                  <div className="text-xs text-gray-400 italic py-2 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    Drag a syllabus item here to plan it.
                  </div>
                ) : (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {recordsForWeek.map((record) => {
                      const lesson = allLessons.find(
                        (l) => String(l.id) === String(record.lesson_id)
                      );
                      const fullPath = getFullLessonPath(lesson);

                      return (
                        <div
                          key={record.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(record.lesson_id));
                          }}
                          className="flex flex-col p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-300 transition-colors group cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span
                              className="font-semibold text-gray-800 text-xs break-words flex-1 pr-2 leading-tight"
                              title={fullPath}
                            >
                              {fullPath}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {renderStatusBadge(record, lesson)}
                              {renderDateUpdateIcon(record)}
                              <button
                                onClick={() => onLogWork(record)}
                                className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded transition-colors text-[11px] font-bold ml-1"
                                title="Log Work"
                              >
                                <i className="  "></i>
                              </button>

                              {record.status === 'planned' && (
                                <button
                                  onClick={(e) => {
                                    handleUnplanLesson(e, record);
                                  }}
                                  className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors text-[11px]"
                                  title="Remove from plan"
                                >
                                  <i className="fas fa-trash-can"></i>
                                </button>
                              )}
                            </div>
                          </div>
                          {updatingReplanId === record.id && (
                            <div
                              className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] font-bold text-gray-500">
                                {updateMode === 'carry_forward'
                                  ? 'New End Date:'
                                  : 'New Start Date:'}
                              </span>
                              <input
                                type="date"
                                value={replanDate}
                                onChange={(e) => setReplanDate(e.target.value)}
                                className="text-[11px] font-semibold border border-gray-300 rounded px-1.5 py-0.5 outline-none"
                              />
                              <button
                                onClick={() => handleUpdateReplan(record)}
                                className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded shadow-sm hover:bg-emerald-200"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setUpdatingReplanId(null)}
                                className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default TimelinePanel;
