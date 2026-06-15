// src/components/portals/admin/timetable/TimetableScheduler.jsx
import React, { useState } from "react";
import { getSubjectColor } from "./TimetableViewer";

const TimetableScheduler = ({
  classId,
  classes = [],
  teachers = [],
  subjects = [],
  periods = [],
  slots = [],
  assignments = [],
  onUpdateSlot,
}) => {
  const [editingSlot, setEditingSlot] = useState(null); // { day, periodId, periodNumber, subjectId, teacherId }
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [showBreaks, setShowBreaks] = useState(true);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentClass = classes.find((c) => String(c.id) === String(classId));
  const visiblePeriods = showBreaks ? periods : periods.filter((p) => !p.is_break);

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

  const getSubjectName = (subId) => subjects.find((s) => String(s.id) === String(subId))?.name || "Unknown";
  const getTeacherName = (tId) => {
    if (!tId) return "Not Assigned";
    return teachers.find((t) => String(t.id) === String(tId))?.name || "Not Assigned";
  };
  const getClassName = (cId) => classes.find((c) => String(c.id) === String(cId))?.name || "Unknown";

  const handleCellClick = (day, period) => {
    const slot = getSlotDetails(day, period.id);
    setEditingSlot({
      day,
      periodId: period.id,
      periodNumber: period.period_number,
      subjectId: slot?.subject_id || "",
      teacherId: slot?.teacher_id || "",
    });
    setSelectedSubjectId(slot?.subject_id || "");
    setSelectedTeacherId(slot?.teacher_id || "");
    setSelectedDays([day]);
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubjectId(subjectId);
    setSelectedTeacherId(""); // Reset teacher selection when subject changes
  };

  const handleSaveSlot = () => {
    if (!editingSlot) return;

    if (selectedDays.length === 0) {
      alert("Please select at least one day to assign.");
      return;
    }

    // Validate (double check validation in logic)
    if (selectedTeacherId && selectedSubjectId) {
      const teacher = teachers.find((t) => String(t.id) === String(selectedTeacherId));
      if (!teacher || !teacher.subjects.some(sid => String(sid) === String(selectedSubjectId))) {
        alert("Selected teacher is not qualified to teach this subject.");
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
          .join("\n");
        alert(
          `Conflict Detected: Teacher ${teacher.name} is already assigned on:\n${conflictMessages}`
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

    // 1. Filter teachers who are qualified for this subject
    const qualified = teachers.filter((t) =>
      t.subjects && t.subjects.some((sid) => String(sid) === String(selectedSubjectId))
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
        conflictingClassName: conflictingSlot ? getClassName(conflictingSlot.class_id) : "",
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
      {/* Header stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-light-lbg/30 border border-light-border px-5 py-3 rounded-2xl gap-3">
        <div>
          <span className="text-xs font-bold text-dark-soft uppercase">Active Timetable</span>
          <h3 className="text-lg font-bold text-dark-deepblue">{currentClass.name}</h3>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-white border border-light-border px-3 py-1.5 rounded-xl hover:bg-light-bg/30 transition-all select-none">
            <input
              type="checkbox"
              checked={showBreaks}
              onChange={(e) => setShowBreaks(e.target.checked)}
              className="rounded text-brand-primary focus:ring-brand-soft w-4 h-4"
            />
            <span className="text-xs font-bold text-dark-primary">Show Breaks</span>
          </label>
          <div className="text-right">
            <span className="text-xs text-dark-soft font-semibold block">Scheduled Periods</span>
            <span className="text-sm font-extrabold text-brand-primary">
              {
                slots.filter(
                  (s) =>
                    String(s.class_id) === String(classId) &&
                    s.subject_id &&
                    !periods.find((p) => String(p.id) === String(s.period_id))?.is_break
                ).length
              } /{" "}
              {days.length * periods.filter((p) => !p.is_break).length} slots assigned
            </span>
          </div>
        </div>
      </div>

      {/* Grid view */}
      {visiblePeriods.length === 0 ? (
        <div className="text-center py-12 bg-white border border-light-border rounded-3xl">
          <p className="text-dark-muted font-bold text-sm">Please set up periods in Settings first.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-light-border bg-white shadow-sm">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-light-lbg border-b border-light-border">
                <th className="py-4 px-4 text-left font-bold text-xs text-dark-primary tracking-wider uppercase border-r border-light-border w-[120px]">
                  Day
                </th>
                 {visiblePeriods.map((period) => (
                  <th
                    key={period.id || period.period_number}
                    className="py-3 px-3 text-center border-r border-light-border last:border-r-0"
                  >
                    <div className="font-extrabold text-sm text-dark-deepblue">{period.name || `Period ${period.period_number}`}</div>
                    {period.start_time && period.end_time && (
                      <div className="text-[10px] text-dark-soft font-semibold mt-0.5">
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
                  className="border-b border-light-border last:border-b-0 hover:bg-light-bg/20 transition-colors"
                >
                  <td className="py-4 px-4 font-bold text-sm text-dark-deepblue border-r border-light-border bg-light-lbg/10 w-[120px]">
                    {day}
                  </td>
                  {visiblePeriods.map((period) => {
                    const isBreak = period.is_break;
                    const slot = getSlotDetails(day, period.id);
                    const isAssigned = slot && slot.subject_id;
                    const subjectName = isAssigned ? getSubjectName(slot.subject_id) : "";
                    const isTeacherAssigned = slot && slot.teacher_id;
                    const teacher = isTeacherAssigned ? teachers.find(t => String(t.id) === String(slot.teacher_id)) : null;
                    const isFemale = teacher && teacher.is_male === false;
                    
                    let colorClass = "";
                    if (isAssigned) {
                      if (!isTeacherAssigned) {
                        colorClass = getSubjectColor(subjectName);
                      } else if (isFemale) {
                        colorClass = "bg-purple-100 text-purple-900 border-purple-200";
                      } else {
                        colorClass = "bg-blue-lbg text-blue-dark border-blue-200";
                      }
                    }

                    if (isBreak) {
                      const nameLower = (period.name || "Break").toLowerCase();
                      let breakIcon = "fa-coffee";
                      if (nameLower.includes("salah") || nameLower.includes("prayer") || nameLower.includes("namaz") || nameLower.includes("zohr") || nameLower.includes("asr")) {
                        breakIcon = "fa-mosque";
                      } else if (nameLower.includes("lunch") || nameLower.includes("breakfast") || nameLower.includes("recess") || nameLower.includes("tea") || nameLower.includes("snack") || nameLower.includes("food") || nameLower.includes("tiffin")) {
                        breakIcon = "fa-utensils";
                      }

                      return (
                        <td
                          key={period.id || period.period_number}
                          className="p-1.5 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] bg-light-bg/5 select-none"
                        >
                          <div className="w-full h-full rounded-xl border border-light-border bg-light-bg/15 flex flex-col items-center justify-center text-[10px] text-dark-muted font-bold">
                            <i className={`fas ${breakIcon} mb-1 text-xs text-brand-soft`}></i>
                            {period.name || "Break"}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={period.id || period.period_number}
                        onClick={() => handleCellClick(day, period)}
                        className="p-1.5 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] cursor-pointer group hover:bg-light-bg/40 transition-colors"
                      >
                        {isAssigned ? (
                          <div
                            className={`w-full h-full rounded-xl p-2 border flex flex-col justify-center gap-0.5 shadow-sm transition-all duration-300 group-hover:scale-95 ${colorClass}`}
                          >
                            <span className="font-extrabold text-[10px] tracking-wide uppercase truncate">
                              {subjectName}
                            </span>
                            {!isTeacherAssigned ? (
                              <span className="text-[9px] font-bold truncate text-red-primary flex items-center justify-center gap-1">
                                <i className="fas fa-exclamation-triangle text-[8px] animate-pulse"></i>
                                Not Assigned
                              </span>
                            ) : (
                              <span className="text-[9px] opacity-90 font-bold truncate">
                                <i className={`fas ${isFemale ? "fa-female" : "fa-male"} mr-1 text-[8px]`}></i>
                                {getTeacherName(slot.teacher_id)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-xl border border-dashed border-light-border group-hover:border-brand-soft group-hover:bg-brand-lbg/10 flex items-center justify-center text-[10px] text-dark-muted font-bold bg-light-bg/10 transition-all">
                            + Assign
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
                  
                  {/* Option Group for Class Mapped Subjects */}
                  <optgroup label="Class Assigned Subjects">
                    {assignments
                      .filter((a) => String(a.class_id) === String(classId))
                      .map((a) => subjects.find((s) => String(s.id) === String(a.subject_id)))
                      .filter(Boolean)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                  </optgroup>

                  {/* Option Group for Other Database Subjects */}
                  <optgroup label="Other Subjects">
                    {subjects
                      .filter(
                        (sub) =>
                          !assignments.some(
                            (a) => String(a.class_id) === String(classId) && String(a.subject_id) === String(sub.id)
                          )
                      )
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                  </optgroup>
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
                      label += " (Assigned to Class)";
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
                      if (selectedDays.length === days.length) {
                        setSelectedDays([editingSlot.day]);
                      } else {
                        setSelectedDays([...days]);
                      }
                    }}
                    className="text-[10px] font-extrabold text-brand-primary hover:text-brand-dark transition-all hover:underline uppercase tracking-wide"
                  >
                    {selectedDays.length === days.length ? "Reset to single day" : "Select All Days"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {days.map((d) => {
                    const isSelected = selectedDays.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => {
                          setSelectedDays(prev =>
                            prev.includes(d)
                              ? prev.filter(day => day !== d)
                              : [...prev, d]
                          );
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold select-none transition-all ${
                          isSelected
                            ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                            : "bg-white border-light-border text-dark-soft hover:bg-light-bg/40"
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
                    alert("Please select at least one day to clear.");
                    return;
                  }
                  const dayNames = selectedDays.join(", ");
                  if (confirm(`Are you sure you want to clear assignments for ${dayNames}?`)) {
                    onUpdateSlot(
                      classId,
                      selectedDays,
                      editingSlot.periodId,
                      null,
                      null
                    );
                    setEditingSlot(null);
                  }
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
    </div>
  );
};

export default TimetableScheduler;
