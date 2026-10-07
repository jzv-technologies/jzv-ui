import React from 'react';
import { DEFAULT_BLOCK_STYLE } from '../../report-card-designer/constants';

/**
 * renderRemarks
 * Print renderer for the teacher remarks block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderRemarks = ({ bleed, activeTemplate, studentRemarksMap, student, remarksPrint }) => {
  if (!activeTemplate.showTeacherRemarks) return null;
  const rmk = activeTemplate.remarksConfig || {};
  const isCompact = rmk.size === 'compact';
  const rmkSt = { ...DEFAULT_BLOCK_STYLE, ...(rmk.style || {}) };

  const studentRemarks = studentRemarksMap[String(student.id)] || {};
  const effectiveRemarks = studentRemarks.remarks !== undefined ? studentRemarks.remarks : activeTemplate.remarksText || '';
  const effectiveRecommendations = studentRemarks.recommendations !== undefined ? studentRemarks.recommendations : rmk.recommendationsText || '';

  return (
    <div
      key="remarks"
      className={`border border-amber-200 rounded-2xl print:rounded-lg space-y-1.5 print:space-y-0.5 relative group ${isCompact ? 'p-2 print:p-1' : 'p-3.5 print:p-1.5'}`}
      style={bleed.innerBgStyle('rgb(255 251 235 / 0.6)')}
    >
      <div className="flex items-center justify-between">
        <span className="font-black uppercase tracking-wider block remarks-label" style={{ color: rmkSt.labelColor || '#78350f', fontSize: `${remarksPrint.labelFontSize}px` }}>
          {rmk.title || "Teacher's Remarks"}:
        </span>
      </div>
      <p className="italic font-medium remarks-content" style={{ color: rmkSt.contentColor || '#0f172a', fontSize: `${remarksPrint.contentFontSize}px` }}>
        "{effectiveRemarks}"
      </p>

      {rmk.showRecommendations !== false && effectiveRecommendations && (
        <div className="pt-1.5 border-t border-amber-200/60 print:pt-0.5">
          <span className="font-black uppercase tracking-wider block remarks-label" style={{ color: rmkSt.labelColor || '#78350f', fontSize: `${remarksPrint.labelFontSize}px` }}>
            {rmk.recommendationsTitle || 'Recommendations'}:
          </span>
          <p className="italic font-medium remarks-content" style={{ color: rmkSt.contentColor || '#0f172a', fontSize: `${remarksPrint.contentFontSize}px` }}>
            "{effectiveRecommendations}"
          </p>
        </div>
      )}

      {rmk.showPromotion && (
        <p className="mt-1 font-bold uppercase tracking-wider remarks-content" style={{ fontSize: `${remarksPrint.labelFontSize}px`, color: rmkSt.contentColor || '#065f46' }}>
          Status: Eligible for promotion to next grade level.
        </p>
      )}
    </div>
  );
};