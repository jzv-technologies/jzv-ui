import React, { useMemo } from 'react';
import MultiSelectDropdown from '../../../MultiSelectDropdown';
import { BLOCK_LABELS } from '../constants';

/**
 * BlockSpacingCard
 * MultiSelectDropdown component block filter & Slider/inputs controlling the gap between report-card blocks.
 * Extracted from the original ReportCardDesigner.jsx — enhanced with block filter control.
 */
const BlockSpacingCard = ({
  currentConfig,
  setCurrentConfig,
  selectedBlocks = Object.keys(BLOCK_LABELS),
  setSelectedBlocks,
}) => {
  const blockOptions = useMemo(() => {
    return Object.entries(BLOCK_LABELS).map(([key, info]) => ({
      value: key,
      label: info.name,
      prefix: info.icon,
    }));
  }, []);

  const totalBlocks = blockOptions.length;
  const selectedCount = Array.isArray(selectedBlocks) ? selectedBlocks.length : totalBlocks;
  const isFiltered = selectedCount < totalBlocks;

  return (
    <div className="bg-white border border-light-border shadow-2xs divide-y divide-slate-100 overflow-hidden">
      {/* ── Component Blocks Multi-Select Filter Control ── */}
      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs shrink-0 shadow-2xs">
            <i className="fas fa-layer-group" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-dark-primary tracking-tight">
                Visible Component Blocks
              </h4>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                  isFiltered
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {selectedCount}/{totalBlocks}
              </span>
            </div>
            <p className="text-[10px] text-dark-muted leading-tight">
              Filter which component blocks are displayed in the designer view
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-56 sm:w-64">
            <MultiSelectDropdown
              label="Blocks"
              placeholder="Select component blocks..."
              options={blockOptions}
              selected={selectedBlocks}
              onChange={setSelectedBlocks}
              icon="fa-cubes"
              fullWidth={true}
            />
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={() => setSelectedBlocks && setSelectedBlocks(Object.keys(BLOCK_LABELS))}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 shadow-2xs"
              title="Show all component blocks in designer"
            >
              <i className="fas fa-check-double text-[9px]" />
              <span>Show All</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Block Spacing / Margin Gap Control ── */}
      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
        <div className="flex items-center gap-2.5 min-w-[180px]">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs shrink-0 shadow-2xs">
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
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
    </div>
  );
};

export default BlockSpacingCard;
