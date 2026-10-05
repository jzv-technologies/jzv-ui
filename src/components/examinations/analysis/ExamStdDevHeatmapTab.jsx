// src/components/examinations/analysis/ExamStdDevHeatmapTab.jsx
import React, { useState, useMemo } from 'react';

/**
 * Standard Deviation Calculation & Status Rules:
 * A1: Students Std Dev (for specific Class and Subject)
 * B1: Class Std Dev (Average of Std Dev for that Class across all subjects)
 * C1: Subject Std Dev (Average of Std Dev for that Subject across all classes)
 *
 * Rules:
 * 6. (A1 <= B1 and A1 <= C1) OR A1 <= 5.0 -> Green (Optimal / Low variance)
 * 7. A1 >= B1 and A1 >= C1 -> Red (High variance across both)
 * 8. A1 <= B1 and A1 >= C1 -> Amber (Subject Disparity)
 * 9. A1 >= B1 and A1 <= C1 -> Blue (Class Disparity)
 */
export const evaluateStdDevStatus = (A1, B1, C1, allowThresholdOverride = true) => {
  if (A1 === null || A1 === undefined || isNaN(A1)) {
    return {
      color: 'neutral',
      code: 'NONE',
      bgClass: 'bg-slate-100 hover:bg-slate-200/80 text-slate-400',
      borderClass: 'border-slate-200',
      badgeClass: 'bg-slate-200 text-slate-700',
      label: 'No Data',
      ruleFormula: 'No marks recorded',
    };
  }

  const hasAggregates = B1 !== null && B1 !== undefined && C1 !== null && C1 !== undefined;
  const isLowerBoth = hasAggregates && A1 <= B1 && A1 <= C1;
  const isHigherBoth = hasAggregates && A1 >= B1 && A1 >= C1;
  const isLowerClassHigherSub = hasAggregates && A1 <= B1 && A1 >= C1;
  const isHigherClassLowerSub = hasAggregates && A1 >= B1 && A1 <= C1;

  // Rule 6: (A1 <= B1 and A1 <= C1) OR (allowThresholdOverride && A1 <= 5.0)
  if (isLowerBoth || (allowThresholdOverride && A1 <= 5.0 && !isHigherBoth)) {
    return {
      color: 'green',
      code: 'GREEN',
      bgClass: 'bg-emerald-600 hover:bg-emerald-700 text-white font-black',
      borderClass: 'border-emerald-700',
      badgeClass: 'bg-emerald-600 text-white',
      label: 'Optimal / High Consistency',
      ruleFormula: isLowerBoth
        ? 'A1 ≤ B1 (Class) and A1 ≤ C1 (Subject)'
        : 'A1 ≤ 5.0 (Low Dispersion Threshold)',
    };
  }

  // Rule 7: A1 >= B1 and A1 >= C1
  if (isHigherBoth) {
    return {
      color: 'red',
      code: 'RED',
      bgClass: 'bg-rose-600 hover:bg-rose-700 text-white font-black',
      borderClass: 'border-rose-700',
      badgeClass: 'bg-rose-600 text-white',
      label: 'High Variance (Disparity)',
      ruleFormula: 'A1 ≥ B1 (Class) and A1 ≥ C1 (Subject)',
    };
  }

  // Rule 8: A1 <= B1 and A1 >= C1
  if (isLowerClassHigherSub) {
    return {
      color: 'amber',
      code: 'AMBER',
      bgClass: 'bg-amber-600 hover:bg-amber-700 text-white font-black',
      borderClass: 'border-amber-700',
      badgeClass: 'bg-amber-600 text-white',
      label: 'Moderate (Subject Disparity)',
      ruleFormula: 'A1 ≤ B1 (Class) and A1 ≥ C1 (Subject)',
    };
  }

  // Rule 9: A1 >= B1 and A1 <= C1
  if (isHigherClassLowerSub) {
    return {
      color: 'blue',
      code: 'BLUE',
      bgClass: 'bg-blue-600 hover:bg-blue-700 text-white font-black',
      borderClass: 'border-blue-700',
      badgeClass: 'bg-blue-600 text-white',
      label: 'Moderate (Class Disparity)',
      ruleFormula: 'A1 ≥ B1 (Class) and A1 ≤ C1 (Subject)',
    };
  }

  return {
    color: 'green',
    code: 'GREEN',
    bgClass: 'bg-emerald-600 hover:bg-emerald-700 text-white font-black',
    borderClass: 'border-emerald-700',
    badgeClass: 'bg-emerald-600 text-white',
    label: 'Optimal',
    ruleFormula: 'Optimal Distribution',
  };
};

const ExamStdDevHeatmapTab = ({
  schedule = null,
  classes = [],
  subjects = [],
  selectedClassIds = [],
  selectedSubjectIds = [],
  selectedSubjectId = '',
  results = [],
  entries = [],
  loading = false,
}) => {
  // Option: Include A1 <= 5.0 in Green Rule (Requirement 6)
  const [allowThresholdOverride, setAllowThresholdOverride] = useState(true);

  // Transpose View Toggle: false = Class rows × Subject cols; true = Subject rows × Class cols (Requirement 3)
  const [isTransposed, setIsTransposed] = useState(false);

  // Active cell detail modal
  const [activeCellDetail, setActiveCellDetail] = useState(null);

  // Map results by `${class_id}_${subject_id}`
  const classSubjectResultIndex = useMemo(() => {
    const idx = {};
    results.forEach((r) => {
      idx[`${r.class_id}_${r.subject_id}`] = r;
    });
    return idx;
  }, [results]);

  // Target classes filtered
  const targetClasses = useMemo(() => {
    if (!classes || classes.length === 0) return [];
    if (!selectedClassIds || selectedClassIds.length === 0) return classes;
    return classes.filter((c) => selectedClassIds.map(String).includes(String(c.id)));
  }, [classes, selectedClassIds]);

  // Target subjects: subjects that have results in this schedule, filtered if multi-select or single subject is selected
  const targetSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return [];
    const subjectsWithResults = new Set(results.map((r) => String(r.subject_id)));
    let list = subjects.filter((s) => subjectsWithResults.has(String(s.id)));
    if (list.length === 0) list = subjects;

    if (selectedSubjectIds && selectedSubjectIds.length > 0) {
      list = list.filter((s) => selectedSubjectIds.map(String).includes(String(s.id)));
    } else if (selectedSubjectId && selectedSubjectId !== 'all') {
      list = list.filter((s) => String(s.id) === String(selectedSubjectId));
    }
    return list;
  }, [subjects, results, selectedSubjectIds, selectedSubjectId]);

  // Total unique students evaluated per class (Requirement 1)
  const studentCountsByClass = useMemo(() => {
    const map = {};
    targetClasses.forEach((cls) => {
      const classResults = results.filter((r) => String(r.class_id) === String(cls.id));
      const resIds = new Set(classResults.map((r) => String(r.id)));
      const matching = entries.filter(
        (e) => resIds.has(String(e.result_id)) && !e.is_absent && e.marks_obtained !== null
      );
      const uniqueStudents = new Set(matching.map((e) => e.student_id || e.admission_no)).size;
      map[String(cls.id)] = uniqueStudents;
    });
    return map;
  }, [targetClasses, results, entries]);

  // Total unique students evaluated per subject (For transpose view)
  const studentCountsBySubject = useMemo(() => {
    const map = {};
    targetSubjects.forEach((sub) => {
      const subResults = results.filter((r) => String(r.subject_id) === String(sub.id));
      const resIds = new Set(subResults.map((r) => String(r.id)));
      const matching = entries.filter(
        (e) => resIds.has(String(e.result_id)) && !e.is_absent && e.marks_obtained !== null
      );
      const uniqueStudents = new Set(matching.map((e) => e.student_id || e.admission_no)).size;
      map[String(sub.id)] = uniqueStudents;
    });
    return map;
  }, [targetSubjects, results, entries]);

  // Compute Standard Deviation Matrix
  const matrixData = useMemo(() => {
    if (!results || results.length === 0 || !entries || entries.length === 0) {
      return {
        cells: {},
        classStdDevs: {},
        subjectStdDevs: {},
        grandAverageStdDev: 0,
      };
    }

    const cells = {}; // key: `${classId}_${subjectId}` -> { A1, studentCount, meanMark }
    const classValuesMap = {}; // classId -> array of A1
    const subjectValuesMap = {}; // subjectId -> array of A1

    targetClasses.forEach((cls) => {
      classValuesMap[String(cls.id)] = [];
    });
    targetSubjects.forEach((sub) => {
      subjectValuesMap[String(sub.id)] = [];
    });

    // 1. Calculate A1 for each cell
    targetClasses.forEach((cls) => {
      targetSubjects.forEach((sub) => {
        const key = `${cls.id}_${sub.id}`;
        const res = classSubjectResultIndex[key];

        if (!res) {
          cells[key] = { A1: null, studentCount: 0, meanMark: null };
          return;
        }

        const maxMarks = Number(res.max_marks) || 100;
        const matchingEntries = entries.filter(
          (e) => String(e.result_id) === String(res.id) && !e.is_absent && e.marks_obtained !== null
        );

        if (matchingEntries.length === 0) {
          cells[key] = { A1: null, studentCount: 0, meanMark: null };
          return;
        }

        const markPcts = matchingEntries.map((e) =>
          Math.max(0, Math.min(100, (Number(e.marks_obtained) / maxMarks) * 100))
        );

        const count = markPcts.length;
        const sum = markPcts.reduce((acc, v) => acc + v, 0);
        const mean = sum / count;

        let stdDev = 0;
        if (count > 1) {
          const variance = markPcts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
          stdDev = Math.sqrt(variance);
        }

        const A1 = Math.round(stdDev * 10) / 10;
        const roundedMean = Math.round(mean * 10) / 10;

        cells[key] = {
          A1,
          studentCount: count,
          meanMark: roundedMean,
          maxMarks,
        };

        classValuesMap[String(cls.id)].push(A1);
        subjectValuesMap[String(sub.id)].push(A1);
      });
    });

    // 2. Calculate B1 (Class Std Dev) = Average of A1 for each class
    const classStdDevs = {};
    let totalAllStdDevs = 0;
    let countAllStdDevs = 0;

    targetClasses.forEach((cls) => {
      const arr = classValuesMap[String(cls.id)] || [];
      if (arr.length > 0) {
        const avg = arr.reduce((acc, v) => acc + v, 0) / arr.length;
        classStdDevs[String(cls.id)] = Math.round(avg * 10) / 10;
        totalAllStdDevs += arr.reduce((acc, v) => acc + v, 0);
        countAllStdDevs += arr.length;
      } else {
        classStdDevs[String(cls.id)] = null;
      }
    });

    // 3. Calculate C1 (Subject Std Dev) = Average of A1 for each subject
    const subjectStdDevs = {};
    targetSubjects.forEach((sub) => {
      const arr = subjectValuesMap[String(sub.id)] || [];
      if (arr.length > 0) {
        const avg = arr.reduce((acc, v) => acc + v, 0) / arr.length;
        subjectStdDevs[String(sub.id)] = Math.round(avg * 10) / 10;
      } else {
        subjectStdDevs[String(sub.id)] = null;
      }
    });

    const grandAverageStdDev =
      countAllStdDevs > 0 ? Math.round((totalAllStdDevs / countAllStdDevs) * 10) / 10 : 0;

    return {
      cells,
      classStdDevs,
      subjectStdDevs,
      grandAverageStdDev,
    };
  }, [results, entries, targetClasses, targetSubjects, classSubjectResultIndex]);

  // Summary counts for color distributions
  const statusStats = useMemo(() => {
    let green = 0;
    let red = 0;
    let amber = 0;
    let blue = 0;
    let totalAssessed = 0;

    targetClasses.forEach((cls) => {
      targetSubjects.forEach((sub) => {
        const key = `${cls.id}_${sub.id}`;
        const cell = matrixData.cells[key];
        if (cell && cell.A1 !== null) {
          totalAssessed++;
          const B1 = matrixData.classStdDevs[String(cls.id)];
          const C1 = matrixData.subjectStdDevs[String(sub.id)];
          const status = evaluateStdDevStatus(cell.A1, B1, C1, allowThresholdOverride);
          if (status.code === 'GREEN') green++;
          else if (status.code === 'RED') red++;
          else if (status.code === 'AMBER') amber++;
          else if (status.code === 'BLUE') blue++;
        }
      });
    });

    return { green, red, amber, blue, totalAssessed };
  }, [matrixData, targetClasses, targetSubjects, allowThresholdOverride]);

  // Export Matrix to CSV (Respects Transpose View)
  const handleExportCSV = () => {
    if (targetClasses.length === 0 || targetSubjects.length === 0) return;

    if (!isTransposed) {
      // Normal View: Rows = Classes, Cols = Class Std Dev (B1), Subjects
      const headers = ['Class Section', 'Students', 'Class Std Dev (B1)', ...targetSubjects.map((s) => s.name)];
      const subHeaderRow = [
        'Subject Std Dev (C1)',
        '—',
        matrixData.grandAverageStdDev,
        ...targetSubjects.map((sub) => matrixData.subjectStdDevs[String(sub.id)] ?? '—'),
      ];

      const rows = targetClasses.map((cls) => {
        const count = studentCountsByClass[String(cls.id)] || 0;
        const b1 = matrixData.classStdDevs[String(cls.id)] ?? '—';
        const row = [cls.name, count, b1];
        targetSubjects.forEach((sub) => {
          const key = `${cls.id}_${sub.id}`;
          const cell = matrixData.cells[key];
          row.push(cell?.A1 !== null && cell?.A1 !== undefined ? cell.A1 : '—');
        });
        return row;
      });

      const csvContent = [headers.join(','), subHeaderRow.map((c) => `"${c}"`).join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Standard_Deviation_Heatmap_${schedule?.name || 'Exam'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Transposed View: Rows = Subjects, Cols = Subject Std Dev (C1), Classes
      const headers = ['Subject', 'Students', 'Subject Std Dev (C1)', ...targetClasses.map((c) => c.name)];
      const subHeaderRow = [
        'Class Std Dev (B1)',
        '—',
        matrixData.grandAverageStdDev,
        ...targetClasses.map((cls) => matrixData.classStdDevs[String(cls.id)] ?? '—'),
      ];

      const rows = targetSubjects.map((sub) => {
        const count = studentCountsBySubject[String(sub.id)] || 0;
        const c1 = matrixData.subjectStdDevs[String(sub.id)] ?? '—';
        const row = [sub.name, count, c1];
        targetClasses.forEach((cls) => {
          const key = `${cls.id}_${sub.id}`;
          const cell = matrixData.cells[key];
          row.push(cell?.A1 !== null && cell?.A1 !== undefined ? cell.A1 : '—');
        });
        return row;
      });

      const csvContent = [headers.join(','), subHeaderRow.map((c) => `"${c}"`).join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Standard_Deviation_Transposed_${schedule?.name || 'Exam'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-light-border rounded-3xl shadow-xs">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-dark-muted">Computing standard deviations across examination matrices...</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-20 bg-white border border-light-border rounded-3xl p-8 shadow-xs max-w-lg mx-auto">
        <i className="fas fa-calendar-xmark text-4xl text-slate-300 mb-3 block" />
        <p className="text-sm font-bold text-dark-primary">No Exam Schedule Selected</p>
        <p className="text-xs text-dark-muted mt-1">Please select an examination schedule from the header filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">Matrix Grand Mean Std Dev</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-xs">
              <i className="fas fa-chart-area" />
            </div>
          </div>
          <div className="text-2xl font-black text-dark-primary">
            {matrixData.grandAverageStdDev}
            <span className="text-xs font-semibold text-dark-muted ml-1">pts</span>
          </div>
          <div className="text-[10px] text-dark-muted mt-1">Overall school examination dispersion</div>
        </div>

        <div className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">Optimal / Consistent (Green)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
              <i className="fas fa-circle-check" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{statusStats.green}</div>
          <div className="text-[10px] text-dark-muted mt-1">
            {statusStats.totalAssessed > 0 ? Math.round((statusStats.green / statusStats.totalAssessed) * 100) : 0}% of all evaluated cells
          </div>
        </div>

        <div className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">High Variance (Red)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs">
              <i className="fas fa-circle-exclamation" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{statusStats.red}</div>
          <div className="text-[10px] text-dark-muted mt-1">
            Exceeding both Class and Subject averages
          </div>
        </div>

        <div className="bg-white border border-light-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">Subject/Class Disparity</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
              <i className="fas fa-scale-unbalanced" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {statusStats.amber + statusStats.blue}
          </div>
          <div className="text-[10px] text-dark-muted mt-1">
            {statusStats.amber} Amber / {statusStats.blue} Blue cells
          </div>
        </div>
      </div>

      {/* ── Standard Deviation Heatmap Matrix Section ── */}
      <div className="bg-white border border-light-border rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm sm:text-base font-black text-dark-primary tracking-tight flex items-center gap-2">
              <i className="fas fa-table-cells text-violet-600" />
              <span>Standard Deviation Heatmap Matrix</span>
              {isTransposed && (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-violet-100 text-violet-800 border border-violet-200">
                  Transposed
                </span>
              )}
            </h2>
            <p className="text-[11px] font-medium text-dark-muted mt-0.5">
              Solid dark cells show <span className="font-bold text-dark-primary">Students Std Dev (A1)</span>. Evaluated against <span className="font-bold text-dark-primary">Class Std Dev (B1)</span> and <span className="font-bold text-dark-primary">Subject Std Dev (C1)</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Transpose View Toggle (Requirement 3) */}
            <button
              type="button"
              onClick={() => setIsTransposed((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                isTransposed
                  ? 'bg-violet-600 text-white border-violet-700 shadow-violet-200'
                  : 'bg-white text-dark-muted border-light-border hover:bg-slate-50 hover:text-dark-primary'
              }`}
              title="Toggle transpose: swap rows and columns"
            >
              <i className="fas fa-repeat" />
              <span>{isTransposed ? 'Transposed (Subject × Class)' : 'Transpose View'}</span>
            </button>

            {/* Rule 6 Threshold Toggle (Requirement 6: A1 <= 5.0) */}
            <label className="flex items-center gap-2 text-xs font-bold text-dark-primary bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={allowThresholdOverride}
                onChange={(e) => setAllowThresholdOverride(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <span className="text-[11px]">Include A1 ≤ 5.0 in Green Rule</span>
            </label>

            {/* Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 rounded-xl border border-light-border text-dark-muted hover:text-dark-primary hover:bg-slate-50 transition-all cursor-pointer shadow-2xs text-xs font-bold flex items-center gap-1.5"
              title="Export Heatmap to CSV"
            >
              <i className="fas fa-file-excel text-emerald-600" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* ── Status Rules Legend (Requirement 2 & 6) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3 bg-slate-50/70 border border-slate-200/70 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-md bg-emerald-600 shrink-0 shadow-xs" />
            <div>
              <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <span>Green</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">Consistent</span>
              </div>
              <p className="text-[10px] text-dark-muted font-mono leading-tight mt-0.5">
                (A1 ≤ B1 and A1 ≤ C1) {allowThresholdOverride ? 'OR A1 ≤ 5.0' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-md bg-rose-600 shrink-0 shadow-xs" />
            <div>
              <div className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                <span>Red</span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.2 rounded">High Spread</span>
              </div>
              <p className="text-[10px] text-dark-muted font-mono leading-tight mt-0.5">
                A1 ≥ B1 and A1 ≥ C1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-md bg-amber-600 shrink-0 shadow-xs" />
            <div>
              <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <span>Amber</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded">Subj Disparity</span>
              </div>
              <p className="text-[10px] text-dark-muted font-mono leading-tight mt-0.5">
                A1 ≤ B1 and A1 ≥ C1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-md bg-blue-600 shrink-0 shadow-xs" />
            <div>
              <div className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                <span>Blue</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">Class Disparity</span>
              </div>
              <p className="text-[10px] text-dark-muted font-mono leading-tight mt-0.5">
                A1 ≥ B1 and A1 ≤ C1
              </p>
            </div>
          </div>
        </div>

        {/* ── Heatmap Table ── */}
        {targetClasses.length === 0 || targetSubjects.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <i className="fas fa-table-cells-large text-4xl text-slate-300 mb-3 block" />
            <p className="text-xs font-bold text-dark-primary">No examination data available for heatmap</p>
            <p className="text-[11px] text-dark-muted mt-0.5">
              Ensure classes and subjects have recorded marks for this examination schedule.
            </p>
          </div>
        ) : !isTransposed ? (
          /* ── NORMAL VIEW: Rows = Classes, Cols = Class Std Dev (B1) then Subjects ── */
          /* (Requirement 1: Total students into class column, Requirement 4: Subject Std Dev just below header, Class Std Dev next to Class) */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Header Row: Class Section | Class Std Dev (B1) | Subject 1 | Subject 2 ... */}
                <tr className="bg-slate-100/90 text-dark-primary font-black uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 sticky left-0 bg-slate-100 z-30 border-r border-slate-200 min-w-[140px]">
                    <div>Class Section</div>
                    <div className="text-[9px] font-medium text-dark-muted lowercase">(& Total Assessed)</div>
                  </th>
                  <th className="py-3 px-3 text-center bg-violet-100/80 text-violet-950 font-black border-r-2 border-violet-300 min-w-[125px]">
                    <div>Class Std Dev</div>
                    <div className="text-[10px] font-mono font-bold text-violet-700 lowercase">(B1)</div>
                  </th>
                  {targetSubjects.map((sub) => (
                    <th key={sub.id} className="py-3 px-3 text-center min-w-[100px] border-r border-slate-200/80">
                      <div className="font-extrabold text-dark-primary truncate" title={sub.name}>
                        {sub.name}
                      </div>
                      {sub.code && (
                        <div className="text-[10px] font-mono text-dark-muted font-normal">{sub.code}</div>
                      )}
                    </th>
                  ))}
                </tr>

                {/* Sub-Header Row: Subject Std Dev (C1) positioned directly below header (Requirement 4) */}
                <tr className="bg-violet-50/90 border-b-2 border-violet-200 text-violet-950 font-black">
                  <th className="py-2.5 px-4 sticky left-0 bg-violet-100/90 z-30 border-r border-slate-200 text-[11px] font-black uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span>Subject Std Dev</span>
                      <span className="text-[10px] font-mono font-bold text-violet-700 lowercase">(C1)</span>
                    </div>
                  </th>
                  {/* Grand Mean Std Dev at the intersection */}
                  <th className="py-2.5 px-3 text-center bg-violet-600 text-white font-black border-r-2 border-violet-300">
                    <div className="text-xs font-black">{matrixData.grandAverageStdDev}</div>
                    <div className="text-[8px] uppercase tracking-wider text-violet-200 font-bold">Grand Mean</div>
                  </th>
                  {/* C1 for each subject */}
                  {targetSubjects.map((sub) => {
                    const C1 = matrixData.subjectStdDevs[String(sub.id)];
                    return (
                      <th key={sub.id} className="py-2 px-2 text-center border-r border-slate-200/80">
                        {C1 !== null && C1 !== undefined ? (
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-violet-200/80 text-violet-900 font-black text-xs shadow-2xs">
                            {C1}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs font-normal">—</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Data Rows for Each Class */}
              <tbody className="divide-y divide-slate-200/80">
                {targetClasses.map((cls) => {
                  const B1 = matrixData.classStdDevs[String(cls.id)];
                  const studentCount = studentCountsByClass[String(cls.id)] || 0;

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Column 1: Sticky Class Name with Total Students (Requirement 1) */}
                      <td className="py-2.5 px-4 sticky left-0 bg-white z-20 border-r border-slate-200 shadow-2xs">
                        <div className="font-black text-dark-primary text-xs">{cls.name}</div>
                        <div className="text-[10px] text-dark-muted font-medium mt-0.5">
                          {studentCount} {studentCount === 1 ? 'student' : 'students'}
                        </div>
                      </td>

                      {/* Column 2: Class Std Dev (B1) positioned next to Class Section (Requirement 4) */}
                      <td className="py-2.5 px-3 text-center bg-violet-50/40 font-black text-violet-950 border-r-2 border-violet-300">
                        {B1 !== null && B1 !== undefined ? (
                          <div className="inline-flex items-center justify-center px-2 py-1 rounded-xl bg-violet-100 text-violet-900 font-black text-xs shadow-2xs min-w-[42px]">
                            {B1}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Subject Cells: Solid dark color highlight, no balloons, no student counts (Requirement 1 & 2) */}
                      {targetSubjects.map((sub) => {
                        const key = `${cls.id}_${sub.id}`;
                        const cell = matrixData.cells[key];
                        const C1 = matrixData.subjectStdDevs[String(sub.id)];
                        const status = evaluateStdDevStatus(cell?.A1, B1, C1, allowThresholdOverride);

                        return (
                          <td
                            key={sub.id}
                            onClick={() =>
                              cell?.A1 !== null &&
                              setActiveCellDetail({
                                className: cls.name,
                                subjectName: sub.name,
                                A1: cell.A1,
                                B1,
                                C1,
                                meanMark: cell.meanMark,
                                studentCount: cell.studentCount,
                                status,
                              })
                            }
                            className={`py-2 px-2 text-center border-r border-slate-200/80 transition-all select-none relative cursor-pointer ${status.bgClass}`}
                            title={`Click for formula breakdown: ${cls.name} - ${sub.name} (A1: ${cell?.A1 ?? '—'}, B1: ${B1 ?? '—'}, C1: ${C1 ?? '—'})`}
                          >
                            {cell?.A1 !== null && cell?.A1 !== undefined ? (
                              <div className="flex items-center justify-center py-1">
                                <span className="text-sm font-black tracking-tight drop-shadow-xs">
                                  {cell.A1}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs font-mono">—</span>
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
        ) : (
          /* ── TRANSPOSED VIEW: Rows = Subjects, Cols = Subject Std Dev (C1) then Classes ── */
          /* (Requirement 3: Transpose view option) */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Header Row: Subject | Subject Std Dev (C1) | Class 1 | Class 2 ... */}
                <tr className="bg-slate-100/90 text-dark-primary font-black uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 sticky left-0 bg-slate-100 z-30 border-r border-slate-200 min-w-[140px]">
                    <div>Subject</div>
                    <div className="text-[9px] font-medium text-dark-muted lowercase">(& Total Assessed)</div>
                  </th>
                  <th className="py-3 px-3 text-center bg-violet-100/80 text-violet-950 font-black border-r-2 border-violet-300 min-w-[125px]">
                    <div>Subject Std Dev</div>
                    <div className="text-[10px] font-mono font-bold text-violet-700 lowercase">(C1)</div>
                  </th>
                  {targetClasses.map((cls) => (
                    <th key={cls.id} className="py-3 px-3 text-center min-w-[100px] border-r border-slate-200/80">
                      <div className="font-extrabold text-dark-primary truncate" title={cls.name}>
                        {cls.name}
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Sub-Header Row: Class Std Dev (B1) positioned directly below header */}
                <tr className="bg-violet-50/90 border-b-2 border-violet-200 text-violet-950 font-black">
                  <th className="py-2.5 px-4 sticky left-0 bg-violet-100/90 z-30 border-r border-slate-200 text-[11px] font-black uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span>Class Std Dev</span>
                      <span className="text-[10px] font-mono font-bold text-violet-700 lowercase">(B1)</span>
                    </div>
                  </th>
                  {/* Grand Mean Std Dev at the intersection */}
                  <th className="py-2.5 px-3 text-center bg-violet-600 text-white font-black border-r-2 border-violet-300">
                    <div className="text-xs font-black">{matrixData.grandAverageStdDev}</div>
                    <div className="text-[8px] uppercase tracking-wider text-violet-200 font-bold">Grand Mean</div>
                  </th>
                  {/* B1 for each class */}
                  {targetClasses.map((cls) => {
                    const B1 = matrixData.classStdDevs[String(cls.id)];
                    return (
                      <th key={cls.id} className="py-2 px-2 text-center border-r border-slate-200/80">
                        {B1 !== null && B1 !== undefined ? (
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-violet-200/80 text-violet-900 font-black text-xs shadow-2xs">
                            {B1}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs font-normal">—</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Data Rows for Each Subject */}
              <tbody className="divide-y divide-slate-200/80">
                {targetSubjects.map((sub) => {
                  const C1 = matrixData.subjectStdDevs[String(sub.id)];
                  const studentCount = studentCountsBySubject[String(sub.id)] || 0;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Column 1: Sticky Subject Name with Total Students */}
                      <td className="py-2.5 px-4 sticky left-0 bg-white z-20 border-r border-slate-200 shadow-2xs">
                        <div className="font-black text-dark-primary text-xs">{sub.name}</div>
                        {sub.code && <div className="text-[10px] text-dark-muted font-mono">{sub.code}</div>}
                        <div className="text-[10px] text-dark-muted font-medium mt-0.5">
                          {studentCount} {studentCount === 1 ? 'student' : 'students'}
                        </div>
                      </td>

                      {/* Column 2: Subject Std Dev (C1) positioned next to Subject Column */}
                      <td className="py-2.5 px-3 text-center bg-violet-50/40 font-black text-violet-950 border-r-2 border-violet-300">
                        {C1 !== null && C1 !== undefined ? (
                          <div className="inline-flex items-center justify-center px-2 py-1 rounded-xl bg-violet-100 text-violet-900 font-black text-xs shadow-2xs min-w-[42px]">
                            {C1}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Class Cells: Solid dark color highlight, no balloons, no student counts */}
                      {targetClasses.map((cls) => {
                        const key = `${cls.id}_${sub.id}`;
                        const cell = matrixData.cells[key];
                        const B1 = matrixData.classStdDevs[String(cls.id)];
                        const status = evaluateStdDevStatus(cell?.A1, B1, C1, allowThresholdOverride);

                        return (
                          <td
                            key={cls.id}
                            onClick={() =>
                              cell?.A1 !== null &&
                              setActiveCellDetail({
                                className: cls.name,
                                subjectName: sub.name,
                                A1: cell.A1,
                                B1,
                                C1,
                                meanMark: cell.meanMark,
                                studentCount: cell.studentCount,
                                status,
                              })
                            }
                            className={`py-2 px-2 text-center border-r border-slate-200/80 transition-all select-none relative cursor-pointer ${status.bgClass}`}
                            title={`Click for formula breakdown: ${cls.name} - ${sub.name} (A1: ${cell?.A1 ?? '—'}, B1: ${B1 ?? '—'}, C1: ${C1 ?? '—'})`}
                          >
                            {cell?.A1 !== null && cell?.A1 !== undefined ? (
                              <div className="flex items-center justify-center py-1">
                                <span className="text-sm font-black tracking-tight drop-shadow-xs">
                                  {cell.A1}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs font-mono">—</span>
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
        )}
      </div>

      {/* ── Modal / Popover: Cell Standard Deviation Breakdown ── */}
      {activeCellDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                  Standard Deviation Analysis
                </span>
                <h3 className="text-base font-black text-dark-primary">
                  {activeCellDetail.className} — {activeCellDetail.subjectName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCellDetail(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
                <span className="text-[10px] font-bold text-dark-muted uppercase">Students Std Dev</span>
                <div className="text-xl font-black text-dark-primary mt-0.5">{activeCellDetail.A1}</div>
                <span className="text-[9px] font-mono text-violet-600 font-bold">(A1)</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
                <span className="text-[10px] font-bold text-dark-muted uppercase">Class Std Dev</span>
                <div className="text-xl font-black text-dark-primary mt-0.5">{activeCellDetail.B1 ?? '—'}</div>
                <span className="text-[9px] font-mono text-violet-600 font-bold">(B1)</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
                <span className="text-[10px] font-bold text-dark-muted uppercase">Subject Std Dev</span>
                <div className="text-xl font-black text-dark-primary mt-0.5">{activeCellDetail.C1 ?? '—'}</div>
                <span className="text-[9px] font-mono text-violet-600 font-bold">(C1)</span>
              </div>
            </div>

            {/* Evaluation Logic Card */}
            <div className={`p-4 rounded-2xl border ${activeCellDetail.status.borderClass} ${activeCellDetail.status.bgClass}`}>
              <div className="flex items-center gap-2 font-black text-sm text-white">
                <span className="w-3 h-3 rounded-full bg-white/30" />
                <span>Result: {activeCellDetail.status.code} Status</span>
              </div>
              <p className="text-xs font-bold text-white/95 mt-1">
                {activeCellDetail.status.label}
              </p>
              <div className="text-[11px] font-mono mt-2 bg-black/25 p-2 rounded-xl text-white font-medium">
                Rule Applied: <span className="font-bold">{activeCellDetail.status.ruleFormula}</span>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="flex items-center justify-between text-xs text-dark-muted px-1">
              <span>Students evaluated: <strong className="text-dark-primary">{activeCellDetail.studentCount}</strong></span>
              <span>Class Mean Mark: <strong className="text-dark-primary">{activeCellDetail.meanMark}%</strong></span>
            </div>

            <button
              type="button"
              onClick={() => setActiveCellDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamStdDevHeatmapTab;
