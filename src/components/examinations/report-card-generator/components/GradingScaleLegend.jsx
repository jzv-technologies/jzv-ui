import React from 'react';

/**
 * GradingScaleLegend
 * Optional grading-scale legend shown at the bottom of the printed card.
 * Extracted from the original ReportCardGenerator.jsx
 */
const GradingScaleLegend = ({ currentConfig, gradingScalePrint }) => {
  return (
    <div className="pt-2 print:pt-1 border-t border-slate-200 print:border-slate-300 grading-scale-legend">
      <span
        className="font-black uppercase text-dark-muted block mb-0.5"
        style={{ fontSize: `${gradingScalePrint.fontSize}px` }}
      >
        Grading Criteria Legend:
      </span>
      <div className="flex flex-wrap gap-1.5 text-dark-slate" style={{ fontSize: `${gradingScalePrint.fontSize}px` }}>
        {currentConfig.gradingScale.map((g) => (
          <span
            key={g.grade}
            className="bg-slate-100 print:bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200 font-bold"
            style={{ fontSize: `${gradingScalePrint.fontSize}px` }}
          >
            <strong>{g.grade}</strong> ({g.minPercentage}% - {g.maxPercentage}%
            {g.description ? ` · ${g.description}` : ''})
          </span>
        ))}
      </div>
    </div>
  );
};

export default GradingScaleLegend;