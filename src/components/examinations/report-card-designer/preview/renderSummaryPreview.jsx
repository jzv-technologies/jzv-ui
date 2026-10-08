import React from 'react';
import { DEFAULT_BLOCK_STYLE, DEFAULT_TEMPLATE } from '../constants';

/**
 * renderSummaryPreview
 * Live-preview renderer for one report-card block.
 * This is a render function (not a component): it returns null when the block is hidden/empty so
 * PreviewPanel can skip the block wrapper, exactly like the original switch statement did.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
export const renderSummaryPreview = ({
  bleed,
  blockSize,
  currentConfig,
  overallPreviewGrade,
  overallPreviewPct,
  previewScoresWithGrades,
}) => {
  if (!currentConfig.showSummaryCalculations) return null;
  const sum = currentConfig.summaryConfig || {};
  const isCompact = blockSize === 'compact';
  const sumStyle = { ...DEFAULT_BLOCK_STYLE, ...(sum.style || {}) };
  const itemOrder = sum.itemOrder || DEFAULT_TEMPLATE.summaryConfig.itemOrder;

  const hasFailed =
    Boolean(sum.simulateFailPreview) ||
    (Array.isArray(previewScoresWithGrades) &&
      previewScoresWithGrades.some((s) => {
        if (s.status === 'FAIL') return true;
        const obt = Number(s.marksObtained ?? s.marks_obtained);
        const pass = Number(s.passMarks ?? s.pass_marks ?? 35);
        return !isNaN(obt) && obt < pass;
      }));

  const SUMMARY_PREVIEW_VALUES = {
    showGrandTotal: { label: 'Grand Total', value: hasFailed ? '540 / 700' : '615 / 700', color: '' },
    showPercentage: {
      label: 'Percentage',
      value: hasFailed ? '77.1%' : `${overallPreviewPct}%`,
      color: sumStyle.contentColor || '#34d399',
    },
    showGrade: {
      label: 'Overall Grade',
      value: hasFailed ? 'F' : overallPreviewGrade,
      color: hasFailed ? '#dc2626' : (sumStyle.contentColor || '#fbbf24'),
    },
    showClassRank: { label: 'Class Rank', value: hasFailed ? '' : '#3', color: '' },
    showPassFail: {
      label: 'Result',
      value: hasFailed ? 'FAIL' : 'PASS',
      color: hasFailed ? '#dc2626' : (sumStyle.contentColor || '#34d399'),
    },
    showTotalSubjects: { label: 'Total Subjects', value: '7', color: '' },
  };
  const visibleItems = itemOrder.filter((k) => sum[k]);
  const numCols = sum.columns > 0 ? sum.columns : Math.min(visibleItems.length, 5);
  const gridCols =
    numCols <= 2
      ? `grid-cols-${numCols}`
      : numCols === 3
        ? 'grid-cols-3'
        : numCols === 4
          ? 'grid-cols-4'
          : 'grid-cols-5';

  return (
    <div
      key="summaryCalculations"
      className={`rounded-xl grid ${gridCols} gap-2 text-center border border-slate-700/50 ${
        isCompact ? 'p-2 text-xs' : 'p-3 text-sm'
      }`}
      style={bleed.innerBgStyle('#0f172a')}
    >
      {visibleItems.map((key) => {
        const item = SUMMARY_PREVIEW_VALUES[key];
        if (!item) return null;
        return (
          <div key={key}>
            <span
              className="font-bold uppercase block"
              style={{
                fontSize: `${sumStyle.labelFontSize || 9}px`,
                color: sumStyle.labelColor || '#94a3b8',
              }}
            >
              {item.label}
            </span>
            <span
              className="font-black font-mono"
              style={{
                color: item.color || sumStyle.contentColor || '#ffffff',
                fontSize: `${sumStyle.contentFontSize || 14}px`,
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
