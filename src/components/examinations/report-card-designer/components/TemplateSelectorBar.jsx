import React from 'react';
import MultiSelectDropdown from '../../../MultiSelectDropdown';

/**
 * TemplateSelectorBar
 * Template dropdown, template name input and "new template" button.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const TemplateSelectorBar = ({
  currentConfig,
  handleCreateNewTemplate,
  handleSelectTemplate,
  setCurrentConfig,
  templateOptions,
}) => {
  return (
    <div className="px-4 py-3 bg-white border-b border-light-border flex flex-wrap items-center justify-between gap-2.5 shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-44 sm:w-52 shrink-0">
          <MultiSelectDropdown
            placeholder="Select Template..."
            options={templateOptions}
            selected={String(currentConfig.id)}
            onChange={handleSelectTemplate}
            singleSelect={true}
            icon="fa-file-invoice"
            fullWidth={true}
          />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={currentConfig.name}
            onChange={(e) => setCurrentConfig({ ...currentConfig, name: e.target.value })}
            placeholder="Template Name..."
            className="w-full min-w-0 px-3 py-1.5 text-xs border border-light-border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-300 outline-none text-dark-primary transition-all"
            title="Edit Template Name"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleCreateNewTemplate}
        className="px-2.5 py-1.5 rounded-xl border border-dashed border-rose-300 text-rose-700 bg-rose-50/60 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        title="Create a new template from scratch"
      >
        <i className="fas fa-plus text-[10px]" />
        <span>New Template</span>
      </button>
    </div>
  );
};

export default TemplateSelectorBar;
