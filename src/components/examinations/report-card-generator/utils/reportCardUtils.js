// Re-export shared utilities from report-card-designer
export {
  calculateGrade,
  getGradeColor,
  getActiveTableColumns,
  hexToRgba,
  getBlockBackgroundStyle,
  getBlockBleedStyles,
  formatDataLabel,
  getLegendProps,
  getLabelPlacement,
  hexToRgb,
  rgbToHex,
  getColorName,
  mergeConfig,
  shouldPrintBlockOnPage,
  getDynamicClassesPerPage,
} from '../../report-card-designer/utils';

/**
 * Generator-specific utility functions
 */

// Merge two arrays by ID, preserving existing properties
export const mergeById = (prev, incoming) => {
  const byId = new Map((prev || []).map((x) => [String(x.id), x]));
  incoming.forEach((x) => {
    const existing = byId.get(String(x.id)) || {};
    const merged = { ...existing, ...x };
    if (
      (merged.classification_id === undefined || merged.classification_id === null) &&
      existing.classification_id !== undefined &&
      existing.classification_id !== null
    ) {
      merged.classification_id = existing.classification_id;
    }
    if (
      (merged.seq === undefined || merged.seq === null) &&
      existing.seq !== undefined &&
      existing.seq !== null
    ) {
      merged.seq = existing.seq;
    }
    byId.set(String(x.id), merged);
  });
  return Array.from(byId.values());
};

// Apply attendance data to map
export const applyAttendance = (list, selectedScheduleId, propAttendanceMap) => {
  let rows = Array.isArray(list) ? list : [];
  if (rows.length === 0) {
    try {
      const local = localStorage.getItem(`jzv_exam_attendance_${selectedScheduleId}`);
      if (local) rows = JSON.parse(local);
    } catch (_) {}
  }
  const map = {};
  rows.forEach((item) => {
    if (item.admission_no) {
      const k1 = String(item.admission_no).trim().toLowerCase();
      const k2 = k1.replace(/^0+/, '');
      map[k1] = item;
      if (k2) map[k2] = item;
    }
    if (item.student_id) map[String(item.student_id)] = item;
  });
  if (propAttendanceMap && typeof propAttendanceMap === 'object') {
    Object.assign(map, propAttendanceMap);
  }
  return map;
};

// Build student metrics map
export const buildStudentMetricsMap = (students, results, internalSubjects, activeTemplate, selectedClassId, serverRanksMap) => {
  if (students.length === 0 || results.length === 0) return {};
  const scale = activeTemplate?.gradingScale || DEFAULT_GRADING_SCALE;

  const studentCalculations = students.map((student) => {
    let totalObtained = 0;
    let totalMax = 0;
    let hasFailed = false;
    const subjectScores = [];
    const stuClassId = String(student.class_id || selectedClassId || '');
    const relevantResults = results.filter(
      (r) => !r.class_id || !stuClassId || String(r.class_id) === stuClassId
    );

    relevantResults.forEach((result) => {
      const sub = internalSubjects.find((s) => String(s.id) === String(result.subject_id));
      if (!sub) return;
      const obtained = Number(result.marks_obtained) || 0;
      const max = Number(sub.max_marks || result.max_marks || 100);
      const pass = Number(sub.pass_marks || 35);
      totalObtained += obtained;
      totalMax += max;
      if (obtained < pass) hasFailed = true;
      subjectScores.push({
        subjectId: String(sub.id),
        subjectName: sub.name,
        arabicName: sub.arabic_name || '',
        maxMarks: max,
        passMarks: pass,
        marksObtained: obtained,
        percentage: max > 0 ? Math.round((obtained / max) * 100) : 0,
        status: obtained >= pass ? 'PASS' : 'FAIL',
        classificationId: sub.classification_id,
      });
    });

    const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    const overallGrade = hasFailed ? 'F' : calculateGrade(percentage, scale);
    const status = hasFailed ? 'FAIL' : 'PASS';

    return {
      studentId: String(student.id),
      totalObtained,
      totalMax,
      percentage,
      overallGrade,
      status,
      subjectScores,
      hasFailed,
    };
  });

  // Calculate class ranks
  const sortedByPct = [...studentCalculations].sort((a, b) => b.percentage - a.percentage);
  const rankMap = {};
  sortedByPct.forEach((calc, idx) => {
    rankMap[calc.studentId] = idx + 1;
  });

  // Merge with server ranks
  const finalMetrics = {};
  studentCalculations.forEach((calc) => {
    const serverRank = serverRanksMap?.[calc.studentId];
    finalMetrics[calc.studentId] = {
      ...calc,
      classRank: serverRank || rankMap[calc.studentId] || null,
      totalStudents: students.length,
    };
  });

  return finalMetrics;
};

// Build chart data for a student
export const buildChartData = (subjectScores, chartConfig, overallPreviewPct, previewScoresWithGrades) => {
  const ch = chartConfig || {};
  const chartCols = ch.columns && ch.columns.length > 0 ? ch.columns : [{ ...DEFAULT_CHART_COLUMN }];
  const chartH = ch.height || 180;
  const accentColor = '#e11d48';
  const PALETTE = ['#e11d48', '#059669', '#7c3aed', '#0284c7', '#d97706', '#db2777', '#0891b2'];

  const isPercentage = (colCfg) => {
    const d = colCfg.chartData === 'classification' ? 'grade_classification' : colCfg.chartData || 'subject_marks';
    const agg = colCfg.aggregation || 'none';
    if (d === 'subject_pct' || d === 'overall_pct') return true;
    if (d === 'subject_classification' && agg !== 'sum' && agg !== 'max') return true;
    return false;
  };

  const buildColData = (colCfg) => {
    const d = colCfg.chartData === 'classification' ? 'grade_classification' : colCfg.chartData || 'subject_marks';
    const agg = colCfg.aggregation || 'none';

    if (d === 'subject_marks') {
      return subjectScores.map((s) => ({
        name: s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + '…' : s.subjectName,
        fullName: s.subjectName,
        value: typeof s.marksObtained === 'number' ? s.marksObtained : 0,
        Max: s.maxMarks,
      }));
    }

    if (d === 'subject_pct') {
      return subjectScores.map((s) => ({
        name: s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + '…' : s.subjectName,
        fullName: s.subjectName,
        value: Math.round((s.marksObtained / s.maxMarks) * 100),
        Max: 100,
      }));
    }

    if (d === 'subject_classification') {
      const groupsMap = new Map();
      subjectScores.forEach((s) => {
        const key = s.classificationName || 'General';
        if (!groupsMap.has(key)) groupsMap.set(key, []);
        groupsMap.get(key).push(s);
      });
      const result = [];
      groupsMap.forEach((subList, groupName) => {
        const totalObt = subList.reduce((acc, curr) => acc + (Number(curr.marksObtained) || 0), 0);
        const totalMax = subList.reduce((acc, curr) => acc + (Number(curr.maxMarks) || 0), 0);
        const count = subList.length;
        let val = 0;
        if (agg === 'sum') val = Math.round(totalObt);
        else if (agg === 'max') val = Math.max(...subList.map((s) => Number(s.marksObtained) || 0));
        else val = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : count > 0 ? Math.round(totalObt / count) : 0;
        result.push({
          name: groupName.length > 12 ? groupName.slice(0, 10) + '…' : groupName,
          fullName: `${groupName} (${count} subject${count === 1 ? '' : 's'})`,
          value: val,
          count,
          Max: agg === 'sum' ? totalMax : 100,
        });
      });
      return result;
    }

    if (d === 'grade_classification') {
      const scale = DEFAULT_GRADING_SCALE;
      const counts = {};
      scale.forEach((g) => { counts[g.grade] = 0; });
      subjectScores.forEach((s) => { if (s.grade) counts[s.grade] = (counts[s.grade] || 0) + 1; });
      return scale.map((g) => ({
        name: g.grade,
        fullName: `Grade ${g.grade}${g.description ? ` (${g.description})` : ''}`,
        value: counts[g.grade] || 0,
        count: counts[g.grade] || 0,
      })).filter((g) => g.value > 0);
    }

    if (d === 'attendance') {
      return [
        { name: 'Present', fullName: 'Present Days', value: 96, Max: 100 },
        { name: 'Absent', fullName: 'Absent Days', value: 4, Max: 100 },
      ];
    }

    if (d === 'overall_pct') {
      return [
        { name: 'Score', fullName: 'Overall Score', value: Math.round(overallPreviewPct), Max: 100 },
        { name: 'Remaining', fullName: 'Remaining', value: Math.round(100 - overallPreviewPct), Max: 100 },
      ];
    }

    return subjectScores.map((s) => ({
      name: s.subjectName.slice(0, 6),
      fullName: s.subjectName,
      value: s.marksObtained,
      Max: s.maxMarks,
    }));
  };

  return { chartCols, chartH, accentColor, PALETTE, isPercentage, buildColData };
};

// Build grouped sections for subject table
export const buildGroupedSections = (subjectScores, subjectGroups) => {
  const mappedIds = new Set();
  const sections = [];

  (subjectGroups || []).forEach((g) => {
    const groupMembers = subjectScores.filter((s) => g.subjectIds.map(String).includes(String(s.subjectId)));
    if (groupMembers.length > 0) {
      groupMembers.forEach((m) => mappedIds.add(String(m.subjectId)));
      const groupTotalObt = groupMembers.reduce((acc, curr) => acc + (typeof curr.marksObtained === 'number' ? curr.marksObtained : 0), 0);
      const groupTotalMax = groupMembers.reduce((acc, curr) => acc + curr.maxMarks, 0);
      const groupPct = groupTotalMax > 0 ? (groupTotalObt / groupTotalMax) * 100 : 0;
      sections.push({
        groupName: g.name,
        members: groupMembers,
        groupTotalObt,
        groupTotalMax,
        groupPct: Number(groupPct.toFixed(1)),
      });
    }
  });

  const ungrouped = subjectScores.filter((s) => !mappedIds.has(String(s.subjectId)));
  return { groupedSections: sections, ungroupedScores: ungrouped };
};

// Get print font sizes for a block
export const getPrintFontSizes = (activeTemplate, blockKey) => {
  const cfg = activeTemplate?.[blockKey] || {};
  const isCompact = cfg.size === 'compact';
  const isLarge = cfg.size === 'large';
  const st = { ...DEFAULT_BLOCK_STYLE, ...(cfg.style || {}) };
  return {
    labelFontSize: st.labelFontSize || (isCompact ? 9 : isLarge ? 11 : 10),
    contentFontSize: st.contentFontSize || (isCompact ? 10 : isLarge ? 14 : 12),
  };
};