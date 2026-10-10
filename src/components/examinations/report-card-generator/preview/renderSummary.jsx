import React from 'react';
import { DEFAULT_BLOCK_STYLE, DEFAULT_TEMPLATE } from '../../report-card-designer/constants';
import { hasStudentFailed, getClassRankDisplay, calculateClassRanks, filterPassedStudents } from '../../../../utils/ranking';

/**
 * Calculate class ranks from metrics objects (excludes failed students)
 * @param {Object} allStudentsMetrics - Map of studentId to metrics
 * @returns {Object} - Rank map
 */
const calculateClassRanksFromMetrics = (allStudentsMetrics) => {
  if (!allStudentsMetrics || typeof allStudentsMetrics !== 'object') return {};
  
  const studentsArray = Object.values(allStudentsMetrics);
  // Filter out failed students before calculating ranks
  const passedStudents = filterPassedStudents(studentsArray);
  return calculateClassRanks(passedStudents);
};

/**
 * renderSummary
 * Print renderer for the summary calculations block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderSummary = ({ bleed, activeTemplate, metrics, subjectScores, summaryPrint, student, allStudentsMetrics }) => {
  if (!activeTemplate.showSummaryCalculations) return null;
  const sum = activeTemplate.summaryConfig || {};
  const isCompact = sum.size === 'compact';
  const sumStyle = { ...DEFAULT_BLOCK_STYLE, ...(sum.style || {}) };
  const itemOrder = sum.itemOrder || DEFAULT_TEMPLATE.summaryConfig.itemOrder;

  const hasFailed = Boolean(
    metrics.hasFailed ||
    metrics.status === 'FAIL' ||
    (Array.isArray(subjectScores) &&
      subjectScores.some(
        (s) =>
          s.status === 'FAIL' ||
          Number(s.marksObtained ?? s.marks_obtained) < Number(s.passMarks ?? s.pass_marks ?? 35)
      ))
  );

  // Calculate class rank display using new utility (excludes failed students). When no cohort
  // map is supplied (the usual case) fall back to the rank already computed on the metrics,
  // otherwise every passing student would print '—'.
  const cohortRankMap = allStudentsMetrics
    ? calculateClassRanksFromMetrics(allStudentsMetrics)
    : null;
  const classRankDisplay = hasFailed
    ? ''
    : (cohortRankMap &&
        getClassRankDisplay(
          { ...metrics, studentId: metrics.studentId, hasFailed },
          cohortRankMap
        )) ||
      (metrics.classRank
        ? `#${metrics.classRank}${metrics.totalStudents ? ` / ${metrics.totalStudents}` : ''}`
        : '');

  const SUMMARY_VALUES = {
    showGrandTotal: {
      label: 'Grand Total',
      value: `${metrics.totalObtained ?? '—'} / ${metrics.totalMax ?? '—'}`,
      color: '',
    },
    showPercentage: {
      label: 'Percentage',
      value: typeof metrics.percentage === 'number' ? `${metrics.percentage}%` : metrics.percentage || '—',
      color: sumStyle.contentColor || '#34d399',
    },
    showGrade: {
      label: 'Overall Grade',
      value: hasFailed ? 'F' : metrics.overallGrade || '—',
      color: hasFailed ? '#dc2626' : sumStyle.contentColor || '#fbbf24',
    },
    showClassRank: {
      label: 'Class Rank',
      value: classRankDisplay || '—',
      color: '',
    },
    showPassFail: {
      label: 'Result',
      value: hasFailed ? 'FAIL' : metrics.status || 'PASS',
      color: hasFailed ? '#dc2626' : sumStyle.contentColor || '#34d399',
    },
    showTotalSubjects: {
      label: 'Total Subjects',
      value: String(subjectScores.length || 0),
      color: '',
    },
  };

  const visibleItems = itemOrder.filter((k) => sum[k]);
  const numCols = sum.columns > 0 ? sum.columns : Math.min(visibleItems.length, 5);
  const gridCols =
    numCols <= 1
      ? 'grid-cols-1'
      : numCols === 2
        ? 'grid-cols-2'
        : numCols === 3
          ? 'grid-cols-3'
          : numCols === 4
            ? 'grid-cols-4'
            : numCols === 5
              ? 'grid-cols-5'
              : 'grid-cols-6';

  return (
    <div
      key="summaryCalculations"
      className={`rounded-2xl print:rounded-lg grid ${gridCols} gap-2.5 print:gap-1 text-center border border-slate-700/50 ${
        isCompact ? 'p-2.5 print:p-1 text-xs' : 'p-3.5 print:p-1.5 text-sm'
      }`}
      style={bleed.innerBgStyle('#0f172a')}
    >
      {visibleItems.map((key) => {
        const item = SUMMARY_VALUES[key];
        if (!item) return null;
        return (
          <div key={key}>
            <span
              className="font-bold uppercase block summary-calc-label"
              style={{
                fontSize: `${summaryPrint.labelFontSize}px`,
                color: sumStyle.labelColor || '#94a3b8',
              }}
            >
              {item.label}
            </span>
            <span
              className="font-black font-mono summary-calc-value"
              style={{
                color: item.color || sumStyle.contentColor || '#ffffff',
                fontSize: `${summaryPrint.contentFontSize}px`,
              }}
            >
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};