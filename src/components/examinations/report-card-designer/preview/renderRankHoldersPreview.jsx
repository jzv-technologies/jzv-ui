import React from 'react';
import RankHolders from '../../RankHolders';
import { PREVIEW_RANK_HOLDERS } from '../constants';

/**
 * renderRankHoldersPreview
 * Live-preview renderer for the Rank Holders block in Report Card Designer.
 * Returns null if currentConfig.showRankHolders is false (default is false).
 */
export const renderRankHoldersPreview = ({ blockSize, currentConfig }) => {
  if (!currentConfig.showRankHolders) return null;

  return (
    <div key="rankHolders">
      <RankHolders
        students={PREVIEW_RANK_HOLDERS}
        classNameText={currentConfig.rankHoldersConfig?.classNameText || 'PLATINUM - 3'}
        config={currentConfig.rankHoldersConfig}
        isCompact={blockSize === 'compact'}
      />
    </div>
  );
};

export default renderRankHoldersPreview;
