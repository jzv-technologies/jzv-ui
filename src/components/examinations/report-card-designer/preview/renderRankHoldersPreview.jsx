import React from 'react';
import RankHolders from '../../RankHolders';
import { PREVIEW_RANK_HOLDERS, PREVIEW_ALL_CLASS_RANK_HOLDERS } from '../constants';

/**
 * renderRankHoldersPreview
 * Live-preview renderer for the Rank Holders block in Report Card Designer.
 * Returns null if currentConfig.showRankHolders is false (default is false).
 */
export const renderRankHoldersPreview = ({
  blockSize,
  currentConfig,
  previewClassName = null,
  previewStudents = null,
  classes = null,
}) => {
  if (!currentConfig.showRankHolders) return null;

  const rkCfg = {
    ...(currentConfig.rankHoldersConfig || {}),
    size: blockSize || currentConfig.rankHoldersConfig?.size || 'standard',
  };

  if (Array.isArray(classes) && classes.length > 0) {
    const isStacked = classes.length > 1;
    return (
      <div key="rankHolders" className="flex-1 flex flex-col justify-center gap-3 w-full">
        {classes.map((cEntry, cIdx) => (
          <div key={cEntry.className || cIdx} className="w-full">
            {cIdx > 0 && <div className="w-full border-t border-slate-200/80 my-2" />}
            <RankHolders
              students={cEntry.students}
              classNameText={cEntry.className}
              config={rkCfg}
              size={isStacked ? 'compact' : blockSize}
              isCompact={isStacked || blockSize === 'compact'}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div key="rankHolders">
      <RankHolders
        students={previewStudents || PREVIEW_RANK_HOLDERS}
        classNameText={previewClassName || rkCfg.classNameText || 'PLATINUM - 3'}
        config={rkCfg}
        size={blockSize}
        isCompact={blockSize === 'compact'}
      />
    </div>
  );
};

export default renderRankHoldersPreview;
