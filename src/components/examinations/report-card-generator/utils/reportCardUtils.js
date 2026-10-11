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

import {
  DEFAULT_GRADING_SCALE,
  DEFAULT_MOCK_CLASSIFICATIONS,
  CLASSIFICATION_SEQ_FALLBACK,
  CLASSIFICATION_NAME_SEQ_FALLBACK,
  KNOWN_SUBJECT_CLASSIFICATIONS,
} from '../../report-card-designer/constants';
import { calculateGrade } from '../../report-card-designer/utils';

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

/**
 * Build the per-student metrics map used by every preview renderer.
 *
 * Marks live on exam_result_entries (marks_obtained), not on exam_results, so results and entries
 * are joined here: by admission_no when the entry carries one, otherwise by student_id for legacy
 * rows. max_marks/pass_marks are read from the exam result, which is the per-exam authority.
 *
 * @param {Array} students - Students to report on
 * @param {Array} results - exam_results rows for the selected exam
 * @param {Array} entries - exam_result_entries rows holding the marks
 * @param {Array} internalSubjects - Subject master rows (name, arabic name, classification)
 * @param {Array} internalClassifications - Classification rows for seq/name resolution
 * @param {Object} activeTemplate - Report template (gradingScale)
 * @param {string|number} selectedClassId - Fallback class id when a student has none
 * @param {Object} ranks - { studentRanksMap, serverRanksMap, isParentView }
 * @returns {Object} metrics keyed by String(student.id)
 */
export const buildStudentMetricsMap = (
  students,
  results,
  entries = [],
  internalSubjects = [],
  internalClassifications = [],
  activeTemplate = null,
  selectedClassId = null,
  { studentRanksMap = null, serverRanksMap = {}, isParentView = false } = {}
) => {
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
      const entry = entries.find(
        (e) =>
          String(e.result_id) === String(result.id) &&
          (e.admission_no
            ? String(e.admission_no) === String(student.admission_no)
            : String(e.student_id) === String(student.id))
      );

      const isAbsent = Boolean(entry?.is_absent);
      const marks = entry && entry.marks_obtained !== null ? Number(entry.marks_obtained) : null;
      const maxMarks = Number(result.max_marks || 100);
      const passMarks = result.pass_marks ? Number(result.pass_marks) : null;

      let status = 'PASS';
      if (isAbsent) {
        status = 'ABSENT';
        hasFailed = true;
      } else if (passMarks !== null && marks !== null && marks < passMarks) {
        status = 'FAIL';
        hasFailed = true;
      }

      let grade = '—';
      if (marks !== null && maxMarks > 0) {
        grade = calculateGrade((marks / maxMarks) * 100, scale);
      }

      if (!isAbsent && marks !== null) totalObtained += marks;
      totalMax += maxMarks;

      const subName = (sub?.name || `Subject #${result.subject_id}`).trim();
      const subNameNorm = subName.toLowerCase();
      const knownSub =
        KNOWN_SUBJECT_CLASSIFICATIONS[subNameNorm] ||
        Object.values(KNOWN_SUBJECT_CLASSIFICATIONS).find(
          (k) => String(k.subjectId) === String(result.subject_id)
        );

      const classificationId = sub?.classification_id ?? knownSub?.classificationId ?? null;
      const clsObj =
        internalClassifications.find((c) => String(c.id) === String(classificationId)) ||
        DEFAULT_MOCK_CLASSIFICATIONS.find((c) => String(c.id) === String(classificationId));

      const classificationName = clsObj?.name || knownSub?.classificationName || 'General';
      const classificationSeq =
        clsObj?.seq !== undefined && clsObj?.seq !== null
          ? Number(clsObj.seq)
          : knownSub?.seq !== undefined && knownSub?.seq !== null
            ? Number(knownSub.seq)
            : CLASSIFICATION_SEQ_FALLBACK[String(classificationId)] !== undefined
              ? CLASSIFICATION_SEQ_FALLBACK[String(classificationId)]
              : CLASSIFICATION_NAME_SEQ_FALLBACK[classificationName.toLowerCase()] !== undefined
                ? CLASSIFICATION_NAME_SEQ_FALLBACK[classificationName.toLowerCase()]
                : 999999;

      subjectScores.push({
        subjectId: result.subject_id,
        subjectName: subName,
        arabicName: sub?.arabic_name || knownSub?.arabicName || '',
        classificationId,
        classificationName,
        classificationSeq,
        maxMarks,
        passMarks,
        marksObtained: isAbsent ? 'Absent' : marks !== null ? marks : '—',
        rawMarks: marks || 0,
        isAbsent,
        grade,
        status,
      });
    });

    // Sort subjects by classification seq, then name, so every report lists subjects the same way.
    subjectScores.sort((a, b) => {
      const seqA = a.classificationSeq ?? 999999;
      const seqB = b.classificationSeq ?? 999999;
      if (seqA !== seqB) return seqA - seqB;
      return (a.subjectName || '').localeCompare(b.subjectName || '');
    });

    const overallPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const overallGrade = hasFailed ? 'F' : calculateGrade(overallPct, scale);

    return {
      studentId: student.id,
      totalObtained,
      totalMax,
      percentage: Number(overallPct.toFixed(1)),
      overallGrade,
      status: hasFailed ? 'FAIL' : 'PASS',
      subjectScores,
      hasFailed,
    };
  });

  // Only students who passed take a rank slot, sorted by percentage then total marks. Letting
  // failed students consume slots is what made a class show Rank 3 while Rank 2 was missing.
  const rankedCalculations = studentCalculations.filter(
    (s) => s.status !== 'FAIL' && s.overallGrade !== 'F'
  );
  const sortedByRank = [...rankedCalculations].sort(
    (a, b) => (b.percentage || 0) - (a.percentage || 0) || b.totalObtained - a.totalObtained
  );

  const metricsMap = {};
  studentCalculations.forEach((item) => {
    const stuObj = students.find((s) => String(s.id) === String(item.studentId));
    const admKey = stuObj?.admission_no ? String(stuObj.admission_no).trim().toLowerCase() : '';
    const serverRank =
      studentRanksMap?.[String(item.studentId)] ||
      (admKey && studentRanksMap?.[admKey]) ||
      serverRanksMap[String(item.studentId)] ||
      (admKey && serverRanksMap[admKey]);

    const failed = item.status === 'FAIL' || item.overallGrade === 'F';
    const rankIdx = sortedByRank.findIndex((s) => String(s.studentId) === String(item.studentId));
    const computedRank = rankIdx >= 0 ? rankIdx + 1 : null;
    // The parent view only loads the ward's rows, so its local cohort is not the whole class and
    // the class-wide server rank stays authoritative. Class-wide views use the local rank so the
    // progress report always agrees with the Rank Holder report.
    const classRank = failed
      ? null
      : isParentView
        ? serverRank?.classRank || computedRank
        : computedRank || serverRank?.classRank || null;
    const totalStudents =
      serverRank?.totalStudents ||
      (studentCalculations.length > 1 ? studentCalculations.length : null);

    metricsMap[String(item.studentId)] = { ...item, hasFailed: failed, classRank, totalStudents };
  });

  return metricsMap;
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
