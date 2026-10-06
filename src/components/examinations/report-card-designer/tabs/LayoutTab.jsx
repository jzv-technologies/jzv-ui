import React, { useState } from 'react';
import { BLOCK_LABELS } from '../constants';
import BlockRowHeader from '../block-settings/BlockRowHeader';
import BlockSettingsPanel from '../block-settings/BlockSettingsPanel';
import BlockSpacingCard from '../components/BlockSpacingCard';
import ExtraComponentConfig from '../components/ExtraComponent';

/**
 * LayoutTab
 * The "Blocks & Layout" tab: spacing card with block filter, Extra Components card and the sortable block list.
 * Extracted from the original ReportCardDesigner.jsx — enhanced with selective block loading.
 */
const LayoutTab = ({
  currentConfig,
  draggedBlockIdx,
  expandedBlock,
  getBlockSize,
  handleDragEnd,
  handleDragOver,
  handleDragStart,
  isBlockVisible,
  isExtraComponentExpanded,
  moveBlock,
  setBlockSize,
  setCurrentConfig,
  setExpandedBlock,
  setIsExtraComponentExpanded,
  toggleBlockVisibility,
  selectedBlocks: propSelectedBlocks,
  setSelectedBlocks: propSetSelectedBlocks,
}) => {
  const [internalSelectedBlocks, setInternalSelectedBlocks] = useState(() =>
    Object.keys(BLOCK_LABELS)
  );
  const selectedBlocks =
    propSelectedBlocks !== undefined ? propSelectedBlocks : internalSelectedBlocks;
  const setSelectedBlocks = propSetSelectedBlocks || setInternalSelectedBlocks;

  const handleSelectedBlocksChange = (newSelected) => {
    setSelectedBlocks(newSelected);
    if (Array.isArray(newSelected) && newSelected.length === 1) {
      setExpandedBlock(newSelected[0]);
    }
  };

  const hasAnyBlockSelected =
    Array.isArray(selectedBlocks) &&
    currentConfig.blockOrder.some((blockKey) => selectedBlocks.includes(blockKey));

  return (
    <div>
      {/* ── Block Spacing / Gap Control & Block Selection Card ── */}
      <BlockSpacingCard
        currentConfig={currentConfig}
        setCurrentConfig={setCurrentConfig}
        selectedBlocks={selectedBlocks}
        setSelectedBlocks={handleSelectedBlocksChange}
      />

      {/* ── ExtraComponent / Logo Layers Configuration Card ── */}
      <ExtraComponentConfig
        currentConfig={currentConfig}
        setCurrentConfig={setCurrentConfig}
        expanded={isExtraComponentExpanded}
        onExpandedChange={setIsExtraComponentExpanded}
      />

      {/* Block List with Inline Details & Size Controls (Only selected BLOCK_LABELS loaded) */}
      <div>
        {currentConfig.blockOrder.map((blockKey, idx) => {
          // Only selected BLOCK_LABELS are loaded in Block List
          if (Array.isArray(selectedBlocks) && !selectedBlocks.includes(blockKey)) {
            return null;
          }

          const blockInfo = BLOCK_LABELS[blockKey] || {
            name: blockKey,
            icon: 'fa-cube',
          };
          const isDragging = draggedBlockIdx === idx;
          const isExpanded = expandedBlock === blockKey;
          const isVisible = isBlockVisible(blockKey);
          const blockSize = getBlockSize(blockKey);

          return (
            <div
              key={blockKey}
              className={`bg-white border transition-all shadow-2xs overflow-hidden ${
                isDragging
                  ? 'border-rose-300 shadow-md scale-[1.01] bg-rose-50/40'
                  : isVisible
                    ? 'border-light-border hover:border-slate-300'
                    : 'border-slate-200 opacity-60 bg-slate-50/80'
              }`}
            >
              {/* Block Row Header */}
              <BlockRowHeader
                blockInfo={blockInfo}
                blockKey={blockKey}
                currentConfig={currentConfig}
                handleDragEnd={handleDragEnd}
                handleDragOver={handleDragOver}
                handleDragStart={handleDragStart}
                idx={idx}
                isExpanded={isExpanded}
                isVisible={isVisible}
                moveBlock={moveBlock}
                setExpandedBlock={setExpandedBlock}
              />

              {/* ── EXPANDABLE BLOCK DETAILS PANEL ── */}
              {isExpanded && (
                <BlockSettingsPanel
                  blockKey={blockKey}
                  blockSize={blockSize}
                  currentConfig={currentConfig}
                  isVisible={isVisible}
                  setBlockSize={setBlockSize}
                  setCurrentConfig={setCurrentConfig}
                  toggleBlockVisibility={toggleBlockVisibility}
                />
              )}
            </div>
          );
        })}

        {/* Empty state when no blocks are selected */}
        {!hasAnyBlockSelected && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center my-2 shadow-2xs">
            <div className="w-10 h-10 mx-auto rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm mb-2 shadow-2xs">
              <i className="fas fa-layer-group" />
            </div>
            <h4 className="text-xs font-black text-dark-primary mb-1">
              No Component Blocks Selected
            </h4>
            <p className="text-[11px] text-dark-muted max-w-xs mx-auto mb-3">
              Select component blocks in the Visible Component Blocks dropdown above to display their controls here.
            </p>
            <button
              type="button"
              onClick={() => handleSelectedBlocksChange(Object.keys(BLOCK_LABELS))}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <i className="fas fa-check-double text-[10px]" />
              <span>Show All Blocks</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutTab;
