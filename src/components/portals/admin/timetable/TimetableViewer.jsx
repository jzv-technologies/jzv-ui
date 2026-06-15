// src/components/portals/admin/timetable/TimetableViewer.jsx
import React, { useState } from "react";

// Helper to get a consistent color style for a subject name
export const getSubjectColor = (subjectName) => {
  if (!subjectName) return "bg-light-bg text-dark-soft border-dashed border-light-border";
  const name = subjectName.toLowerCase();
  
  if (name.includes("quran") || name.includes("tahfeez") || name.includes("arabic")) {
    return "bg-pine-100 text-pine-900 border-pine-200";
  }
  if (name.includes("math") || name.includes("algebra")) {
    return "bg-blue-lbg text-blue-dark border-blue-200";
  }
  if (name.includes("science") || name.includes("physics") || name.includes("chemistry") || name.includes("biology")) {
    return "bg-teal-lbg text-teal-dark border-teal-200";
  }
  if (name.includes("english") || name.includes("grammar") || name.includes("literature")) {
    return "bg-pink-lbg text-pink-deep border-pink-200";
  }
  if (name.includes("computer") || name.includes("coding") || name.includes("it")) {
    return "bg-brand-lbg text-brand-burnt border-brand-soft";
  }
  if (name.includes("islamic") || name.includes("deeniyat") || name.includes("hadith")) {
    return "bg-olive-100 text-olive-900 border-olive-200";
  }
  if (name.includes("social") || name.includes("history") || name.includes("geography")) {
    return "bg-orange-lbg text-orange-dark border-orange-200";
  }
  
  // Default fallback colors based on string hash
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-indigo-50 text-indigo-900 border-indigo-200",
    "bg-amber-50 text-amber-900 border-amber-200",
    "bg-violet-50 text-violet-900 border-violet-200",
    "bg-cyan-50 text-cyan-900 border-cyan-200",
    "bg-emerald-50 text-emerald-900 border-emerald-200"
  ];
  return colors[Math.abs(hash) % colors.length];
};

const TimetableViewer = ({
  classes = [],
  teachers = [],
  subjects = [],
  periods = [],
  slots = [],
  onRefresh,
  refreshing = false,
}) => {
  const [viewType, setViewType] = useState("class"); // "class" | "teacher"
  const [selectedId, setSelectedId] = useState("");
  const [showBreaks, setShowBreaks] = useState(true);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const visiblePeriods = showBreaks ? periods : periods.filter((p) => !p.is_break);

  // Handle default selection
  React.useEffect(() => {
    if (viewType === "class") {
      if (classes.length > 0) {
        setSelectedId(classes[0].id);
      } else {
        setSelectedId("");
      }
    } else {
      if (teachers.length > 0) {
        setSelectedId(teachers[0].id);
      } else {
        setSelectedId("");
      }
    }
  }, [viewType, classes, teachers]);

  const handlePrint = () => {
    window.print();
  };

  // Find entity names using robust String comparisons
  const getSubjectName = (subId) => subjects.find((s) => String(s.id) === String(subId))?.name || "Unknown";
  const getTeacherName = (tId) => {
    if (!tId) return "Not Assigned";
    return teachers.find((t) => String(t.id) === String(tId))?.name || "Not Assigned";
  };
  const getClassName = (cId) => classes.find((c) => String(c.id) === String(cId))?.name || "Unknown";

  // Filter slots based on view type and selection
  const getSlotDetails = (day, periodId) => {
    if (!selectedId) return null;

    if (viewType === "class") {
      return slots.find(
        (s) => String(s.class_id) === String(selectedId) && s.day === day && String(s.period_id) === String(periodId)
      );
    } else {
      return slots.find(
        (s) => String(s.teacher_id) === String(selectedId) && s.day === day && String(s.period_id) === String(periodId)
      );
    }
  };

  const selectedEntityName =
    viewType === "class"
      ? getClassName(selectedId)
      : getTeacherName(selectedId);

  return (
    <div className="w-full bg-white border border-light-border rounded-3xl shadow-sm p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0 print:border-none print:shadow-none">
      
      {/* Header controls (hidden on print) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-light-border mb-6 print:hidden">
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-dark-primary flex items-center gap-2">
            <i className="fas fa-calendar-alt text-brand-primary"></i>
            Timetable Viewer
          </h3>
          <p className="text-sm text-dark-soft">
            View schedules dynamically by Class or Teacher.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggles */}
          <div className="bg-light-lbg p-1 rounded-xl flex border border-light-border">
            <button
              onClick={() => setViewType("class")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
                viewType === "class"
                  ? "bg-white text-brand-primary shadow-sm"
                  : "text-dark-soft hover:text-dark-primary"
              }`}
            >
              Class Schedule
            </button>
            <button
              onClick={() => setViewType("teacher")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
                viewType === "teacher"
                  ? "bg-white text-brand-primary shadow-sm"
                  : "text-dark-soft hover:text-dark-primary"
              }`}
            >
              Teacher Schedule
            </button>
          </div>

          {/* Selector */}
          {viewType === "class" ? (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-white border border-light-border rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-dark-primary focus:ring-2 focus:ring-brand-soft outline-none min-w-[150px]"
            >
              {classes.length === 0 ? (
                <option value="">No Classes</option>
              ) : (
                [...classes]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))
              )}
            </select>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-white border border-light-border rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-dark-primary focus:ring-2 focus:ring-brand-soft outline-none min-w-[150px]"
            >
              {teachers.length === 0 ? (
                <option value="">No Teachers</option>
              ) : (
                [...teachers]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
              )}
            </select>
          )}

          {/* Show Breaks Toggle (hidden on print) */}
          <label className="flex items-center gap-2 cursor-pointer bg-light-bg hover:bg-light-ui border border-light-border px-4 py-2 rounded-xl text-xs sm:text-sm font-bold select-none transition-all">
            <input
              type="checkbox"
              checked={showBreaks}
              onChange={(e) => setShowBreaks(e.target.checked)}
              className="rounded text-brand-primary focus:ring-brand-soft w-4 h-4"
            />
            <span>Show Breaks</span>
          </label>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="bg-light-bg text-dark-primary hover:bg-light-ui border border-light-border px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Timetable Data"
            >
              <i className={`fas fa-sync-alt ${refreshing ? "animate-spin text-brand-primary" : ""}`}></i>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={!selectedId}
            className="bg-light-bg text-dark-primary hover:bg-light-ui border border-light-border px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-print"></i>
            Print / PDF
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-6 text-center">
        <h2 className="text-2xl font-bold text-black mb-1">JAMIA ZAYTOONAH VELLORE</h2>
        <h3 className="text-lg font-bold text-gray-800">
          Weekly Timetable — {viewType === "class" ? "Class" : "Teacher"}: {selectedEntityName}
        </h3>
        <p className="text-xs text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* Timetable Schedule Grid Container */}
      {!selectedId ? (
        <div className="text-center py-12">
          <div className="text-4xl text-light-muted mb-3">
            <i className="fas fa-calendar-times"></i>
          </div>
          <p className="text-dark-soft text-lg font-semibold">No data selected to display</p>
          <p className="text-dark-muted text-sm mt-1">Please configure and select a class or teacher.</p>
        </div>
      ) : visiblePeriods.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl text-light-muted mb-3">
            <i className="fas fa-cogs"></i>
          </div>
          <p className="text-dark-soft text-lg font-semibold">No periods configured</p>
          <p className="text-dark-muted text-sm mt-1">Please set up periods in the setup tabs.</p>
        </div>
      ) : (
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
              {days.map((day) => (
                <tr key={day} className="border-b border-light-border last:border-b-0 hover:bg-light-bg/40 transition-colors">
                  <td className="py-4 px-4 font-bold text-sm text-dark-deepblue border-r border-light-border bg-light-lbg/30 print:bg-gray-50 print:text-black w-[120px]">
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
                          className="p-2 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px] bg-light-bg/5"
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
                        className="p-2 border-r border-light-border last:border-r-0 text-center min-w-[120px] h-[80px]"
                      >
                        {isAssigned ? (
                          <div
                            className={`w-full h-full rounded-xl p-2 border flex flex-col justify-center gap-0.5 shadow-sm transition-all duration-300 ${colorClass}`}
                          >
                            <span className="font-extrabold text-xs tracking-wide uppercase truncate">
                              {subjectName}
                            </span>
                            {viewType === "class" ? (
                              !isTeacherAssigned ? (
                                <span className="text-[10px] font-bold text-red-primary flex items-center justify-center gap-1 truncate">
                                  <i className="fas fa-exclamation-triangle text-[9px] animate-pulse"></i>
                                  Not Assigned
                                </span>
                              ) : (
                                <span className="text-[10px] opacity-90 font-bold truncate">
                                  <i className={`fas ${isFemale ? "fa-female" : "fa-male"} mr-1 text-[9px]`}></i>
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
                          <div className="w-full h-full rounded-xl border border-dashed border-light-border flex items-center justify-center text-xs text-dark-muted font-bold bg-light-bg/20">
                            Free
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
    </div>
  );
};

export default TimetableViewer;
