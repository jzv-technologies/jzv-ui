// src/components/examinations/ExamNoticeBoardPrint.jsx
import React, { useState, useMemo } from 'react';
import { formatDateDisplay } from '../../utils/dateUtils';

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

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'class-cards'

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

  const selectAll = () => {
    setSelectedClassIds(new Set(classes.map((c) => String(c.id))));
  };

  const clearAll = () => {
    setSelectedClassIds(new Set());
  };

  const selectedClassesList = useMemo(() => {
    return classes.filter((c) => selectedClassIds.has(String(c.id)));
  }, [classes, selectedClassIds]);

  // Unique exam dates sorted chronologically
  const examDates = useMemo(() => {
    const dates = new Set();
    slots.forEach((s) => {
      if (s.exam_date) dates.add(s.exam_date);
    });
    return Array.from(dates).sort((a, b) => a.localeCompare(b));
  }, [slots]);

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
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-light-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg shadow-2xs">
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

          <div className="flex items-center gap-2">
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

            <button
              onClick={handlePrint}
              disabled={selectedClassesList.length === 0}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fas fa-print" />
              <span>Print Notice Board</span>
            </button>
          </div>
        </div>

        {/* Class Selection Filter */}
        <div className="pt-3 border-t border-light-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-dark-muted">
              Select Classes to Include in Notice ({selectedClassesList.length} of {classes.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-bold text-purple-700 hover:underline"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-bold text-dark-muted hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {classes.map((c) => {
              const isSelected = selectedClassIds.has(String(c.id));
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClass(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-2xs'
                      : 'bg-white text-dark-muted border-light-border hover:border-gray-300'
                  }`}
                >
                  <i
                    className={`fas ${isSelected ? 'fa-check-square text-purple-600' : 'fa-square text-gray-300'} mr-1.5 text-[10px]`}
                  />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Printable Area */}
      <div className="print:m-0 print:p-0 bg-white rounded-2xl border border-light-border p-6 sm:p-8 shadow-sm space-y-6 print:border-none print:shadow-none">
        {/* Printable Official Header */}
        <div className="text-center border-b-2 border-black pb-4 print:pb-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-black">
            Jamia Zia Ul Uloom
          </h1>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-700 mt-0.5">
            Examination Department • Notice Board Timetable
          </p>
          <div className="mt-2 inline-flex items-center gap-4 text-xs font-bold text-black border border-black px-4 py-1 rounded-md">
            <span>
              EXAM: <strong className="uppercase">{schedule?.name || 'Annual Examination'}</strong>
            </span>
            <span>•</span>
            <span>
              DATES: {schedule?.start_date} to {schedule?.end_date}
            </span>
            <span>•</span>
            <span>
              STATUS: <strong className="uppercase">{schedule?.status || 'Scheduled'}</strong>
            </span>
          </div>
        </div>

        {selectedClassesList.length === 0 ? (
          <div className="text-center py-12 text-dark-muted text-xs font-bold">
            No classes selected. Please select at least one class from the filter above.
          </div>
        ) : examDates.length === 0 ? (
          <div className="text-center py-12 text-dark-muted text-xs font-bold">
            No exam dates scheduled yet for this examination.
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

                  return sessions.map((sess, sessIdx) => {
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
            size: landscape;
            margin: 8mm;
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
        }
      `}</style>
    </div>
  );
};

export default ExamNoticeBoardPrint;
