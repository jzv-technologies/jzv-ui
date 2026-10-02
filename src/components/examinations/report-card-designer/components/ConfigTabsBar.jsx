import React from 'react';

/**
 * ConfigTabsBar
 * Tab strip for Blocks & Layout / Grading Rules / Subject Groups.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const ConfigTabsBar = ({ activeTab, setActiveTab }) => {
  return (
    <div className="px-4 py-2 border-b border-light-border bg-white flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
      <div className="flex items-center gap-1">
        {[
          { id: 'layout', label: 'Blocks & Layout', icon: 'fa-grip-vertical' },
          { id: 'grading', label: 'Grading Rules', icon: 'fa-graduation-cap' },
          { id: 'grouping', label: 'Subject Groups', icon: 'fa-layer-group' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                : 'text-dark-muted hover:text-dark-primary hover:bg-slate-100 border border-transparent'
            }`}
          >
            <i className={`fas ${tab.icon} text-[10px]`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConfigTabsBar;
