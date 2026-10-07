import React from 'react';
import RankHolders from '../../RankHolders';

/**
 * renderRankHolders
 * Print renderer for the rank holders block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderRankHolders = ({ activeTemplate, rankHolderClassesToRender }) => {
  if (!activeTemplate.showRankHolders) return null;
  return (
    <div key="rankHolders" className="rank-holders-print-block">
      {rankHolderClassesToRender.map((cls) => (
        <div key={cls.id} className="mb-4 print:mb-2">
          {cls.classObj && (
            <h5 className="font-black text-dark-primary uppercase tracking-wider text-center mb-2 text-sm print:text-xs">
              {cls.name}
            </h5>
          )}
          <RankHolders
            students={cls.students}
            classNameText={activeTemplate.rankHoldersConfig?.classNameText || cls.name}
            config={activeTemplate.rankHoldersConfig}
            isCompact={false}
          />
        </div>
      ))}
    </div>
  );
};