import React from 'react';

/**
 * BlockRowHeader
 * One row of the block list: drag handle, reorder arrows, name, visibility and expand toggle.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const BlockRowHeader = ({
  blockInfo,
  blockKey,
  currentConfig,
  handleDragEnd,
  handleDragOver,
  handleDragStart,
  idx,
  isExpanded,
  isVisible,
  moveBlock,
  setExpandedBlock,
}) => {
  return (
    <div
      draggable
      onDragStart={() => handleDragStart(idx)}
      onDragOver={(e) => handleDragOver(e, idx)}
      onDragEnd={handleDragEnd}
      onClick={() => setExpandedBlock(isExpanded ? null : blockKey)}
      className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 transition-colors"
    >
      {/* Left: Reorder Up/Down (Leftmost), Drag Handle, Icon, Block Name & Read-Only Eye */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        {/* Reorder Arrows (Leftmost) */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => moveBlock(idx, -1)}
            disabled={idx === 0}
            className="w-6 h-6 rounded-lg border border-light-border flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-20 cursor-pointer transition-all"
            title="Move block up"
          >
            <i className="fas fa-chevron-up text-[8px]" />
          </button>
          <button
            type="button"
            onClick={() => moveBlock(idx, 1)}
            disabled={idx === currentConfig.blockOrder.length - 1}
            className="w-6 h-6 rounded-lg border border-light-border flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-20 cursor-pointer transition-all"
            title="Move block down"
          >
            <i className="fas fa-chevron-down text-[8px]" />
          </button>
        </div>

        {/* Drag Handle */}
        <div
          className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs shrink-0 cursor-grab active:cursor-grabbing"
          title="Drag to reorder block"
        >
          <i className="fas fa-grip-vertical text-[10px]" />
        </div>

        {/* Block Icon */}
        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs shrink-0">
          <i className={`fas ${blockInfo.icon}`} />
        </div>

        {/* Block Name, # Badge & Read-Only Eye */}
        <div className="min-w-0 flex items-center gap-2">
          <h4 className="text-xs font-black text-dark-primary tracking-tight truncate">
            {blockInfo.name}
          </h4>
          <span className="text-[10px] text-dark-muted font-mono bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
            #{idx + 1}
          </span>
          {/* Read-only eye based on visibility */}
          {isVisible ? (
            <span
              title="Visible on report card"
              className="text-emerald-600 flex items-center ml-1 shrink-0"
            >
              <i className="fas fa-eye text-xs" />
            </span>
          ) : (
            <span
              title="Hidden from report card"
              className="text-slate-400 flex items-center gap-1 ml-1 shrink-0"
            >
              <i className="fas fa-eye-slash text-xs" />
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600">
                Hidden
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Expand / Collapse Button */}
      <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setExpandedBlock(isExpanded ? null : blockKey)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
            isExpanded
              ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
              : 'bg-white text-dark-slate border-light-border hover:bg-slate-50'
          }`}
          title={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          <i
            className={`fas fa-chevron-down text-[8px] transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-rose-600' : 'text-slate-400'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default BlockRowHeader;
