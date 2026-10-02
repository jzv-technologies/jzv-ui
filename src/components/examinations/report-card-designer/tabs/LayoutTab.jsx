import React from 'react';
import { BLOCK_LABELS } from '../constants';
import BlockRowHeader from '../block-settings/BlockRowHeader';
import BlockSettingsPanel from '../block-settings/BlockSettingsPanel';
import BlockSpacingCard from '../components/BlockSpacingCard';
import ExtraComponentConfig from '../components/ExtraComponent';

/**
 * LayoutTab
 * The "Blocks & Layout" tab: spacing card, Extra Components card and the sortable block list.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
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
}) => {
  return (
    <div>
      {/* ── Block Spacing / Gap Control Card ── */}
      <BlockSpacingCard currentConfig={currentConfig} setCurrentConfig={setCurrentConfig} />

      {/* ── ExtraComponent / Logo Layers Configuration Card ── */}
      <ExtraComponentConfig
        currentConfig={currentConfig}
        setCurrentConfig={setCurrentConfig}
        expanded={isExtraComponentExpanded}
        onExpandedChange={setIsExtraComponentExpanded}
      />

      {/* Block List with Inline Details & Size Controls */}
      <div>
        {currentConfig.blockOrder.map((blockKey, idx) => {
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
      </div>
    </div>
  );
};

export default LayoutTab;
