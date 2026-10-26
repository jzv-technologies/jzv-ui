// src/components/layout/PortalLayout.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Translate from '../Translate';

// Role‑specific style configurations
const roleStyles = {
  admin: {
    bgGradient: 'from-orange-50 via-white to-orange-100',
    textColor: 'text-orange-700',
    activeTextColor: 'text-orange-800',
    hoverColor: 'hover:text-orange-800',
    chevronColor: 'text-orange-300',
    borderColor: 'border-orange-200',
  },
  management: {
    bgGradient: 'from-purple-50 via-white to-purple-100',
    textColor: 'text-purple-700',
    activeTextColor: 'text-purple-800',
    hoverColor: 'hover:text-purple-800',
    chevronColor: 'text-purple-300',
    borderColor: 'border-purple-200',
  },
  teacher: {
    bgGradient: 'from-green-50 via-white to-green-100',
    textColor: 'text-green-700',
    activeTextColor: 'text-green-800',
    hoverColor: 'hover:text-green-800',
    chevronColor: 'text-green-300',
    borderColor: 'border-green-200',
  },
  parent: {
    bgGradient: 'from-blue-50 via-white to-blue-100',
    textColor: 'text-blue-700',
    activeTextColor: 'text-blue-800',
    hoverColor: 'hover:text-blue-800',
    chevronColor: 'text-blue-300',
    borderColor: 'border-blue-200',
  },
  candidate: {
    bgGradient: 'from-teal-50 via-white to-teal-100',
    textColor: 'text-teal-700',
    activeTextColor: 'text-teal-800',
    hoverColor: 'hover:text-teal-800',
    chevronColor: 'text-teal-300',
    borderColor: 'border-teal-200',
  },
};

// Fallback for unknown roles (e.g., when roleName is not one of the four)
const defaultStyles = {
  bgGradient: 'from-gray-50 via-white to-gray-50/50',
  textColor: 'text-gray-700',
  activeTextColor: 'text-gray-800',
  hoverColor: 'hover:text-gray-800',
  chevronColor: 'text-gray-300',
  borderColor: 'border-gray-200',
};

const PortalLayout = ({
  children,
  userRoles,
  roleName,
  subView,
  onSetSubView,
  subViewTitle,
  activeGroup,
  onSetActiveGroup,
  activeGroupTitle,
  groups = [],
  isCategoryView = true,
  onCategoryViewChange,
  isHeaderVisible = true,
  onShowHeader,
  onHideHeader,
}) => {
  const navigate = useNavigate();

  const handlePortalClick = () => {
    if (onSetSubView) onSetSubView(null);
    if (onSetActiveGroup) onSetActiveGroup(null);
    navigate('/portal');
  };

  const handleGroupClick = () => {
    if (onSetSubView) {
      const destination = activeGroup
        ? `/portal?group=${encodeURIComponent(activeGroup)}`
        : '/portal';
      onSetSubView(null, destination);
    }
  };

  const handleMobileBack = () => {
    if (subView && activeGroup) {
      handleGroupClick();
      return;
    }
    handlePortalClick();
  };

  const styles = roleStyles[roleName] || defaultStyles;

  const displayTitle =
    subViewTitle ||
    (subView ? subView.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

  const isAtRoot = !subView && !activeGroup;

  const Breadcrumbs = () => (
    <div
      data-portal-breadcrumbs
      className={`
        w-full bg-gradient-to-r ${styles.bgGradient}
        border-b ${styles.borderColor}
        px-3 sm:px-4 py-1 sm:py-1.5 flex items-center text-xs sm:text-sm
        shadow-xs sticky ${isHeaderVisible ? 'top-[88px] sm:top-[96px]' : 'top-0'} z-30 backdrop-blur-md bg-opacity-95 print:hidden
      `}
    >
      <div className="w-full flex items-center justify-between gap-2">
        {!isHeaderVisible && (
          <img
            src="/media/jzv-round-round-white-bg.png"
            alt="JZV"
            className="h-8 w-8 shrink-0 rounded-full object-contain"
          />
        )}
        {/* Left: Breadcrumbs Navigation */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap">
          <button
            onClick={handlePortalClick}
            className={`${
              !isAtRoot ? styles.textColor : `${styles.activeTextColor} font-bold`
            } ${styles.hoverColor} flex items-center gap-1 transition-colors font-semibold cursor-pointer shrink-0 text-xs sm:text-sm`}
          >
            <i className="fas fa-th-large text-[11px]"></i>
            <span>Portal</span>
          </button>

          {/* Group Level (when in group drill-down or inside a subview belonging to a group) */}
          {activeGroupTitle && (
            <>
              <span className="text-gray-400 font-semibold select-none text-xs">\</span>
              {subView ? (
                <button
                  onClick={handleGroupClick}
                  className={`${styles.textColor} ${styles.hoverColor} transition-colors font-semibold cursor-pointer truncate max-w-[130px] sm:max-w-xs text-xs sm:text-sm`}
                >
                  {activeGroupTitle}
                </button>
              ) : (
                <span
                  className={`${styles.activeTextColor} font-bold truncate max-w-[150px] sm:max-w-xs text-xs sm:text-sm`}
                >
                  {activeGroupTitle}
                </span>
              )}
            </>
          )}

          {/* Subview Level */}
          {subView && (
            <>
              <span className="text-gray-400 font-semibold select-none text-xs">\</span>
              <span
                className={`${styles.activeTextColor} font-bold truncate max-w-[150px] sm:max-w-xs text-xs sm:text-sm`}
              >
                {displayTitle}
              </span>
            </>
          )}
        </div>

        <div className="sm:hidden flex items-center gap-2 min-w-0">
          <button
            onClick={handlePortalClick}
            className={`${!isAtRoot ? styles.textColor : `${styles.activeTextColor} font-bold`} ${styles.hoverColor} flex items-center gap-1 transition-colors font-semibold cursor-pointer shrink-0 text-xs`}
          >
            <i className="fas fa-th-large text-[11px]"></i>
            <span>Portal</span>
          </button>
          {!isAtRoot && (
            <button
              type="button"
              onClick={handleMobileBack}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${styles.borderColor} bg-white/80 ${styles.textColor} ${styles.hoverColor} text-[11px] font-bold transition-colors cursor-pointer`}
            >
              <i className="fas fa-arrow-left text-[10px]"></i>
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Right: Category view and group controls */}
        <div className="flex items-center shrink-0 gap-2">
          {isCategoryView && groups && groups.length > 0 && (
            <>
              {/* Desktop View: Icons only, no description */}
              <div className="hidden md:flex items-center gap-1 bg-white/70 backdrop-blur-xs border border-light-border/70 rounded-lg p-0.5 shadow-2xs">
                {groups.map((g) => {
                  const isCurrent = activeGroup === g.info.key;
                  return (
                    <button
                      key={g.info.key}
                      type="button"
                      title={g.info.label}
                      onClick={() => {
                        if (onSetSubView)
                          onSetSubView(null, `/portal?group=${encodeURIComponent(g.info.key)}`);
                        if (onSetActiveGroup) onSetActiveGroup(g.info.key);
                      }}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-orange-primary text-white shadow-xs font-bold scale-105'
                          : 'text-dark-muted hover:text-dark-deepblue hover:bg-white/90 active:scale-95'
                      }`}
                    >
                      <i className={`fas ${g.info.icon}`}></i>
                    </button>
                  );
                })}
              </div>

              {/* Mobile View: Icon-only category controls */}
              <div className="md:hidden flex items-center gap-1 max-w-[48vw] overflow-x-auto scrollbar-hide py-0.5">
                {groups.map((g) => {
                  const isCurrent = activeGroup === g.info.key;
                  return (
                    <button
                      key={g.info.key}
                      type="button"
                      title={g.info.label}
                      aria-label={g.info.label}
                      onClick={() => {
                        if (onSetSubView)
                          onSetSubView(null, `/portal?group=${encodeURIComponent(g.info.key)}`);
                        if (onSetActiveGroup) onSetActiveGroup(g.info.key);
                      }}
                      className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-orange-primary text-white shadow-xs font-bold'
                          : 'bg-white/80 border border-light-border/70 text-dark-muted hover:text-dark-deepblue active:scale-95'
                      }`}
                    >
                      <i className={`fas ${g.info.icon}`}></i>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <label
            className="inline-flex items-center gap-1.5 cursor-pointer"
            title={isCategoryView ? 'Show all tiles directly' : 'Group tiles by category'}
          >
            <input
              type="checkbox"
              checked={isCategoryView}
              onChange={(event) => onCategoryViewChange?.(event.target.checked)}
              className="sr-only peer"
              aria-label="Group portal tiles by category"
            />
            <span className="relative h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-orange-primary after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-xs after:transition-transform peer-checked:after:translate-x-4" />
          </label>
          {isHeaderVisible ? (
            <button
              type="button"
              onClick={onHideHeader}
              aria-label="Hide header"
              title="Hide header"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${styles.borderColor} bg-white/90 ${styles.textColor} shadow-sm transition-colors hover:bg-white`}
            >
              <i className="fas fa-chevron-up text-[11px]" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onShowHeader}
              aria-label="Show header"
              title="Show header"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${styles.borderColor} bg-white/90 ${styles.textColor} shadow-sm transition-colors hover:bg-white`}
            >
              <i className="fas fa-chevron-down text-[11px]" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const isFullWidth = true;

  return (
    <div className="min-h-screen flex flex-col bg-transparent print:min-h-0 print:block print:p-0 print:m-0">
      <Breadcrumbs />
      <main
        className={
          isFullWidth
            ? 'flex-1 w-full max-w-none p-0 m-0'
            : 'flex-1 w-full max-w-7xl mx-auto px-6 py-12'
        }
      >
        {children}
      </main>
    </div>
  );
};

export default PortalLayout;
