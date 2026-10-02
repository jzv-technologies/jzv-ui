import React from 'react';

/**
 * GradingScaleLegend
 * Optional grading-scale legend shown at the bottom of the preview.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const GradingScaleLegend = ({ currentConfig }) => {
  return (
    <div className="pt-2 border-t border-slate-200">
      <span className="text-[9px] font-black uppercase text-dark-muted block mb-1">
        Grading Criteria Legend:
      </span>
      <div className="flex flex-wrap gap-2 text-[9px] text-dark-slate">
        {currentConfig.gradingScale.map((g) => (
          <span
            key={g.grade}
            className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold"
          >
            <strong className="text-dark-primary">{g.grade}</strong> ({g.minPercentage}% -{' '}
            {g.maxPercentage}%{g.description ? ` · ${g.description}` : ''})
          </span>
        ))}
      </div>
    </div>
  );
};

export default GradingScaleLegend;
