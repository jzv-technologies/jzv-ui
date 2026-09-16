// src/components/examinations/ExamNoticeBoardPrint.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { formatDateDisplay, generateDateRange } from '../../utils/dateUtils';

/**
 * Notice Board Printable View
 * Allows selecting multiple classes and rendering a high-contrast, professional
 * examination schedule table designed specifically for notice board printing.
 */
const ExamNoticeBoardPrint = ({
  schedule,
  sessions = [],
  classes = [],
  subjects = [],
  teachers = [],
  slots = [],
}) => {
  // Selection state for classes to print
  const [selectedClassIds, setSelectedClassIds] = useState(
    () => new Set(classes.map((c) => String(c.id)))
  );

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'scheduler' | 'class-cards'
  const [printOrientation, setPrintOrientation] = useState('landscape'); // 'landscape' | 'portrait'

  // Multi-select dropdown state
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const classDropdownRef = useRef(null);

  // Sync initial selection if classes load asynchronously
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && classes.length > 0) {
      setSelectedClassIds(new Set(classes.map((c) => String(c.id))));
      initializedRef.current = true;
    }
  }, [classes]);

  // Click outside and escape key listener to close dropdown
  useEffect(() => {
    if (!isClassDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
        setIsClassDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsClassDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isClassDropdownOpen]);

  const toggleClass = (classId) => {
    const next = new Set(selectedClassIds);
    const cidStr = String(classId);
    if (next.has(cidStr)) {
      next.delete(cidStr);
    } else {
      next.add(cidStr);
    }
    setSelectedClassIds(next);
  };

  const filteredClasses = useMemo(() => {
    if (!classSearch.trim()) return classes;
    const query = classSearch.toLowerCase().trim();
    return classes.filter((c) => (c.name || '').toLowerCase().includes(query));
  }, [classes, classSearch]);

  const selectAll = () => {
    if (classSearch.trim() && filteredClasses.length > 0) {
      const next = new Set(selectedClassIds);
      filteredClasses.forEach((c) => next.add(String(c.id)));
      setSelectedClassIds(next);
    } else {
      setSelectedClassIds(new Set(classes.map((c) => String(c.id))));
    }
  };

  const clearAll = () => {
    if (classSearch.trim() && filteredClasses.length > 0) {
      const next = new Set(selectedClassIds);
      filteredClasses.forEach((c) => next.delete(String(c.id)));
      setSelectedClassIds(next);
    } else {
      setSelectedClassIds(new Set());
    }
  };

  const selectedClassesList = useMemo(() => {
    return classes.filter((c) => selectedClassIds.has(String(c.id)));
  }, [classes, selectedClassIds]);

  const classSummaryText = useMemo(() => {
    if (classes.length === 0) return 'No Classes';
    if (selectedClassesList.length === 0) return 'No Classes Selected';
    if (selectedClassesList.length === classes.length) return `All Classes (${classes.length})`;
    if (selectedClassesList.length === 1) return selectedClassesList[0].name;
    if (selectedClassesList.length === 2) {
      return `${selectedClassesList[0].name}, ${selectedClassesList[1].name}`;
    }
    return `${selectedClassesList.length} of ${classes.length} Classes`;
  }, [classes.length, selectedClassesList]);

  // Chronologically sorted sessions
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.sort_order !== undefined && b.sort_order !== undefined) {
        return a.sort_order - b.sort_order;
      }
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  }, [sessions]);

  // Unique exam dates sorted chronologically
  const examDates = useMemo(() => {
    const dates = new Set();
    slots.forEach((s) => {
      if (s.exam_date) dates.add(s.exam_date);
    });
    return Array.from(dates).sort((a, b) => a.localeCompare(b));
  }, [slots]);

  // Inclusive date range matching Scheduler view
  const schedulerDates = useMemo(() => {
    if (schedule?.start_date && schedule?.end_date) {
      const range = generateDateRange(schedule.start_date, schedule.end_date);
      if (range && range.length > 0) return range;
    }
    return examDates;
  }, [schedule, examDates]);

  // Lookup maps
  const subjectMap = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[String(s.id)] = s.name;
    });
    return map;
  }, [subjects]);

  const teacherMap = useMemo(() => {
    const map = {};
    teachers.forEach((t) => {
      map[String(t.id)] = t.name;
    });
    return map;
  }, [teachers]);

  // Multi-key index for instant slot lookup: `date__sessionId__classId`
  const slotMatrix = useMemo(() => {
    const matrix = {};
    slots.forEach((slot) => {
      const key = `${slot.exam_date}__${slot.session_id}__${slot.class_id}`;
      matrix[key] = slot;
    });
    return matrix;
  }, [slots]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Print Controls Header (Hidden when printing) */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-light-border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg shadow-2xs shrink-0">
              <i className="fas fa-print" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                Notice Board Printout
              </h2>
              <p className="text-xs font-bold text-dark-muted">
                Multi-class printable Exam Schedule formatted for school notice boards
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-Select Class Dropdown */}
            <div className="relative" ref={classDropdownRef}>
              <button
                type="button"
                onClick={() => setIsClassDropdownOpen((prev) => !prev)}
                className={`px-3 py-1.5 h-9 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                  selectedClassesList.length > 0
                    ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100/70'
                    : 'bg-white text-gray-500 border-light-border hover:bg-gray-50 hover:text-dark-primary'
                }`}
                title="Select Classes to Include in Notice"
              >
                <i className="fas fa-graduation-cap text-purple-700 text-xs" />
                <span className="max-w-[130px] sm:max-w-[170px] truncate text-left">
                  {classSummaryText}
                </span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full transition-colors ${
                    selectedClassesList.length > 0
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {selectedClassesList.length}
                </span>
                <i
                  className={`fas fa-chevron-down text-[9px] text-purple-600 transition-transform duration-200 ${
                    isClassDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Popover */}
              {isClassDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-72 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-light-border p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Dropdown Header & Quick Actions */}
                  <div className="flex items-center justify-between px-1.5 pb-2 border-b border-light-border">
                    <span className="text-[11px] font-black uppercase tracking-wider text-dark-muted">
                      Select Classes
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search Filter (shown if > 4 classes) */}
                  {classes.length > 4 && (
                    <div className="pt-2 px-0.5">
                      <div className="relative">
                        <i className="fas fa-search absolute left-2.5 top-2.5 text-gray-400 text-[10px]" />
                        <input
                          type="text"
                          value={classSearch}
                          onChange={(e) => setClassSearch(e.target.value)}
                          placeholder="Search classes..."
                          className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all"
                        />
                        {classSearch && (
                          <button
                            type="button"
                            onClick={() => setClassSearch('')}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-[10px] cursor-pointer"
                          >
                            <i className="fas fa-times" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Scrollable Class List */}
                  <div className="mt-2 max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                    {filteredClasses.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-400 font-medium">
                        No classes match "{classSearch}"
                      </div>
                    ) : (
                      filteredClasses.map((c) => {
                        const isSelected = selectedClassIds.has(String(c.id));
                        return (
                          <label
                            key={c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleClass(c.id);
                            }}
                            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors select-none ${
                              isSelected
                                ? 'bg-purple-50 text-purple-900 font-black'
                                : 'text-dark-primary hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Handled by row onClick
                                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer accent-purple-600 shrink-0"
                              />
                              <span className="truncate">{c.name}</span>
                            </div>
                            {isSelected && (
                              <i className="fas fa-check text-[10px] text-purple-600 shrink-0" />
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Footer status & Done button */}
                  <div className="mt-2 pt-2 border-t border-light-border px-1.5 flex items-center justify-between text-[10px] font-bold text-dark-muted">
                    <span>
                      {selectedClassIds.size} of {classes.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsClassDropdownOpen(false)}
                      className="text-purple-700 hover:text-purple-900 font-black cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* View Mode Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white text-dark-primary shadow-xs' : 'text-dark-muted'
                }`}
              >
                <i className="fas fa-table-cells mr-1.5" />
                Consolidated Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('scheduler')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'scheduler'
                    ? 'bg-white text-dark-primary shadow-xs'
                    : 'text-dark-muted'
                }`}
              >
                <i className="fas fa-calendar-week mr-1.5" />
                Scheduler View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('class-cards')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'class-cards'
                    ? 'bg-white text-dark-primary shadow-xs'
                    : 'text-dark-muted'
                }`}
              >
                <i className="fas fa-id-card mr-1.5" />
                Class-wise Blocks
              </button>
            </div>

            {/* Print Orientation Selector: A4 Landscape vs A4 Portrait */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  printOrientation === 'landscape'
                    ? 'bg-white text-purple-800 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
                title="Print Landscape"
              >
                <i className="fas fa-file-lines text-xl fa-rotate-270" />
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  printOrientation === 'portrait'
                    ? 'bg-white text-purple-800 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
                title="Print Portrait"
              >
                <i className="fas fa-file-lines text-xl" />
              </button>
              <button
                onClick={handlePrint}
                disabled={selectedClassesList.length === 0}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <i className="fas fa-print" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area */}
      <div
        className={`print:m-0 print:p-0 bg-white rounded-2xl border border-light-border p-6 sm:p-8 shadow-sm space-y-6 print:border-none print:shadow-none ${
          printOrientation === 'portrait' ? 'print-portrait max-w-4xl mx-auto' : 'print-landscape'
        }`}
      >
        {/* Printable Official Header */}
        <div className="text-center border-b-2 border-black pb-4 print:pb-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-black">
            Jamia Zaytoonah
          </h1>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-700 mt-0.5">
            <strong className="uppercase">
              {schedule?.name || '______________________ Examination'}
            </strong>
          </p>
        </div>

        {selectedClassesList.length === 0 ? (
          <div className="text-center py-12 text-dark-muted text-xs font-bold">
            No classes selected. Please select at least one class from the filter above.
          </div>
        ) : schedulerDates.length === 0 && examDates.length === 0 ? (
          <div className="text-center py-12 text-dark-muted text-xs font-bold">
            No exam dates scheduled yet for this examination.
          </div>
        ) : viewMode === 'scheduler' ? (
          /* Scheduler View: Displayed like the Scheduler with dark headings and banded rows */
          <div className="space-y-6">
            {selectedClassesList.map((cls) => {
              const classSlots = slots.filter((s) => String(s.class_id) === String(cls.id));

              return (
                <div
                  key={cls.id}
                  className="sched-table-card border-2 border-slate-900 rounded-xl overflow-hidden shadow-xs bg-white break-inside-avoid"
                >
                  {/* Dark Header Banner for Class */}
                  <div className="sched-dark-header bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-slate-800 text-slate-200 flex items-center justify-center text-xs font-bold">
                        <i className="fas fa-chalkboard" />
                      </div>
                      <h3 className="font-black text-sm uppercase tracking-wide text-white">
                        {cls.name}
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      {classSlots.length} Papers Scheduled
                    </span>
                  </div>

                  {/* Table with dark header and banded rows */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sched-dark-header bg-slate-900 text-white">
                        <tr className="border-b-2 border-slate-700 bg-slate-900 text-white">
                          <th className="py-2.5 px-3 text-left font-black uppercase text-[11px] tracking-wider text-white border border-slate-700 w-32 sm:w-36">
                            Date & Day
                          </th>
                          {sortedSessions.map((sess) => (
                            <th
                              key={sess.id}
                              className="py-2.5 px-3 text-center font-black uppercase text-[11px] tracking-wider text-white border border-slate-700 min-w-[130px]"
                            >
                              <div className="text-white font-black">{sess.name}</div>
                              {sess.start_time && (
                                <div className="text-[10px] font-normal text-slate-300 normal-case mt-0.5">
                                  {sess.start_time.slice(0, 5)} – {sess.end_time?.slice(0, 5)}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {schedulerDates.map((dateStr, rIdx) => {
                          const dayName = formatDateDisplay(dateStr, { weekday: 'short' });
                          const formattedDate = formatDateDisplay(dateStr, {
                            month: 'short',
                            day: 'numeric',
                          });
                          const isOdd = rIdx % 2 === 1;

                          return (
                            <tr
                              key={dateStr}
                              className={`${isOdd ? 'sched-row-odd bg-slate-100/80' : 'sched-row-even bg-white'} transition-colors`}
                            >
                              <td
                                className={`py-2.5 px-3 font-bold border border-slate-300 whitespace-nowrap align-top ${
                                  isOdd
                                    ? 'bg-slate-200/70 text-slate-900'
                                    : 'bg-slate-50 text-slate-900'
                                }`}
                              >
                                <span className="text-slate-900 font-black text-xs block leading-tight">
                                  {formattedDate}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                  {dayName}
                                </span>
                              </td>

                              {sortedSessions.map((sess) => {
                                const slot = slotMatrix[`${dateStr}__${sess.id}__${cls.id}`];

                                if (!slot) {
                                  return (
                                    <td
                                      key={sess.id}
                                      className="border border-slate-300 p-2 text-center text-slate-300 font-mono text-xs align-middle"
                                    >
                                      —
                                    </td>
                                  );
                                }

                                const subName =
                                  subjectMap[String(slot.subject_id)] ||
                                  `Subject #${slot.subject_id}`;
                                const tName = teacherMap[String(slot.teacher_id)];

                                return (
                                  <td
                                    key={sess.id}
                                    className="border border-slate-300 p-2.5 text-center align-top"
                                  >
                                    <span className="font-black text-slate-900 text-xs block leading-tight">
                                      {subName}
                                    </span>
                                    {tName && (
                                      <span className="text-[10px] text-slate-600 block font-semibold mt-0.5">
                                        Inv: {tName}
                                      </span>
                                    )}
                                    {slot.room_no && (
                                      <span className="text-[9px] text-slate-500 block font-mono">
                                        Rm: {slot.room_no}
                                      </span>
                                    )}
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
              );
            })}
          </div>
        ) : viewMode === 'table' ? (
          /* Consolidated Matrix Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-gray-100 text-black font-black uppercase text-[11px] border-b-2 border-black">
                  <th className="border border-black p-2 w-28">Date & Day</th>
                  <th className="border border-black p-2 w-32">Session / Time</th>
                  {selectedClassesList.map((c) => (
                    <th key={c.id} className="border border-black p-2 text-center">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {examDates.map((dateStr) => {
                  const dayName = formatDateDisplay(dateStr, { weekday: 'short' });
                  const formattedDate = formatDateDisplay(dateStr, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return sortedSessions.map((sess, sessIdx) => {
                    return (
                      <tr
                        key={`${dateStr}__${sess.id}`}
                        className={sessIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      >
                        {sessIdx === 0 && (
                          <td
                            rowSpan={sessions.length}
                            className="border border-black p-2 align-top font-bold bg-gray-50"
                          >
                            <span className="text-black font-extrabold text-sm block">
                              {formattedDate}
                            </span>
                            <span className="text-gray-600 uppercase text-[10px]">{dayName}</span>
                          </td>
                        )}
                        <td className="border border-black p-2 align-top">
                          <span className="font-bold text-black block">{sess.name}</span>
                          <span className="text-[10px] text-gray-600 font-mono">
                            {sess.start_time?.slice(0, 5)} – {sess.end_time?.slice(0, 5)}
                          </span>
                        </td>
                        {selectedClassesList.map((c) => {
                          const slot = slotMatrix[`${dateStr}__${sess.id}__${c.id}`];
                          if (!slot) {
                            return (
                              <td
                                key={c.id}
                                className="border border-black p-2 text-center text-gray-300 font-mono text-[10px]"
                              >
                                —
                              </td>
                            );
                          }

                          const subName =
                            subjectMap[String(slot.subject_id)] || `Subject #${slot.subject_id}`;
                          const teacherName = teacherMap[String(slot.teacher_id)];

                          return (
                            <td
                              key={c.id}
                              className="border border-black p-2 align-top bg-white text-center"
                            >
                              <span className="font-black text-black text-xs block leading-tight">
                                {subName}
                              </span>
                              {teacherName && (
                                <span className="text-[10px] text-gray-700 block font-medium mt-0.5">
                                  Inv: {teacherName}
                                </span>
                              )}
                              {slot.room_no && (
                                <span className="text-[9px] text-gray-500 block">
                                  Rm: {slot.room_no}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Class-wise Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
            {selectedClassesList.map((cls) => {
              const classSlots = slots
                .filter((s) => String(s.class_id) === String(cls.id))
                .sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || ''));

              return (
                <div
                  key={cls.id}
                  className="border-2 border-black rounded-lg p-3 bg-white space-y-2 break-inside-avoid"
                >
                  <div className="border-b border-black pb-1.5 flex justify-between items-center">
                    <h3 className="font-black text-base text-black uppercase">{cls.name}</h3>
                    <span className="text-[10px] font-bold text-gray-600">
                      {classSlots.length} Papers
                    </span>
                  </div>

                  {classSlots.length === 0 ? (
                    <p className="text-xs italic text-gray-500 py-3 text-center">
                      No examination scheduled
                    </p>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      {classSlots.map((slot, sIdx) => {
                        const sess = sessions.find((s) => String(s.id) === String(slot.session_id));
                        const subName =
                          subjectMap[String(slot.subject_id)] || `Subject #${slot.subject_id}`;
                        const teacherName = teacherMap[String(slot.teacher_id)];
                        const formatted = formatDateDisplay(slot.exam_date, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <div
                            key={slot.id || sIdx}
                            className="flex items-start justify-between border-b border-dashed border-gray-300 pb-1"
                          >
                            <div>
                              <span className="font-extrabold text-black block">{subName}</span>
                              <span className="text-[10px] text-gray-600 block">
                                {formatted} • {sess?.name || 'Session'} (
                                {sess?.start_time?.slice(0, 5)})
                              </span>
                            </div>
                            {teacherName && (
                              <span className="text-[10px] text-gray-700 font-medium text-right shrink-0">
                                {teacherName}
                              </span>
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
        )}

        {/* Printable Footer / Signatures */}
        <div className="border-t border-black pt-6 mt-8 flex justify-between items-end text-xs font-bold text-black print:flex">
          <div>
            <p>Notice Board Copy — Display with Official Seal</p>
            <p className="text-[10px] text-gray-600 font-normal">
              Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-12 text-center">
            <div>
              <div className="w-32 border-b border-black mb-1" />
              <p className="text-[11px] font-bold uppercase">Exam Incharge</p>
            </div>
            <div>
              <div className="w-32 border-b border-black mb-1" />
              <p className="text-[11px] font-bold uppercase">Principal / Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scoped CSS for @media print */}
      <style>{`
        @media print {
          @page {
            size: A4 ${printOrientation};
            margin: ${printOrientation === 'portrait' ? '8mm 6mm' : '8mm'};
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, aside, .print-hide, .portal-header, [data-feature="portal-header"] {
            display: none !important;
          }
          .sched-dark-header {
            background-color: #0f172a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sched-dark-header th, .sched-dark-header div, .sched-dark-header h3 {
            color: #ffffff !important;
          }
          .sched-dark-header .text-slate-300 {
            color: #cbd5e1 !important;
          }
          .sched-row-even {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sched-row-odd {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sched-table-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 1.25rem !important;
          }
          .print-portrait .sched-table-card {
            margin-bottom: 1rem !important;
          }
          .print-portrait table {
            font-size: 10.5px !important;
          }
          .print-portrait th, .print-portrait td {
            padding: 3px 5px !important;
          }
          .print-portrait h1 {
            font-size: 1.35rem !important;
          }
          .print-portrait .grid {
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ExamNoticeBoardPrint;
