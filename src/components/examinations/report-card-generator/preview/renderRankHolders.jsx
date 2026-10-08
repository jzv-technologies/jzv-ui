import React from 'react';
import RankHolders from '../../RankHolders';

/**
 * renderRankHolders
 * Print renderer for the rank holders block.
 * Extracted from the original ReportCardGenerator.jsx
 */
export const renderRankHolders = ({
  activeTemplate,
  rankHolderClassesToRender = [],
  student = null,
}) => {
  if (!activeTemplate.showRankHolders) return null;
  const rkCfg = activeTemplate.rankHoldersConfig || {};

  // If repeatForEveryClass is false, filter to only the current student's class (or first class)
  let targetClasses = rankHolderClassesToRender;
  if (!rkCfg.repeatForEveryClass) {
    if (student?.class_id) {
      const matched = rankHolderClassesToRender.filter(
        (cls) => String(cls.id) === String(student.class_id)
      );
      targetClasses = matched.length > 0 ? matched : rankHolderClassesToRender.slice(0, 1);
    } else {
      targetClasses = rankHolderClassesToRender.slice(0, 1);
    }
  }

  return (
    <div key="rankHolders" className="rank-holders-print-block">
      {targetClasses.map((cls) => (
        <div key={cls.id} className="mb-4 print:mb-2">
          {cls.classObj && targetClasses.length > 1 && (
            <h5 className="font-black text-dark-primary uppercase tracking-wider text-center mb-2 text-sm print:text-xs">
              {cls.name}
            </h5>
          )}
          <RankHolders
            students={cls.students}
            classNameText={rkCfg.classNameText || cls.name}
            config={rkCfg}
            size={rkCfg.size}
            isCompact={rkCfg.size === 'compact'}
          />
        </div>
      ))}
    </div>
  );
};