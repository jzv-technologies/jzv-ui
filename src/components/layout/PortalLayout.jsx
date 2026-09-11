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
}) => {
  const navigate = useNavigate();

  const handlePortalClick = () => {
    if (onSetSubView) onSetSubView(null);
    if (onSetActiveGroup) onSetActiveGroup(null);
    navigate('/portal');
  };

  const handleGroupClick = () => {
    if (onSetSubView) onSetSubView(null);
  };

  const styles = roleStyles[roleName] || defaultStyles;

  const displayTitle =
    subViewTitle ||
    (subView ? subView.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

  const isAtRoot = !subView && !activeGroup;

  const Breadcrumbs = () => (
    <div
      className={`
        w-full bg-gradient-to-r ${styles.bgGradient}
        border-b ${styles.borderColor}
        px-3 sm:px-4 py-1 sm:py-1.5 flex items-center text-xs sm:text-sm
        shadow-xs sticky top-[88px] sm:top-[96px] z-30 backdrop-blur-md bg-opacity-95 print:hidden
      `}
    >
      <div className="w-full flex items-center justify-between gap-2">
        {/* Left: Breadcrumbs Navigation */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap">
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
                <span className={`${styles.activeTextColor} font-bold truncate max-w-[150px] sm:max-w-xs text-xs sm:text-sm`}>
                  {activeGroupTitle}
                </span>
              )}
            </>
          )}

          {/* Subview Level */}
          {subView && (
            <>
              <span className="text-gray-400 font-semibold select-none text-xs">\</span>
              <span className={`${styles.activeTextColor} font-bold truncate max-w-[150px] sm:max-w-xs text-xs sm:text-sm`}>
                {displayTitle}
              </span>
            </>
          )}
        </div>

        {/* Right: Category Switch Options */}
        {groups && groups.length > 0 && (
          <div className="flex items-center shrink-0">
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
                      if (onSetSubView) onSetSubView(null);
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

            {/* Mobile View: Dropdown */}
            <div className="md:hidden relative">
              <select
                value={activeGroup || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    if (onSetSubView) onSetSubView(null);
                    if (onSetActiveGroup) onSetActiveGroup(null);
                  } else {
                    if (onSetSubView) onSetSubView(null);
                    if (onSetActiveGroup) onSetActiveGroup(val);
                  }
                }}
                className="appearance-none text-[11px] font-semibold bg-white/90 border border-light-border/90 rounded-md pl-2 pr-6 py-1 text-dark-deepblue focus:outline-none focus:ring-1 focus:ring-orange-primary shadow-2xs max-w-[130px] truncate cursor-pointer"
              >
                <option value="">All Categories</option>
                {groups.map((g) => (
                  <option key={g.info.key} value={g.info.key}>
                    {g.info.label}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-dark-muted pointer-events-none" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const isFullWidth = true;

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
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
