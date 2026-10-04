// src/components/portal-shared/TileButton.jsx
import React, { memo, useCallback } from 'react';
import Translate from '../Translate';

/**
 * Memoized tile button component to prevent unnecessary re-renders.
 * Only re-renders when tile props actually change.
 */
const TileButton = memo(function TileButton({
  tile,
  onClick,
  isCategoryView = true,
  multiTileGroups = [],
  resolveGroupInfo,
}) {
  const topBarClass = useCallback(() => {
    return (
      (tile.buttonColor && tile.buttonColor.split(' ').find((c) => c.startsWith('bg-'))) ||
      'bg-orange-primary'
    );
  }, [tile.buttonColor]);

  const hoverBorderClass = useCallback(() => {
    const top = topBarClass();
    return top ? top.replace('bg-', 'hover:border-') : 'hover:border-orange-primary';
  }, [topBarClass]);

  const handleClick = useCallback(() => {
    onClick(tile);
  }, [onClick, tile]);

  const bgColorClass = tile.buttonColor || 'bg-orange-primary text-white';
  const shadowClass = tile.shadow || '';
  const iconClass = `fas ${tile.icon}`;
  const titleContent = tile.titleKey ? (
    <Translate id={tile.titleKey}>{tile.title}</Translate>
  ) : (
    tile.title
  );
  const descriptionContent = tile.descriptionKey ? (
    <Translate id={tile.descriptionKey}>{tile.description}</Translate>
  ) : (
    tile.description
  );

  return (
    <button
      onClick={handleClick}
      className={`group pt-5 pb-3.5 px-3.5 sm:pt-7 sm:pb-5 sm:px-5 lg:pt-8 lg:pb-6 lg:px-6 bg-white border border-light-border rounded-2xl sm:rounded-[1.75rem] ${hoverBorderClass()} hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center sm:items-center gap-2.5 sm:gap-3.5 text-center sm:text-left w-full shadow-sm relative overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 ${topBarClass()}`} />
      <div
        className={`w-10 h-10 sm:w-14 lg:w-16 sm:h-14 lg:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl lg:text-2xl shadow-md sm:shadow-lg ${shadowClass} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0 ${bgColorClass}`}
      >
        <i className={iconClass}></i>
      </div>
      <div className="w-full">
        <div className="flex items-center justify-center sm:justify-start gap-1.5">
          <h5 className="font-bold text-xs sm:text-base lg:text-xl text-dark-deepblue sm:mb-1 group-hover:text-orange-primary transition-colors leading-tight">
            {titleContent}
          </h5>
          {tile.isDynamic && (
            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase">
              Form
            </span>
          )}
        </div>
        <p className="hidden sm:block text-dark-muted text-xs lg:text-sm leading-relaxed">
          {descriptionContent}
        </p>
      </div>
    </button>
  );
});

TileButton.displayName = 'TileButton';

export default TileButton;
