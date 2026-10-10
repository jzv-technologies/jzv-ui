// src/utils/ranking.js
/**
 * Ranking utility functions for progress reports
 * Filters out students who have failed in any subject from rank calculations
 */

/**
 * Check if a student has failed in any subject
 * @param {Object} student - Student object with subjectScores or marks data
 * @returns {boolean} - True if student has failed any subject
 */
export const hasStudentFailed = (student) => {
  // Check subjectScores array (from report card generator)
  if (student.subjectScores && Array.isArray(student.subjectScores)) {
    return student.subjectScores.some(
      (s) =>
        s.isAbsent === true ||
        s.status === 'ABSENT' ||
        s.status === 'FAIL' ||
        s.marksObtained === 'Absent' ||
        Number(s.marksObtained ?? s.marks_obtained) < Number(s.passMarks ?? s.pass_marks ?? 35)
    );
  }

  // Absent students are never eligible for a rank
  if (student.isAbsent === true || student.status === 'ABSENT') {
    return true;
  }

  // Check hasFailed flag (from buildStudentMetricsMap)
  if (student.hasFailed === true) {
    return true;
  }

  // Check metrics.hasFailed (from renderSummary)
  if (student.metrics?.hasFailed === true) {
    return true;
  }
  
  // Check overall grade F
  if (student.overallGrade === 'F' || student.metrics?.overallGrade === 'F') {
    return true;
  }
  
  // Check status FAIL
  if (student.status === 'FAIL' || student.metrics?.status === 'FAIL') {
    return true;
  }
  
  return false;
};

/**
 * Filter out students who have failed from ranking calculations
 * @param {Array} students - Array of student objects
 * @returns {Array} - Filtered array of students who passed all subjects
 */
export const filterPassedStudents = (students) => {
  if (!Array.isArray(students)) return [];
  return students.filter((student) => !hasStudentFailed(student));
};

/**
 * Calculate class ranks for students, excluding those who failed
 * @param {Array} students - Array of student objects with percentage
 * @returns {Object} - Map of studentId to rank info { rank, totalStudents }
 */
export const calculateClassRanks = (students) => {
  if (!Array.isArray(students) || students.length === 0) return {};
  
  // Filter out failed students
  const passedStudents = filterPassedStudents(students);
  
  // Sort by percentage descending, then total marks (matches the Rank Holder report)
  const sortedByPct = [...passedStudents].sort((a, b) => {
    const pctA = Number(a.percentage ?? a.metrics?.percentage ?? 0);
    const pctB = Number(b.percentage ?? b.metrics?.percentage ?? 0);
    const totalA = Number(a.totalObtained ?? a.metrics?.totalObtained ?? 0);
    const totalB = Number(b.totalObtained ?? b.metrics?.totalObtained ?? 0);
    return pctB - pctA || totalB - totalA;
  });
  
  // Assign ranks
  const rankMap = {};
  sortedByPct.forEach((student, idx) => {
    const studentId = String(student.studentId ?? student.id ?? student.admission_no ?? idx);
    rankMap[studentId] = {
      rank: idx + 1,
      totalStudents: passedStudents.length,
    };
  });
  
  return rankMap;
};

/**
 * Get rank for a specific student
 * @param {Object} student - Student object
 * @param {Object} rankMap - Rank map from calculateClassRanks
 * @returns {Object|null} - Rank info or null if student failed or not ranked
 */
export const getStudentRank = (student, rankMap) => {
  if (!student || !rankMap) return null;
  
  // Check if student failed
  if (hasStudentFailed(student)) {
    return null;
  }
  
  const studentId = String(student.studentId ?? student.id ?? student.admission_no);
  return rankMap[studentId] || null;
};

/**
 * Get display value for class rank (empty string if failed)
 * @param {Object} student - Student object
 * @param {Object} rankMap - Rank map from calculateClassRanks
 * @returns {string} - Rank display string (e.g., "#2 / 25") or empty string
 */
export const getClassRankDisplay = (student, rankMap) => {
  const rankInfo = getStudentRank(student, rankMap);
  if (!rankInfo) return '';
  
  return `#${rankInfo.rank}${rankInfo.totalStudents ? ` / ${rankInfo.totalStudents}` : ''}`;
};

/**
 * Process students for rank holders display
 * Filters failed students and returns only those eligible for ranking
 * @param {Array} students - Array of student objects
 * @param {Object} options - Options for filtering
 * @returns {Array} - Filtered and sorted students for rank display
 */
export const getRankHolders = (students, options = {}) => {
  const { limit = 3, filterMode = 'top_x' } = options;
  
  // Filter out failed students
  const passedStudents = filterPassedStudents(students);
  
  // Sort by percentage descending, then total marks (matches the Rank Holder report)
  const sorted = [...passedStudents].sort((a, b) => {
    const pctA = Number(a.percentage ?? a.metrics?.percentage ?? 0);
    const pctB = Number(b.percentage ?? b.metrics?.percentage ?? 0);
    const totalA = Number(a.totalObtained ?? a.metrics?.totalObtained ?? 0);
    const totalB = Number(b.totalObtained ?? b.metrics?.totalObtained ?? 0);
    return pctB - pctA || totalB - totalA;
  });
  
  // Apply filter mode
  if (filterMode === 'upto_x') {
    return sorted.filter((s, idx) => {
      const rank = idx + 1;
      return rank <= limit;
    });
  }
  
  // Default: top_x
  return sorted.slice(0, limit);
};

export default {
  hasStudentFailed,
  filterPassedStudents,
  calculateClassRanks,
  getStudentRank,
  getClassRankDisplay,
  getRankHolders,
};