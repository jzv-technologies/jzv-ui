// src/components/portal-shared/GroupCard.jsx
import React, { memo, useCallback } from 'react';

/**
 * Memoized group card component to prevent unnecessary re-renders.
 */
const GroupCard = memo(function GroupCard({ group, onClick }) {
  const accentBarClass = useCallback(() => {
    return group.info.color ? group.info.color.replace('text-', 'bg-') : 'bg-orange-primary';
  }, [group.info.color]);

  const badgeBg = group.info.badgeBg || 'bg-gray-100';
  const iconClass = `fas ${group.info.icon} ${group.info.color}`;
  const featureCount = group.tiles.length;
  const featureLabel = featureCount === 1 ? 'feature' : 'features';

  const handleClick = useCallback(() => {
    onClick(group.info.key);
  }, [onClick, group.info.key]);

  return (
    <div
      onClick={handleClick}
      className="group relative bg-white border border-light-border hover:border-orange-primary/60 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-left shadow-xs hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-2 ${accentBarClass()}`} />

      <div>
        {/* Icon + Feature Count */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-xs ${badgeBg} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
          >
            <i className={iconClass}></i>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            {featureCount} {featureLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg lg:text-xl font-extrabold text-dark-deepblue group-hover:text-orange-primary transition-colors tracking-tight mb-2">
          {group.info.label}
        </h3>

        {/* Feature Previews */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {group.tiles.slice(0, 4).map((tile) => (
            <span
              key={tile.id}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-dark-slate bg-gray-50 group-hover:bg-orange-50/50 px-2 py-0.5 rounded-md border border-gray-200/70 transition-colors"
            >
              <i className={`fas ${tile.icon} text-[9px] opacity-70`}></i>
              <span className="truncate max-w-[130px]">{tile.title}</span>
            </span>
          ))}
          {group.tiles.length > 4 && (
            <span className="inline-flex items-center text-[10px] font-bold text-dark-muted px-1.5 py-0.5">
              +{group.tiles.length - 4} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

GroupCard.displayName = 'GroupCard';

export default GroupCard;
