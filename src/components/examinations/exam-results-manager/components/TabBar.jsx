import React from 'react';
import FilterBar from './FilterBar';

/**
 * TabBar
 * Workspace tabs on the left, with FilterBar on the right in the same row
 */
const TabBar = ({
  availableTabs = [],
  activeTab,
  setActiveTab,
  children,
  ...filterProps
}) => {
  return (
    <div
      className="w-full bg-white border-b border-light-border px-4 sm:px-6 py-2.5 print:hidden shadow-2xs"
      data-feature-tab-bar
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Workspace Tabs */}
        {availableTabs.length > 1 && (
          <div className="flex items-center gap-2 shrink-0" data-feature-tab="exam-results-tabs-wrapper">
            {/* Mobile: Dropdown (shown only on small screens when > 3 tabs) */}
            {availableTabs.length > 3 && (
              <div className="sm:hidden relative w-full mb-1" data-feature-tab="exam-results-tabs-mobile">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full appearance-none bg-white border border-light-border rounded-xl px-3.5 py-2 pr-8 text-xs font-extrabold text-dark-primary outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                >
                  {availableTabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
                <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-dark-muted pointer-events-none" />
              </div>
            )}

            {/* Desktop: Pill tabs */}
            <div
              className={`${availableTabs.length > 3 ? 'hidden sm:flex' : 'flex'} items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar mr-1 shrink-0`}
              data-feature-tab="exam-results-tabs"
            >
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-dark-muted hover:text-dark-primary'
                  }`}
                >
                  <i className={`fas ${tab.icon} text-[10px]`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right Side: FilterBar */}
        <div className="flex items-center gap-2.5 flex-wrap justify-start md:justify-end flex-1 w-full">
          {children || <FilterBar activeTab={activeTab} {...filterProps} />}
        </div>
      </div>
    </div>
  );
};

export default TabBar;