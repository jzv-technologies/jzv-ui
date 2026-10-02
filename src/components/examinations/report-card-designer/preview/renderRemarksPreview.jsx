import React from 'react';
import { DEFAULT_BLOCK_STYLE } from '../constants';

/**
 * renderRemarksPreview
 * Live-preview renderer for one report-card block.
 * This is a render function (not a component): it returns null when the block is hidden/empty so
 * PreviewPanel can skip the block wrapper, exactly like the original switch statement did.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
export const renderRemarksPreview = ({ bleed, blockSize, currentConfig }) => {
  if (!currentConfig.showTeacherRemarks) return null;
  const rmk = currentConfig.remarksConfig || {};
  const isCompact = blockSize === 'compact';
  const rmkSt = { ...DEFAULT_BLOCK_STYLE, ...(rmk.style || {}) };

  return (
    <div
      key="remarks"
      className={`border border-amber-200 rounded-xl space-y-2 ${isCompact ? 'p-2' : 'p-3'}`}
      style={bleed.innerBgStyle('rgb(255 251 235 / 0.6)')}
    >
      <div>
        <span
          className="font-black uppercase tracking-wider block mb-0.5"
          style={{
            fontSize: `${rmkSt.labelFontSize || 10}px`,
            color: rmkSt.labelColor || '#78350f',
          }}
        >
          {rmk.title || "Teacher's Remarks"}:
        </span>
        <p
          className="font-medium italic"
          style={{
            fontSize: `${rmkSt.contentFontSize || 11}px`,
            color: rmkSt.contentColor || '#0f172a',
          }}
        >
          &quot;
          {currentConfig.remarksText ||
            'Consistently demonstrates strong academic performance, active class participation, and excellent problem-solving skills.'}
          &quot;
        </p>
      </div>

      {rmk.showRecommendations && (
        <div className="pt-1.5 border-t border-amber-200/60">
          <span
            className="font-black uppercase tracking-wider block mb-0.5"
            style={{
              fontSize: `${rmkSt.labelFontSize || 10}px`,
              color: rmkSt.labelColor || '#78350f',
            }}
          >
            {rmk.recommendationsTitle || 'Recommendations'}:
          </span>
          <p
            className="font-medium italic"
            style={{
              fontSize: `${rmkSt.contentFontSize || 11}px`,
              color: rmkSt.contentColor || '#0f172a',
            }}
          >
            &quot;
            {rmk.recommendationsText ||
              'Encouraged to read broader scientific journals and continue regular practice in advanced mathematics.'}
            &quot;
          </p>
        </div>
      )}

      {rmk.showPromotion && (
        <p
          className="mt-1 font-bold uppercase tracking-wider"
          style={{
            fontSize: `${rmkSt.labelFontSize || 10}px`,
            color: rmkSt.contentColor || '#065f46',
          }}
        >
          Status: Eligible for promotion to next grade level.
        </p>
      )}
    </div>
  );
};
