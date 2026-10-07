import React from 'react';
import { DEFAULT_BLOCK_STYLE, DEFAULT_TEMPLATE } from '../../report-card-designer/constants';

/**
 * renderSummary
 * Print renderer for the summary calculations block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderSummary = ({ bleed, activeTemplate, metrics, subjectScores, summaryPrint }) => {
  if (!activeTemplate.showSummaryCalculations) return null;
  const sum = activeTemplate.summaryConfig || {};
  const isCompact = sum.size === 'compact';
  const sumStyle = { ...DEFAULT_BLOCK_STYLE, ...(sum.style || {}) };
  const itemOrder = sum.itemOrder || DEFAULT_TEMPLATE.summaryConfig.itemOrder;

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
      value: metrics.overallGrade || '—',
      color: sumStyle.contentColor || '#fbbf24',
    },
    showClassRank: {
      label: 'Class Rank',
      value: metrics.classRank
        ? `${metrics.classRank ? `#${metrics.classRank}` : ''}${metrics.totalStudents ? ` / ${metrics.totalStudents}` : ''}`
        : '—',
      color: '',
    },
    showPassFail: {
      label: 'Result',
      value: metrics.status || '—',
      color: metrics.status === 'PASS' ? sumStyle.contentColor || '#34d399' : '#f87171',
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