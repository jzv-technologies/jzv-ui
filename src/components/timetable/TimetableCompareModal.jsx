// src/components/portals/admin/timetable/TimetableCompareModal.jsx
import React, { useState, useEffect } from 'react';
import ConfirmModal from '../ConfirmModal';

const TimetableCompareModal = ({
  isOpen,
  onClose,
  currentData, // { classes, teachers, subjects, periods, slots }
  importedData, // { classes, teachers, subjects, periods, slots }
}) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeTab, setActiveTab] = useState('grid'); // "grid" | "subjects" | "teachers"

  // Destructure database/state inputs
  const currentClasses = currentData?.classes || [];
  const currentTeachers = currentData?.teachers || [];
  const currentSubjects = currentData?.subjects || [];
  const currentPeriods = currentData?.periods || [];
  const currentSlots = currentData?.slots || [];

  // Destructure offline JSON inputs
  const importedClasses = importedData?.classes || [];
  const importedTeachers = importedData?.teachers || [];
  const importedSubjects = importedData?.subjects || [];
  const importedPeriods = importedData?.periods || [];
  const importedSlots = importedData?.slots || [];

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-select first class when modal opens
  useEffect(() => {
    if (isOpen && currentClasses.length > 0) {
      // Find the first class that is in both list, or just first current class
      const sortedClasses = [...currentClasses].sort((a, b) => a.name.localeCompare(b.name));
      setSelectedClassId(String(sortedClasses[0]?.id));
    }
  }, [isOpen, currentClasses]);

  if (!isOpen) return null;

  // Find class details
  const activeClass = currentClasses.find((c) => String(c.id) === String(selectedClassId));
  const activeClassName = activeClass?.name || '';

  // Find matching class in imported JSON
  const importedClass = importedClasses.find(
    (c) => c.name.toLowerCase() === activeClassName.toLowerCase()
  );

  // Weekdays list to iterate
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Periods - we match by period_number to make it independent of DB ids
  const maxPeriods = Math.max(currentPeriods.length, importedPeriods.length, 1);
  const periodIndices = Array.from({ length: maxPeriods }, (_, i) => i + 1);

  // Mapped Lookups for Current
  const getCurrentSlot = (day, periodNum) => {
    const periodObj = currentPeriods.find((p) => p.period_number === periodNum);
    if (!periodObj) return null;
    return currentSlots.find(
      (s) =>
        String(s.class_id) === String(selectedClassId) &&
        s.day === day &&
        String(s.period_id) === String(periodObj.id)
    );
  };

  const getSubjectNameCurrent = (subId) => {
    return currentSubjects.find((s) => String(s.id) === String(subId))?.name || '';
  };

  const getTeacherNameCurrent = (tId) => {
    return currentTeachers.find((t) => String(t.id) === String(tId))?.name || '';
  };

  // Mapped Lookups for Imported JSON
  const getImportedSlot = (day, periodNum) => {
    if (!importedClass) return null;
    const periodObj = importedPeriods.find((p) => p.period_number === periodNum);
    if (!periodObj) return null;
    return importedSlots.find(
      (s) =>
        String(s.class_id) === String(importedClass.id) &&
        s.day === day &&
        String(s.period_id) === String(periodObj.id)
    );
  };

  const getSubjectNameImported = (subId) => {
    return importedSubjects.find((s) => String(s.id) === String(subId))?.name || '';
  };

  const getTeacherNameImported = (tId) => {
    return importedTeachers.find((t) => String(t.id) === String(tId))?.name || '';
  };

  // Helper: check if slot details match
  const checkSlotsMatch = (day, periodNum) => {
    const currSlot = getCurrentSlot(day, periodNum);
    const impSlot = getImportedSlot(day, periodNum);

    const currSub = currSlot ? getSubjectNameCurrent(currSlot.subject_id) : '';
    const currTch = currSlot ? getTeacherNameCurrent(currSlot.teacher_id) : '';

    const impSub = impSlot ? getSubjectNameImported(impSlot.subject_id) : '';
    const impTch = impSlot ? getTeacherNameImported(impSlot.teacher_id) : '';

    return currSub === impSub && currTch === impTch;
  };

  // ----------------------------------------------------
  // SUBJECT COUNTS DATA CALCULATION
  // ----------------------------------------------------
  const getSubjectCounts = () => {
    const countsMap = new Map(); // subjectName => { currentCount, importedCount }

    // Aggregate Current Subject Counts for selected class
    currentSlots.forEach((s) => {
      if (String(s.class_id) !== String(selectedClassId) || !s.subject_id) return;
      const subName = getSubjectNameCurrent(s.subject_id);
      if (!subName) return;
      if (!countsMap.has(subName)) {
        countsMap.set(subName, { currentCount: 0, importedCount: 0 });
      }
      countsMap.get(subName).currentCount += 1;
    });

    // Aggregate Imported Subject Counts for matched class
    if (importedClass) {
      importedSlots.forEach((s) => {
        if (String(s.class_id) !== String(importedClass.id) || !s.subject_id) return;
        const subName = getSubjectNameImported(s.subject_id);
        if (!subName) return;
        if (!countsMap.has(subName)) {
          countsMap.set(subName, { currentCount: 0, importedCount: 0 });
        }
        countsMap.get(subName).importedCount += 1;
      });
    }

    return Array.from(countsMap.entries())
      .map(([subjectName, counts]) => ({
        name: subjectName,
        current: counts.currentCount,
        imported: counts.importedCount,
        diff: counts.importedCount - counts.currentCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // ----------------------------------------------------
  // TEACHER COUNTS DATA CALCULATION
  // ----------------------------------------------------
  const getTeacherCounts = () => {
    const countsMap = new Map(); // teacherName => { currentCount, importedCount }

    // Aggregate Current Teacher Counts for selected class
    currentSlots.forEach((s) => {
      if (String(s.class_id) !== String(selectedClassId) || !s.teacher_id) return;
      const teacherName = getTeacherNameCurrent(s.teacher_id);
      if (!teacherName) return;
      if (!countsMap.has(teacherName)) {
        countsMap.set(teacherName, { currentCount: 0, importedCount: 0 });
      }
      countsMap.get(teacherName).currentCount += 1;
    });

    // Aggregate Imported Teacher Counts for matched class
    if (importedClass) {
      importedSlots.forEach((s) => {
        if (String(s.class_id) !== String(importedClass.id) || !s.teacher_id) return;
        const teacherName = getTeacherNameImported(s.teacher_id);
        if (!teacherName) return;
        if (!countsMap.has(teacherName)) {
          countsMap.set(teacherName, { currentCount: 0, importedCount: 0 });
        }
        countsMap.get(teacherName).importedCount += 1;
      });
    }

    return Array.from(countsMap.entries())
      .map(([teacherName, counts]) => ({
        name: teacherName,
        current: counts.currentCount,
        imported: counts.importedCount,
        diff: counts.importedCount - counts.currentCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const subjectCounts = getSubjectCounts();
  const teacherCounts = getTeacherCounts();

  // Find total slot matches/mismatches for summary
  const getMatchSummary = () => {
    let matches = 0;
    let mismatches = 0;

    days.forEach((day) => {
      periodIndices.forEach((periodNum) => {
        if (checkSlotsMatch(day, periodNum)) {
          matches++;
        } else {
          mismatches++;
        }
      });
    });

    return { matches, mismatches };
  };

  const summary = getMatchSummary();

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] border border-light-border shadow-2xl max-w-5xl w-full h-[700px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-brand-primary p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <i className="fas fa-wave-square"></i>
              Timetable Comparison Panel
            </h3>
            <p className="text-xs text-brand-lbg/80 mt-0.5">
              Compare the currently active database timetable against the uploaded offline JSON
              configuration at the class level.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white/80 transition-all text-xl outline-none p-1 bg-transparent border-none"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Top Controls Bar */}
        <div className="border-b border-light-border px-6 py-4 bg-light-bg/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          {/* Class Select Selector */}
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-extrabold text-dark-deepblue uppercase tracking-wide">
              Select Class:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-white border border-light-border rounded-xl px-3 py-1.5 text-xs font-bold text-dark-primary outline-none focus:ring-1 focus:ring-brand-soft cursor-pointer"
            >
              {[...currentClasses]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
            </select>

            {!importedClass && (
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                Not found in offline JSON
              </span>
            )}
          </div>

          {/* Quick stats summary */}
          <div className="flex gap-4 text-xs font-bold shrink-0">
            <span className="text-emerald-600 flex items-center gap-1">
              <i className="fas fa-check-circle"></i>
              {summary.matches} Slots Match
            </span>
            {summary.mismatches > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <i className="fas fa-exclamation-triangle"></i>
                {summary.mismatches} Slots Differ
              </span>
            )}
          </div>
        </div>

        {/* Tab switch buttons */}
        <div className="flex border-b border-light-border bg-white px-6 py-2 gap-2 shrink-0">
          {[
            { id: 'grid', label: 'Period by Period', icon: 'fa-th' },
            { id: 'subjects', label: 'Subject Period Counts', icon: 'fa-book' },
            { id: 'teachers', label: 'Teacher Period Counts', icon: 'fa-chalkboard-teacher' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-none ${
                activeTab === tab.id
                  ? 'bg-brand-lbg text-brand-primary'
                  : 'bg-transparent text-dark-soft hover:bg-light-lbg'
              }`}
            >
              <i className={`fas ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Comparison Panel Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-light-bg/5">
          {/* TAB 1: GRID VIEW (Period by Period) */}
          {activeTab === 'grid' && (
            <div className="w-full overflow-x-auto border border-light-border rounded-2xl bg-white shadow-sm">
              <table className="w-full border-collapse min-w-[900px] text-center">
                <thead>
                  <tr className="bg-light-lbg border-b border-light-border">
                    <th className="py-3 px-4 font-bold text-xs text-dark-primary uppercase tracking-wider border-r border-light-border w-[120px] text-left">
                      Day
                    </th>
                    {periodIndices.map((pNum) => {
                      const currPeriod = currentPeriods.find((p) => p.period_number === pNum);
                      const impPeriod = importedPeriods.find((p) => p.period_number === pNum);
                      const nameStr = currPeriod?.name || impPeriod?.name || `Period ${pNum}`;
                      const timeStr = currPeriod?.start_time
                        ? `${currPeriod.start_time}-${currPeriod.end_time}`
                        : '';

                      return (
                        <th
                          key={pNum}
                          className="py-2.5 px-3 border-r border-light-border last:border-r-0"
                        >
                          <div className="font-extrabold text-xs text-dark-deepblue">{nameStr}</div>
                          {timeStr && (
                            <div className="text-[9px] text-dark-soft font-semibold">{timeStr}</div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => (
                    <tr
                      key={day}
                      className="border-b border-light-border last:border-b-0 hover:bg-light-bg/5 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-xs text-dark-deepblue border-r border-light-border bg-light-lbg/10 w-[120px] text-left">
                        {day}
                      </td>
                      {periodIndices.map((pNum) => {
                        const isMatch = checkSlotsMatch(day, pNum);
                        const currSlot = getCurrentSlot(day, pNum);
                        const impSlot = getImportedSlot(day, pNum);

                        const currSub = currSlot ? getSubjectNameCurrent(currSlot.subject_id) : '';
                        const currTch = currSlot ? getTeacherNameCurrent(currSlot.teacher_id) : '';

                        const impSub = impSlot ? getSubjectNameImported(impSlot.subject_id) : '';
                        const impTch = impSlot ? getTeacherNameImported(impSlot.teacher_id) : '';

                        const isBreak =
                          currentPeriods.find((p) => p.period_number === pNum)?.is_break ||
                          importedPeriods.find((p) => p.period_number === pNum)?.is_break;

                        if (isBreak) {
                          return (
                            <td
                              key={pNum}
                              className="p-1 border-r border-light-border last:border-r-0 bg-light-bg/20 select-none"
                            >
                              <span className="text-[9px] font-bold text-dark-muted block">
                                Break
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={pNum}
                            className={`p-1.5 border-r border-light-border last:border-r-0 text-center min-w-[130px] transition-colors ${
                              isMatch ? '' : 'bg-orange-50/20'
                            }`}
                          >
                            {isMatch ? (
                              currSub ? (
                                <div className="rounded-xl border border-light-border p-1.5 bg-green-50/15 flex flex-col justify-center gap-0.5">
                                  <span className="text-[10px] font-extrabold text-emerald-800 truncate">
                                    {currSub}
                                  </span>
                                  <span className="text-[9px] font-bold text-dark-soft truncate">
                                    {currTch}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-dark-muted">Free</span>
                              )
                            ) : (
                              <div className="rounded-xl border border-dashed border-orange-300 p-1 bg-amber-50/10 flex flex-col gap-1 text-[9px] text-left">
                                <div className="border-b border-light-border/40 pb-0.5">
                                  <span className="font-bold text-[8px] uppercase tracking-wide text-dark-muted block">
                                    Current:
                                  </span>
                                  <span className="font-extrabold text-blue-dark truncate block">
                                    {currSub || 'Free'}
                                  </span>
                                  {currTch && (
                                    <span className="text-dark-soft block truncate">{currTch}</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-bold text-[8px] uppercase tracking-wide text-orange-500 block">
                                    Offline JSON:
                                  </span>
                                  <span className="font-extrabold text-orange-700 truncate block">
                                    {impSub || 'Free'}
                                  </span>
                                  {impTch && (
                                    <span className="text-dark-soft block truncate">{impTch}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: SUBJECT ALLOCATED PERIOD COUNTS */}
          {activeTab === 'subjects' && (
            <div className="bg-white border border-light-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-light-border">
                <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider">
                  Subject Allocated Count Comparison
                </h4>
                <span className="text-[10px] text-dark-soft font-bold">
                  Compares number of weekly periods assigned to each subject.
                </span>
              </div>

              {subjectCounts.length === 0 ? (
                <div className="text-center py-8 text-xs italic text-dark-muted">
                  No subject allocations found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-light-border text-dark-soft font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-2.5">Subject Name</th>
                        <th className="py-2.5 text-center">Current Count (Active)</th>
                        <th className="py-2.5 text-center">Offline JSON Count</th>
                        <th className="py-2.5 text-center">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border/40">
                      {subjectCounts.map((row) => (
                        <tr
                          key={row.name}
                          className="hover:bg-light-lbg/10 font-semibold text-dark-primary"
                        >
                          <td className="py-3 font-bold">{row.name}</td>
                          <td className="py-3 text-center">{row.current} periods</td>
                          <td className="py-3 text-center">{row.imported} periods</td>
                          <td
                            className={`py-3 text-center font-bold ${
                              row.diff > 0
                                ? 'text-green-600'
                                : row.diff < 0
                                  ? 'text-red-500'
                                  : 'text-dark-muted'
                            }`}
                          >
                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEACHER ALLOCATED PERIOD COUNTS */}
          {activeTab === 'teachers' && (
            <div className="bg-white border border-light-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-light-border">
                <h4 className="text-xs font-bold text-dark-deepblue uppercase tracking-wider">
                  Teacher Allocated Count Comparison
                </h4>
                <span className="text-[10px] text-dark-soft font-bold">
                  Compares number of weekly periods assigned to each teacher.
                </span>
              </div>

              {teacherCounts.length === 0 ? (
                <div className="text-center py-8 text-xs italic text-dark-muted">
                  No teacher allocations found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-light-border text-dark-soft font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-2.5">Teacher Name</th>
                        <th className="py-2.5 text-center">Current Count (Active)</th>
                        <th className="py-2.5 text-center">Offline JSON Count</th>
                        <th className="py-2.5 text-center">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border/40">
                      {teacherCounts.map((row) => (
                        <tr
                          key={row.name}
                          className="hover:bg-light-lbg/10 font-semibold text-dark-primary"
                        >
                          <td className="py-3 font-bold">{row.name}</td>
                          <td className="py-3 text-center">{row.current} periods</td>
                          <td className="py-3 text-center">{row.imported} periods</td>
                          <td
                            className={`py-3 text-center font-bold ${
                              row.diff > 0
                                ? 'text-green-600'
                                : row.diff < 0
                                  ? 'text-red-500'
                                  : 'text-dark-muted'
                            }`}
                          >
                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimetableCompareModal;
