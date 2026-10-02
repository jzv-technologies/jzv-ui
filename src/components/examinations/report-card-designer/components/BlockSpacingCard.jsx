import React from 'react';

/**
 * BlockSpacingCard
 * Slider/inputs controlling the gap between report-card blocks.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const BlockSpacingCard = ({ currentConfig, setCurrentConfig }) => {
  return (
    <div className="bg-white border border-light-border shadow-2xs p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-[200px]">
        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs shrink-0 shadow-2xs">
          <i className="fas fa-arrows-split-up-and-left" />
        </div>
        <div>
          <h4 className="text-xs font-black text-dark-primary tracking-tight">
            Block Spacing / Margin Gap
          </h4>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: 'Tight (6px)', val: 6 },
          { label: 'Standard (12px)', val: 12 },
          { label: 'Relaxed (18px)', val: 18 },
          { label: 'Spacious (24px)', val: 24 },
        ].map((preset) => (
          <button
            key={preset.val}
            type="button"
            onClick={() => setCurrentConfig((p) => ({ ...p, blockSpacing: preset.val }))}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
              (currentConfig.blockSpacing ?? 12) === preset.val
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="range"
            min="0"
            max="32"
            step="2"
            value={currentConfig.blockSpacing ?? 12}
            onChange={(e) =>
              setCurrentConfig((p) => ({ ...p, blockSpacing: Number(e.target.value) }))
            }
            className="w-20 accent-rose-600 cursor-pointer"
            title={`${currentConfig.blockSpacing ?? 12}px`}
          />
          <span className="text-xs font-mono font-black text-dark-primary min-w-[36px]">
            {currentConfig.blockSpacing ?? 12}px
          </span>
        </div>
      </div>
    </div>
  );
};

export default BlockSpacingCard;
